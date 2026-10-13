import json
import math
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from api import app, JOBS_STORE
from research_adapter import (
    parse_sources,
    parse_critic_feedback,
    extract_domain,
    execute_research_workflow,
    calculate_weighted_score,
    passes_quality_gate,
    CRITERIA_WEIGHTS,
)
from tools import is_safe_external_url, web_search, scrape_url, _get_with_safe_redirects
import requests

client = TestClient(app)


class TestPythonService(unittest.TestCase):

    def setUp(self):
        JOBS_STORE.clear()
        mock_tool = MagicMock()
        mock_tool.invoke.return_value = "Title: Mocked Search\nURL: https://mock.org\nSnippet: Mocked Snippet\r"
        search_patcher = patch("research_adapter.web_search", mock_tool)
        self.mock_web_search = search_patcher.start()
        self.addCleanup(search_patcher.stop)

    # 1. Valid critic JSON parsing
    def test_valid_critic_json_parsing(self):
        valid_json = json.dumps({
            "score": 8.4,
            "criteria": {
                "factual_accuracy": 8,
                "source_quality": 9,
                "completeness": 8,
                "reasoning": 9,
                "clarity": 8
            },
            "critical_issues": [],
            "issues": ["Minor formatting tweak"],
            "missing_information": [],
            "recommendations": ["Add more historical context"],
            "verdict": "APPROVED",
            "next_action": "publish"
        })
        parsed = parse_critic_feedback(valid_json)
        self.assertEqual(parsed["verdict"], "APPROVED")
        self.assertEqual(parsed["next_action"], "publish")
        self.assertEqual(parsed["score"], 8.4)
        self.assertEqual(len(parsed["critical_issues"]), 0)
        self.assertEqual(parsed["criteria"]["factual_accuracy"], 8.0)
        self.assertEqual(parsed["criteria"]["source_quality"], 9.0)
        self.assertIn("Minor formatting tweak", parsed["issues"])

    # 2. Markdown-fenced JSON parsing
    def test_markdown_fenced_json_parsing(self):
        fenced_input = """Here is my evaluation:
```json
{
  "score": 8.7,
  "criteria": {
    "factual_accuracy": 9,
    "source_quality": 9,
    "completeness": 8,
    "reasoning": 9,
    "clarity": 8
  },
  "critical_issues": [],
  "issues": [],
  "missing_information": [],
  "recommendations": [],
  "verdict": "APPROVED",
  "next_action": "publish"
}
```
"""
        parsed = parse_critic_feedback(fenced_input)
        self.assertEqual(parsed["verdict"], "APPROVED")
        self.assertEqual(parsed["score"], 8.7)
        self.assertEqual(len(parsed["critical_issues"]), 0)

    # 3. Missing or malformed critic output
    def test_missing_or_malformed_critic_output(self):
        malformed_inputs = [
            "",
            "This is just random text with no JSON at all.",
            "{invalid json string: true,",
            None,
        ]
        for bad_input in malformed_inputs:
            parsed = parse_critic_feedback(bad_input)
            self.assertEqual(parsed["verdict"], "NEEDS REVISION", f"Failed for input: {bad_input}")
            self.assertEqual(parsed["score"], 0.0)
            self.assertGreater(len(parsed["critical_issues"]), 0)
            self.assertEqual(parsed["next_action"], "revise")

    # 4. Invalid criterion values
    def test_invalid_criterion_values(self):
        # Value > 10
        out_of_range_high = json.dumps({
            "criteria": {
                "factual_accuracy": 15,
                "source_quality": 8,
                "completeness": 8,
                "reasoning": 8,
                "clarity": 8
            },
            "critical_issues": [],
            "verdict": "APPROVED"
        })
        parsed_high = parse_critic_feedback(out_of_range_high)
        self.assertEqual(parsed_high["verdict"], "NEEDS REVISION")
        self.assertEqual(parsed_high["score"], 0.0)
        self.assertTrue(any("Invalid evaluation criteria" in err for err in parsed_high["critical_issues"]))

        # Non-numeric value
        non_numeric = json.dumps({
            "criteria": {
                "factual_accuracy": "excellent",
                "source_quality": 8,
                "completeness": 8,
                "reasoning": 8,
                "clarity": 8
            },
            "critical_issues": [],
            "verdict": "APPROVED"
        })
        parsed_str = parse_critic_feedback(non_numeric)
        self.assertEqual(parsed_str["verdict"], "NEEDS REVISION")
        self.assertEqual(parsed_str["score"], 0.0)

        # Missing a required criterion
        missing_crit = json.dumps({
            "criteria": {
                "factual_accuracy": 9,
                "source_quality": 9,
                # completeness missing
                "reasoning": 9,
                "clarity": 9
            },
            "critical_issues": [],
            "verdict": "APPROVED"
        })
        parsed_missing = parse_critic_feedback(missing_crit)
        self.assertEqual(parsed_missing["verdict"], "NEEDS REVISION")
        self.assertEqual(parsed_missing["score"], 0.0)

    def test_non_finite_criterion_values_are_rejected(self):
        for bad_value in [math.nan, math.inf, -math.inf]:
            criteria = {
                "factual_accuracy": 8,
                "source_quality": 8,
                "completeness": 8,
                "reasoning": 8,
                "clarity": 8,
            }
            criteria["clarity"] = bad_value
            with self.assertRaises(ValueError):
                calculate_weighted_score(criteria)

            parsed = parse_critic_feedback({
                "criteria": criteria,
                "critical_issues": [],
                "verdict": "APPROVED"
            })
            self.assertEqual(parsed["verdict"], "NEEDS REVISION")
            self.assertEqual(parsed["score"], 0.0)
            self.assertTrue(any("finite" in issue for issue in parsed["critical_issues"]))

    # 5. Weighted score calculation
    def test_weighted_score_calculation(self):
        criteria = {
            "factual_accuracy": 10.0,  # 10 * 0.30 = 3.0
            "source_quality": 8.0,    # 8 * 0.25 = 2.0
            "completeness": 7.0,      # 7 * 0.20 = 1.4
            "reasoning": 6.0,         # 6 * 0.15 = 0.9
            "clarity": 5.0            # 5 * 0.10 = 0.5
        }
        # Expected: 3.0 + 2.0 + 1.4 + 0.9 + 0.5 = 7.8
        score = calculate_weighted_score(criteria)
        self.assertAlmostEqual(score, 7.8, places=2)

        # Application recalculation overrides hallucinated LLM score
        spoofed_payload = json.dumps({
            "score": 9.9, # Fake score from LLM
            "criteria": criteria,
            "critical_issues": [],
            "verdict": "APPROVED"
        })
        parsed = parse_critic_feedback(spoofed_payload)
        self.assertEqual(parsed["score"], 7.8)  # Recalculated to 7.8!
        self.assertEqual(parsed["verdict"], "NEEDS REVISION") # Below 8.0 gate

    # 6. Score 8 or above with no critical issues
    def test_score_8_or_above_with_no_critical_issues(self):
        criteria = {
            "factual_accuracy": 9,
            "source_quality": 8,
            "completeness": 8,
            "reasoning": 8,
            "clarity": 8
        }
        # 0.3*9 + 0.25*8 + 0.2*8 + 0.15*8 + 0.1*8 = 2.7 + 2.0 + 1.6 + 1.2 + 0.8 = 8.3
        payload = json.dumps({
            "score": 8.3,
            "criteria": criteria,
            "critical_issues": [],
            "verdict": "APPROVED"
        })
        parsed = parse_critic_feedback(payload)
        self.assertEqual(parsed["score"], 8.3)
        self.assertEqual(parsed["verdict"], "APPROVED")
        self.assertEqual(parsed["next_action"], "publish")
        self.assertTrue(passes_quality_gate(parsed))

    def test_quality_gate_exact_score_boundaries(self):
        cases = [
            (7.99, "NEEDS REVISION", False),
            (8.0, "APPROVED", True),
            (10.0, "APPROVED", True),
        ]
        for score_value, expected_verdict, expected_gate in cases:
            with self.subTest(score=score_value):
                payload = json.dumps({
                    "criteria": {
                        "factual_accuracy": score_value,
                        "source_quality": score_value,
                        "completeness": score_value,
                        "reasoning": score_value,
                        "clarity": score_value,
                    },
                    "critical_issues": [],
                    "verdict": "APPROVED",
                })
                parsed = parse_critic_feedback(payload)
                self.assertEqual(parsed["score"], score_value)
                self.assertEqual(parsed["verdict"], expected_verdict)
                self.assertEqual(passes_quality_gate(parsed), expected_gate)

    def test_high_score_with_non_approved_verdict_fails_quality_gate(self):
        payload = json.dumps({
            "criteria": {
                "factual_accuracy": 10,
                "source_quality": 10,
                "completeness": 10,
                "reasoning": 10,
                "clarity": 10,
            },
            "critical_issues": [],
            "verdict": "NEEDS REVISION",
        })
        parsed = parse_critic_feedback(payload)
        self.assertEqual(parsed["score"], 10.0)
        self.assertEqual(parsed["verdict"], "NEEDS REVISION")
        self.assertFalse(passes_quality_gate(parsed))

    # 7. Score below 8
    def test_score_below_8_fails_quality_gate(self):
        criteria = {
            "factual_accuracy": 7,
            "source_quality": 7,
            "completeness": 7,
            "reasoning": 7,
            "clarity": 7
        }
        # Score = 7.0
        payload = json.dumps({
            "criteria": criteria,
            "critical_issues": [],
            "verdict": "APPROVED" # LLM tried to approve but score is 7.0
        })
        parsed = parse_critic_feedback(payload)
        self.assertEqual(parsed["score"], 7.0)
        self.assertEqual(parsed["verdict"], "NEEDS REVISION") # Overridden by app quality gate!
        self.assertFalse(passes_quality_gate(parsed))

    # 8. Score above 8 with a critical issue
    def test_score_above_8_with_critical_issue_fails_quality_gate(self):
        criteria = {
            "factual_accuracy": 10,
            "source_quality": 9,
            "completeness": 9,
            "reasoning": 9,
            "clarity": 9
        }
        # Score = 0.3*10 + 0.25*9 + 0.2*9 + 0.15*9 + 0.1*9 = 3.0 + 2.25 + 1.8 + 1.35 + 0.9 = 9.3
        payload = json.dumps({
            "criteria": criteria,
            "critical_issues": ["Contains unverified financial claim about revenue."],
            "verdict": "APPROVED" # LLM tried to approve
        })
        parsed = parse_critic_feedback(payload)
        self.assertEqual(parsed["score"], 9.3)
        self.assertEqual(parsed["verdict"], "NEEDS REVISION")
        self.assertFalse(passes_quality_gate(parsed))

    # 9. Revision succeeds and the final report is approved
    @patch("research_adapter.run_research_pipeline")
    @patch("research_adapter.writer_chain")
    @patch("research_adapter.critic_chain")
    def test_revision_succeeds_and_report_approved(self, mock_critic, mock_writer, mock_pipeline):
        # Initial run produces a failing draft
        mock_pipeline.return_value = {
            "search_result": "Title: Renewable Energy\nURL: https://example.com/energy\nSnippet: Wind power.\n---",
            "scraped_content": "Deep content on wind turbines.",
            "report_result": "Initial draft on energy",
            "feedback_result": json.dumps({
                "criteria": {"factual_accuracy": 6, "source_quality": 6, "completeness": 6, "reasoning": 6, "clarity": 6},
                "critical_issues": ["Needs more detail on solar."],
                "verdict": "NEEDS REVISION"
            })
        }
        # Revision 1 generates improved report and passes
        mock_writer.invoke.return_value = "Improved draft with solar energy"
        mock_critic.invoke.return_value = json.dumps({
            "criteria": {"factual_accuracy": 9, "source_quality": 9, "completeness": 8, "reasoning": 9, "clarity": 8},
            "critical_issues": [],
            "verdict": "APPROVED"
        })

        result = execute_research_workflow("Renewable Energy", max_revisions=2, enable_revisions=True)

        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["requires_user_rerun"], False)
        self.assertEqual(result["report"], "Improved draft with solar energy")
        self.assertEqual(len(result["revisions"]), 1)
        self.assertEqual(result["revisions"][0]["revision_number"], 1)
        self.assertEqual(result["critic_feedback"]["verdict"], "APPROVED")

    # 10. Revision budget is exhausted and the result becomes needs_rerun
    @patch("research_adapter.run_research_pipeline")
    @patch("research_adapter.writer_chain")
    @patch("research_adapter.critic_chain")
    def test_revision_budget_exhausted_results_in_needs_rerun(self, mock_critic, mock_writer, mock_pipeline):
        failing_feedback = json.dumps({
            "criteria": {"factual_accuracy": 5, "source_quality": 5, "completeness": 5, "reasoning": 5, "clarity": 5},
            "critical_issues": ["Severe inaccuracies present."],
            "verdict": "NEEDS REVISION"
        })
        mock_pipeline.return_value = {
            "search_result": "Title: Quantum\nURL: https://quantum.org\nSnippet: Qubits\n---",
            "scraped_content": "Quantum content",
            "report_result": "Draft 0",
            "feedback_result": failing_feedback
        }
        mock_writer.invoke.return_value = "Draft still poor"
        mock_critic.invoke.return_value = failing_feedback

        # Allow max 2 revisions
        result = execute_research_workflow("Quantum Computing", max_revisions=2, enable_revisions=True)

        self.assertEqual(result["status"], "needs_rerun")
        self.assertEqual(result["requires_user_rerun"], True)
        self.assertEqual(len(result["revisions"]), 2)
        self.assertEqual(result["critic_feedback"]["verdict"], "NEEDS REVISION")

    # 11. Zero revisions when revisions are disabled
    @patch("research_adapter.run_research_pipeline")
    @patch("research_adapter.writer_chain")
    def test_zero_revisions_when_disabled(self, mock_writer, mock_pipeline):
        failing_feedback = json.dumps({
            "criteria": {"factual_accuracy": 6, "source_quality": 6, "completeness": 6, "reasoning": 6, "clarity": 6},
            "critical_issues": ["Insufficient citations"],
            "verdict": "NEEDS REVISION"
        })
        mock_pipeline.return_value = {
            "search_result": "Title: AI\nURL: https://ai.org\nSnippet: Agents\n---",
            "scraped_content": "Agent content",
            "report_result": "Initial unrevised draft",
            "feedback_result": failing_feedback
        }

        result = execute_research_workflow("AI Agents", max_revisions=2, enable_revisions=False)

        self.assertEqual(result["status"], "needs_rerun")
        self.assertEqual(len(result["revisions"]), 0)
        mock_writer.invoke.assert_not_called()

    # 12. Revision history contains the revised report and critic feedback
    @patch("research_adapter.run_research_pipeline")
    @patch("research_adapter.writer_chain")
    @patch("research_adapter.critic_chain")
    def test_revision_history_recorded_completely(self, mock_critic, mock_writer, mock_pipeline):
        mock_pipeline.return_value = {
            "search_result": "Title: Biotech\nURL: https://bio.org\nSnippet: RNA\n---",
            "scraped_content": "Bio content",
            "report_result": "Draft 1",
            "feedback_result": json.dumps({
                "criteria": {"factual_accuracy": 7, "source_quality": 7, "completeness": 7, "reasoning": 7, "clarity": 7},
                "critical_issues": [],
                "verdict": "NEEDS REVISION"
            })
        }
        mock_writer.invoke.return_value = "Draft 2 (improved)"
        mock_critic.invoke.return_value = json.dumps({
            "criteria": {"factual_accuracy": 9, "source_quality": 9, "completeness": 8, "reasoning": 9, "clarity": 8},
            "critical_issues": [],
            "verdict": "APPROVED"
        })

        result = execute_research_workflow("Biotechnology", max_revisions=1, enable_revisions=True)
        self.assertEqual(result["status"], "completed")
        self.assertEqual(len(result["revisions"]), 1)
        rev0 = result["revisions"][0]
        self.assertEqual(rev0["revision_number"], 1)
        self.assertEqual(rev0["report"], "Draft 2 (improved)")
        self.assertEqual(rev0["score"], 8.7)
        self.assertEqual(rev0["verdict"], "APPROVED")
        self.assertIn("timestamp", rev0)
        self.assertEqual(result["report"], "Draft 2 (improved)")

    @patch("research_adapter.run_research_pipeline")
    @patch("research_adapter.writer_chain")
    def test_revision_writer_failure_returns_failed(self, mock_writer, mock_pipeline):
        mock_pipeline.return_value = {
            "search_result": "Title: Robotics\nURL: https://robotics.org\nSnippet: Bots\n---",
            "scraped_content": "Robotics content",
            "report_result": "Draft needs work",
            "feedback_result": json.dumps({
                "criteria": {"factual_accuracy": 6, "source_quality": 6, "completeness": 6, "reasoning": 6, "clarity": 6},
                "critical_issues": ["Missing citations"],
                "verdict": "NEEDS REVISION"
            })
        }
        mock_writer.invoke.side_effect = RuntimeError("LLM writer timeout")

        result = execute_research_workflow("Robotics", max_revisions=1, enable_revisions=True)
        self.assertEqual(result["status"], "failed")
        self.assertIn("Revision 1 failed", result["error"])

    # 13. Search, writer, or critic failures are handled safely
    @patch("research_adapter.run_research_pipeline")
    def test_workflow_exception_handling(self, mock_pipeline):
        mock_pipeline.side_effect = RuntimeError("Tavily service unreachable")

        result = execute_research_workflow("Resilience Test")
        self.assertEqual(result["status"], "failed")
        self.assertIn("Tavily service unreachable", result["error"])
        self.assertEqual(result["requires_user_rerun"], False)

    # 14. API responses preserve the correct status
    @patch("api.execute_research_workflow")
    def test_api_responses_preserve_correct_status(self, mock_workflow):
        # Case A: Quality gate passed
        mock_workflow.return_value = {
            "status": "completed",
            "topic": "Autonomous Driving",
            "report": "Approved report",
            "sources": [],
            "critic_feedback": {
                "score": 8.5,
                "criteria": {"factual_accuracy": 9, "source_quality": 8, "completeness": 8, "reasoning": 9, "clarity": 8},
                "critical_issues": [],
                "issues": [],
                "missing_information": [],
                "recommendations": [],
                "verdict": "APPROVED",
                "next_action": "publish",
                "strengths": [],
                "raw_feedback": "{}"
            },
            "revisions": [],
            "execution_metadata": {"duration_ms": 100},
            "requires_user_rerun": False,
            "error": None
        }

        res_completed = client.post("/internal/research", json={"topic": "Autonomous Driving"})
        self.assertEqual(res_completed.status_code, 200)
        data_completed = res_completed.json()
        self.assertEqual(data_completed["status"], "completed")
        self.assertEqual(data_completed["requires_user_rerun"], False)
        self.assertEqual(data_completed["critic_feedback"]["score"], 8.5)

        # Case B: Quality gate failed, needs rerun
        mock_workflow.return_value = {
            "status": "needs_rerun",
            "topic": "Nuclear Fusion",
            "report": "Underwhelming draft",
            "sources": [],
            "critic_feedback": {
                "score": 6.8,
                "criteria": {"factual_accuracy": 7, "source_quality": 6, "completeness": 7, "reasoning": 7, "clarity": 7},
                "critical_issues": ["Missing recent 2026 reactor benchmarks."],
                "issues": [],
                "missing_information": ["Reactor data"],
                "recommendations": ["Re-run research with targeted query"],
                "verdict": "NEEDS REVISION",
                "next_action": "revise",
                "strengths": [],
                "raw_feedback": "{}"
            },
            "revisions": [],
            "execution_metadata": {"duration_ms": 150},
            "requires_user_rerun": True,
            "error": None
        }

        res_rerun = client.post("/internal/research", json={"topic": "Nuclear Fusion"})
        self.assertEqual(res_rerun.status_code, 200)
        data_rerun = res_rerun.json()
        self.assertEqual(data_rerun["status"], "needs_rerun")
        self.assertEqual(data_rerun["requires_user_rerun"], True)
        self.assertEqual(data_rerun["critic_feedback"]["score"], 6.8)
        self.assertIn("Missing recent 2026 reactor benchmarks.", data_rerun["critic_feedback"]["critical_issues"])

    # Domain extraction and source parsing tests
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

    def test_parse_sources_excludes_unsafe_urls(self):
        sample_search = """Title: Local Admin
URL: http://127.0.0.1:8080/admin
Snippet: Should not be retained.
---
Title: IPv6 Local
URL: http://[::1]/secret
Snippet: Should not be retained.
---
Title: Example
URL: https://example.com/research
Snippet: Public page.
"""
        sources = parse_sources(sample_search, "")
        urls = [s["url"] for s in sources]
        self.assertEqual(urls, ["https://example.com/research"])

    def test_ssrf_blocking(self):
        self.assertFalse(is_safe_external_url("http://127.0.0.1/admin"))
        self.assertFalse(is_safe_external_url("http://localhost:8080/secret"))
        self.assertFalse(is_safe_external_url("http://[::1]/secret"))
        self.assertFalse(is_safe_external_url("http://169.254.169.254/latest/meta-data"))
        self.assertFalse(is_safe_external_url("file:///etc/passwd"))
        self.assertFalse(is_safe_external_url("ftp://example.com"))
        self.assertTrue(is_safe_external_url("https://example.com/article"))

    @patch("tools.get_tavily_client")
    def test_web_search_external_api_failure_returns_error(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.search.side_effect = RuntimeError("Tavily timeout")
        mock_get_client.return_value = mock_client

        result = web_search.invoke({"query": "external API failure topic"})
        self.assertIn("Error executing web search", result)
        self.assertIn("Tavily timeout", result)

    @patch("tools.requests.get")
    def test_scraper_timeout_failure_returns_error(self, mock_get):
        mock_get.side_effect = requests.Timeout("read timed out")

        result = scrape_url.invoke({"url": "https://example.com/slow"})
        self.assertIn("Error scraping URL", result)
        self.assertIn("read timed out", result)
        self.assertEqual(mock_get.call_count, 2)

    @patch("tools.requests.get")
    def test_redirect_to_unsafe_destination_is_blocked_without_fetching_target(self, mock_get):
        redirect_response = MagicMock()
        redirect_response.is_redirect = True
        redirect_response.is_permanent_redirect = False
        redirect_response.headers = {"Location": "http://127.0.0.1/admin"}
        redirect_response.close.return_value = None
        mock_get.return_value = redirect_response

        with self.assertRaises(ValueError) as ctx:
            _get_with_safe_redirects("https://example.com/redirect", headers={})

        self.assertIn("Disallowed URL", str(ctx.exception))
        self.assertEqual(mock_get.call_count, 1)

    @patch("research_adapter.run_research_pipeline")
    @patch("research_adapter.writer_chain")
    @patch("research_adapter.critic_chain")
    def test_revision_critic_failure_returns_failed(self, mock_critic, mock_writer, mock_pipeline):
        mock_pipeline.return_value = {
            "search_result": "Title: Climate\nURL: https://climate.example/report\nSnippet: baseline\n---",
            "scraped_content": "Baseline climate content",
            "report_result": "Draft needing critic revision",
            "feedback_result": json.dumps({
                "criteria": {"factual_accuracy": 6, "source_quality": 6, "completeness": 6, "reasoning": 6, "clarity": 6},
                "critical_issues": ["Insufficient evidence"],
                "verdict": "NEEDS REVISION",
            }),
        }
        mock_writer.invoke.return_value = "Revised draft"
        mock_critic.invoke.side_effect = RuntimeError("critic LLM timeout")

        result = execute_research_workflow("Climate risk", max_revisions=1, enable_revisions=True)
        self.assertEqual(result["status"], "failed")
        self.assertIn("critic LLM timeout", result["error"])
        self.assertFalse(result["requires_user_rerun"])

    @patch("research_adapter.run_research_pipeline")
    def test_generalizes_across_different_topics_with_mocked_evidence(self, mock_pipeline):
        approved_feedback = json.dumps({
            "criteria": {"factual_accuracy": 8, "source_quality": 8, "completeness": 8, "reasoning": 8, "clarity": 8},
            "critical_issues": [],
            "verdict": "APPROVED",
        })
        topics = ["marine biodiversity monitoring", "semiconductor supply chain resilience"]
        for topic in topics:
            with self.subTest(topic=topic):
                mock_pipeline.return_value = {
                    "search_result": f"Title: Source for {topic}\nURL: https://example.com/{topic.replace(' ', '-')}\nSnippet: Evidence\n---",
                    "scraped_content": f"Detailed evidence for {topic}",
                    "report_result": f"Approved report on {topic}",
                    "feedback_result": approved_feedback,
                }
                result = execute_research_workflow(topic, max_revisions=0, enable_revisions=False)
                self.assertEqual(result["status"], "completed")
                self.assertIn(topic, result["report"])
                self.assertEqual(result["critic_feedback"]["score"], 8.0)

    @patch("research_adapter.run_research_pipeline")
    def test_insufficient_and_conflicting_evidence_returns_needs_rerun(self, mock_pipeline):
        mock_pipeline.return_value = {
            "search_result": (
                "Title: Source A\nURL: https://example.com/a\nSnippet: Claim X is true.\n---\n"
                "Title: Source B\nURL: https://example.org/b\nSnippet: Claim X is false.\n---"
            ),
            "scraped_content": "Collected sources conflict and do not resolve the central claim.",
            "report_result": "Draft cannot resolve conflicting sources.",
            "feedback_result": json.dumps({
                "criteria": {"factual_accuracy": 5, "source_quality": 6, "completeness": 5, "reasoning": 5, "clarity": 7},
                "critical_issues": ["Conflicting sources are not reconciled"],
                "missing_information": ["primary source adjudication"],
                "verdict": "NEEDS REVISION",
            }),
        }

        result = execute_research_workflow("conflicting evidence topic", max_revisions=0, enable_revisions=False)
        self.assertEqual(result["status"], "needs_rerun")
        self.assertTrue(result["requires_user_rerun"])
        self.assertNotEqual(result["status"], "completed")
        self.assertIn("Conflicting sources", result["critic_feedback"]["critical_issues"][0])

    def test_health_endpoint(self):
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")


if __name__ == "__main__":
    unittest.main()
