# ResearchAI - Autonomous Multi-Agent Deep Research Platform

ResearchAI is a full-stack, AI-powered research platform that takes an inquiry topic, coordinates a multi-agent Python research workflow, evaluates the generated report with a deterministic quality gate, persists execution records and state transitions in MongoDB, and presents the report alongside separate Research and Execution summaries in a responsive React UI.

---

## 🏛 Architecture Overview

ResearchAI employs a decoupled 3-tier microservice architecture:

```text
+--------------------------------------------------------------------------+
|                       React 18 + Vite Frontend                           |
|  - Real-time pipeline execution tracking with stage stepper              |
|  - Distinct Research Summary (Key findings, conclusions, evidence, limits)|
|  - Distinct Execution Summary (Audit trail, stages, scores, gate reason) |
|  - Structured Critic Score card & 5-criterion rubric progress bars       |
|  - Revision history inspector & 1-click Rerun Research trigger           |
+------------------------------------+-------------------------------------+
                                     | HTTP + HTTP-Only JWT Cookie
                                     v
+--------------------------------------------------------------------------+
|                     Node.js / Express API Gateway                        |
|  - User Authentication (bcrypt + JWT + secure cookies)                   |
|  - User-specific job authorization, rate limiting & Zod input validation |
|  - Background Job Runner (jobRunner.js) with state machine transitions   |
|  - MongoDB (Mongoose) persistence layer                                  |
+------------------------------------+-------------------------------------+
                                     | Internal REST (Port 8000)
                                     v
+--------------------------------------------------------------------------+
|                  Python FastAPI Microservice (api.py)                    |
|  - Endpoints: POST /internal/research, GET /health, status check         |
|  - Research Adapter (research_adapter.py) with application quality gate  |
|  - Bounded iterative revision loop (max 2) with targeted follow-up search|
|  - SSRF protection, bounded network retries, and timeout enforcement     |
+------------------------------------+-------------------------------------+
                                     | In-process Execution
                                     v
+--------------------------------------------------------------------------+
|                     LangChain Multi-Agent Logic                          |
|  - agents.py: Search agent, Reader agent, Writer chain, Critic chain     |
|  - tools.py: Tavily web_search, BeautifulSoup scrape_url with SSRF guard |
|  - pipeline.py: Base orchestrator pipeline                               |
+--------------------------------------------------------------------------+
```

### Key Workflow Components
- **`agents.py`**: Prompt templates and agent builders for search, reading, writing, and structured critic evaluations.
- **`pipeline.py`**: Base linear search $\to$ read $\to$ write $\to$ critic orchestration.
- **`research_adapter.py`**: Recalculates weighted rubric scores, enforces the 3-part quality gate, coordinates bounded revisions, and gathers targeted evidence.
- **`tools.py`**: Tavily web search and BeautifulSoup scraper with native SSRF checks, redirect validation, and bounded retries.
- **`api.py`**: FastAPI microservice exposing sync and background research routes.
- **`server/src/services/jobRunner.js`**: Background queue execution, timer cleanup, and state synchronization.
- **`server/src/models/ResearchJob.js`**: MongoDB schema storing status, reports, critic rubrics, revisions, and execution metadata.
- **`client/src/pages/ReportViewer.jsx`**: Report inspection interface hosting independent Research and Execution summary views.
- **`client/src/pages/ResearchExecution.jsx`**: Live tracking stepper and terminal action triggers (`completed` / `needs_rerun` / `failed`).

---

## 🛠 Setup & Run Instructions

### 1. Prerequisites
- **Node.js**: `v18+` or `v20+`
- **Python**: `3.10+`, `3.11+`, or `3.13+`
- **MongoDB**: Local instance running on `127.0.0.1:27017` or via Docker

### 2. Environment Configuration
Create a `.env` file in the project root:

```bash
# LLM & Search API Keys
MISTRAL_API_KEY=your_mistral_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
MISTRAL_MODEL=ministral-3b-2512

# Python AI Service
PYTHON_SERVICE_HOST=0.0.0.0
PYTHON_SERVICE_PORT=8000
PYTHON_SERVICE_URL=http://localhost:8000

# Node.js Server
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/research_ai
JWT_SECRET=replace_with_a_long_random_secret_min_32_chars
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# Frontend Vite
VITE_API_URL=http://localhost:5001/api
```

