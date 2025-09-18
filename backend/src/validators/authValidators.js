import { body } from "express-validator";
import {
  passwordValidatorMiddleware,
  PASSWORD_ERROR_MESSAGE,
} from "../utils/passwordUtils.js";

export const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("username")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters"),
  body("email").isEmail().withMessage("Valid email required"),
  body("password")
    .custom(passwordValidatorMiddleware)
    .withMessage(PASSWORD_ERROR_MESSAGE),
  body("upiId").optional().isString().withMessage("UPI must be a string"),
];

export const loginValidation = [
  body("email").isEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password required"),
];
