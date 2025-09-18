// src/validators/friendValidators.js
import { body } from "express-validator";

export const friendIdValidation = [
  body("friendId")
    .notEmpty()
    .withMessage("friendId is required")
    .isMongoId()
    .withMessage("Invalid friendId"),
];
