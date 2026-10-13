import axios from "axios";
import { ENV } from "../config/env.js";

const client = axios.create({
  baseURL: ENV.PYTHON_SERVICE_URL,
  timeout: 300000, // 5 minutes max timeout for deep research pipeline
  headers: {
    "Content-Type": "application/json",
  },
});

export const pythonService = {
  async checkHealth() {
    try {
      const response = await client.get("/health", { timeout: 5000 });
      return response.data;
    } catch (error) {
      console.error("[PythonClient] Health check failed:", error.message);
      return { status: "down", error: error.message };
    }
  },

  async executeResearch({ topic, jobId, maxRevisions = 2, enableRevisions = true }) {
    try {
      console.log(`[PythonClient] Requesting research for job ${jobId}, topic: "${topic}"`);
      const response = await client.post("/internal/research", {
        topic,
        job_id: jobId,
        max_revisions: maxRevisions,
        enable_revisions: enableRevisions,
        async_execution: false, // Node background runner handles async
      });
      return response.data;
    } catch (error) {
      const detail = error.response?.data?.detail || error.message;
      console.error(`[PythonClient] Research request failed for job ${jobId}:`, detail);
      throw new Error(`AI Research Service Error: ${detail}`);
    }
  },

  async getJobStatus(jobId) {
    try {
      const response = await client.get(`/internal/research/${jobId}/status`, { timeout: 5000 });
      return response.data;
    } catch (error) {
      return null;
    }
  },
};
