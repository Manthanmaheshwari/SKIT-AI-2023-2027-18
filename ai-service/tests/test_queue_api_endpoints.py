"""
API endpoint integration tests for Queue endpoints in FastAPI main.py.
"""

import sys
from unittest.mock import MagicMock

# Mock chromadb if not installed in local environment
if "chromadb" not in sys.modules:
    mock_chroma = MagicMock()
    mock_collection = MagicMock()
    mock_collection.count.return_value = 10
    mock_chroma.PersistentClient.return_value.get_or_create_collection.return_value = mock_collection
    sys.modules["chromadb"] = mock_chroma
    sys.modules["chromadb.utils"] = MagicMock()
    sys.modules["chromadb.utils.embedding_functions"] = MagicMock()

if "langchain" not in sys.modules:
    mock_lc = MagicMock()
    sys.modules["langchain"] = mock_lc
    sys.modules["langchain.text_splitter"] = mock_lc

if "rank_bm25" not in sys.modules:
    mock_bm25 = MagicMock()
    sys.modules["rank_bm25"] = mock_bm25

from fastapi.testclient import TestClient
from main import app, queue_consumer
from services.queue_consumer import JobStatus


def test_queue_endpoints_workflow():
    """Test full endpoint lifecycle for queue submission and status lookup."""
    with TestClient(app) as client:
        # 1. Check stats endpoint
        stats_resp = client.get("/api/v1/queue/stats")
        assert stats_resp.status_code == 200
        stats_data = stats_resp.json()
        assert stats_data["status"] == "operational"
        assert "queue_depth" in stats_data
        assert "by_status" in stats_data

        # 2. Enqueue a job via API
        payload = {
            "tenant_id": "tenant_api_test",
            "document_uri": "mock://api-test-doc",
            "job_id": "job_api_001",
            "metadata": {"title": "API Test Document", "content": "Sample content for API test"},
        }
        submit_resp = client.post("/api/v1/queue/jobs", json=payload)
        assert submit_resp.status_code == 202
        submit_data = submit_resp.json()
        assert submit_data["job_id"] == "job_api_001"
        assert submit_data["tenant_id"] == "tenant_api_test"
        assert submit_data["status"] == "Queued"

        # 3. Query job status by ID
        status_resp = client.get("/api/v1/queue/jobs/job_api_001")
        assert status_resp.status_code == 200
        job_data = status_resp.json()
        assert job_data["job_id"] == "job_api_001"
        assert job_data["status"] in ["Queued", "Parsing", "Chunking", "Indexed"]

        # 4. List jobs with filtering
        list_resp = client.get("/api/v1/queue/jobs?tenant_id=tenant_api_test")
        assert list_resp.status_code == 200
        jobs_list = list_resp.json()
        assert len(jobs_list) >= 1
        assert any(j["job_id"] == "job_api_001" for j in jobs_list)

        # 5. Dead-letter endpoint
        dlq_resp = client.get("/api/v1/queue/dead-letter")
        assert dlq_resp.status_code == 200
        assert isinstance(dlq_resp.json(), list)

        # 6. Health check includes queue stats
        health_resp = client.get("/health")
        assert health_resp.status_code == 200
        health_data = health_resp.json()
        assert health_data["queue_status"] == "operational"
