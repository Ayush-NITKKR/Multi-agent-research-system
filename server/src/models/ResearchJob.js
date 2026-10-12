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
    verdict: {
      type: String,
      enum: ["APPROVED", "NEEDS REVISION", "UNKNOWN"],
      default: "UNKNOWN",
    },
    raw_feedback: { type: String, default: "" },
    strengths: [{ type: String }],
    issues: [{ type: String }],
    missing_information: [{ type: String }],
    recommendations: [{ type: String }],
  },
  { _id: false }
);

const revisionSchema = new mongoose.Schema(
  {
    revision_number: { type: Number, required: true },
    report: { type: String, default: "" },
    critic_feedback: { type: String, default: "" },
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
