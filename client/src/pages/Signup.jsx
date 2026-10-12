import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, User, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setFormError("Please enter your email address.");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const res = await signup({ name, email, password, confirmPassword });
    setSubmitting(false);

    if (res.success) {
      navigate("/dashboard");
    } else {
      setFormError(res.error || "Failed to create account.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at 50% 20%, #15192c 0%, #08090e 70%)",
        padding: "1.5rem",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "2.5rem 2rem",
          background: "rgba(14, 17, 26, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--border-muted)",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 30px -10px rgba(99, 102, 241, 0.25)",
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              margin: "0 auto 1rem auto",
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 0 20px rgba(99, 102, 241, 0.5)",
            }}
          >
            <Sparkles size={24} />
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
            Create Your Account
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Deploy autonomous agents for deep web research
          </p>
        </div>

        {formError && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-danger-bg)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              fontSize: "0.8125rem",
              marginBottom: "1.25rem",
            }}
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input
                id="name"
                type="text"
                className="form-input has-icon"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Jane Doe"
                required
                autoComplete="name"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Work Email</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                className="form-input has-icon"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@research.org"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password (min 8 characters)</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-input has-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="input-suffix-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "1.75rem" }}>
            <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                className="form-input has-icon"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.75rem 1rem", fontSize: "0.9375rem" }}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Register & Access Platform</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--accent-primary)", fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
