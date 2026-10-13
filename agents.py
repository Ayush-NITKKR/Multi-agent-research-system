from langchain.agents import create_agent
from langchain_mistralai import ChatMistralAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from tools import web_search , scrape_url
import os
from dotenv import load_dotenv
load_dotenv()

# 1 prompt



# 2 model

model = ChatMistralAI(
    model="ministral-3b-2512", temperature=0
)

# 1 agent


def build_search_agent():
    return create_agent(
        model=model,
        tools=[web_search],
        system_prompt="""
        You are an expert web research search agent.

        Your task is to find accurate, recent, reliable, and relevant
        information about the user's research topic.

        Instructions:

        1. You MUST use the web_search tool to search for information.
        2. Search for credible sources such as official websites,
           research papers, government reports, and reputable publications.
        3. Prefer recent sources when the topic requires current information.
        4. Gather information from multiple sources whenever useful.
        5. Identify the most relevant findings for the research topic.
        6. Include the title, full URL, and key information for each source.
        7. Avoid duplicate URLs, irrelevant pages, and unsupported claims.
        8. Do not invent URLs, search results, facts, or citations.
        9. If the search tool fails or returns insufficient results,
           clearly explain the limitation.
        10. Return structured results that another agent can use
            to scrape the selected webpages.

        Output format:

        ## Research Topic
        State the topic.

        ## Key Findings
        Summarize the most relevant findings from the search results.

        ## Sources
        For each source, provide:
        - Title
        - URL
        - Search snippet
        - Why it is relevant

        ## Research Gaps
        Mention information that still needs further investigation.

        Be factual, concise, and evidence-oriented.
        Never pretend that you have read the full webpage
        when you have only received its search snippet.
        """
    )

# 2 agent

def build_reader_agent():
    return create_agent(
        model=model,
        tools=[scrape_url],
        system_prompt="""
        You are a web research reader agent.

        Your job is to scrape real webpages using the scrape_url tool.

        Rules:
        1. Read the search results provided by the user.
        2. Select the most relevant URL explicitly present in those results.
        3. Call scrape_url with that exact URL.
        4. Use the actual tool output to summarize the webpage.
        5. If scraping fails, report the actual error.
        6. Never invent URLs, research findings, or scraped content.
        7. If no usable URL exists, clearly say so.

        You must attempt to call scrape_url before producing your answer.
        """
    )
# 3 parser (structured output)

paser = StrOutputParser()

# writer chain

writer_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are an expert research writer. Write clear, structured, "
        "and insightful reports."
    ),
    (
        "human",
        """Write a detailed research report on the topic below.

Topic: {topic}

Research Gathered:
{research}

Structure the report as:
- Introduction
- Key Findings (minimum 3 well-explained points)
- Conclusion
- Sources (list all URLs found in the research)

Be detailed, factual, and professional."""
    )
])

writer_chain = writer_prompt | model | paser


# critic chain
critic_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are an expert research critic, fact-checker, and quality evaluation auditor.

Your job is to critically evaluate research reports against the provided research topic and collected evidence.

Evaluate the report using this weighted rubric (scores 0 to 10):
1. Factual accuracy and evidence (30% weight): Are claims factual, accurate, and supported by the collected evidence? Are there unsupported or hallucinated claims?
2. Source quality and citation support (25% weight): Are reputable sources and full URLs cited from the evidence?
3. Completeness (20% weight): Does the report thoroughly address key dimensions of the topic?
4. Reasoning and consistency (15% weight): Is reasoning logically sound, without internal contradictions or leaps?
5. Clarity and structure (10% weight): Is the report well-structured (Introduction, Key Findings, Conclusion, Sources), readable, and professional?

Scoring rules:
- Assign a numeric score between 0 and 10 for each criterion in the "criteria" object:
  - factual_accuracy (0-10)
  - source_quality (0-10)
  - completeness (0-10)
  - reasoning (0-10)
  - clarity (0-10)
- Calculate the overall score out of 10 using the weights:
  score = 0.30 * factual_accuracy + 0.25 * source_quality + 0.20 * completeness + 0.15 * reasoning + 0.10 * clarity
- A report may only receive verdict "APPROVED" and next_action "publish" if the weighted score is at least 8.0 AND critical_issues is completely empty ([]).
- If the score is below 8.0, or there are any critical factual errors, unverified claims, or missing essential sections, verdict MUST be "NEEDS REVISION", next_action MUST be "revise", and the blocking flaws must be listed in "critical_issues".

You MUST return valid JSON adhering strictly to this schema:
{{
  "score": 8.4,
  "criteria": {{
    "factual_accuracy": 8,
    "source_quality": 9,
    "completeness": 8,
    "reasoning": 9,
    "clarity": 8
  }},
  "critical_issues": [],
  "issues": [],
  "missing_information": [],
  "recommendations": [],
  "verdict": "APPROVED",
  "next_action": "publish"
}}

Output ONLY the JSON object without markdown fences or extraneous text."""
    ),
    (
        "human",
        """Evaluate the following research report against the topic and collected evidence.

Topic:
{topic}

Collected Evidence & Research:
{evidence}

Report to Evaluate:
{report}
"""
    )
])

critic_chain = critic_prompt | model | paser