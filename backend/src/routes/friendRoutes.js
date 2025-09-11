import express from "express";
import { sendFriendRequest, acceptFriendRequest, rejectFriendRequest, getFriends, getPendingRequests } from "../controllers/friendController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/send", authMiddleware, sendFriendRequest);
router.patch("/accept", authMiddleware, acceptFriendRequest);
router.patch("/reject", authMiddleware, rejectFriendRequest);
router.get("/list", authMiddleware, getFriends);
router.get("/requests", authMiddleware, getPendingRequests);

export default router;
