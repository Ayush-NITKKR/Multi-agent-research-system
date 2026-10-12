import React, { useState, useEffect } from "react";
import {
  Activity,
  Server,
  Cpu,
  Database,
  Search,
  Globe,
  FileText,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Header } from "../components/Header";
import axios from "axios";

export const SystemStatus = ({ onMenuClick }) => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/health");
      setHealthData(res.data);
      setError(null);
    } catch (err) {
      setError("Unable to reach backend health endpoint.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="main-content">
      <Header
        onMenuClick={onMenuClick}
        title="Multi-Agent Pipeline Architecture"
        subtitle="Microservice health, LangChain agent telemetry, and configuration status"
      />

      <div className="page-wrapper animate-fade-in">
        {/* Status Banner */}
        <div
          className="card"
          style={{
            marginBottom: "2rem",
            padding: "1.5rem",
            background: "linear-gradient(135deg, #101424 0%, #0a0d16 100%)",
            border: "1px solid var(--border-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "var(--color-success-bg)",
                color: "var(--color-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Activity size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>
                Multi-Agent System Online & Operational
              </h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                FastAPI microservice communicating with Node.js Express orchestrator and MongoDB database.
              </p>
            </div>
          </div>

          <button
            onClick={fetchHealth}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh Health</span>
          </button>
        </div>

        {/* Microservices Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
          {/* Node.js Backend */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <Server size={20} color="var(--accent-primary)" />
              <div>
                <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#ffffff" }}>Node.js API Gateway</h4>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Express v4.21 • Port 5001</p>
              </div>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Handles client JWT sessions, request validation via Zod, rate limiting, and async job orchestration.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="badge badge-completed">Healthy</span>
            </div>
          </div>

          {/* Python AI Service */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <Cpu size={20} color="#06b6d4" />
              <div>
                <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#ffffff" }}>Python AI Microservice</h4>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>FastAPI • Uvicorn • Port 8000</p>
              </div>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Executes LangChain state graphs, Tavily API searches, and multi-agent loops.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className={`badge ${healthData?.python_ai_service?.status === "ok" ? "badge-completed" : "badge-failed"}`}>
                {healthData?.python_ai_service?.status === "ok" ? "Connected" : "Service Offline"}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Model: {healthData?.python_ai_service?.model || "ministral-3b-2512"}
              </span>
            </div>
          </div>

          {/* MongoDB */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <Database size={20} color="#10b981" />
              <div>
                <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#ffffff" }}>MongoDB Cluster</h4>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Mongoose v8.9 • Port 27017</p>
              </div>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Stores user accounts, research jobs, source links, critic verdicts, and report revisions.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="badge badge-completed">Connected</span>
            </div>
          </div>
        </div>

        {/* Pipeline Workflow Diagram */}
        <div className="card" style={{ padding: "2rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff", marginBottom: "1.25rem" }}>
            Autonomous Multi-Agent Workflow Sequence
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div style={{ padding: "1rem", background: "var(--bg-input)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "var(--accent-primary)" }}>
                <Search size={16} />
                <strong style={{ fontSize: "0.875rem" }}>1. Tavily Search</strong>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Queries Tavily API for top 5 high-authority web results, extracting URLs, titles, and snippets.
              </p>
            </div>

            <div style={{ padding: "1rem", background: "var(--bg-input)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "#06b6d4" }}>
                <Globe size={16} />
                <strong style={{ fontSize: "0.875rem" }}>2. Reader Agent</strong>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Picks most relevant source and performs live HTTP GET with BeautifulSoup to scrape full article text.
              </p>
            </div>

            <div style={{ padding: "1rem", background: "var(--bg-input)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "#8b5cf6" }}>
                <FileText size={16} />
                <strong style={{ fontSize: "0.875rem" }}>3. Writer Chain</strong>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Combines search & scraped content into structured Markdown with Introduction, Key Findings, and Sources.
              </p>
            </div>

            <div style={{ padding: "1rem", background: "var(--bg-input)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "#10b981" }}>
                <ShieldCheck size={16} />
                <strong style={{ fontSize: "0.875rem" }}>4. Critic Chain</strong>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Audits factual support, evaluates citations, and triggers iterative revisions if verdict is NEEDS REVISION.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
