# ResearchAI Assessment Report

Date: 2026-10-13

## 1. Executive Summary

ResearchAI is a full-stack autonomous research application with a React frontend, Express/MongoDB gateway, FastAPI Python service, and LangChain/Mistral research pipeline. I audited the implementation by tracing the actual flow from topic submission through job persistence, Python execution, critic evaluation, revision handling, and frontend rendering.

The final implementation demonstrates the eight assessment criteria at a minimum high-quality submission level, with important caveats: live LLM and Tavily integrations were not smoke-tested in this environment, and the critic remains a heuristic quality gate rather than proof of factual truth. Mocked unit and integration tests verify the deterministic scoring, status propagation, revision behavior, rerun authorization, and frontend production build.

## 2. Project Objective and Actual Capabilities

ResearchAI accepts a research topic, queues a user-owned job, runs a Python research workflow, generates a report, evaluates the report with a structured critic rubric, performs up to two bounded revisions, and stores either a `completed`, `needs_rerun`, or `failed` terminal result. The UI displays the report, collected sources, research summary, execution summary, critic breakdown, critical issues, recommendations, and revision history.

Actual verified capabilities:

- Authenticated users can create, list, view, delete, and rerun their own research jobs.
- The Node job runner persists progress and terminal status to MongoDB.
- The Python service recalculates critic scores in application code.
- Malformed, missing, non-numeric, non-finite, or out-of-range critic scores cannot approve a report.
- Revisions are bounded to at most two attempts and record the revised draft, score, criteria, verdict, issues, and timestamp.
- `needs_rerun` is distinct from `failed`.
- SSRF guards block local/private/link-local/reserved addresses, validate redirect destinations, and enforce request timeouts and response size limits.

## 3. Architecture and Request Lifecycle

1. React submits a topic through `client/src/services/api.js` to `POST /api/research`.
2. Express validates the payload in `server/src/controllers/researchController.js` and authenticates through `server/src/middleware/auth.js`.
3. A `ResearchJob` document is created in `server/src/models/ResearchJob.js`.
4. `server/src/services/jobRunner.js` starts background execution and calls `server/src/services/pythonClient.js`.
5. `api.py` receives `POST /internal/research` and calls `execute_research_workflow` in `research_adapter.py`.
6. `pipeline.py` invokes the search agent, reader agent, writer chain, and critic chain defined in `agents.py`.
7. `research_adapter.py` parses the critic output, recalculates the score, applies the quality gate, optionally revises, and returns a terminal result.
8. `jobRunner.js` persists report, sources, critic feedback, revision history, execution metadata, and final status.
9. React polling and report pages render persisted state in `ResearchExecution.jsx`, `ReportViewer.jsx`, `ResearchSummaryCard.jsx`, `ExecutionSummaryCard.jsx`, and `CriticFeedbackCard.jsx`.

## 4. Initial Assessment Matrix

| Criterion | Initial Status | Evidence Inspected | Principal Gaps Found | Fix / Verification |
|---|---|---|---|---|
| Autonomy | PARTIAL | `pipeline.py`, `agents.py`, `research_adapter.py` | Revision loop existed, but revision history recorded pre-revision drafts and default budget was inconsistent. | Defaulted to two revisions, recorded revised drafts, tested pass and exhaustion. |
| Execution | PARTIAL | `jobRunner.js`, `pythonClient.js`, `api.py` | Python result statuses needed careful propagation; revision failures could be reduced to a nonterminal quality rejection. | Preserved `failed`, `needs_rerun`, `completed`; tested Node propagation. |
| Reliability | PARTIAL | `tools.py`, `researchController.js`, tests | Non-finite critic scores were accepted; retry could reset active jobs; redirect and response-size SSRF cases were incomplete. | Added finite validation, retry eligibility, redirect validation, byte cap, tests. |
| Verification | PARTIAL | `research_adapter.py`, `agents.py`, Python tests | Score recalculation existed but lacked non-finite coverage. | Added finite validation and tests for invalid/malformed gates. |
| Generalization | UNVERIFIED | Python mocked tests | No live multi-topic smoke test without credentials; mocked topics covered multiple domains and insufficient evidence. | Documented limitation; deterministic tests use varied topics. |
| Engineering Quality | PARTIAL | Full backend/Python/UI structure | Logic mostly separated, but status/default mismatches and revision schema gaps remained. | Added schema fields and aligned defaults/statuses. |
| Product Thinking | PARTIAL | React pages/components | UI had good surfaces but some labels overstated verification. | Changed labels to collected sources/quality gate, build verified. |
| Technical Understanding | PARTIAL | Code, tests, docs | README overstated some live guarantees and examples. | Updated README and this report with evidence-based claims. |

