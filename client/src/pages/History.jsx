import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  FileText,
  Clock,
  RotateCcw,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
} from "lucide-react";
import { Header } from "../components/Header";
import { researchApi } from "../services/api";

export const History = ({ onMenuClick }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalCount: 0 });

  const navigate = useNavigate();

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await researchApi.getAll({
        page,
        limit: 12,
        status: statusFilter,
        q: searchQuery,
      });
      if (res.success) {
        setJobs(res.jobs);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this research record?")) return;
    try {
      await researchApi.delete(id);
      fetchHistory();
    } catch (err) {
      alert("Failed to delete record.");
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
        title="Research History"
        subtitle={`Total Persisted Records: ${pagination.totalCount}`}
      />

      <div className="page-wrapper animate-fade-in">
        {/* Search & Filter Bar */}
        <div
          className="card"
          style={{
            marginBottom: "1.5rem",
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", flex: 1, minWidth: "260px" }}>
            <div className="input-wrapper" style={{ width: "100%" }}>
              <Search size={18} className="input-icon" />
              <input
                type="text"
                className="form-input has-icon"
                placeholder="Search research history by topic keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ width: "150px" }}
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

        {/* Jobs List */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
            <Loader2 size={36} className="animate-spin" color="var(--accent-primary)" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <FileText size={40} color="var(--text-muted)" style={{ margin: "0 auto 1rem auto" }} />
            <h4 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.5rem" }}>
              No Records Found
            </h4>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              Try adjusting your search criteria or submit a new inquiry from the dashboard.
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
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: "260px" }}>
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
                    <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.25rem" }}>
                      {job.topic}
                    </h4>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.75rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <Calendar size={12} />
                        {new Date(job.createdAt).toLocaleString()}
                      </span>
                      {job.executionMetadata?.duration_ms > 0 && (
                        <span>
                          Run time: {Math.round(job.executionMetadata.duration_ms / 1000)}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  {getStatusBadge(job.status)}

                  <button
                    onClick={(e) => handleDelete(job._id, e)}
                    className="btn btn-ghost"
                    style={{ padding: "0.4rem", color: "var(--text-muted)" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "var(--color-danger)")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "1rem",
              marginTop: "2rem",
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.75rem" }}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Page <strong>{page}</strong> of <strong>{pagination.totalPages}</strong>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.75rem" }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
