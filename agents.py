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
        """You are an expert research critic and fact-checker.

Your job is to critically evaluate research reports for:
- Factual accuracy and unsupported claims
- Logical consistency and quality of reasoning
- Missing important information
- Clarity, structure, and readability
- Quality and relevance of sources and citations
- Whether the report addresses the given topic

Be objective, precise, and constructive.
Do not approve a report simply because it sounds convincing.
Do not invent facts or claim to have verified sources
unless you have actually checked them."""
    ),
    (
        "human",
        """Review the following research report.

Report to Review:
{report}

Evaluate the report using these criteria:

1. Factual Accuracy
   Identify claims that appear incorrect, unsupported, or unverifiable.

2. Completeness
   Identify missing key findings or important aspects of the topic.

3. Reasoning
   Check for logical gaps, contradictions, and weak arguments.

4. Sources and Citations
   Check whether claims are supported by the supplied research
   and whether source URLs are included.

5. Structure and Clarity
   Evaluate the introduction, key findings, conclusion,
   and overall readability.

Provide your review in this format:

## Overall Verdict
APPROVED or NEEDS REVISION

## Strengths
List the report's strongest aspects.

## Issues Found
Explain each significant issue with specific examples.

## Missing Information
Describe important details that should be added.

## Source and Citation Issues
Identify missing citations, unsupported claims,
and URLs that require verification.

## Recommended Improvements
Give actionable suggestions to improve the report.

## Final Recommendation
Clearly state whether the report is ready to publish
or should be revised.

Be detailed, evidence-based, and constructive."""
    )
])

critic_chain = critic_prompt | model | paser