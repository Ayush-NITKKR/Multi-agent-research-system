import mongoose from "mongoose";

const sourceSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    url: { type: String, required: true },
    snippet: { type: String, default: "" },
    domain: { type: String, default: "" },
  },
  { _id: false }
);

const criticFeedbackSchema = new mongoose.Schema(
  {
    score: { type: Number, default: 0 },
    criteria: {
      factual_accuracy: { type: Number, default: 0 },
      source_quality: { type: Number, default: 0 },
      completeness: { type: Number, default: 0 },
      reasoning: { type: Number, default: 0 },
      clarity: { type: Number, default: 0 },
    },
    critical_issues: [{ type: String }],
    issues: [{ type: String }],
    missing_information: [{ type: String }],
    recommendations: [{ type: String }],
    verdict: {
      type: String,
      enum: ["APPROVED", "NEEDS REVISION", "UNKNOWN"],
      default: "UNKNOWN",
    },
    next_action: { type: String, default: "revise" },
    strengths: [{ type: String }],
    raw_feedback: { type: String, default: "" },
  },
  { _id: false }
);

const revisionSchema = new mongoose.Schema(
  {
    revision_number: { type: Number, required: true },
    report: { type: String, default: "" },
    score: { type: Number, default: 0 },
    criteria: {
      factual_accuracy: { type: Number, default: 0 },
      source_quality: { type: Number, default: 0 },
      completeness: { type: Number, default: 0 },
      reasoning: { type: Number, default: 0 },
      clarity: { type: Number, default: 0 },
    },
    critic_feedback: { type: mongoose.Schema.Types.Mixed, default: "" },
    critical_issues: [{ type: String }],
    verdict: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const researchJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: [true, "Research topic is required"],
      trim: true,
      maxlength: [500, "Topic cannot exceed 500 characters"],
    },
    status: {
      type: String,
      enum: [
        "queued",
        "searching",
        "scraping",
        "writing",
        "reviewing",
        "revising",
        "completed",
        "needs_rerun",
        "failed",
      ],
      default: "queued",
      index: true,
    },

    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    currentStage: {
      type: String,
      default: "Queued for research",
    },
    report: {
      type: String,
      default: "",
    },
    sources: [sourceSchema],
    criticFeedback: {
      type: criticFeedbackSchema,
      default: () => ({}),
    },
    revisions: [revisionSchema],
    error: {
      type: String,
      default: null,
    },
    executionMetadata: {
      duration_ms: { type: Number, default: 0 },
      revision_count: { type: Number, default: 0 },
      sources_count: { type: Number, default: 0 },
      started_at: { type: Date },
      completed_at: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user job list sorted by newest
researchJobSchema.index({ userId: 1, createdAt: -1 });
researchJobSchema.index({ userId: 1, status: 1 });
// Text index for search
researchJobSchema.index({ topic: "text" });

export const ResearchJob = mongoose.model("ResearchJob", researchJobSchema);
