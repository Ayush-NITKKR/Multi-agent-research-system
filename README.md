# ResearchAI - Full-Stack Multi-Agent AI Research Platform

ResearchAI is an autonomous, full-stack multi-agent deep research platform. It leverages an ensemble of AI agents (Tavily search agent, BeautifulSoup reader agent, synthesis writer chain, and fact-checking critic chain) to produce factual, well-cited research dossiers.

---

## 🏛 Architecture

```
+-------------------------------------------------------------+
|               React 18 + Vite Web Application               |
|      - Responsive Dark Mode SaaS UI (Inter / Glassmorphism) |
|      - Live Polling & Stage Stepper (Queued -> Finished)    |
|      - Research History & Metric Cards                      |
|      - Safe Markdown Dossier & Sources Link Viewer          |
|      - Critic Fact-Check & Revision Review Panel            |
+------------------------------+------------------------------+
                               | HTTP + HTTP-Only JWT Cookies
                               v
+-------------------------------------------------------------+
|                Node.js / Express API Gateway                |
|      - User Authentication (bcrypt + JWT + Secure Cookies)  |
|      - User-Specific Job Authorization & CRUD               |
|      - Asynchronous Background Job Runner & Polling Engine  |
|      - Rate Limiting, Helmet Security Headers & CORS        |
|      - MongoDB (Mongoose) Persistence Layer                 |
+------------------------------+------------------------------+
                               | Internal REST (Port 8000)
                               v
+-------------------------------------------------------------+
|            Python FastAPI AI Microservice (api.py)          |
|      - Internal REST endpoints: /internal/research          |
|      - Source parser & Critic verdict extractor             |
|      - Runtime SSRF Protection on Web Scraping              |
|      - Optional multi-pass iterative revision loop          |
+------------------------------+------------------------------+
                               | In-memory invocation
                               v
+-------------------------------------------------------------+
|               Core Multi-Agent Research Logic               |
|      - pipeline.py: run_research_pipeline()                 |
|      - agents.py: build_search_agent, build_reader_agent,   |
|                   writer_chain, critic_chain                |
|      - tools.py: Tavily web_search, BeautifulSoup scrape    |
|      - Mistral AI 3B (ministral-3b-2512)                    |
+-------------------------------------------------------------+
```

---

## 📁 Repository Structure

```
multi-agent/
├── agents.py                 # Core LangChain agents and chains (UNTOUCHED)
├── tools.py                  # Core Tavily search & scraping tools (UNTOUCHED)
├── pipeline.py               # Core orchestrator pipeline (UNTOUCHED)
├── requirement.txt           # Python dependency requirements (UNTOUCHED)
├── research_adapter.py       # Adapter: parses sources, parses critic, SSRF guard
├── api.py                    # FastAPI microservice wrapper
├── tests/
│   └── test_python_service.py# Python service unit and SSRF tests
├── server/                   # Node.js / Express backend
│   ├── package.json
│   ├── src/
│   │   ├── config/           # Database & env config
│   │   ├── controllers/      # authController & researchController
│   │   ├── middleware/       # JWT auth, Zod validation, rateLimiters
│   │   ├── models/           # User & ResearchJob (MongoDB schemas)
│   │   ├── routes/           # authRoutes & researchRoutes
│   │   ├── services/         # pythonClient & async jobRunner
│   │   ├── app.js            # Express app
│   │   └── index.js          # Server entrypoint
│   └── tests/
│       ├── auth.test.js      # Auth & signup/login tests
│       └── research.test.js  # Job CRUD & isolation tests
├── client/                   # React + Vite frontend
│   ├── package.json
│   ├── vite.config.js        # Vite config with API proxy
│   ├── index.html
│   └── src/
│       ├── components/       # Sidebar, Header, MetricsCards, StageStepper, etc.
│       ├── context/          # AuthContext
│       ├── pages/            # Login, Signup, Dashboard, Execution, Report, History
│       ├── services/         # Axios API client
│       └── styles/           # Modern Dark CSS Design System
├── Dockerfile.python         # Python container
├── Dockerfile.server         # Node.js backend container
├── Dockerfile.client         # Frontend container
├── docker-compose.yml        # Multi-container local orchestration
├── .env.example              # Sample environment configuration
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v18+` or `v20+`
- **Python**: `3.10+`, `3.11+`, or `3.13+`
- **MongoDB**: Running locally on `127.0.0.1:27017` or via Docker
- **API Keys**:
  - `MISTRAL_API_KEY`: API key for Mistral AI
  - `TAVILY_API_KEY`: API key for Tavily Web Search

### 2. Environment Setup
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Ensure your `.env` contains valid credentials:
```env
MISTRAL_API_KEY=your_mistral_key
TAVILY_API_KEY=your_tavily_key
MONGO_URI=mongodb://127.0.0.1:27017/research_ai
JWT_SECRET=your_jwt_secret_min_32_characters
```

### 3. Run Locally

#### Step A: Start the Python AI Microservice
```bash
# In the repository root
source .venv/bin/activate  # or create a venv and install -r requirement.txt
python api.py
# Running on http://127.0.0.1:8000
```

#### Step B: Start the Node.js Express Backend
```bash
cd server
npm install
npm run dev
# Running on http://localhost:5001
```

#### Step C: Start the React Frontend
```bash
cd client
npm install
npm run dev
# Running on http://localhost:5173
```
Open **`http://localhost:5173`** in your browser!

---

## 🐳 Running with Docker Compose

Run all 4 services (MongoDB, Python AI Service, Node.js API, React Frontend) in isolated containers:
```bash
docker-compose up --build
```
Access the application at `http://localhost:5173`.

---

## 🔒 Security Features

1. **Strict SSRF Protection**: External URL reader agent queries validate destinations against loopback (`127.0.0.1`, `localhost`), link-local (`169.254.0.0/16`), and private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), disallowing internal network scanning.
2. **User Isolation**: Research records are tied to authenticated `userId`. Users can only read, poll, retry, or delete their own research jobs.
3. **Password Security**: Passwords hashed with `bcryptjs` (salt rounds: 12). Passwords are never returned in queries or responses.
4. **Session Protection**: JWTs delivered in `httpOnly`, `SameSite` cookies with fallback to Bearer header.
5. **Rate Limiting**:
   - Authentication endpoints limited to 30 requests per 15 minutes.
   - Research job creation limited to 20 jobs per 10 minutes.
6. **Input Validation**: Request bodies strictly parsed and sanitized with Zod schemas.

---

## 🧪 Testing

### Node.js Backend Tests
Runs Jest test suites testing user signup, login, session validation, research creation, pagination, and multi-tenant authorization:
```bash
cd server
npm test
```

### Python AI Service Tests
Runs Python unit tests verifying source parsing, critic evaluation extraction, health endpoint, and SSRF prevention:
```bash
python -m unittest tests/test_python_service.py
```
