import { body } from "express-validator";

export const expenseValidation = [
  body("description").trim().notEmpty().withMessage("Description required"),
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be > 0"),
  body("splitType")
    .optional()
    .isIn(["none", "equal", "percentage", "custom"])
    .withMessage("splitType must be one of none|equal|percentage|custom"),
  // If percentages provided, each must be >0 && <=100
  body("splitDetails.*.percentage")
    .optional()
    .isFloat({ gt: 0, lte: 100 })
    .withMessage("Each percentage must be between 0 and 100"),
  body("splitDetails.*.amount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Each custom amount must be greater than 0"),
];
