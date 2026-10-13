import re
import json
import time
import logging
import math
from urllib.parse import urlparse
from typing import Dict, List, Any, Optional

from pipeline import run_research_pipeline
from agents import writer_chain, critic_chain
from tools import is_safe_external_url, web_search

logger = logging.getLogger("research_adapter")

# Criterion weights summing to 1.0 (100%)
CRITERIA_WEIGHTS = {
    "factual_accuracy": 0.30,
    "source_quality": 0.25,
    "completeness": 0.20,
    "reasoning": 0.15,
    "clarity": 0.10,
}

def calculate_weighted_score(criteria: Dict[str, Any]) -> float:
    """
    Validates criterion scores and calculates weighted score out of 10.
    Rubric:
    - Factual accuracy and evidence: 30%
    - Source quality and citation support: 25%
    - Completeness: 20%
    - Reasoning and consistency: 15%
    - Clarity and structure: 10%
    """
    if not isinstance(criteria, dict):
        raise ValueError("Criteria must be a dictionary.")

    total = 0.0
    for key, weight in CRITERIA_WEIGHTS.items():
        if key not in criteria:
            raise ValueError(f"Missing required criterion '{key}'.")
        val = criteria[key]
        if isinstance(val, bool) or not isinstance(val, (int, float)):
            raise ValueError(f"Criterion '{key}' value must be numeric, got {type(val).__name__}.")
        if not math.isfinite(float(val)):
            raise ValueError(f"Criterion '{key}' value must be finite.")
        if val < 0.0 or val > 10.0:
            raise ValueError(f"Criterion '{key}' value {val} is outside allowed range [0, 10].")
        total += float(val) * weight

    return round(total, 2)


def extract_domain(url: str) -> str:
    """Extract clean domain name from URL."""
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc or "external-source"
    except Exception:
        return "external-source"


def to_string(content: Any) -> str:
    """
    Safely converts strings, lists of content blocks, or dictionaries
    (such as Mistral/LangChain content block lists) into a clean string.
    """
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                if "text" in item and item["text"]:
                    parts.append(str(item["text"]))
                elif "content" in item and item["content"]:
                    parts.append(str(item["content"]))
                else:
                    parts.append(str(item))
            else:
                parts.append(str(item))
        return "\n".join(parts)
    if isinstance(content, dict):
        if "text" in content:
            return str(content["text"])
        if "content" in content:
            return str(content["content"])
        return str(content)
    return str(content)


def parse_sources(search_result: Any, report_result: Any = "") -> List[Dict[str, str]]:
    """
    Parse structured sources from Tavily output, agent text, and Markdown report.
    Returns deduplicated list of source dictionaries.
    Ignores error messages and invalid schemes.
    """
    search_str = to_string(search_result)
    report_str = to_string(report_result)

    sources: List[Dict[str, str]] = []
    seen_urls = set()

    # 1. Tavily block format: Title:{title}\nURL:{url}\nSnippet:{content}\r\n---\n
    tavily_blocks = search_str.split("---")
    for block in tavily_blocks:
        title_match = re.search(r"Title:\s*(.*?)(?=\nURL:|\Z)", block, re.DOTALL | re.IGNORECASE)
        url_match = re.search(r"URL:\s*(https?://[^\s\r\n\)]+)", block, re.IGNORECASE)
        snippet_match = re.search(r"Snippet:\s*(.*?)(?=\Z)", block, re.DOTALL | re.IGNORECASE)

        if url_match:
            raw_url = url_match.group(1).strip()
            clean_url = re.sub(r"[,\.\)\]\>\'\"]+$", "", raw_url)
            if clean_url not in seen_urls and is_safe_external_url(clean_url):
                seen_urls.add(clean_url)
                title = title_match.group(1).strip() if title_match else extract_domain(clean_url)
                snippet = snippet_match.group(1).strip() if snippet_match else ""
                sources.append({
                    "title": title or extract_domain(clean_url),
                    "url": clean_url,
                    "snippet": snippet or "Referenced research findings.",
                    "domain": extract_domain(clean_url)
                })

    # 2. Markdown links and bare URLs in search text and report
    combined_text = f"{search_str}\n\n{report_str}"
    url_pattern = re.compile(r"\[([^\]]+)\]\((https?://[^\s\)]+)\)|(https?://[^\s\)\],>'\"]+)")
    for match in url_pattern.finditer(combined_text):
        link_title = match.group(1)
        link_url = match.group(2) or match.group(3)
        if link_url:
            clean_url = re.sub(r"[,\.\)\]\>\'\"]+$", "", link_url.strip())
            if clean_url not in seen_urls and is_safe_external_url(clean_url):
                seen_urls.add(clean_url)
                sources.append({
                    "title": (link_title.strip() if link_title else extract_domain(clean_url)),
                    "url": clean_url,
                    "snippet": "Referenced research citation.",
                    "domain": extract_domain(clean_url)
                })

    return sources


