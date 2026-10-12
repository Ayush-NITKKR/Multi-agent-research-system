import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from api import app, JOBS_STORE
from research_adapter import parse_sources, parse_critic_feedback, extract_domain, execute_research_workflow

client = TestClient(app)

class TestPythonService(unittest.TestCase):

    def setUp(self):
        JOBS_STORE.clear()

    def test_extract_domain(self):
        self.assertEqual(extract_domain("https://www.example.com/path"), "example.com")
        self.assertEqual(extract_domain("https://sub.domain.org/test?id=1"), "sub.domain.org")
        self.assertEqual(extract_domain("invalid-url"), "external-source")

    def test_parse_sources(self):
        sample_search = """Title: Example Tech News
URL: https://techcrunch.com/article-1
Snippet: Here is a snippet about technology.
---
Title: AI Research Paper
URL: https://arxiv.org/abs/2401.0001
Snippet: An empirical study on agents.
"""
        sample_report = "Check this [OpenAI](https://openai.com/research) announcement."
        sources = parse_sources(sample_search, sample_report)
        self.assertEqual(len(sources), 3)
        urls = [s["url"] for s in sources]
        self.assertIn("https://techcrunch.com/article-1", urls)
        self.assertIn("https://arxiv.org/abs/2401.0001", urls)
        self.assertIn("https://openai.com/research", urls)

    def test_parse_sources_with_list_input(self):
        # Simulates LangChain / ChatMistralAI content blocks
        list_search = [
            {"type": "text", "text": "## Dark Matter\n\n1. **URL:** https://science.nasa.gov/dark-matter\n"},
            {"type": "text", "text": "2. **URL:** https://www.esa.int/Science_Exploration/Space_Science/Euclid"}
        ]
        sources = parse_sources(list_search, "")
        self.assertEqual(len(sources), 2)
        urls = [s["url"] for s in sources]
        self.assertIn("https://science.nasa.gov/dark-matter", urls)
        self.assertIn("https://www.esa.int/Science_Exploration/Space_Science/Euclid", urls)

    def test_parse_critic_feedback_approved(self):
        feedback = """## Overall Verdict
APPROVED

## Strengths
- Clear structure and solid findings.
- Good citations.

## Issues Found
- Minor typographical error in section 2.

## Recommended Improvements
- Expand future outlook.
"""
        parsed = parse_critic_feedback(feedback)
        self.assertEqual(parsed["verdict"], "APPROVED")
        self.assertIn("Clear structure and solid findings.", parsed["strengths"])
        self.assertIn("Expand future outlook.", parsed["recommendations"])

    def test_parse_critic_feedback_needs_revision(self):
        feedback = """## Overall Verdict
NEEDS REVISION

## Strengths
- Good summary of main topics.

## Issues Found
- Missing sources for claims.

## Missing Information
- Quantum computing benchmarks.

## Recommended Improvements
- Verify all links.
"""
        parsed = parse_critic_feedback(feedback)
        self.assertEqual(parsed["verdict"], "NEEDS REVISION")
        self.assertIn("Missing sources for claims.", parsed["issues"])
        self.assertIn("Quantum computing benchmarks.", parsed["missing_information"])

    def test_health_endpoint(self):
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("model", data)

    @patch("research_adapter.run_research_pipeline")
    def test_submit_research_sync_mocked(self, mock_pipeline):
        mock_pipeline.return_value = {
            "search_result": "Title: Test\nURL: https://test.org\nSnippet: Sample snippet\n---",
            "scraped_content": "Scraped article content",
            "report_result": "# Introduction\nTest Report",
            "feedback_result": "## Overall Verdict\nAPPROVED\n## Strengths\n- Great work"
        }

        payload = {
            "topic": "Test topic for research",
            "job_id": "test-job-123",
            "enable_revisions": False,
            "async_execution": False
        }
        response = client.post("/internal/research", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["job_id"], "test-job-123")
        self.assertEqual(data["status"], "completed")
        self.assertEqual(data["topic"], "Test topic for research")
        self.assertEqual(len(data["sources"]), 1)
        self.assertEqual(data["critic_feedback"]["verdict"], "APPROVED")

    def test_get_nonexistent_job(self):
        response = client.get("/internal/research/nonexistent-id")
        self.assertEqual(response.status_code, 404)

    def test_ssrf_blocking(self):
        from research_adapter import is_safe_external_url
        self.assertFalse(is_safe_external_url("http://127.0.0.1/admin"))
        self.assertFalse(is_safe_external_url("http://localhost:8080/secret"))
        self.assertFalse(is_safe_external_url("file:///etc/passwd"))
        self.assertFalse(is_safe_external_url("ftp://example.com"))
        self.assertTrue(is_safe_external_url("https://example.com/article"))

if __name__ == "__main__":
    unittest.main()
