import { Router } from "express";
import { signup, login, logout, getMe, signupSchema, loginSchema } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/signup", authLimiter, validateBody(signupSchema), signup);
router.post("/login", authLimiter, validateBody(loginSchema), login);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);

export default router;