### 3. Starting the Services

Open 3 terminal windows to run the stack:

#### Terminal 1: Python FastAPI Service
```bash
cd /Users/ayushtiwari/Desktop/multi-agent
source .venv/bin/activate
pip install -r requirement.txt
python api.py
# Listening on http://127.0.0.1:8000
```

#### Terminal 2: Node.js Express Server
```bash
cd /Users/ayushtiwari/Desktop/multi-agent/server
npm install
npm run dev
# Listening on http://localhost:5001
```

#### Terminal 3: React Frontend Client
```bash
cd /Users/ayushtiwari/Desktop/multi-agent/client
npm install
npm run dev
# Listening on http://localhost:5173
```

Open **`http://localhost:5173`** in your browser.

---

## 🧪 Test Execution

The automated test suite runs with fully mocked external APIs, requiring no live internet or paid credits:

```bash
# 1. Run Python Unit Tests
cd /Users/ayushtiwari/Desktop/multi-agent
.venv/bin/python -m unittest tests/test_python_service.py -v
# Result: 18 passed (0.02s)

# 2. Run Node.js Jest Tests
cd /Users/ayushtiwari/Desktop/multi-agent/server
npm test -- --runInBand
# Result: 3 suites passed, 17 tests passed

# 3. Verify Frontend Client Build
cd /Users/ayushtiwari/Desktop/multi-agent/client
npm run build
# Result: Vite production build succeeded
```

---

## 💡 Important Technical & Design Decisions

### 1. Application-Calculated Critic Rubric (Zero Trust in LLM Arithmetic)
The critic agent returns structured JSON evaluating five weighted criteria out of 10:
- **Factual accuracy and evidence**: 30%
- **Source quality and citation support**: 25%
- **Completeness**: 20%
- **Reasoning and consistency**: 15%
- **Clarity and structure**: 10%

Rather than trusting the model's self-reported score, `research_adapter.py` programmatically parses each criterion, validates numeric ranges $[0, 10]$, strips accidental markdown code fences, and recalculates the weighted sum in code. Malformed, non-numeric, or missing criteria fail closed.

### 2. Strict Application Quality Gate
A report is granted `completed` status if and only if **all three** conditions pass:
1. Recalculated weighted score is $\ge 8.0 / 10$
2. Critical issues list is empty (`len(critical_issues) == 0`)
3. Critic verdict is explicitly `"APPROVED"`

If any condition fails, the draft is rejected.

### 3. Bounded Iterative Revisions & `needs_rerun` State
When a draft fails the quality gate:
- The system allows a maximum of **2 automatic revision attempts** (`max_revisions`).
- Targeted follow-up research is initiated using Tavily if specific evidence gaps are cited.
- If the revision budget is exhausted and the report still fails the quality gate, the workflow terminates with status **`needs_rerun`** (never falsely marked `completed`).
- Complete revision history (drafts, intermediate scores, and critique) is preserved.

### 4. Native SSRF Protection Without Global Monkey Patching
External web scraping in `tools.py` validates URLs natively before network dispatch:
- Rejects non-HTTP schemes (`file://`, `ftp://`).
- Blocks loopback (`127.0.0.1`, `localhost`), link-local / cloud metadata (`169.254.169.254`), and RFC 1918 private IPv4/IPv6 ranges.
- Enforces DNS checks across both IPv4 and IPv6, verifies redirect destinations, caps responses at 1 MB, and bounds retries to 2 attempts with a 15-second timeout.

