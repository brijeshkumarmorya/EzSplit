import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  createCombinedPayment,
  submitPaymentProof,
  confirmPayment,
} from "../controllers/paymentController.js";
import {
  requestMoney,
  getIncomingRequests,
  getOutgoingRequests,
} from "../controllers/paymentController.js";


const paymentRouter = express.Router();

paymentRouter.post("/combined", authMiddleware, createCombinedPayment);
paymentRouter.patch("/:paymentId/proof", authMiddleware, submitPaymentProof);
paymentRouter.patch("/:paymentId/confirm", authMiddleware, confirmPayment);
paymentRouter.post("/request", authMiddleware, requestMoney);
paymentRouter.get("/requests/incoming", authMiddleware, getIncomingRequests);
paymentRouter.get("/requests/outgoing", authMiddleware, getOutgoingRequests);

export default paymentRouter;
