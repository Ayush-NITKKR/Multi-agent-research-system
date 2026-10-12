import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { ResearchJob } from "../src/models/ResearchJob.js";
import { connectDB } from "../src/config/db.js";

let tokenA;
let userA;
let tokenB;
let userB;
let createdJobId;

beforeAll(async () => {
  await connectDB();
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
