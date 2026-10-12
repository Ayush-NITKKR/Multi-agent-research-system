import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { ENV } from "../config/env.js";

export const authenticate = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication required. Please log in to proceed.",
      });
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Session expired or user account not found.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Session expired. Please log in again.",
      });
    }
    return res.status(401).json({
      success: false,
      error: "Invalid authentication token.",
    });
  }
};
