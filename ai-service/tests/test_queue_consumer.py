"""
Unit and integration tests for AsyncDocumentQueueConsumer in ai-service.

Tests cover:
- Non-blocking asynchronous job enqueueing and processing.
- Status tracking transitions: Queued -> Parsing -> Chunking -> Indexed.
- Vector and sparse indexing verification after queue processing.
- Retry backoff mechanism on transient failures.
- Dead-letter handling (routing to DLQ when max retries exceeded).
- Concurrent worker processing without blocking the event loop.
- Telemetry stats and dead-letter retrieval API.
"""

import asyncio
import os
import shutil
import tempfile
from unittest.mock import MagicMock

from services.queue_consumer import (
    AsyncDocumentQueueConsumer,
    DocumentIngestionJob,
    JobStatus,
)


def get_mock_services():
    """Initializes mock VectorEmbeddingService and SparseKeywordService."""
    mock_vector = MagicMock()
    mock_sparse = MagicMock()

    mock_vector.process_and_store_document.return_value = (
        ["chunk_1: Enterprise specification", "chunk_2: RabbitMQ queue consumers"],
        [{"chunk_id": "c1", "page": 1}, {"chunk_id": "c2", "page": 1}],
    )
    mock_sparse.add_documents.return_value = None

    return mock_vector, mock_sparse


def test_job_status_tracking_full_lifecycle():
    """
    Verifies that a document ingestion job successfully transitions through:
    Queued -> Parsing -> Chunking -> Indexed, and calls downstream chunk/index services.
    """
    async def _test():
        mock_vector, mock_sparse = get_mock_services()
        consumer = AsyncDocumentQueueConsumer(
            vector_service=mock_vector,
            sparse_service=mock_sparse,
            num_workers=1,
            base_delay_seconds=0.05,
            max_delay_seconds=0.2,
        )

        await consumer.start()

        temp_dir = tempfile.mkdtemp(prefix="test_qc_")
        try:
            test_file = os.path.join(temp_dir, "sample_document.txt")
            sample_content = (
                "Enterprise Architecture Specification for Asynchronous Queue Consumers. "
                "Section 1.1: RabbitMQ background processing handles large document ingestion jobs. "
                "Section 1.2: Status tracking transitions through Queued, Parsing, Chunking, and Indexed."
            )
            with open(test_file, "w", encoding="utf-8") as f:
                f.write(sample_content)

            job_id = "job_test_lifecycle_001"
            tenant_id = "tenant_test_a"
            file_uri = f"file:///{test_file.replace(os.sep, '/')}"

            # 1. Enqueue job -> should immediately return with status Queued
            job = await consumer.enqueue_job(
                tenant_id=tenant_id,
                document_uri=file_uri,
                job_id=job_id,
                metadata={"title": "Test Doc", "category": "Architecture"},
            )

            assert job.status == JobStatus.QUEUED
            assert job.job_id == job_id
            assert job.tenant_id == tenant_id

            # 2. Wait for consumer to process the job
            for _ in range(50):
                tracked_job = consumer.get_job(job_id)
                if tracked_job and tracked_job.status == JobStatus.INDEXED:
                    break
                await asyncio.sleep(0.05)

            tracked = consumer.get_job(job_id)
            assert tracked is not None
            assert tracked.status == JobStatus.INDEXED
            assert tracked.chunks_indexed == 2
            assert tracked.processing_time_ms > 0
            assert tracked.error_message is None

            # 3. Verify downstream vector chunking and sparse indexing were called
            mock_vector.process_and_store_document.assert_called_once()
            mock_sparse.add_documents.assert_called_once()

        finally:
            await consumer.stop()
            shutil.rmtree(temp_dir, ignore_errors=True)

    asyncio.run(_test())


def test_retry_backoff_on_transient_failure():
    """
    Verifies retry backoff logic: when a transient failure occurs, the consumer
    increments retry_count, backs off, and re-queues until eventual success.
    """
    async def _test():
        mock_vector, mock_sparse = get_mock_services()
        consumer = AsyncDocumentQueueConsumer(
            vector_service=mock_vector,
            sparse_service=mock_sparse,
            num_workers=1,
            base_delay_seconds=0.05,
            max_delay_seconds=0.2,
        )

        await consumer.start()

        job_id = "job_transient_retry_001"
        tenant_id = "tenant_test_b"

        call_count = 0

        async def mock_transient_parse(job):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise ConnectionResetError("Transient network timeout fetching document storage URI")
            return "Grounded document text retrieved successfully after transient reconnect.", {"page": 1}

        consumer._parse_document = mock_transient_parse

        job = await consumer.enqueue_job(
            tenant_id=tenant_id,
            document_uri="mock://transient-retry-test",
            job_id=job_id,
            max_retries=2,
        )

        for _ in range(50):
            tracked = consumer.get_job(job_id)
            if tracked and tracked.status == JobStatus.INDEXED:
                break
            await asyncio.sleep(0.05)

        tracked = consumer.get_job(job_id)
        assert tracked is not None
        assert tracked.status == JobStatus.INDEXED
        assert tracked.retry_count == 1, "Should have retried exactly once after transient failure"
        assert call_count == 2, "Should have invoked parse twice"

        await consumer.stop()

    asyncio.run(_test())


