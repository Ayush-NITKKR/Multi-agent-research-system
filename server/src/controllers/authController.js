import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User.js";
import { ENV } from "../config/env.js";

// Validation schemas
export const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(60, "Name cannot exceed 60 characters"),
    email: z.string().email("Please provide a valid email address").toLowerCase(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password confirmation is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Please provide a valid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

// Helper to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN,
  });
};

// Helper to set cookie options
const getCookieOptions = () => ({
  httpOnly: true,
  secure: ENV.NODE_ENV === "production",
  sameSite: ENV.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: ENV.COOKIE_MAX_AGE_MS,
  path: "/",
});

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "An account with this email address already exists.",
      });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    res.cookie("token", token, getCookieOptions());

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token, // Also return token for clients that prefer Bearer headers
    });
  } catch (error) {
    console.error("[AuthController] Signup error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error during account creation.",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Must explicitly select password since schema has select: false
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    const token = generateToken(user._id);
    res.cookie("token", token, getCookieOptions());

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error("[AuthController] Login error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error during authentication.",
    });
  }
};

export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    sameSite: ENV.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
  });
  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

export const getMe = (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      createdAt: req.user.createdAt,
    },
  });
};
