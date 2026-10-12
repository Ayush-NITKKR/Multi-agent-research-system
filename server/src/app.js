import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { ENV } from "./config/env.js";

import authRoutes from "./routes/authRoutes.js";
import researchRoutes from "./routes/researchRoutes.js";
import { pythonService } from "./services/pythonClient.js";

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Let frontend handle CSP if needed
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const allowedOrigins = [
  ENV.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev, or check allowedOrigins
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Request parsing
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());

if (ENV.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Health check endpoint
app.get("/api/health", async (req, res) => {
  const pythonHealth = await pythonService.checkHealth();
  return res.status(200).json({
    status: "ok",
    node_backend: "healthy",
    python_ai_service: pythonHealth,
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/research", researchRoutes);

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("[ServerError]", err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || "An unexpected internal server error occurred.",
    ...(ENV.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
});

export default app;
