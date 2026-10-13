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
      let progressTimer = null;

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
        job.executionMetadata = job.executionMetadata || {};
        job.executionMetadata.started_at = new Date();
        await job.save();

        // Conservative progress progression while Python microservice executes
        progressTimer = setInterval(async () => {
          try {
            const current = await ResearchJob.findById(jobId);
            if (!current || ["completed", "needs_rerun", "failed"].includes(current.status)) {
              if (progressTimer) clearInterval(progressTimer);
              return;
            }

            const elapsedSec = (Date.now() - startTime) / 1000;
            if (elapsedSec > 15 && current.status === "searching") {
              current.status = "scraping";
              current.progress = 35;
              current.currentStage = "Processing candidate sources via Reader agent";
              await current.save();
            } else if (elapsedSec > 30 && current.status === "scraping") {
              current.status = "writing";
              current.progress = 55;
              current.currentStage = "Synthesizing research report via Writer chain";
              await current.save();
            } else if (elapsedSec > 50 && current.status === "writing") {
              current.status = "reviewing";
              current.progress = 75;
              current.currentStage = "Evaluating against rubric & citations via Critic chain";
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
          maxRevisions: 2,
          enableRevisions: true,
        });

        if (progressTimer) {
          clearInterval(progressTimer);
          progressTimer = null;
        }

        if (!result || result.status === "failed") {
          throw new Error(result?.error || "AI Research Pipeline execution failed");
        }

        // Re-fetch current job before finalizing
        const freshJob = await ResearchJob.findById(jobId);
        if (!freshJob) return;

        const critic = result.critic_feedback || {};
        const criticScore = typeof critic.score === "number" ? critic.score : 0;
        const criticalIssues = Array.isArray(critic.critical_issues)
          ? critic.critical_issues
          : [];
        const verdict = (critic.verdict || "").toUpperCase();
        const pyStatus = result.status;

        // Quality Gate: score >= 8.0, no critical issues, APPROVED verdict, Python reports completed
        const passesQualityGate =
          pyStatus === "completed" &&
          criticScore >= 8.0 &&
          criticalIssues.length === 0 &&
          verdict === "APPROVED";

        if (passesQualityGate) {
          freshJob.status = "completed";
          freshJob.progress = 100;
          freshJob.currentStage = `Research and evaluation completed (Score: ${criticScore.toFixed(1)}/10)`;
          freshJob.error = null;
        } else if (pyStatus === "needs_rerun" || !passesQualityGate) {
          freshJob.status = "needs_rerun";
          freshJob.progress = 100;
          freshJob.currentStage =
            criticalIssues.length > 0
              ? `Quality gate failed with ${criticalIssues.length} critical issue(s) (Score: ${criticScore.toFixed(1)}/10)`
              : `Quality gate failed: score ${criticScore.toFixed(1)}/10 is below 8.0 threshold`;
          freshJob.error = null;
        } else {
          freshJob.status = "needs_rerun";
          freshJob.progress = 100;
          freshJob.currentStage = `Quality gate could not verify report approval (status: ${pyStatus})`;
        }

        freshJob.report = result.report || "";
        freshJob.sources = result.sources || [];
        freshJob.criticFeedback = {
          score: criticScore,
          criteria: critic.criteria || {
            factual_accuracy: 0,
            source_quality: 0,
            completeness: 0,
            reasoning: 0,
            clarity: 0,
          },
          critical_issues: criticalIssues,
          issues: critic.issues || [],
          missing_information: critic.missing_information || [],
          recommendations: critic.recommendations || [],
          verdict: verdict || "NEEDS REVISION",
          next_action: critic.next_action || (passesQualityGate ? "publish" : "revise"),
          strengths: critic.strengths || [],
          raw_feedback: critic.raw_feedback || "",
        };
        freshJob.revisions = result.revisions || [];
        freshJob.executionMetadata = {
          duration_ms: result.execution_metadata?.duration_ms || (Date.now() - startTime),
          revision_count: result.execution_metadata?.revision_count || (result.revisions || []).length,
          sources_count: (result.sources || []).length,
          started_at: freshJob.executionMetadata?.started_at || new Date(startTime),
          completed_at: new Date(),
        };

        await freshJob.save();
        console.log(`[JobRunner] Job ${jobId} finished with status: ${freshJob.status} (Score: ${criticScore})`);
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
        if (progressTimer) {
          clearInterval(progressTimer);
          progressTimer = null;
        }
        activeJobs.delete(jobId.toString());
      }
    });
  },

};
