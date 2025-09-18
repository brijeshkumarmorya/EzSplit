import { body, param } from "express-validator";

export const createGroupValidation = [
  body("name").trim().notEmpty().withMessage("Group name is required"),
  body("members")
    .isArray({ min: 1 })
    .withMessage("Members must be an array with at least one member"),
];

export const addMemberValidation = [
  param("groupId").notEmpty().withMessage("groupId required"),
  body("userId").notEmpty().withMessage("userId required"),
];
