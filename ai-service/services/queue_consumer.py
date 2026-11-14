"""
Asynchronous RabbitMQ-style background queue consumer module for large document parsing
and vector chunking without blocking the main web/FastAPI thread.

Features:
- Non-blocking async queue consumer with multi-worker parallelism.
- Retry backoff: Exponential retry backoff with jitter on transient failures.
- Dead-letter handling: Automatic routing to dead-letter queue (DLQ) upon exceeding max retries.
- Real-time job status tracking: Queued -> Parsing -> Chunking -> Indexed (or DeadLetter/Failed).
- Dual-mode broker: RabbitMQ (AMQP via pika) with automatic fallback to high-performance async Channel queue.
"""

import asyncio
import base64
import json
import logging
import os
import random
import threading
import time
import urllib.parse
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
import pika

try:
    from services.vector_service import VectorEmbeddingService
except ImportError:
    VectorEmbeddingService = Any  # type: ignore

try:
    from services.sparse_service import SparseKeywordService
except ImportError:
    SparseKeywordService = Any  # type: ignore


logger = logging.getLogger("ai_service.queue_consumer")


class JobStatus(str, Enum):
    """Execution status states for document ingestion queue jobs."""
    QUEUED = "Queued"
    PARSING = "Parsing"
    CHUNKING = "Chunking"
    INDEXED = "Indexed"
    FAILED = "Failed"
    DEAD_LETTER = "DeadLetter"


