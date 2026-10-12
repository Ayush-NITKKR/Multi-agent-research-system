from langchain.tools import tool
import requests
from bs4 import BeautifulSoup # for web scrpaing
from tavily import TavilyClient
import os
from dotenv import load_dotenv
load_dotenv()
from rich import print

tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

# 1 tool for searching
@tool
def web_search(query : str) -> str:
    """ Search the web for recent and reliable information on a topic . Returns Titles , URLs and Snippets """

    results = tavily.search(query=query , max_results=5)
    print(results)

    output = []

    for r in results["results"]:
        output.append(
            f"Title:{r['title']}\nURL:{r['url']}\nSnippet:{r['content'][:300]}\r"
        )
    return "\n---\n".join(output)


@tool
def scrape_url(url: str) -> str:
    """Scrape and return clean text content from a given URL for deeper reading."""
    print(f"Scrapping the {url}")
    try:
        headers = {
            "User-Agent": "Mozilla/5.0"
        }

        response = requests.get(
            url,
            headers=headers,
            timeout=15
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Remove unnecessary elements
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        # Extract readable text
        text = soup.get_text(separator=" ", strip=True)

        # Limit output size
        return text[:3000] if text else "No readable text found."

    except requests.RequestException as e:
        return f"Error scraping URL: {str(e)}"
    except Exception as e:
        return f"Unexpected error: {str(e)}"

