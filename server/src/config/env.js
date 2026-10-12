import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load root .env or server .env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5001", 10),
  MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/research_ai",
  JWT_SECRET: process.env.JWT_SECRET || "research_ai_super_secret_jwt_key_2026_dev",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  COOKIE_MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  PYTHON_SERVICE_URL: process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
};
