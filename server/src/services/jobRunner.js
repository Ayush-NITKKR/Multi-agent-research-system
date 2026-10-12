import { ResearchJob } from "../models/ResearchJob.js";
import { pythonService } from "./pythonClient.js";

// Track actively running jobs in this Node instance to avoid duplicates
const activeJobs = new Set();

export const jobRunner = {
  /**
   * Start executing a research job asynchronously.
   * Does not block the HTTP request.
   */
  startJob(jobId) {
    if (activeJobs.has(jobId.toString())) {
      console.log(`[JobRunner] Job ${jobId} is already running.`);
      return;
    }

    activeJobs.add(jobId.toString());

    // Execute in next event loop tick
    setImmediate(async () => {
      const startTime = Date.now();
      try {
        console.log(`[JobRunner] Starting background execution for job: ${jobId}`);

        const job = await ResearchJob.findById(jobId);
        if (!job) {
          activeJobs.delete(jobId.toString());
          return;
        }

        // Stage 1: Searching
        job.status = "searching";
        job.progress = 20;
        job.currentStage = "Searching web sources via Tavily";
        job.executionMetadata.started_at = new Date();
        await job.save();

        // Simulate stage progression while Python microservice executes
        // (Python service coordinates LangChain agents)
        const progressTimer = setInterval(async () => {
          try {
            const current = await ResearchJob.findById(jobId);
            if (!current || current.status === "completed" || current.status === "failed") {
              clearInterval(progressTimer);
              return;
            }

            const elapsedSec = (Date.now() - startTime) / 1000;
            if (elapsedSec > 12 && current.status === "searching") {
              current.status = "scraping";
              current.progress = 40;
              current.currentStage = "Scraping full webpage content via Reader agent";
              await current.save();
            } else if (elapsedSec > 25 && current.status === "scraping") {
              current.status = "writing";
              current.progress = 65;
              current.currentStage = "Generating structured research report via Writer chain";
              await current.save();
            } else if (elapsedSec > 40 && current.status === "writing") {
              current.status = "reviewing";
              current.progress = 85;
              current.currentStage = "Evaluating accuracy and citations via Critic chain";
              await current.save();
            }
          } catch (err) {
            console.error(`[JobRunner] Progress tick error: ${err.message}`);
          }
        }, 3000);

        // Call Python service to run full agentic workflow
        const result = await pythonService.executeResearch({
          topic: job.topic,
          jobId: job._id.toString(),
          maxRevisions: 1,
          enableRevisions: true,
        });

        clearInterval(progressTimer);

        if (result.status === "failed") {
          throw new Error(result.error || "AI Research Pipeline execution failed");
        }

        // Successfully completed
        job.status = "completed";
        job.progress = 100;
        job.currentStage = "Research and evaluation completed";
        job.report = result.report || "";
        job.sources = result.sources || [];
        job.criticFeedback = result.critic_feedback || {
          verdict: "UNKNOWN",
          raw_feedback: "",
          strengths: [],
          issues: [],
          missing_information: [],
          recommendations: [],
        };
        job.revisions = result.revisions || [];
        job.error = null;
        job.executionMetadata = {
          duration_ms: result.execution_metadata?.duration_ms || (Date.now() - startTime),
          revision_count: result.execution_metadata?.revision_count || 0,
          sources_count: (result.sources || []).length,
          started_at: job.executionMetadata.started_at,
          completed_at: new Date(),
        };

        await job.save();
        console.log(`[JobRunner] Job ${jobId} completed successfully!`);
      } catch (error) {
        console.error(`[JobRunner] Job ${jobId} failed: ${error.message}`);
        try {
          await ResearchJob.findByIdAndUpdate(jobId, {
            status: "failed",
            progress: 100,
            currentStage: "Execution halted due to error",
            error: error.message || "An unknown error occurred during research execution.",
            "executionMetadata.completed_at": new Date(),
          });
        } catch (dbErr) {
          console.error(`[JobRunner] Failed to record error state for ${jobId}: ${dbErr.message}`);
        }
      } finally {
        activeJobs.delete(jobId.toString());
      }
    });
  },
};
