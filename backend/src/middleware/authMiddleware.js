import jwt from "jsonwebtoken";
import { error } from "../utils/response.js";
import config from '../config/config.js';

/**
 * Authentication Middleware
 * Verifies JWT and attaches user to request
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return error(res, 401, "No token, authorization denied");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwtSecret);

    req.user = decoded; // { id: user._id }
    next();
  } catch (err) {
    return error(res, 401, "Token is not valid");
  }
};

export default authMiddleware;