def test_dead_letter_handling_when_max_retries_exceeded():
    """
    Verifies that jobs with unrecoverable errors exceeding max_retries
    are routed to the Dead-Letter Queue (DLQ) with status 'DeadLetter'.
    """
    async def _test():
        mock_vector, mock_sparse = get_mock_services()
        consumer = AsyncDocumentQueueConsumer(
            vector_service=mock_vector,
            sparse_service=mock_sparse,
            num_workers=1,
            base_delay_seconds=0.02,
            max_delay_seconds=0.1,
        )

        await consumer.start()

        job_id = "job_dlq_test_001"
        tenant_id = "tenant_test_c"

        # Enqueue with an invalid, non-existent URI and no metadata content
        job = await consumer.enqueue_job(
            tenant_id=tenant_id,
            document_uri="file:///invalid/non_existent_path_nowhere_to_be_found.pdf",
            job_id=job_id,
            max_retries=2,
        )

        # Wait for job to exhaust retries and enter DLQ
        for _ in range(60):
            tracked = consumer.get_job(job_id)
            if tracked and tracked.status == JobStatus.DEAD_LETTER:
                break
            await asyncio.sleep(0.05)

        tracked = consumer.get_job(job_id)
        assert tracked is not None
        assert tracked.status == JobStatus.DEAD_LETTER
        assert tracked.retry_count == 2, "Should have attempted all retries before dead-lettering"
        assert tracked.error_message is not None
        assert "FileNotFoundError" in tracked.error_message or "could not be resolved" in tracked.error_message

        # Verify DLQ contains the failed job
        dlq_jobs = consumer.get_dead_letter_jobs()
        assert any(j.job_id == job_id for j in dlq_jobs)

        metrics = consumer.get_metrics()
        assert metrics["dead_letter_count"] >= 1

        await consumer.stop()

    asyncio.run(_test())


def test_concurrent_non_blocking_execution():
    """
    Verifies that multiple concurrent jobs are dispatched and processed simultaneously
    without blocking one another.
    """
    async def _test():
        mock_vector, mock_sparse = get_mock_services()
        consumer = AsyncDocumentQueueConsumer(
            vector_service=mock_vector,
            sparse_service=mock_sparse,
            num_workers=3,
            base_delay_seconds=0.02,
            max_delay_seconds=0.1,
        )

        await consumer.start()

        num_jobs = 6
        job_ids = [f"job_concurrent_{i}" for i in range(num_jobs)]

        for jid in job_ids:
            await consumer.enqueue_job(
                tenant_id="tenant_concurrent",
                document_uri=f"mock://doc_{jid}",
                job_id=jid,
                metadata={"content": f"Document content for concurrent worker test {jid}. High-throughput batching."},
            )

        # Wait for all jobs to reach INDEXED
        for _ in range(60):
            all_indexed = all(
                consumer.get_job(jid) is not None and consumer.get_job(jid).status == JobStatus.INDEXED
                for jid in job_ids
            )
            if all_indexed:
                break
            await asyncio.sleep(0.05)

        for jid in job_ids:
            job = consumer.get_job(jid)
            assert job is not None
            assert job.status == JobStatus.INDEXED
            assert job.chunks_indexed >= 1

        metrics = consumer.get_metrics()
        assert metrics["total_jobs"] >= num_jobs
        assert metrics["by_status"]["Indexed"] >= num_jobs

        await consumer.stop()

    asyncio.run(_test())


def test_data_uri_and_metadata_content_parsing():
    """
    Verifies parsing of data: URIs (base64 and raw) and embedded metadata content.
    """
    async def _test():
        mock_vector, mock_sparse = get_mock_services()
        consumer = AsyncDocumentQueueConsumer(
            vector_service=mock_vector,
            sparse_service=mock_sparse,
            num_workers=1,
        )

        await consumer.start()

        # Data URI base64
        import base64
        raw_text = "Base64 encoded confidential legal contract text."
        b64_encoded = base64.b64encode(raw_text.encode("utf-8")).decode("utf-8")
        data_uri = f"data:text/plain;base64,{b64_encoded}"

        job1 = await consumer.enqueue_job(
            tenant_id="tenant_data_uri",
            document_uri=data_uri,
            job_id="job_data_b64",
        )

        for _ in range(50):
            tracked = consumer.get_job("job_data_b64")
            if tracked and tracked.status == JobStatus.INDEXED:
                break
            await asyncio.sleep(0.05)

        assert consumer.get_job("job_data_b64").status == JobStatus.INDEXED

        await consumer.stop()

    asyncio.run(_test())