## 5. Final Criterion-by-Criterion Assessment

### 1. Autonomy: PASS

Evidence:

- Search/reader/writer/critic flow: `pipeline.py`, `agents.py`.
- Quality-gated orchestration and follow-up search on missing information: `research_adapter.py` lines 290-420.
- Bounded revision budget and terminal decision: `research_adapter.py` lines 302-420.
- Tests: `test_revision_succeeds_and_report_approved`, `test_revision_budget_exhausted_results_in_needs_rerun`, `test_zero_revisions_when_disabled`.

Limit: Live external search/LLM behavior was not verified here.

### 2. Execution: PASS

Evidence:

- Node job runner executes Python service and stores results: `server/src/services/jobRunner.js` lines 73-155.
- Python API returns actual statuses, report, sources, feedback, revisions, metadata: `api.py`.
- Tests: `server/tests/jobRunner.test.js`, `test_api_responses_preserve_correct_status`.

### 3. Reliability: PASS

Evidence:

- Valid states in `ResearchJob.js`; duplicate in-progress job prevention in `researchController.js`.
- Active job in-memory duplicate guard and timer cleanup in `jobRunner.js`.
- Retry restricted to terminal jobs: `researchController.js` lines 242-248.
- Timeouts, bounded retries, redirect checks, and size limit in `tools.py`.
- Tests: Python failure/revision tests and Node rerun/status tests.

Limit: In-memory duplicate protection is per Node process, not distributed.

### 4. Verification: PASS

Evidence:

- Weights and deterministic score formula in `research_adapter.py` lines 15-50.
- Gate requires score >= 8.0, zero critical issues, and `APPROVED`: `research_adapter.py` lines 280-287.
- Malformed JSON and invalid criteria fail closed: `parse_critic_feedback`.
- Tests cover threshold approval, low score, critical issues, non-approved verdict, malformed JSON, missing/non-numeric/non-finite/out-of-range criteria.

Limit: The critic score is a heuristic; it does not independently prove factual correctness.

### 5. Generalization: PARTIAL

Evidence:

- Topic input is generic and not hard-coded: `api.py`, `researchController.js`.
- Mocked tests cover renewable energy, quantum computing, biotechnology, robotics, autonomous driving, nuclear fusion, AI agents, and insufficient evidence/failure cases.

Reason for PARTIAL:

- No live multi-topic smoke tests were run with real Tavily/Mistral credentials in this environment.

### 6. Engineering Quality: PASS

Evidence:

- Clear service boundaries: React, Express, FastAPI, Python pipeline.
- Scoring logic centralized in `research_adapter.py`.
- Rerun authorization and ownership are in controller tests.
- No unnecessary new infrastructure or dependencies were added.
- Tests and build passed.

### 7. Product Thinking: PASS

Evidence:

- Research submission and history: `Dashboard.jsx`, `TopicSubmitForm.jsx`, `History.jsx`.
- Live status: `ResearchExecution.jsx`, `StageStepper.jsx`.
- Final report, sources, critic, research summary, execution summary: `ReportViewer.jsx`, `ResearchSummaryCard.jsx`, `ExecutionSummaryCard.jsx`, `CriticFeedbackCard.jsx`.
- Rerun action: `researchController.js`, React retry handlers.
- Frontend production build passed.

### 8. Technical Understanding: PASS

Evidence:

- README now documents actual architecture, quality gate, commands, and known limitations.
- This report distinguishes mocked tests from live integrations and avoids claiming unverified external behavior.

## 6. Defects Found and Fixes Implemented

- Accepted non-finite critic values: fixed with `math.isfinite` validation in `research_adapter.py`.
- Incomplete revision history semantics: revision history now records actual revised drafts and critic results with timestamps.
- Revision execution failures could be treated like ordinary quality rejection: revision writer/critic exceptions now return `failed`.
- Default revision budget mismatch: Python API, adapter, and Node client/runner now default to two revisions.
- Rerun reset for active jobs: controller now rejects rerun for nonterminal jobs with HTTP 409.
- SSRF limitations: URL safety now checks IPv4/IPv6 DNS answers, literal IPs, redirects, and response size.
- UI overclaiming: labels changed from verified sources/research to collected sources and quality-gate language.

