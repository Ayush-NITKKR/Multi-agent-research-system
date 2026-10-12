import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  FileCheck2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Clock,
  Compass,
} from "lucide-react";
import { Header } from "../components/Header";
import { StageStepper } from "../components/StageStepper";
import { researchApi } from "../services/api";

export const ResearchExecution = ({ onMenuClick }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Fetch complete job info initially
  const fetchJob = async () => {
    try {
      const res = await researchApi.getById(id);
      if (res.success && res.job) {
        setJob(res.job);
        if (res.job.status === "completed") {
          // If already completed, user can still see it or view report
        }
      } else {
        setError(res.error || "Research job not found.");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load research job.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  // Elapsed timer
  useEffect(() => {
    if (job?.status === "completed" || job?.status === "failed") return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [job?.status]);

  // Polling for live status
  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;

    const pollInterval = setInterval(async () => {
      try {
        const statusRes = await researchApi.getStatus(id);
        if (statusRes.success) {
          setJob((prev) => ({
            ...prev,
            status: statusRes.status,
            progress: statusRes.progress,
            currentStage: statusRes.currentStage,
            error: statusRes.error,
          }));

          if (statusRes.status === "completed") {
            clearInterval(pollInterval);
            // Re-fetch full job data to load sources and report
            fetchJob();
          } else if (statusRes.status === "failed") {
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [job?.status, id]);

  const handleRetry = async () => {
    try {
      setLoading(true);
      const res = await researchApi.retry(id);
      if (res.success) {
        setJob(res.job);
        setElapsedSeconds(0);
      }
    } catch (err) {
      alert("Failed to retry research job.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <Header onMenuClick={onMenuClick} title="Research Pipeline Tracking" />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
          <Loader2 size={36} className="animate-spin" color="var(--accent-primary)" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="main-content">
        <Header onMenuClick={onMenuClick} title="Pipeline Error" />
        <div className="page-wrapper">
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <AlertTriangle size={48} color="var(--color-danger)" style={{ margin: "0 auto 1rem auto" }} />
            <h3 style={{ fontSize: "1.25rem", color: "#ffffff", marginBottom: "0.5rem" }}>
              Unable to Track Research Job
            </h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              {error || "Record could not be loaded."}
            </p>
            <Link to="/dashboard" className="btn btn-secondary">
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = job.status === "completed";
  const isFailed = job.status === "failed";

  return (
    <div className="main-content">
      <Header
        onMenuClick={onMenuClick}
        title="Live Agent Orchestration"
        subtitle={`Tracking Job ID: ${job._id}`}
      />

      <div className="page-wrapper animate-fade-in">
        {/* Navigation & Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <button
            onClick={() => navigate("/dashboard")}
            className="btn btn-ghost"
            style={{ padding: "0.5rem 0.75rem" }}
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.4rem 0.8rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
              }}
            >
              <Clock size={14} color="var(--accent-primary)" />
              <span>
                Elapsed: <strong>{elapsedSeconds}s</strong>
              </span>
            </div>

            {isCompleted && (
              <button
                onClick={() => navigate(`/research/${job._id}/report`)}
                className="btn btn-primary"
                style={{ padding: "0.5rem 1rem" }}
              >
                <FileCheck2 size={16} />
                <span>View Full Report</span>
              </button>
            )}

            {isFailed && (
              <button
                onClick={handleRetry}
                className="btn btn-secondary"
                style={{ padding: "0.5rem 1rem" }}
              >
                <RotateCcw size={16} />
                <span>Retry Research</span>
              </button>
            )}
          </div>
        </div>

        {/* Topic Title Banner */}
        <div
          className="card"
          style={{
            marginBottom: "2rem",
            background: "linear-gradient(135deg, #101422 0%, #0c0f18 100%)",
            border: "1px solid var(--border-muted)",
          }}
        >
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--accent-primary)", fontWeight: 700, letterSpacing: "0.05em" }}>
            Investigated Topic
          </span>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffffff", marginTop: "0.35rem" }}>
            {job.topic}
          </h2>
        </div>

        {/* Real Stage Stepper */}
        <StageStepper
          status={job.status}
          currentStage={job.currentStage}
          error={job.error}
          progress={job.progress}
        />

        {/* Agent Activity Explanations */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
            marginTop: "1.5rem",
          }}
        >
          <div className="card" style={{ background: "rgba(14, 17, 26, 0.6)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <Compass size={18} color="#818cf8" />
              <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#ffffff" }}>
                1. Tavily Search Agent
              </h4>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Executes targeted search queries to extract credible official documentation, academic
              papers, and contemporary news articles.
            </p>
          </div>

          <div className="card" style={{ background: "rgba(14, 17, 26, 0.6)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <Compass size={18} color="#06b6d4" />
              <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#ffffff" }}>
                2. BeautifulSoup Reader Agent
              </h4>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Selects the top candidate URLs and scrapes the full body text while safely removing
              scripts, navigation headers, and boilerplate.
            </p>
          </div>

          <div className="card" style={{ background: "rgba(14, 17, 26, 0.6)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <Compass size={18} color="#10b981" />
              <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#ffffff" }}>
                3. Synthesis & Fact-Checker
              </h4>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              The Writer chain synthesizes key findings and structured sections, then the Critic
              fact-checks claims and evaluates citation integrity.
            </p>
          </div>
        </div>

        {/* Completion Action Box */}
        {isCompleted && (
          <div
            className="card animate-fade-in"
            style={{
              marginTop: "2rem",
              padding: "2rem",
              textAlign: "center",
              background: "linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(14, 17, 26, 0.8) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "var(--color-success-bg)",
                color: "var(--color-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem auto",
              }}
            >
              <FileCheck2 size={24} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ffffff", marginBottom: "0.5rem" }}>
              Research Complete & Verified
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", maxWidth: "500px", margin: "0 auto 1.5rem auto" }}>
              The research report has been formulated, scrutinized by the fact-checker critic chain,
              and permanently saved to your workspace.
            </p>
            <button
              onClick={() => navigate(`/research/${job._id}/report`)}
              className="btn btn-primary"
              style={{ padding: "0.75rem 1.75rem", fontSize: "0.9375rem" }}
            >
              <FileCheck2 size={18} />
              <span>Open Research Report & Sources</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
