import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { connectDB } from "../src/config/db.js";

beforeAll(async () => {
  await connectDB();
  // Clear test users
  await User.deleteMany({ email: { $regex: /@testauth\.com$/ } });
});

afterAll(async () => {
  await User.deleteMany({ email: { $regex: /@testauth\.com$/ } });
  await mongoose.connection.close();
});

describe("Authentication API", () => {
  const testUser = {
    name: "Test Researcher",
    email: "researcher@testauth.com",
    password: "Password123!",
    confirmPassword: "Password123!",
  };

  it("should successfully register a new user", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toHaveProperty("id");
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user).not.toHaveProperty("password");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("should reject signup with duplicate email", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it("should reject signup with mismatched passwords", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Mismatch User",
        email: "mismatch@testauth.com",
        password: "Password123!",
        confirmPassword: "DifferentPassword!",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should successfully log in with valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.token).toBeDefined();
  });

  it("should reject login with invalid password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: "WrongPassword!",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should reject access to /api/auth/me without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should allow access to /api/auth/me with valid Bearer token", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.user.email).toBe(testUser.email);
  });
});
