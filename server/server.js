import "dotenv/config";
import "colors";

import express from "express";
import cors from "cors";
import morgan from "morgan";
import { clerkMiddleware } from "@clerk/express";

import connectDB from "./config/db.js";
import courseRouter from "./routes/courseRouter.js";
import bookingRouter from "./routes/bookingRouter.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(clerkMiddleware());

app.use("/uploads", express.static("uploads"));

app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/bookings", bookingRouter);

app.use("/", (req, res) => {
  res.send("API Working");
});

app.listen(port, () => {
  connectDB();
  console.log(`Server is running on http://localhost:${port}`.bgMagenta.white);
});