@dataclass
class DocumentIngestionJob:
    """Represents a discrete document ingestion job dispatched to the queue."""
    job_id: str
    tenant_id: str
    document_uri: str
    status: JobStatus = JobStatus.QUEUED
    retry_count: int = 0
    max_retries: int = 3
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    chunks_indexed: int = 0
    processing_time_ms: float = 0.0
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        """Convert job representation to JSON-serializable dictionary."""
        return {
            "job_id": self.job_id,
            "tenant_id": self.tenant_id,
            "document_uri": self.document_uri,
            "status": self.status.value if isinstance(self.status, JobStatus) else str(self.status),
            "retry_count": self.retry_count,
            "max_retries": self.max_retries,
            "error_message": self.error_message,
            "metadata": self.metadata,
            "chunks_indexed": self.chunks_indexed,
            "processing_time_ms": self.processing_time_ms,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class AsyncDocumentQueueConsumer:
    """
    Non-blocking asynchronous background queue consumer engine for processing
    large document parsing and vector chunking.
    """

    def __init__(
        self,
        vector_service: VectorEmbeddingService,
        sparse_service: SparseKeywordService,
        num_workers: int = 3,
        base_delay_seconds: float = 0.5,
        max_delay_seconds: float = 8.0,
        rabbitmq_url: Optional[str] = None,
        exchange_name: str = "documents.exchange",
        queue_name: str = "documents.ingestion",
        dead_letter_exchange: str = "documents.dlx",
        dead_letter_queue: str = "documents.dlq",
        routing_key: str = "document.ingest",
    ):
        self.vector_service = vector_service
        self.sparse_service = sparse_service
        self.num_workers = max(1, num_workers)
        self.base_delay_seconds = base_delay_seconds
        self.max_delay_seconds = max_delay_seconds

        # RabbitMQ configuration
        self.rabbitmq_url = rabbitmq_url or os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
        self.exchange_name = exchange_name
        self.queue_name = queue_name
        self.dead_letter_exchange = dead_letter_exchange
        self.dead_letter_queue = dead_letter_queue
        self.routing_key = routing_key

        # Async internal queue (non-blocking message channel)
        self._queue: asyncio.Queue[DocumentIngestionJob] = asyncio.Queue()
        self._worker_tasks: List[asyncio.Task] = []
        self._is_running = False

        # In-memory thread-safe state registries
        self._jobs: Dict[str, DocumentIngestionJob] = {}
        self._dead_letter_jobs: Dict[str, DocumentIngestionJob] = {}
        self._lock = threading.Lock()

        # RabbitMQ broker state
        self._broker_connected = False
        self._rabbitmq_thread: Optional[threading.Thread] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    async def start(self) -> None:
        """Starts worker tasks in the background without blocking the main event loop."""
        if self._is_running:
            return

        self._is_running = True
        self._loop = asyncio.get_running_loop()

        logger.info(
            "Starting AsyncDocumentQueueConsumer with %d background workers (base delay=%.2fs, max delay=%.2fs)...",
            self.num_workers,
            self.base_delay_seconds,
            self.max_delay_seconds,
        )

        for i in range(self.num_workers):
            task = asyncio.create_task(self._worker_loop(worker_id=i + 1), name=f"QueueWorker-{i + 1}")
            self._worker_tasks.append(task)

        # Attempt background RabbitMQ connection in non-blocking thread
        self._start_rabbitmq_listener_if_available()

    async def stop(self) -> None:
        """Gracefully halts all worker tasks and flushes pending queues."""
        if not self._is_running:
            return

        logger.info("Stopping AsyncDocumentQueueConsumer and cancelling %d worker tasks...", len(self._worker_tasks))
        self._is_running = False

        for task in self._worker_tasks:
            task.cancel()

        await asyncio.gather(*self._worker_tasks, return_exceptions=True)
        self._worker_tasks.clear()
        self._broker_connected = False
        logger.info("AsyncDocumentQueueConsumer shutdown complete.")

    async def enqueue_job(
        self,
        tenant_id: str,
        document_uri: str,
        job_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        max_retries: int = 3,
    ) -> DocumentIngestionJob:
        """
        Enqueues an asynchronous document ingestion job into the non-blocking queue.
        Immediately returns a tracked job in 'Queued' status without blocking the caller.
        """
        import uuid
        effective_job_id = job_id or f"job_{uuid.uuid4().hex[:16]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        job = DocumentIngestionJob(
            job_id=effective_job_id,
            tenant_id=tenant_id,
            document_uri=document_uri,
            status=JobStatus.QUEUED,
            retry_count=0,
            max_retries=max_retries,
            metadata=dict(metadata or {}),
            created_at=now_iso,
            updated_at=now_iso,
        )

        with self._lock:
            self._jobs[effective_job_id] = job

        await self._queue.put(job)
        logger.info(
            "Job '%s' for tenant '%s' placed in queue (queue depth: %d, URI: '%s').",
            effective_job_id,
            tenant_id,
            self._queue.qsize(),
            document_uri,
        )
        return job

    def get_job(self, job_id: str) -> Optional[DocumentIngestionJob]:
        """Retrieves real-time tracking record for a specific job."""
        with self._lock:
            return self._jobs.get(job_id)

    def list_jobs(
        self,
        tenant_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> List[DocumentIngestionJob]:
        """Lists tracked jobs filtered by tenant or status."""
        with self._lock:
            jobs = list(self._jobs.values())

        if tenant_id:
            jobs = [j for j in jobs if j.tenant_id == tenant_id]

        if status:
            target_status = status.lower()
            jobs = [j for j in jobs if (j.status.value.lower() if isinstance(j.status, JobStatus) else str(j.status).lower()) == target_status]

        # Sort descending by creation date
        jobs.sort(key=lambda j: j.created_at, reverse=True)
        return jobs[:limit]

    def get_dead_letter_jobs(self, limit: int = 50) -> List[DocumentIngestionJob]:
        """Returns all jobs currently routed to the Dead-Letter Queue."""
        with self._lock:
            dead_jobs = list(self._dead_letter_jobs.values())
        dead_jobs.sort(key=lambda j: j.updated_at, reverse=True)
        return dead_jobs[:limit]

    def get_metrics(self) -> Dict[str, Any]:
        """Calculates real-time queue operational metrics and status distribution."""
        with self._lock:
            all_jobs = list(self._jobs.values())
            dead_letter_count = len(self._dead_letter_jobs)

        status_counts = {
            JobStatus.QUEUED.value: 0,
            JobStatus.PARSING.value: 0,
            JobStatus.CHUNKING.value: 0,
            JobStatus.INDEXED.value: 0,
            JobStatus.FAILED.value: 0,
            JobStatus.DEAD_LETTER.value: 0,
        }

        for j in all_jobs:
            s_val = j.status.value if isinstance(j.status, JobStatus) else str(j.status)
            status_counts[s_val] = status_counts.get(s_val, 0) + 1

        return {
            "status": "operational" if self._is_running else "stopped",
            "active_workers": len([w for w in self._worker_tasks if not w.done()]),
            "queue_depth": self._queue.qsize(),
            "total_jobs": len(all_jobs),
            "by_status": status_counts,
            "dead_letter_count": dead_letter_count,
            "broker_type": "RabbitMQ" if self._broker_connected else "AsyncChannelInMemory",
            "broker_connected": self._broker_connected,
        }

    # ──────────────────────────────────────────────────────────────────────────
    # Background Worker Execution Loop
    # ──────────────────────────────────────────────────────────────────────────

    async def _worker_loop(self, worker_id: int) -> None:
        """Continuous consumer loop dequeuing and processing jobs with retry and DLQ logic."""
        logger.debug("Background worker %d started.", worker_id)
        while self._is_running:
            try:
                job = await self._queue.get()
                logger.info(
                    "Worker %d picked up job '%s' (Tenant: '%s', Attempt: %d/%d).",
                    worker_id,
                    job.job_id,
                    job.tenant_id,
                    job.retry_count + 1,
                    job.max_retries,
                )

                await self._process_job_with_resilience(job, worker_id)
                self._queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Unexpected worker %d crash: %s", worker_id, str(e), exc_info=True)
                await asyncio.sleep(0.5)

    async def _process_job_with_resilience(self, job: DocumentIngestionJob, worker_id: int) -> None:
        """Executes job pipeline with retry backoff and dead-letter handling."""
        start_time = time.perf_counter()

        try:
            # 1. Update status to Parsing
            self._update_job_status(job, JobStatus.PARSING)

            # 2. Parse large document from document_uri without blocking
            parsed_text, parsed_metadata = await self._parse_document(job)

            # 3. Update status to Chunking
            self._update_job_status(job, JobStatus.CHUNKING)

            # 4. Perform vector chunking and dense embedding in ChromaDB
            # Run CPU-intensive embedding/chunking in threadpool to keep async loop responsive
            merged_metadata = dict(job.metadata)
            merged_metadata.update(parsed_metadata)
            merged_metadata.update({"job_id": job.job_id, "document_uri": job.document_uri})

            chunks, metadatas = await asyncio.to_thread(
                self.vector_service.process_and_store_document,
                tenant_id=job.tenant_id,
                document_id=job.job_id,
                content=parsed_text,
                additional_metadata=merged_metadata,
            )

            # 5. Concurrently index chunks into sparse BM25 keyword index
            await asyncio.to_thread(
                self.sparse_service.add_documents,
                chunks=chunks,
                metadata=metadatas,
            )

            # 6. Update status to Indexed (Success)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            job.chunks_indexed = len(chunks)
            job.processing_time_ms = elapsed_ms
            job.error_message = None
            self._update_job_status(job, JobStatus.INDEXED)

            logger.info(
                "Worker %d successfully indexed job '%s' (%d chunks, %.2fms).",
                worker_id,
                job.job_id,
                len(chunks),
                elapsed_ms,
            )

        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            job.processing_time_ms = elapsed_ms
            err_msg = f"{type(exc).__name__}: {str(exc)}"
            job.error_message = err_msg

            if job.retry_count < job.max_retries:
                # Exponential backoff with jitter: delay = base * 2^retry + jitter
                job.retry_count += 1
                backoff_delay = min(
                    self.max_delay_seconds,
                    self.base_delay_seconds * (2 ** (job.retry_count - 1)),
                ) + random.uniform(0.05, 0.25)

                logger.warning(
                    "Job '%s' failed on attempt %d/%d (%s). Backing off for %.2fs before retry...",
                    job.job_id,
                    job.retry_count,
                    job.max_retries,
                    err_msg,
                    backoff_delay,
                )
                self._update_job_status(job, JobStatus.QUEUED)
                await asyncio.sleep(backoff_delay)
                await self._queue.put(job)
            else:
                # Exceeded max retries -> Dead-Letter Queue
                self._handle_dead_letter(job, err_msg)

    async def _parse_document(self, job: DocumentIngestionJob) -> tuple[str, Dict[str, Any]]:
        """
        Parses document content from document_uri.
        Supports file://, local filesystem paths, data URIs, mock URIs, and inline payload metadata.
        """
        uri = job.document_uri.strip()
        metadata: Dict[str, Any] = {"uri": uri}

        # Check if content was directly embedded in metadata
        if "content" in job.metadata and str(job.metadata["content"]).strip():
            logger.debug("Found pre-loaded content in job metadata for job '%s'.", job.job_id)
            return str(job.metadata["content"]).strip(), metadata

        # Data URI handling: data:text/plain;base64,...
        if uri.startswith("data:"):
            try:
                header, data = uri.split(",", 1)
                if "base64" in header:
                    decoded = base64.b64decode(data).decode("utf-8", errors="replace")
                else:
                    decoded = urllib.parse.unquote(data)
                return decoded, metadata
            except Exception as e:
                raise ValueError(f"Failed to decode data URI: {str(e)}") from e

        # Mock / Test protocol handling: mock:// or inline://
        if uri.startswith("mock://") or uri.startswith("inline://"):
            mock_text = job.metadata.get("text") or (
                f"Synthetic enterprise document for job {job.job_id} under tenant {job.tenant_id}. "
                f"Section 1: Automated queue ingestion and reciprocal rank fusion verification. "
                f"Document URI: {uri}."
            )
            return mock_text, metadata

        # File protocol or local path handling
        file_path = uri
        if uri.startswith("file:///"):
            file_path = uri[8:]
        elif uri.startswith("file://"):
            file_path = uri[7:]

        # Handle Windows drive letters (e.g. /C:/path -> C:/path)
        if len(file_path) > 2 and file_path[0] == "/" and file_path[2] == ":":
            file_path = file_path[1:]

        if os.path.exists(file_path):
            def _read_file():
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    return f.read()

            content = await asyncio.to_thread(_read_file)
            if not content.strip():
                raise ValueError(f"File at '{file_path}' is empty.")
            metadata["file_name"] = os.path.basename(file_path)
            metadata["file_size_bytes"] = os.path.getsize(file_path)
            return content, metadata

        # Simulated remote download for http/https URIs
        if uri.startswith("http://") or uri.startswith("https://"):
            # In test/demo environments, if no network download is configured, check metadata or generate representative text
            if "content" in job.metadata:
                return str(job.metadata["content"]), metadata
            raise ValueError(f"Remote document retrieval for '{uri}' is not configured or host unreachable.")

        raise FileNotFoundError(f"Document URI '{uri}' could not be resolved or file does not exist.")

    def _update_job_status(self, job: DocumentIngestionJob, new_status: JobStatus) -> None:
        """Thread-safe status transition updater."""
        with self._lock:
            job.status = new_status
            job.updated_at = datetime.now(timezone.utc).isoformat()
            self._jobs[job.job_id] = job

    def _handle_dead_letter(self, job: DocumentIngestionJob, error_message: str) -> None:
        """
        Routes an unrecoverable or exhausted-retry job to the Dead-Letter Queue.
        Preserves diagnostic failure context for administrative inspection.
        """
        logger.error(
            "CRITICAL: Job '%s' (Tenant: '%s') exhausted %d retries. Routing to Dead-Letter Queue (DLQ). Reason: %s",
            job.job_id,
            job.tenant_id,
            job.max_retries,
            error_message,
        )

        with self._lock:
            job.status = JobStatus.DEAD_LETTER
            job.error_message = error_message
            job.updated_at = datetime.now(timezone.utc).isoformat()
            self._jobs[job.job_id] = job
            self._dead_letter_jobs[job.job_id] = job

        # Publish to RabbitMQ DLX exchange if connected
        self._publish_to_rabbitmq_dlx(job)

    # ──────────────────────────────────────────────────────────────────────────
    # RabbitMQ Integration & Dual-Mode AMQP Broker
    # ──────────────────────────────────────────────────────────────────────────

    def _start_rabbitmq_listener_if_available(self) -> None:
        """
        Attempts to establish connection with RabbitMQ broker in background thread.
        If RabbitMQ is not available, gracefully remains in high-performance async Channel mode.
        """
        def _connect_broker():
            try:
                parameters = pika.URLParameters(self.rabbitmq_url)
                parameters.connection_attempts = 1
                parameters.retry_delay = 1.0
                parameters.socket_timeout = 2.0

                connection = pika.BlockingConnection(parameters)
                channel = connection.channel()

                # Declare main exchange and dead-letter exchange
                channel.exchange_declare(exchange=self.exchange_name, exchange_type="topic", durable=True)
                channel.exchange_declare(exchange=self.dead_letter_exchange, exchange_type="direct", durable=True)

                # Declare Dead-Letter Queue
                channel.queue_declare(queue=self.dead_letter_queue, durable=True)
                channel.queue_bind(
                    exchange=self.dead_letter_exchange,
                    queue=self.dead_letter_queue,
                    routing_key=self.dead_letter_queue,
                )

                # Declare Main Queue with Dead-Letter bindings
                args = {
                    "x-dead-letter-exchange": self.dead_letter_exchange,
                    "x-dead-letter-routing-key": self.dead_letter_queue,
                }
                channel.queue_declare(queue=self.queue_name, durable=True, arguments=args)
                channel.queue_bind(
                    exchange=self.exchange_name,
                    queue=self.queue_name,
                    routing_key=self.routing_key,
                )

                self._broker_connected = True
                logger.info(
                    "Connected to RabbitMQ broker at '%s'. Queue '%s' bound to exchange '%s' with DLQ '%s'.",
                    self.rabbitmq_url,
                    self.queue_name,
                    self.exchange_name,
                    self.dead_letter_queue,
                )

                # Listen for messages and forward them into the local async queue
                def _on_message(ch, method, properties, body):
                    try:
                        payload = json.loads(body.decode("utf-8"))
                        job_id = payload.get("job_id") or properties.message_id
                        tenant_id = payload.get("tenant_id")
                        document_uri = payload.get("document_uri")
                        metadata = payload.get("metadata", {})

                        if tenant_id and document_uri and self._loop:
                            asyncio.run_coroutine_threadsafe(
                                self.enqueue_job(
                                    tenant_id=tenant_id,
                                    document_uri=document_uri,
                                    job_id=job_id,
                                    metadata=metadata,
                                ),
                                self._loop,
                            )
                        ch.basic_ack(delivery_tag=method.delivery_tag)
                    except Exception as err:
                        logger.error("Failed to parse incoming RabbitMQ message: %s", str(err))
                        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

                channel.basic_qos(prefetch_count=self.num_workers)
                channel.basic_consume(queue=self.queue_name, on_message_callback=_on_message)
                channel.start_consuming()

            except Exception as ex:
                self._broker_connected = False
                logger.info(
                    "RabbitMQ broker not active at '%s' (%s). Consumer running in standalone high-throughput async Channel mode.",
                    self.rabbitmq_url,
                    type(ex).__name__,
                )

        self._rabbitmq_thread = threading.Thread(target=_connect_broker, name="RabbitMQ-Listener", daemon=True)
        self._rabbitmq_thread.start()

    def _publish_to_rabbitmq_dlx(self, job: DocumentIngestionJob) -> None:
        """Publishes dead-lettered job to RabbitMQ DLX exchange if connected."""
        if not self._broker_connected:
            return

        def _publish():
            try:
                parameters = pika.URLParameters(self.rabbitmq_url)
                connection = pika.BlockingConnection(parameters)
                channel = connection.channel()
                channel.basic_publish(
                    exchange=self.dead_letter_exchange,
                    routing_key=self.dead_letter_queue,
                    body=json.dumps(job.to_dict()).encode("utf-8"),
                    properties=pika.BasicProperties(
                        content_type="application/json",
                        delivery_mode=2,  # Persistent
                        message_id=job.job_id,
                        headers={"x-exception-reason": job.error_message or "MaxRetriesExceeded"},
                    ),
                )
                connection.close()
                logger.info("Successfully published job '%s' to RabbitMQ Dead-Letter Exchange.", job.job_id)
            except Exception as e:
                logger.warning("Could not dispatch job '%s' to RabbitMQ DLX: %s", job.job_id, str(e))

        threading.Thread(target=_publish, name="RabbitMQ-DLX-Publisher", daemon=True).start()
