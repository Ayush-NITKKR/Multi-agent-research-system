import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { ResearchJob } from "../src/models/ResearchJob.js";
import { connectDB } from "../src/config/db.js";
import { jobRunner } from "../src/services/jobRunner.js";

let tokenA;
let userA;
let tokenB;
let userB;
let createdJobId;

beforeAll(async () => {
  await connectDB();
  jest.spyOn(jobRunner, "startJob").mockImplementation(() => {});
  await User.deleteMany({ email: { $regex: /@testresearch\.com$/ } });
  await ResearchJob.deleteMany({ topic: { $regex: /Test Topic/ } });

  // Create User A
  const resA = await request(app).post("/api/auth/signup").send({
    name: "User Alpha",
    email: "alpha@testresearch.com",
    password: "Password123!",
    confirmPassword: "Password123!",
  });
  tokenA = resA.body.token;
  userA = resA.body.user;

  // Create User B
  const resB = await request(app).post("/api/auth/signup").send({
    name: "User Beta",
    email: "beta@testresearch.com",
    password: "Password123!",
    confirmPassword: "Password123!",
  });
  tokenB = resB.body.token;
  userB = resB.body.user;
});

afterAll(async () => {
  jest.restoreAllMocks();
  await User.deleteMany({ email: { $regex: /@testresearch\.com$/ } });
  await ResearchJob.deleteMany({ topic: { $regex: /Test Topic/ } });
  await mongoose.connection.close();
});

describe("Research API & Authorization", () => {
  it("should create a new research job for User A", async () => {
    const res = await request(app)
      .post("/api/research")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ topic: "Test Topic on Renewable Energy" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.job).toHaveProperty("_id");
    expect(res.body.job.status).toBe("queued");
    expect(res.body.job.topic).toBe("Test Topic on Renewable Energy");

    createdJobId = res.body.job._id;
  });

  it("should list User A's jobs", async () => {
    const res = await request(app)
      .get("/api/research")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.jobs.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination).toBeDefined();
  });

  it("should retrieve User A's job by ID for User A", async () => {
    const res = await request(app)
      .get(`/api/research/${createdJobId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.job._id).toBe(createdJobId);
  });

  it("should DENY User B access to User A's research job (404/authorization check)", async () => {
    const res = await request(app)
      .get(`/api/research/${createdJobId}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should DENY User B from rerunning User A's research job", async () => {
    const res = await request(app)
      .post(`/api/research/${createdJobId}/retry`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should reject rerun while a job is still in progress", async () => {
    const res = await request(app)
      .post(`/api/research/${createdJobId}/retry`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("should allow User A to rerun an eligible terminal job", async () => {
    await ResearchJob.findByIdAndUpdate(createdJobId, {
      status: "needs_rerun",
      progress: 100,
      currentStage: "Quality gate failed",
      report: "Draft that needs rerun",
      criticFeedback: {
        score: 6,
        criteria: {
          factual_accuracy: 6,
          source_quality: 6,
          completeness: 6,
          reasoning: 6,
          clarity: 6,
        },
        critical_issues: ["Insufficient evidence"],
        verdict: "NEEDS REVISION",
      },
    });

    const res = await request(app)
      .post(`/api/research/${createdJobId}/retry`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.job.status).toBe("queued");
    expect(res.body.job.progress).toBe(5);
    expect(jobRunner.startJob).toHaveBeenCalled();
  });

  it("should DENY User B from reading User A's job status", async () => {
    const res = await request(app)
      .get(`/api/research/${createdJobId}/status`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should DENY User B from deleting User A's research job", async () => {
    const res = await request(app)
      .delete(`/api/research/${createdJobId}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 when fetching jobs without authentication", async () => {
    const res = await request(app).get("/api/research");
    expect(res.status).toBe(401);
  });

  it("should delete User A's job when requested by User A", async () => {
    const res = await request(app)
      .delete(`/api/research/${createdJobId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirm it is gone
    const checkRes = await request(app)
      .get(`/api/research/${createdJobId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(checkRes.status).toBe(404);
  });
});