def parse_critic_feedback(raw_feedback: Any) -> Dict[str, Any]:
    """
    Safely parses structured critic feedback from JSON, Markdown code fences, or fallback text.
    Recalculates and validates the overall score in application code instead of trusting the LLM.
    Malformed or inconsistent critic output will NEVER approve a report.
    """
    feedback_str = to_string(raw_feedback).strip()
    data = None

    # 1. If already a dictionary
    if isinstance(raw_feedback, dict):
        data = raw_feedback
    else:
        # 2. Extract from Markdown code fence if present (```json ... ``` or ``` ... ```)
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", feedback_str, re.IGNORECASE)
        json_candidate = fence_match.group(1).strip() if fence_match else feedback_str

        # 3. Try parsing JSON candidate
        try:
            data = json.loads(json_candidate)
        except Exception:
            # 4. Attempt regex search for outermost curly braces
            brace_match = re.search(r"(\{[\s\S]*\})", json_candidate)
            if brace_match:
                try:
                    data = json.loads(brace_match.group(1))
                except Exception:
                    data = None

    # Handle structured JSON data
    if isinstance(data, dict):
        raw_criteria = data.get("criteria", {})
        critical_issues_raw = data.get("critical_issues", [])
        if isinstance(critical_issues_raw, list):
            critical_issues = [str(i).strip() for i in critical_issues_raw if str(i).strip()]
        elif isinstance(critical_issues_raw, str) and critical_issues_raw.strip():
            critical_issues = [critical_issues_raw.strip()]
        else:
            critical_issues = []

        # Validate criteria and calculate score in application code
        calculated_score = 0.0
        criteria_valid = False
        try:
            calculated_score = calculate_weighted_score(raw_criteria)
            criteria_valid = True
        except ValueError as ve:
            critical_issues.append(f"Invalid evaluation criteria: {str(ve)}")

        # Normalise criteria dictionary
        normalized_criteria = {}
        for key in CRITERIA_WEIGHTS:
            try:
                normalized_criteria[key] = float(raw_criteria.get(key, 0.0))
            except Exception:
                normalized_criteria[key] = 0.0

        raw_verdict = str(data.get("verdict", "")).strip().upper()
        # Enforce quality gate rules in application code
        if criteria_valid and calculated_score >= 8.0 and len(critical_issues) == 0 and raw_verdict == "APPROVED":
            verdict = "APPROVED"
            next_action = "publish"
        else:
            verdict = "NEEDS REVISION"
            next_action = "revise"

        def clean_list(val: Any) -> List[str]:
            if isinstance(val, list):
                return [str(x).strip() for x in val if str(x).strip()]
            if isinstance(val, str) and val.strip():
                return [val.strip()]
            return []

        return {
            "score": calculated_score if criteria_valid else 0.0,
            "criteria": normalized_criteria,
            "critical_issues": critical_issues,
            "issues": clean_list(data.get("issues")),
            "missing_information": clean_list(data.get("missing_information")),
            "recommendations": clean_list(data.get("recommendations")),
            "verdict": verdict,
            "next_action": next_action,
            "strengths": clean_list(data.get("strengths")),
            "raw_feedback": feedback_str
        }

    # Fallback: Malformed, incomplete, or legacy text output
    # Malformed output must NEVER approve a report.
    def extract_legacy_section(section_name: str, next_sections: List[str]) -> List[str]:
        pattern = rf"##\s*{re.escape(section_name)}[\s\S]*?(?=(?:##\s*(?:{'|'.join(re.escape(s) for s in next_sections)}))|\Z)"
        match = re.search(pattern, feedback_str, re.IGNORECASE)
        items = []
        if match:
            content = match.group(0)
            lines = content.split("\n")[1:]
            for line in lines:
                line_str = line.strip()
                if (line_str.startswith("-") or line_str.startswith("*") or re.match(r"^\d+\.", line_str)) and len(line_str) > 2:
                    clean_item = re.sub(r"^[\-\*\d\.\s]+", "", line_str).strip()
                    if clean_item:
                        items.append(clean_item)
        return items

    strengths = extract_legacy_section("Strengths", ["Issues Found", "Missing Information", "Source and Citation Issues", "Recommended Improvements", "Final Recommendation"])
    issues = extract_legacy_section("Issues Found", ["Missing Information", "Source and Citation Issues", "Recommended Improvements", "Final Recommendation"])
    missing_info = extract_legacy_section("Missing Information", ["Source and Citation Issues", "Recommended Improvements", "Final Recommendation"])
    recommendations = extract_legacy_section("Recommended Improvements", ["Final Recommendation"])

    return {
        "score": 0.0,
        "criteria": {k: 0.0 for k in CRITERIA_WEIGHTS},
        "critical_issues": ["Critic produced malformed or non-JSON output without valid rubric scores."],
        "issues": issues,
        "missing_information": missing_info,
        "recommendations": recommendations,
        "verdict": "NEEDS REVISION",
        "next_action": "revise",
        "strengths": strengths,
        "raw_feedback": feedback_str
    }


