import express from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getPendingRequests,
} from "../controllers/friendController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { friendIdValidation } from "../validators/friendValidators.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

// Send Friend Request
router.post("/send", authMiddleware, friendIdValidation, validate, sendFriendRequest);

// Accept Friend Request
router.patch("/accept", authMiddleware, friendIdValidation, validate, acceptFriendRequest);

// Reject Friend Request
router.patch("/reject", authMiddleware, friendIdValidation, validate, rejectFriendRequest);

// Get Friends List
router.get("/list", authMiddleware, getFriends);

// Get Pending Friend Requests
router.get("/requests", authMiddleware, getPendingRequests);

export default router;
