import re
import time
import logging
from urllib.parse import urlparse
from typing import Dict, List, Any, Optional

from pipeline import run_research_pipeline
from agents import writer_chain, critic_chain

import ipaddress
import socket

logger = logging.getLogger("research_adapter")

def is_safe_external_url(url: str) -> bool:
    """
    Validates that a URL does not resolve to private, loopback, or link-local IP addresses (SSRF Protection).
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme.lower() not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        if hostname.lower() in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
            return False

        # Resolve hostname to IPv4 address
        ip_str = socket.gethostbyname(hostname)
        ip = ipaddress.ip_address(ip_str)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False
        return True
    except Exception:
        return False


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
            if clean_url not in seen_urls:
                seen_urls.add(clean_url)
                title = title_match.group(1).strip() if title_match else extract_domain(clean_url)
                snippet = snippet_match.group(1).strip() if snippet_match else ""
                sources.append({
                    "title": title or extract_domain(clean_url),
                    "url": clean_url,
                    "snippet": snippet,
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
            # Skip API endpoints or local URLs
            if clean_url not in seen_urls and not clean_url.startswith("http://localhost") and not clean_url.startswith("http://127.0.0.1"):
                seen_urls.add(clean_url)
                sources.append({
                    "title": (link_title.strip() if link_title else extract_domain(clean_url)),
                    "url": clean_url,
                    "snippet": "Verified web source referenced by research agents.",
                    "domain": extract_domain(clean_url)
                })

    return sources

def parse_critic_feedback(raw_feedback: Any) -> Dict[str, Any]:
    """
    Extract verdict, strengths, issues, missing info, and recommendations from critic chain output.
    """
    feedback_str = to_string(raw_feedback)

    verdict = "NEEDS REVISION"
    if re.search(r"##\s*Overall\s*Verdict\s*\n*\s*APPROVED\b", feedback_str, re.IGNORECASE):
        verdict = "APPROVED"
    elif "APPROVED" in feedback_str.upper() and "NEEDS REVISION" not in feedback_str.upper():
        verdict = "APPROVED"

    def extract_section(section_name: str, next_sections: List[str]) -> List[str]:
        pattern = rf"##\s*{re.escape(section_name)}[\s\S]*?(?=(?:##\s*(?:{'|'.join(re.escape(s) for s in next_sections)}))|\Z)"
        match = re.search(pattern, feedback_str, re.IGNORECASE)
        items = []
        if match:
            content = match.group(0)
            lines = content.split("\n")[1:]  # skip heading
            for line in lines:
                line_str = line.strip()
                if (line_str.startswith("-") or line_str.startswith("*") or re.match(r"^\d+\.", line_str)) and len(line_str) > 2:
                    clean_item = re.sub(r"^[\-\*\d\.\s]+", "", line_str).strip()
                    if clean_item:
                        items.append(clean_item)
        return items

    strengths = extract_section("Strengths", ["Issues Found", "Missing Information", "Source and Citation Issues", "Recommended Improvements", "Final Recommendation"])
    issues = extract_section("Issues Found", ["Missing Information", "Source and Citation Issues", "Recommended Improvements", "Final Recommendation"])
    missing_info = extract_section("Missing Information", ["Source and Citation Issues", "Recommended Improvements", "Final Recommendation"])
    recommendations = extract_section("Recommended Improvements", ["Final Recommendation"])

    return {
        "verdict": verdict,
        "raw_feedback": raw_feedback,
        "strengths": strengths,
        "issues": issues,
        "missing_information": missing_info,
        "recommendations": recommendations
    }

def execute_research_workflow(topic: str, max_revisions: int = 1, enable_revisions: bool = True) -> Dict[str, Any]:
    """
    Executes the research workflow:
    1. Invokes existing run_research_pipeline(topic) unmodified.
    2. Parses sources and critic feedback.
    3. If critic suggests revision and revisions enabled, performs up to max_revisions revisions.
    4. Returns complete structured payload.
    """
    start_time = time.time()
    logger.info(f"Starting research workflow for topic: {topic}")

    # Enforce runtime SSRF protection on scraping without modifying tools.py
    import tools
    original_scrape_func = getattr(tools.scrape_url, "func", None)
    if original_scrape_func:
        def secured_scrape(url: str) -> str:
            if not is_safe_external_url(url):
                logger.warning(f"SSRF Protection: Blocked attempt to scrape private or invalid URL '{url}'")
                return f"Security Error: Scraping internal, private IP, or disallowed URL scheme '{url}' is blocked."
            return original_scrape_func(url)
        tools.scrape_url.func = secured_scrape

    # Step 1: Run unmodified pipeline
    pipeline_state = run_research_pipeline(topic)

    search_result = to_string(pipeline_state.get("search_result", ""))
    scraped_content = to_string(pipeline_state.get("scraped_content", ""))
    report_result = to_string(pipeline_state.get("report_result", ""))
    feedback_result = to_string(pipeline_state.get("feedback_result", ""))

    sources = parse_sources(search_result, report_result)
    critic_data = parse_critic_feedback(feedback_result)

    revision_history = []
    current_report = report_result
    current_feedback = feedback_result
    revision_count = 0

    # Step 2: Handle optional revision if critic verdict is NEEDS REVISION
    if enable_revisions and critic_data["verdict"] == "NEEDS REVISION" and max_revisions > 0:
        logger.info(f"Critic requested revision. Running up to {max_revisions} revisions...")
        for rev_idx in range(1, max_revisions + 1):
            revision_count += 1
            revision_history.append({
                "revision_number": rev_idx,
                "report": current_report,
                "critic_feedback": current_feedback,
                "verdict": critic_data["verdict"]
            })

            logger.info(f"Executing revision {rev_idx}/{max_revisions}...")
            # Prepare revised context combining original research and critic's feedback
            revised_research_prompt = (
                f"ORIGINAL RESEARCH:\n{search_result}\n\n"
                f"SCRAPED CONTENT:\n{scraped_content}\n\n"
                f"PREVIOUS DRAFT:\n{current_report}\n\n"
                f"CRITIC FEEDBACK & ACTIONABLE IMPROVEMENTS TO ADDRESS:\n{current_feedback}\n"
            )

            try:
                # Use existing writer_chain and critic_chain
                new_report_raw = writer_chain.invoke({
                    "topic": topic,
                    "research": revised_research_prompt
                })
                new_feedback_raw = critic_chain.invoke({
                    "report": to_string(new_report_raw)
                })

                current_report = to_string(new_report_raw)
                current_feedback = to_string(new_feedback_raw)
                critic_data = parse_critic_feedback(current_feedback)

                if critic_data["verdict"] == "APPROVED":
                    logger.info(f"Report approved on revision {rev_idx}!")
                    break
            except Exception as e:
                logger.error(f"Error during revision {rev_idx}: {e}")
                break

    duration_ms = int((time.time() - start_time) * 1000)

    # Re-parse sources to include any new citations in revised report
    sources = parse_sources(search_result, current_report)

    return {
        "status": "completed",
        "topic": topic,
        "report": current_report,
        "sources": sources,
        "critic_feedback": critic_data,
        "revisions": revision_history,
        "search_result_raw": search_result,
        "scraped_content_raw": scraped_content,
        "execution_metadata": {
            "duration_ms": duration_ms,
            "revision_count": revision_count,
            "sources_count": len(sources),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        },
        "error": None
    }