def passes_quality_gate(critic_data: Dict[str, Any]) -> bool:
    """
    Enforces quality gate:
    - Validated weighted score is at least 8.0.
    - Zero critical issues.
    - Critic verdict is APPROVED.
    """
    score = critic_data.get("score", 0.0)
    critical_issues = critic_data.get("critical_issues", [])
    verdict = critic_data.get("verdict", "")
    return (
        score >= 8.0
        and len(critical_issues) == 0
        and verdict == "APPROVED"
    )


def execute_research_workflow(topic: str, max_revisions: int = 2, enable_revisions: bool = True) -> Dict[str, Any]:
    """
    Executes the research workflow:
    1. Runs initial research pipeline (search, reader, writer, critic).
    2. Enforces application-level quality gate (score >= 8.0, 0 critical issues, APPROVED).
    3. If quality gate fails, performs up to 2 revisions (capped at min(max_revisions, 2)).
    4. Returns 'completed' only if quality gate passes, else 'needs_rerun'.
    5. Preserves full revision history, critic scores, and sources.
    """
    start_time = time.time()
    logger.info(f"Starting research workflow for topic: '{topic}'")

    # Respect configured max_revisions and cap at 2; if disabled, 0 revisions allowed
    budget = min(max(0, int(max_revisions)), 2) if enable_revisions else 0

    try:
        # Step 1: Run research pipeline for initial draft
        pipeline_state = run_research_pipeline(topic)

        search_result = to_string(pipeline_state.get("search_result", ""))
        scraped_content = to_string(pipeline_state.get("scraped_content", ""))
        report_result = to_string(pipeline_state.get("report_result", ""))
        feedback_result = to_string(pipeline_state.get("feedback_result", ""))

        sources = parse_sources(search_result, report_result)
        critic_data = parse_critic_feedback(feedback_result)

        revision_history: List[Dict[str, Any]] = []
        current_report = report_result
        current_feedback_raw = feedback_result
        current_critic = critic_data
        revision_count = 0

        # Step 2: Quality gate check on initial draft
        if passes_quality_gate(current_critic):
            logger.info(f"Initial draft passed quality gate with score {current_critic['score']}/10.")
            status = "completed"
        else:
            logger.info(
                f"Initial draft did not pass quality gate (Score: {current_critic['score']}/10, "
                f"Issues: {len(current_critic['critical_issues'])}). Revision budget: {budget}."
            )
            status = "needs_rerun"

            if budget > 0:
                for rev_idx in range(1, budget + 1):
                    logger.info(f"Executing revision attempt {rev_idx}/{budget}...")

                    # Targeted follow-up research if critic identified missing information
                    followup_evidence = ""
                    missing_info = current_critic.get("missing_information", [])
                    if missing_info and isinstance(missing_info, list):
                        try:
                            gap_query = f"{topic} " + " ".join(missing_info[:2])
                            gap_query = gap_query[:150]
                            followup_raw = web_search.invoke({"query": gap_query})
                            if followup_raw and not str(followup_raw).startswith("Error"):
                                followup_evidence = f"\n\nFOLLOW-UP RESEARCH ON GAPS:\n{to_string(followup_raw)}"
                        except Exception as search_err:
                            logger.warning(f"Targeted follow-up search failed: {search_err}")

                    base_evidence = f"SEARCH RESULTS:\n{search_result}\n\nSCRAPED CONTENT:\n{scraped_content}"
                    combined_evidence = f"{base_evidence}{followup_evidence}"

                    revised_writer_prompt = (
                        f"ORIGINAL RESEARCH:\n{search_result}\n\n"
                        f"SCRAPED CONTENT:\n{scraped_content}\n"
                        f"{followup_evidence}\n\n"
                        f"PREVIOUS DRAFT:\n{current_report}\n\n"
                        f"CRITIC FEEDBACK & REQUIRED IMPROVEMENTS:\n"
                        f"- Current Score: {current_critic.get('score', 0)}/10\n"
                        f"- Critical Issues to Fix: {', '.join(current_critic.get('critical_issues', [])) or 'None'}\n"
                        f"- Missing Information: {', '.join(current_critic.get('missing_information', [])) or 'None'}\n"
                        f"- Recommendations: {', '.join(current_critic.get('recommendations', [])) or 'None'}\n"
                    )

                    try:
                        new_report_raw = writer_chain.invoke({
                            "topic": topic,
                            "research": revised_writer_prompt
                        })
                        current_report = to_string(new_report_raw)

                        new_feedback_raw = critic_chain.invoke({
                            "topic": topic,
                            "evidence": combined_evidence,
                            "report": current_report
                        })
                        current_feedback_raw = to_string(new_feedback_raw)
                        current_critic = parse_critic_feedback(current_feedback_raw)
                        revision_count += 1
                        revision_history.append({
                            "revision_number": rev_idx,
                            "report": current_report,
                            "critic_feedback": current_feedback_raw,
                            "score": current_critic.get("score", 0.0),
                            "criteria": current_critic.get("criteria", {}),
                            "critical_issues": current_critic.get("critical_issues", []),
                            "verdict": current_critic.get("verdict", "NEEDS REVISION"),
                            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        })

                        if passes_quality_gate(current_critic):
                            logger.info(f"Revision {rev_idx} passed quality gate with score {current_critic['score']}/10!")
                            status = "completed"
                            break
                    except Exception as rev_err:
                        logger.error(f"Error during revision {rev_idx}: {rev_err}")
                        raise RuntimeError(f"Revision {rev_idx} failed: {rev_err}") from rev_err

        duration_ms = int((time.time() - start_time) * 1000)
        # Update sources to include citations in final report
        sources = parse_sources(search_result, current_report)

        return {
            "status": status,
            "topic": topic,
            "report": current_report,
            "sources": sources,
            "critic_feedback": current_critic,
            "revisions": revision_history,
            "search_result_raw": search_result,
            "scraped_content_raw": scraped_content,
            "execution_metadata": {
                "duration_ms": duration_ms,
                "revision_count": revision_count,
                "sources_count": len(sources),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            },
            "requires_user_rerun": (status == "needs_rerun"),
            "error": None
        }

    except Exception as e:
        logger.exception(f"Workflow failed for topic '{topic}': {str(e)}")
        duration_ms = int((time.time() - start_time) * 1000)
        return {
            "status": "failed",
            "topic": topic,
            "report": "",
            "sources": [],
            "critic_feedback": {
                "score": 0.0,
                "criteria": {k: 0.0 for k in CRITERIA_WEIGHTS},
                "critical_issues": [str(e)],
                "issues": [],
                "missing_information": [],
                "recommendations": [],
                "verdict": "NEEDS REVISION",
                "next_action": "revise",
                "strengths": [],
                "raw_feedback": str(e)
            },
            "revisions": [],
            "search_result_raw": "",
            "scraped_content_raw": "",
            "execution_metadata": {
                "duration_ms": duration_ms,
                "revision_count": 0,
                "sources_count": 0,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            },
            "requires_user_rerun": False,
            "error": str(e)
        }
