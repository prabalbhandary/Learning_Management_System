import express from "express";
import { checkBooking, confirmPayment, createBooking, getBookings, getStats, getUserBooking } from "../controllers/bookingController.js";

const bookingRouter = express.Router();

bookingRouter.get("/", getBookings);
bookingRouter.get("/stats", getStats);
bookingRouter.post("/create", createBooking);
bookingRouter.get("/confirm", confirmPayment);
bookingRouter.get("/my", getUserBooking);
bookingRouter.get("/check", checkBooking);

export default bookingRouter