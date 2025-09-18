// src/middleware/validate.js
import { validationResult } from "express-validator";
import { error } from "../utils/response.js";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // concatenate messages into one line (or return array if you prefer)
    const msg = errors.array().map((e) => e.msg).join(", ");
    return error(res, 400, msg);
  }
  next();
};
