import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  message: {
    success: false,
    error: "Too many authentication attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const researchCreateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 research jobs per 10 mins
  message: {
    success: false,
    error: "Research creation rate limit reached. Please wait a few moments before submitting a new topic.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