### 5. Separation of Research Summary and Execution Summary in the UI
The UI intentionally separates two distinct summaries:
- **Research Summary** ([`ResearchSummaryCard.jsx`](file:///Users/ayushtiwari/Desktop/multi-agent/client/src/components/ResearchSummaryCard.jsx)): Summarizes the **content** of the final report (Key Findings, Conclusions, Evidence, and Limitations) and auto-regenerates whenever the report updates.
- **Execution Summary** ([`ExecutionSummaryCard.jsx`](file:///Users/ayushtiwari/Desktop/multi-agent/client/src/components/ExecutionSummaryCard.jsx)): Audits **what the system did** (sources collected, stages completed/failed, critic rubric breakdown, revisions executed, total runtime, and quality gate rationale).

---

## 📦 Models, APIs, Frameworks & Dependencies Used

| Category | Component | Purpose |
| :--- | :--- | :--- |
| **LLM Provider** | Mistral AI (`ministral-3b-2512`) | Powers Search Agent, Reader Agent, Writer Chain, and Critic Chain via `langchain-mistralai` |
| **Search API** | Tavily Search API | Performs targeted, query-based web searches via `tavily-python` |
| **Scraper** | Requests + BeautifulSoup4 | Fetches and cleans body text from external websites |
| **Agent Framework**| LangChain (`0.3+`) | Orchestrates chains, prompts (`ChatPromptTemplate`), and structured tools |
| **Python Service** | FastAPI + Uvicorn | Exposes high-performance internal REST endpoints with Pydantic request/response schemas |
| **Backend API** | Node.js + Express (ESM) | API Gateway handling authentication, rate limiting, and job orchestration |
| **Database** | MongoDB + Mongoose | Persists user accounts, research jobs, critic breakdowns, and revision histories |
| **Security** | bcryptjs + jsonwebtoken | Secure password hashing (12 salt rounds) and HTTP-only JWT cookies |
| **Validation** | Zod (Node.js) & Pydantic (Python) | Strict request/response input sanitization and schema enforcement |
| **Frontend** | React 18 + Vite | Single-page application with responsive dark-mode styling and Lucide icons |
| **Markdown** | React-Markdown + Remark-GFM | Renders synthesized research dossiers safely in the browser |

---

## ⚠️ Known Limitations

1. **Static HTML Scraping**: The scraper uses `requests` + `BeautifulSoup4`. Single-page applications requiring heavy client-side JavaScript execution or paywalled content cannot be fully parsed.
2. **Context Window Bounds**: The synthesis writer operates within Mistral 3B context limits; extremely broad topics with voluminous scraped data require aggressive summarization.
3. **Process-Local Job Concurrency**: The Express background runner executes jobs asynchronously in-process. In a distributed multi-node deployment, an external Redis queue (e.g., BullMQ) or distributed lock should be added.
4. **Third-Party Quotas**: Live search is bounded by Tavily API rate limits (1,000 monthly searches on free tier).

---

## 🔮 What to Build Next (Future Roadmap)

If given additional time, the following enhancements would be prioritized:
1. **Headless Browser Scraping (Playwright)**: Add headless browser support with readability filters to capture dynamic, JavaScript-rendered web applications safely.
2. **Streaming Progress via WebSockets/SSE**: Stream section-by-section draft generation and live critic thoughts directly to the UI rather than polling.
3. **Human-in-the-Loop Discretionary Override**: Allow users to review a `needs_rerun` draft, modify specific critique criteria, or provide supplemental manual evidence before triggering a rerun.
4. **Distributed Task Queue**: Extract `jobRunner.js` into BullMQ with Redis backing to support horizontal scaling, job deduplication, and worker crash recovery.
5. **Vector Memory & Source Deduplication**: Implement Chroma/Qdrant embeddings to index scraped passages, preventing duplicate web queries across related research jobs.

---

## 📌 Assumptions Made

1. **Assessment Isolation**: Unit and integration test suites should run offline without consuming live Mistral or Tavily credits; external LLM and search calls are fully mocked in tests.
2. **Quality Gate Threshold**: A minimum score of 8.0 out of 10 and 0 critical issues is the definitive standard for an automated pass; anything below represents insufficient reliability.
3. **Revision Budgeting**: Capping automated revisions at 2 strikes the ideal balance between output refinement and avoiding infinite generation loops or runaway API token consumption.
4. **Private Network Boundaries**: Development runs locally on `localhost` (`127.0.0.1:8000`, `5001`, `5173`); internal microservice communication is unauthenticated behind the Express gateway.


DEMO VIDEO link : [https://drive.google.com/file/d/1Q29MJy1BViTALB7mkxNmIyBEXsQfP4ko/view?usp=sharing](https://drive.google.com/file/d/1VwecQEV89foAl7Cx8zKirUQ127ksrM66/view?usp=sharing)
