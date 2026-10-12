import app from "./app.js";
import { connectDB } from "./config/db.js";
import { ENV } from "./config/env.js";

const startServer = async () => {
  try {
    await connectDB();

    app.listen(ENV.PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 Node.js ResearchAI Server running on port ${ENV.PORT}`);
      console.log(`📡 Environment: ${ENV.NODE_ENV}`);
      console.log(`🔗 Python Microservice URL: ${ENV.PYTHON_SERVICE_URL}`);
      console.log(`💻 Client Allowed Origin: ${ENV.CLIENT_URL}`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