## 7. Tests Run and Actual Results

Passed:

- `.venv/bin/python -m unittest tests/test_python_service.py -v`
  - Result: 21 tests passed.
- `.venv/bin/python -m unittest tests/test_python_service.py -q && .venv/bin/python -m py_compile api.py agents.py pipeline.py research_adapter.py tools.py`
  - Result: 21 tests passed and Python files compiled.
- `npm test -- --runInBand` from `server/`
  - Result: 3 suites passed, 20 tests passed.
- `npm run build` from `client/`
  - Result: Vite production build succeeded.

Attempted but not run:

- `python -m pytest -q tests/test_python_service.py`
  - Result: failed during collection because the system Python lacked `langchain`.
- `.venv/bin/python -m pytest -q tests/test_python_service.py`
  - Result: failed because `pytest` is not installed in `.venv`.
  - Fallback used: stdlib `unittest`, which successfully ran the test file.

## 8. Live Integrations Verified Versus Mocked

Mocked or local:

- LLM, search, writer, critic, and failure paths in Python unit tests.
- Python service API with FastAPI `TestClient`.
- Node job runner and research API behavior with mocked Python service and local MongoDB.
- React production build.

Not live-verified:

- Real Mistral LLM calls.
- Real Tavily search calls.
- Real end-to-end browser submission from React through Node to Python with external credentials.

Reason: live API credentials and an explicit live smoke-test environment were not available/used during this audit.

## 9. Successful Execution Walkthrough

1. User submits a topic in the React UI.
2. Express creates a queued MongoDB job for that authenticated user.
3. `jobRunner` marks the job as searching and calls Python.
4. Python runs search, reader, writer, and critic.
5. Critic returns structured scores.
6. `research_adapter.py` recalculates the weighted score.
7. If score is at least 8.0, critical issues are empty, and verdict is `APPROVED`, Python returns `completed`.
8. Node persists the report, sources, critic feedback, revision metadata, elapsed time, and `completed`.
9. React displays report, summaries, sources, critic breakdown, and execution summary.

## 10. Failed or Quality-Gate-Rejected Walkthrough

Quality rejection:

1. Initial draft receives a low score, critical issue, or non-approved verdict.
2. Python performs up to two revisions if enabled.
3. If no draft passes, Python returns `needs_rerun` with the final draft and critic feedback.
4. Node persists `needs_rerun`, not `completed`.
5. React shows the draft, critic issues, execution summary, and rerun action.

Execution failure:

1. Search, writer, critic, or revision execution raises an exception.
2. Python returns `failed` with an error.
3. Node persists `failed` and preserves a useful error message.
4. React displays the failure state and retry action.

## 11. Known Limitations and Remaining Risks

- Live factual accuracy depends on Mistral and Tavily behavior and was not smoke-tested here.
- SSRF protection is proportionate and tested for key local/private/link-local cases, but network security should also be enforced at infrastructure egress boundaries.
- Node duplicate execution protection is process-local; multiple Node instances would need a database-level lease or lock.
- The frontend research summary is heuristic extraction from the final report and sources, not a second LLM summarization.
- The pipeline scrapes selected pages, but access-controlled, paywalled, JavaScript-heavy, or blocked pages may produce weak evidence.

## 12. Run Instructions

Python:

```bash
cd /Users/ayushtiwari/Desktop/multi-agent
source .venv/bin/activate
pip install -r requirement.txt
python api.py
```

Node:

```bash
cd /Users/ayushtiwari/Desktop/multi-agent/server
npm install
npm run dev
```

Client:

```bash
cd /Users/ayushtiwari/Desktop/multi-agent/client
npm install
npm run dev
```

Tests:

```bash
cd /Users/ayushtiwari/Desktop/multi-agent
.venv/bin/python -m unittest tests/test_python_service.py -v

cd /Users/ayushtiwari/Desktop/multi-agent/server
npm test -- --runInBand

cd /Users/ayushtiwari/Desktop/multi-agent/client
npm run build
```

## 13. Final Scorecard

| Criterion | Final Status |
|---|---|
| Autonomy | PASS |
| Execution | PASS |
| Reliability | PASS |
| Verification | PASS |
| Generalization | PARTIAL |
| Engineering Quality | PASS |
| Product Thinking | PASS |
| Technical Understanding | PASS |

Final assessment: ResearchAI convincingly demonstrates the assessment criteria for a minimum high-quality submission, with the main remaining uncertainty being unverified live external integration behavior across multiple real topics.
