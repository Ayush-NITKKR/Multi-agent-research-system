import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  RotateCcw,
  Trash2,
  FileText,
  Globe,
  ShieldCheck,
  Code,
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Header } from "../components/Header";
import { MarkdownViewer } from "../components/MarkdownViewer";
import { SourcesList } from "../components/SourcesList";
import { CriticFeedbackCard } from "../components/CriticFeedbackCard";
import { researchApi } from "../services/api";

export const ReportViewer = ({ onMenuClick }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("report"); // report | sources | critic | raw
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedUrls, setCopiedUrls] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await researchApi.getById(id);
        if (res.success && res.job) {
          setJob(res.job);
        } else {
          setError(res.error || "Report not found.");
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message || "Failed to load report.");
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const handleCopyReport = () => {
    if (!job?.report) return;
    navigator.clipboard.writeText(job.report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const handleCopyUrls = () => {
    if (!job?.sources?.length) return;
    const urls = job.sources.map((s) => s.url).join("\n");
    navigator.clipboard.writeText(urls);
    setCopiedUrls(true);
    setTimeout(() => setCopiedUrls(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!job?.report) return;
    const element = document.createElement("a");
    const file = new Blob([job.report], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    const cleanFilename = job.topic.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
    element.download = `${cleanFilename}_research_report.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this research report?")) return;
    try {
      await researchApi.delete(id);
      navigate("/dashboard");
    } catch (err) {
      alert("Failed to delete report.");
    }
  };

  const handleRetry = async () => {
    try {
      const res = await researchApi.retry(id);
      if (res.success) {
        navigate(`/research/${id}`);
      }
    } catch (err) {
      alert("Failed to restart research.");
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <Header onMenuClick={onMenuClick} title="Research Report" />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
          <Loader2 size={36} className="animate-spin" color="var(--accent-primary)" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="main-content">
        <Header onMenuClick={onMenuClick} title="Report Not Found" />
        <div className="page-wrapper">
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              {error || "Report record could not be loaded."}
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

  // Word count estimate
  const wordCount = job.report ? job.report.split(/\s+/).filter(Boolean).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="main-content">
      <Header
        onMenuClick={onMenuClick}
        title="Synthesized Research Dossier"
        subtitle={`Topic: ${job.topic}`}
      />

      <div className="page-wrapper animate-fade-in">
        {/* Top Action Bar */}
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
          <button onClick={() => navigate("/dashboard")} className="btn btn-ghost" style={{ padding: "0.5rem" }}>
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={handleCopyReport} className="btn btn-secondary" style={{ padding: "0.45rem 0.85rem", fontSize: "0.8125rem" }}>
              {copiedReport ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
              <span>{copiedReport ? "Report Copied" : "Copy Report"}</span>
            </button>

            <button onClick={handleCopyUrls} className="btn btn-secondary" style={{ padding: "0.45rem 0.85rem", fontSize: "0.8125rem" }}>
              {copiedUrls ? <Check size={14} color="var(--color-success)" /> : <ExternalLink size={14} />}
              <span>{copiedUrls ? "URLs Copied" : "Copy URLs"}</span>
            </button>

            <button onClick={handleDownloadMarkdown} className="btn btn-secondary" style={{ padding: "0.45rem 0.85rem", fontSize: "0.8125rem" }}>
              <Download size={14} />
              <span>Download .md</span>
            </button>

            <button onClick={handleRetry} className="btn btn-secondary" style={{ padding: "0.45rem 0.85rem", fontSize: "0.8125rem" }}>
              <RotateCcw size={14} />
              <span>Re-run</span>
            </button>

            <button onClick={handleDelete} className="btn btn-danger" style={{ padding: "0.45rem 0.85rem", fontSize: "0.8125rem" }}>
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Hero Title & Metadata Card */}
        <div
          className="card"
          style={{
            marginBottom: "2rem",
            background: "linear-gradient(135deg, #131728 0%, #0c0f18 100%)",
            border: "1px solid var(--border-muted)",
            padding: "2rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <span className="badge badge-completed">Verified Research</span>
            {job.criticFeedback?.verdict && (
              <span className={`badge ${job.criticFeedback.verdict === "APPROVED" ? "badge-approved" : "badge-needs-revision"}`}>
                Critic: {job.criticFeedback.verdict}
              </span>
            )}
          </div>

          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
              marginBottom: "1rem",
            }}
          >
            {job.topic}
          </h1>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              fontSize: "0.8125rem",
              color: "var(--text-muted)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Calendar size={14} />
              <span>{new Date(job.createdAt).toLocaleDateString()}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Clock size={14} />
              <span>{readingTime} min read (~{wordCount} words)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Globe size={14} />
              <span>{job.sources?.length || 0} Sources Checked</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: "1.5rem",
          }}
        >
          <button
            onClick={() => setActiveTab("report")}
            style={{
              padding: "0.75rem 1.25rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "report" ? "2px solid var(--accent-primary)" : "2px solid transparent",
              color: activeTab === "report" ? "#ffffff" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "var(--transition-fast)",
            }}
          >
            <FileText size={16} />
            <span>Research Report</span>
          </button>

          <button
            onClick={() => setActiveTab("sources")}
            style={{
              padding: "0.75rem 1.25rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "sources" ? "2px solid var(--accent-primary)" : "2px solid transparent",
              color: activeTab === "sources" ? "#ffffff" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "var(--transition-fast)",
            }}
          >
            <Globe size={16} />
            <span>Verified Sources ({job.sources?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("critic")}
            style={{
              padding: "0.75rem 1.25rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "critic" ? "2px solid var(--accent-primary)" : "2px solid transparent",
              color: activeTab === "critic" ? "#ffffff" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "var(--transition-fast)",
            }}
          >
            <ShieldCheck size={16} />
            <span>Critic Fact-Check</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "report" && (
          <div className="card" style={{ padding: "2.5rem", background: "var(--bg-surface)" }}>
            <MarkdownViewer content={job.report} />
          </div>
        )}

        {activeTab === "sources" && (
          <SourcesList sources={job.sources} />
        )}

        {activeTab === "critic" && (
          <CriticFeedbackCard criticFeedback={job.criticFeedback} revisions={job.revisions} />
        )}
      </div>
    </div>
  );
};
