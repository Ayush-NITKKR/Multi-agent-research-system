import mongoose from "mongoose";
import { z } from "zod";
import { ResearchJob } from "../models/ResearchJob.js";
import { jobRunner } from "../services/jobRunner.js";

export const createResearchSchema = z.object({
  topic: z
    .string()
    .min(3, "Topic must be at least 3 characters")
    .max(500, "Topic cannot exceed 500 characters")
    .trim(),
});

export const createJob = async (req, res) => {
  try {
    const { topic } = req.body;

    // Check if there is an identical active job running recently to avoid duplicates
    const duplicate = await ResearchJob.findOne({
      userId: req.user._id,
      topic: topic,
      status: { $in: ["queued", "searching", "scraping", "writing", "reviewing", "revising"] },
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // within last 5 mins
    });

    if (duplicate) {
      return res.status(200).json({
        success: true,
        message: "An identical research job is already in progress.",
        job: duplicate,
      });
    }

    const job = await ResearchJob.create({
      userId: req.user._id,
      topic,
      status: "queued",
      progress: 5,
      currentStage: "Queued in research scheduler",
    });

    // Start background job execution
    jobRunner.startJob(job._id);

    return res.status(201).json({
      success: true,
      message: "Research job queued successfully.",
      job,
    });
  } catch (error) {
    console.error("[ResearchController] Create job error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create research job.",
    });
  }
};

export const getJobs = async (req, res) => {
  try {
    const { q, status, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = { userId: req.user._id };

    if (status && status !== "all") {
      filter.status = status;
    }

    if (q && q.trim()) {
      filter.topic = { $regex: q.trim(), $options: "i" };
    }

    const [jobs, totalCount] = await Promise.all([
      ResearchJob.find(filter)
        .select("topic status progress currentStage executionMetadata createdAt updatedAt error")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ResearchJob.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      jobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasMore: pageNum * limitNum < totalCount,
      },
    });
  } catch (error) {
    console.error("[ResearchController] Get jobs error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve research history.",
    });
  }
};

export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid research ID format.",
      });
    }

    const job = await ResearchJob.findOne({
      _id: id,
      userId: req.user._id, // Authorization check: user can only see their own
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Research record not found or access denied.",
      });
    }

    return res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    console.error("[ResearchController] Get job by ID error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve research details.",
    });
  }
};

export const getJobStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid research ID format.",
      });
    }

    const job = await ResearchJob.findOne({
      _id: id,
      userId: req.user._id,
    }).select("status progress currentStage error executionMetadata updatedAt");

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Research job not found.",
      });
    }

    return res.status(200).json({
      success: true,
      status: job.status,
      progress: job.progress,
      currentStage: job.currentStage,
      error: job.error,
      completedAt: job.executionMetadata?.completed_at,
      updatedAt: job.updatedAt,
    });
  } catch (error) {
    console.error("[ResearchController] Get job status error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve job status.",
    });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid research ID format.",
      });
    }

    const job = await ResearchJob.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Research record not found or already deleted.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Research record deleted successfully.",
    });
  } catch (error) {
    console.error("[ResearchController] Delete job error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete research record.",
    });
  }
};

export const retryJob = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid research ID format.",
      });
    }

    const job = await ResearchJob.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Research job not found.",
      });
    }

    // Reset job state
    job.status = "queued";
    job.progress = 5;
    job.currentStage = "Restarting research pipeline";
    job.error = null;
    job.report = "";
    job.sources = [];
    job.criticFeedback = {};
    job.revisions = [];
    job.executionMetadata = {
      started_at: new Date(),
      completed_at: null,
      duration_ms: 0,
      revision_count: 0,
      sources_count: 0,
    };
    await job.save();

    // Trigger execution
    jobRunner.startJob(job._id);

    return res.status(200).json({
      success: true,
      message: "Research job restarted.",
      job,
    });
  } catch (error) {
    console.error("[ResearchController] Retry job error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to restart research job.",
    });
  }
};

export const getMetrics = async (req, res) => {
  try {
    const userId = req.user._id;

    const [total, completed, inProgress, failed] = await Promise.all([
      ResearchJob.countDocuments({ userId }),
      ResearchJob.countDocuments({ userId, status: "completed" }),
      ResearchJob.countDocuments({
        userId,
        status: { $in: ["queued", "searching", "scraping", "writing", "reviewing", "revising"] },
      }),
      ResearchJob.countDocuments({ userId, status: "failed" }),
    ]);

    return res.status(200).json({
      success: true,
      metrics: {
        total,
        completed,
        inProgress,
        failed,
      },
    });
  } catch (error) {
    console.error("[ResearchController] Get metrics error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve user metrics.",
    });
  }
};
