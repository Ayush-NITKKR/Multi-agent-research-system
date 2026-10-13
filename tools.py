import os
import socket
import ipaddress
import time
from urllib.parse import urlparse
from urllib.parse import urljoin
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup
from langchain.tools import tool
from tavily import TavilyClient
from rich import print

load_dotenv()

MAX_RESPONSE_BYTES = 1_000_000
MAX_REDIRECTS = 3


def _is_blocked_ip(ip_str: str) -> bool:
    ip = ipaddress.ip_address(ip_str)
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )

def is_safe_external_url(url: str) -> bool:
    """
    Validates that a URL uses http/https and does not resolve to private,
    loopback, link-local, or reserved IP addresses (SSRF Protection).
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

        try:
            literal_ip = ipaddress.ip_address(hostname.strip("[]"))
            if _is_blocked_ip(str(literal_ip)):
                return False
        except ValueError:
            pass

        resolved = socket.getaddrinfo(hostname, None)
        if not resolved:
            return False
        for result in resolved:
            ip_str = result[4][0]
            if _is_blocked_ip(ip_str):
                return False
        return True
    except Exception:
        return False


def _get_with_safe_redirects(url: str, headers: dict) -> requests.Response:
    current_url = url
    for _ in range(MAX_REDIRECTS + 1):
        if not is_safe_external_url(current_url):
            raise ValueError(f"Disallowed URL '{current_url}'. SSRF protection blocked private/local destination or invalid scheme.")

        response = requests.get(
            current_url,
            headers=headers,
            timeout=15,
            allow_redirects=False,
            stream=True,
        )

        if response.is_redirect or response.is_permanent_redirect:
            location = response.headers.get("Location")
            response.close()
            if not location:
                raise ValueError("Redirect response did not include a Location header.")
            current_url = urljoin(current_url, location)
            continue

        chunks = []
        total = 0
        for chunk in response.iter_content(chunk_size=65536, decode_unicode=False):
            if not chunk:
                continue
            total += len(chunk)
            if total > MAX_RESPONSE_BYTES:
                response.close()
                raise ValueError(f"Response exceeded {MAX_RESPONSE_BYTES} byte safety limit.")
            chunks.append(chunk)
        response._content = b"".join(chunks)
        return response

    raise ValueError(f"Too many redirects while fetching '{url}'.")


def get_tavily_client():
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return None
    return TavilyClient(api_key=api_key)


# 1 tool for searching
@tool
def web_search(query: str) -> str:
    """Search the web for recent and reliable information on a topic. Returns Titles, URLs and Snippets."""
    try:
        client = get_tavily_client()
        if not client:
            return "Error: TAVILY_API_KEY is not configured or invalid."

        results = client.search(query=query, max_results=5)
        raw_results = results.get("results", []) if isinstance(results, dict) else []
        if not raw_results:
            return "No search results found for the given query."

        output = []
        for r in raw_results:
            title = r.get("title", "No Title")
            url = r.get("url", "")
            snippet = r.get("content", "")[:300]
            output.append(f"Title:{title}\nURL:{url}\nSnippet:{snippet}\r")
        return "\n---\n".join(output)
    except Exception as e:
        return f"Error executing web search: {str(e)}"


@tool
def scrape_url(url: str) -> str:
    """Scrape and return clean text content from a given URL for deeper reading."""
    print(f"Scraping the {url}")

    # Enforce native SSRF protection
    if not is_safe_external_url(url):
        return f"Error: Disallowed URL '{url}'. SSRF protection blocked private/local destination or invalid scheme."

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    # Bounded retries with short backoff for transient connection errors
    max_attempts = 2
    last_error = None

    for attempt in range(max_attempts):
        try:
            response = _get_with_safe_redirects(url, headers=headers)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Remove unnecessary elements
            for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
                tag.decompose()

            # Extract readable text
            text = soup.get_text(separator=" ", strip=True)

            # Limit output size
            return text[:3000] if text else "No readable text found."

        except requests.RequestException as e:
            last_error = e
            if attempt < max_attempts - 1:
                time.sleep(0.5)
                continue
            return f"Error scraping URL: {str(e)}"
        except Exception as e:
            return f"Unexpected error while scraping: {str(e)}"

    return f"Error scraping URL: {str(last_error)}"


