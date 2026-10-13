import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { ResearchJob } from "../src/models/ResearchJob.js";
import { jobRunner } from "../src/services/jobRunner.js";
import { pythonService } from "../src/services/pythonClient.js";

let testUserId;

beforeAll(async () => {
  await connectDB();
  testUserId = new mongoose.Types.ObjectId();
  await ResearchJob.deleteMany({ topic: { $regex: /JobRunner Test/ } });
});

afterAll(async () => {
  await ResearchJob.deleteMany({ topic: { $regex: /JobRunner Test/ } });
  await mongoose.connection.close();
});

describe("JobRunner Quality Gate & Status Handling", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should mark a job as 'completed' when score >= 8.0, 0 critical issues, and approved", async () => {
    const job = await ResearchJob.create({
      userId: testUserId,
      topic: "JobRunner Test - Passing Gate",
      status: "queued",
    });

    jest.spyOn(pythonService, "executeResearch").mockResolvedValueOnce({
      status: "completed",
      report: "High quality report meeting standards",
      sources: [{ title: "Source 1", url: "https://example.com/1", snippet: "Evidence", domain: "example.com" }],
      critic_feedback: {
        score: 8.5,
        criteria: {
          factual_accuracy: 9,
          source_quality: 8,
          completeness: 8,
          reasoning: 9,
          clarity: 8,
        },
        critical_issues: [],
        issues: [],
        missing_information: [],
        recommendations: [],
        verdict: "APPROVED",
        next_action: "publish",
        raw_feedback: "{}",
      },
      revisions: [],
      execution_metadata: { duration_ms: 50, revision_count: 0 },
    });

    jobRunner.startJob(job._id);

    // Wait briefly for setImmediate to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    const updatedJob = await ResearchJob.findById(job._id);
    expect(updatedJob.status).toBe("completed");
    expect(updatedJob.progress).toBe(100);
    expect(updatedJob.criticFeedback.score).toBe(8.5);
    expect(updatedJob.criticFeedback.verdict).toBe("APPROVED");
    expect(updatedJob.criticFeedback.critical_issues.length).toBe(0);
    expect(updatedJob.report).toBe("High quality report meeting standards");
  });

  it("should mark a job as 'needs_rerun' (NEVER completed) when score is below 8.0", async () => {
    const job = await ResearchJob.create({
      userId: testUserId,
      topic: "JobRunner Test - Low Score Gate",
      status: "queued",
    });

    jest.spyOn(pythonService, "executeResearch").mockResolvedValueOnce({
      status: "needs_rerun",
      report: "Substandard draft",
      sources: [],
      critic_feedback: {
        score: 6.5,
        criteria: {
          factual_accuracy: 6,
          source_quality: 6,
          completeness: 7,
          reasoning: 7,
          clarity: 7,
        },
        critical_issues: ["Insufficient factual evidence"],
        issues: [],
        missing_information: [],
        recommendations: ["Rerun with targeted queries"],
        verdict: "NEEDS REVISION",
        next_action: "revise",
        raw_feedback: "{}",
      },
      revisions: [],
      execution_metadata: { duration_ms: 60, revision_count: 2 },
    });

    jobRunner.startJob(job._id);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const updatedJob = await ResearchJob.findById(job._id);
    expect(updatedJob.status).toBe("needs_rerun");
    expect(updatedJob.status).not.toBe("completed");
    expect(updatedJob.progress).toBe(100);
    expect(updatedJob.criticFeedback.score).toBe(6.5);
    expect(updatedJob.criticFeedback.critical_issues.length).toBe(1);
    expect(updatedJob.currentStage).toContain("Quality gate failed");
  });

  it("should mark a job as 'needs_rerun' if score >= 8.0 but critical issues remain", async () => {
    const job = await ResearchJob.create({
      userId: testUserId,
      topic: "JobRunner Test - Critical Issues Gate",
      status: "queued",
    });

    jest.spyOn(pythonService, "executeResearch").mockResolvedValueOnce({
      status: "needs_rerun",
      report: "Draft with critical flaw",
      sources: [],
      critic_feedback: {
        score: 8.2,
        criteria: {
          factual_accuracy: 8,
          source_quality: 8,
          completeness: 8,
          reasoning: 9,
          clarity: 8,
        },
        critical_issues: ["Major unverified factual contradiction"],
        issues: [],
        missing_information: [],
        recommendations: [],
        verdict: "NEEDS REVISION",
        next_action: "revise",
        raw_feedback: "{}",
      },
      revisions: [],
      execution_metadata: { duration_ms: 70, revision_count: 2 },
    });

    jobRunner.startJob(job._id);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const updatedJob = await ResearchJob.findById(job._id);
    expect(updatedJob.status).toBe("needs_rerun");
    expect(updatedJob.status).not.toBe("completed");
    expect(updatedJob.criticFeedback.critical_issues).toContain("Major unverified factual contradiction");
  });

  it("should mark a job as 'completed' at the exact 8.0 threshold", async () => {
    const job = await ResearchJob.create({
      userId: testUserId,
      topic: "JobRunner Test - Exact Threshold",
      status: "queued",
    });

    jest.spyOn(pythonService, "executeResearch").mockResolvedValueOnce({
      status: "completed",
      report: "Threshold report",
      sources: [{ title: "Source", url: "https://example.com/threshold", snippet: "Evidence", domain: "example.com" }],
      critic_feedback: {
        score: 8.0,
        criteria: { factual_accuracy: 8, source_quality: 8, completeness: 8, reasoning: 8, clarity: 8 },
        critical_issues: [],
        issues: [],
        missing_information: [],
        recommendations: [],
        verdict: "APPROVED",
        next_action: "publish",
        raw_feedback: "{}",
      },
      revisions: [{ revision_number: 1, report: "Threshold report", score: 8.0, verdict: "APPROVED" }],
      execution_metadata: { duration_ms: 125, revision_count: 1 },
    });

    jobRunner.startJob(job._id);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const updatedJob = await ResearchJob.findById(job._id);
    expect(updatedJob.status).toBe("completed");
    expect(updatedJob.executionMetadata.revision_count).toBe(1);
    expect(updatedJob.executionMetadata.sources_count).toBe(1);
    expect(updatedJob.revisions).toHaveLength(1);
  });

  it("should mark a high-score non-approved verdict as needs_rerun", async () => {
    const job = await ResearchJob.create({
      userId: testUserId,
      topic: "JobRunner Test - Non Approved Verdict",
      status: "queued",
    });

    jest.spyOn(pythonService, "executeResearch").mockResolvedValueOnce({
      status: "needs_rerun",
      report: "High score but not approved",
      sources: [],
      critic_feedback: {
        score: 10,
        criteria: { factual_accuracy: 10, source_quality: 10, completeness: 10, reasoning: 10, clarity: 10 },
        critical_issues: [],
        issues: [],
        missing_information: [],
        recommendations: ["Resolve final review concern"],
        verdict: "NEEDS REVISION",
        next_action: "revise",
        raw_feedback: "{}",
      },
      revisions: [],
      execution_metadata: { duration_ms: 90, revision_count: 0 },
    });

    jobRunner.startJob(job._id);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const updatedJob = await ResearchJob.findById(job._id);
    expect(updatedJob.status).toBe("needs_rerun");
    expect(updatedJob.status).not.toBe("completed");
    expect(updatedJob.criticFeedback.score).toBe(10);
    expect(updatedJob.criticFeedback.verdict).toBe("NEEDS REVISION");
  });

  it("should persist Python failed status as failed and not completed", async () => {
    const job = await ResearchJob.create({
      userId: testUserId,
      topic: "JobRunner Test - Python Failed Status",
      status: "queued",
    });

    jest.spyOn(pythonService, "executeResearch").mockResolvedValueOnce({
      status: "failed",
      error: "AI service timeout",
      critic_feedback: { score: 0, critical_issues: ["AI service timeout"], verdict: "NEEDS REVISION" },
    });

    jobRunner.startJob(job._id);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const updatedJob = await ResearchJob.findById(job._id);
    expect(updatedJob.status).toBe("failed");
    expect(updatedJob.status).not.toBe("completed");
    expect(updatedJob.error).toContain("AI service timeout");
  });

  it("should mark a job as 'failed' on unexpected exception and preserve error message", async () => {
    const job = await ResearchJob.create({
      userId: testUserId,
      topic: "JobRunner Test - Exception Failure",
      status: "queued",
    });

    jest.spyOn(pythonService, "executeResearch").mockRejectedValueOnce(
      new Error("FastAPI connection timeout")
    );

    jobRunner.startJob(job._id);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const updatedJob = await ResearchJob.findById(job._id);
    expect(updatedJob.status).toBe("failed");
    expect(updatedJob.error).toContain("FastAPI connection timeout");
  });
});
