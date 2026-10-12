import { Router } from "express";
import {
  createJob,
  getJobs,
  getJobById,
  getJobStatus,
  deleteJob,
  retryJob,
  getMetrics,
  createResearchSchema,
} from "../controllers/researchController.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { researchCreateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// All research routes require authentication
router.use(authenticate);

router.post("/", researchCreateLimiter, validateBody(createResearchSchema), createJob);
router.get("/", getJobs);
router.get("/stats/metrics", getMetrics);
router.get("/:id", getJobById);
router.get("/:id/status", getJobStatus);
router.delete("/:id", deleteJob);
router.post("/:id/retry", retryJob);

export default router;
