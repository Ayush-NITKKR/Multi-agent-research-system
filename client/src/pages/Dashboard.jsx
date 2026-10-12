import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  Layers,
  Sparkles,
} from "lucide-react";
import { Header } from "../components/Header";
import { MetricsCards } from "../components/MetricsCards";
import { TopicSubmitForm } from "../components/TopicSubmitForm";
import { researchApi } from "../services/api";

export const Dashboard = ({ onMenuClick }) => {
  const [metrics, setMetrics] = useState({ total: 0, completed: 0, inProgress: 0, failed: 0 });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      const [metricsRes, jobsRes] = await Promise.all([
        researchApi.getMetrics(),
        researchApi.getAll({ limit: 10, status: filterStatus, q: searchQuery }),
      ]);

      if (metricsRes.success) setMetrics(metricsRes.metrics);
      if (jobsRes.success) setJobs(jobsRes.jobs);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filterStatus]);

  // Handle Search submit
  const handleSearch = (e) => {
    e.preventDefault();
    fetchDashboardData();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this research record?")) return;
    try {
      await researchApi.delete(id);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to delete research record.");
    }
  };

  const handleRetry = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await researchApi.retry(id);
      if (res.success) {
        navigate(`/research/${id}`);
      }
    } catch (err) {
      alert("Failed to restart research job.");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return <span className="badge badge-completed">Completed</span>;
      case "failed":
        return <span className="badge badge-failed">Failed</span>;
      case "queued":
        return <span className="badge badge-queued">Queued</span>;
      default:
        return (
          <span className="badge badge-in_progress">
            <span className="status-dot status-dot-pulse" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="main-content">
      <Header
        onMenuClick={onMenuClick}
        title="AI Research Workspace"
        subtitle="Autonomous Multi-Agent Fact Gathering & Report Synthesis"
      />

      <div className="page-wrapper animate-fade-in">
        {/* Metric Cards */}
        <MetricsCards metrics={metrics} loading={loading} />

        {/* Start New Research Form */}
        <TopicSubmitForm onJobCreated={() => fetchDashboardData()} />

        {/* Recent Researches Section */}
        <div style={{ marginTop: "1rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff" }}>
                Recent Research Inquiries
              </h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                Persisted in MongoDB with complete agent reasoning logs
              </p>
            </div>

            {/* Filter and Search */}
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <form onSubmit={handleSearch} style={{ display: "flex", alignItems: "center" }}>
                <div className="input-wrapper" style={{ width: "220px" }}>
                  <Search size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input has-icon"
                    placeholder="Search topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: "0.45rem 0.75rem 0.45rem 2.25rem", fontSize: "0.8125rem" }}
                  />
                </div>
              </form>

              <select
                className="form-input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ width: "140px", padding: "0.45rem 0.75rem", fontSize: "0.8125rem" }}
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="searching">Searching</option>
                <option value="writing">Writing</option>
                <option value="reviewing">Reviewing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Job List / Cards */}
          {jobs.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "3.5rem 1.5rem",
                background: "var(--bg-surface)",
                border: "1px dashed var(--border-muted)",
              }}
            >
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  background: "rgba(99, 102, 241, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.25rem auto",
                  color: "var(--accent-primary)",
                }}
              >
                <Sparkles size={24} />
              </div>
              <h4 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.5rem" }}>
                No Research Records Yet
              </h4>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", maxWidth: "420px", margin: "0 auto" }}>
                Submit any topic above to unleash the Tavily search agent, BeautifulSoup reader agent,
                and critic fact-checker!
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {jobs.map((job) => (
                <div
                  key={job._id}
                  className="card card-interactive"
                  onClick={() => {
                    if (job.status === "completed") {
                      navigate(`/research/${job._id}/report`);
                    } else {
                      navigate(`/research/${job._id}`);
                    }
                  }}
                  style={{
                    padding: "1.25rem 1.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "var(--radius-sm)",
                        background:
                          job.status === "completed"
                            ? "var(--color-success-bg)"
                            : job.status === "failed"
                            ? "var(--color-danger-bg)"
                            : "var(--color-info-bg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color:
                          job.status === "completed"
                            ? "var(--color-success)"
                            : job.status === "failed"
                            ? "var(--color-danger)"
                            : "var(--color-info)",
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={20} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <h4
                        style={{
                          fontSize: "1rem",
                          fontWeight: 600,
                          color: "#ffffff",
                          marginBottom: "0.25rem",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {job.topic}
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        <span>Created: {new Date(job.createdAt).toLocaleDateString()}</span>
                        {job.executionMetadata?.duration_ms > 0 && (
                          <span>
                            Duration: {Math.round(job.executionMetadata.duration_ms / 1000)}s
                          </span>
                        )}
                        <span>Stage: {job.currentStage || job.status}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    {getStatusBadge(job.status)}

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {job.status === "failed" && (
                        <button
                          onClick={(e) => handleRetry(job._id, e)}
                          title="Retry failed research"
                          className="btn btn-secondary"
                          style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem" }}
                        >
                          <RotateCcw size={14} />
                          <span>Retry</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => handleDelete(job._id, e)}
                        title="Delete research"
                        className="btn btn-ghost"
                        style={{ padding: "0.4rem", color: "var(--text-muted)" }}
                        onMouseOver={(e) => (e.currentTarget.style.color = "var(--color-danger)")}
                        onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
