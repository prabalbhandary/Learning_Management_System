import dotenv from "dotenv";
dotenv.config();

import Booking from "../models/bookingModel.js";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import { getAuth } from "@clerk/express";

const stripe_key = process.env.STRIPE_SECRET_KEY;
const frontend_url = process.env.FRONTEND_URL;
const stripe = stripe_key
  ? new Stripe(stripe_key, { apiVersion: "2022-11-15" })
  : null;

const safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const genBookingId = () => `BK-${uuidv4()}`;

function buildFrontendBase(req) {
  if (frontend_url) return frontend_url.replace(/\/$/, "");
  const origin = req.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const host = req.get("host");
  if (host) return `${req.protocol || "http"}://${host}`.replace(/\/$/, "");
  return null;
}

export const getBookings = async (req, res) => {
  try {
    const {
      search = "",
      status,
      limit: limitRaw = 50,
      page: pageRaw = 1,
    } = req.query;
    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;
    const filter = {};
    if (status) filter.orderStatus = status;
    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [
        { bookingId: re },
        { courseName: re },
        { teacherName: re },
        { clerkUserId: re },
        { studentName: re },
      ];
    }
    const items = (await Booking.find(filter))
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    return res.status(200).json({
      success: true,
      bookings: items,
      meta: {
        page,
        limit,
        count: items.length,
      },
    });
  } catch (e) {
    console.error("Get Bookings Error: ", e);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { userId } = getAuth(req) || {};
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    const {
      courseId,
      courseName,
      teacherName = "",
      price,
      notes = "",
      email,
      studentName,
    } = req.body;

    if (!courseId || !courseName)
      return res
        .status(400)
        .json({ success: false, message: "courseId and courseName required" });

    const numericPrice = safeNumber(price);
    if (numericPrice === null || numericPrice < 0)
      return res
        .status(400)
        .json({ success: false, message: "price must be a valid number" });

    const bookingId = genBookingId();

    const resolvedStudentName =
      (studentName && String(studentName).trim()) ||
      (email && String(email).trim()) ||
      `User-${String(userId).slice(0, 8)}`;

    const basePayload = {
      bookingId,
      clerkUserId: userId,
      studentName: resolvedStudentName,
      course: courseId,
      courseName,
      teacherName,
      price: numericPrice,
      paymentMethod: "Online",
      paymentStatus: "Unpaid",
      notes,
      orderStatus: "Pending",
      createdAt: new Date(),
    };

    if (numericPrice === 0) {
      const booking = await Booking.create({
        ...basePayload,
        paymentStatus: "Paid",
        orderStatus: "Confirmed",
        paidAt: new Date(),
      });
      return res
        .status(201)
        .json({ success: true, booking, checkoutUrl: null });
    }

    if (!stripe) {
      return res
        .status(500)
        .json({ success: false, message: "Stripe not configured on server" });
    }

    const base = buildFrontendBase(req);
    if (!base) {
      return res.status(500).json({
        success: false,
        message:
          "Frontend URL not determined. Set FRONTEND_URL or send an Origin header.",
      });
    }

    const successUrl = `${base}/booking/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${base}/booking/cancel`;

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: email || undefined,
        line_items: [
          {
            price_data: {
              currency: "npr",
              product_data: { name: courseName },
              unit_amount: Math.round(numericPrice * 100),
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          bookingId,
          courseId,
          clerkUserId: userId,
          studentName: resolvedStudentName,
        },
      });
    } catch (stripeErr) {
      console.error("Stripe create session error:", stripeErr);
      const message =
        stripeErr?.raw?.message || stripeErr?.message || "Stripe error";
      return res.status(502).json({
        success: false,
        message: `Payment provider error: ${message}`,
      });
    }

    try {
      const booking = await Booking.create({
        ...basePayload,
        sessionId: session.id,
        paymentIntentId: session.payment_intent || null,
      });
      return res
        .status(201)
        .json({ success: true, booking, checkoutUrl: session.url || null });
    } catch (dbErr) {
      console.error("DB error saving booking after stripe session:", dbErr);
      return res
        .status(500)
        .json({ success: false, message: "Failed to create booking record" });
    }
  } catch (err) {
    console.error("createBooking unexpected:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const confirmPayment = async (req, res) => {
  try {
    const { userId } = getAuth(req) || {};
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    const { session_id } = req.query;
    if (!session_id)
      return res
        .status(400)
        .json({ success: false, message: "session_id is required" });

    if (!stripe)
      return res
        .status(500)
        .json({ success: false, message: "Stripe not configured" });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session)
      return res
        .status(400)
        .json({ success: false, message: "Invalid session" });

    if (session.payment_status !== "paid") {
      return res
        .status(400)
        .json({ success: false, message: "Payment not completed" });
    }

    let booking = await Booking.findOneAndUpdate(
      { sessionId: session_id },
      {
        paymentStatus: "Paid",
        paymentIntentId: session.payment_intent || null,
        orderStatus: "Confirmed",
        paidAt: new Date(),
      },
      { new: true },
    );

    if (!booking && session.metadata?.bookingId) {
      booking = await Booking.findOneAndUpdate(
        { bookingId: session.metadata.bookingId },
        {
          paymentStatus: "Paid",
          paymentIntentId: session.payment_intent || null,
          orderStatus: "Confirmed",
          paidAt: new Date(),
        },
        { new: true },
      );
    }

    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });

    return res.json({ success: true, booking });
  } catch (err) {
    console.error("confirmPayment: ", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getUserBooking = async (req, res) => {
  try {
    const { userId } = getAuth(req) || {};
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Unauthorized Access" });
    }
    const bookings = await Booking.find({ clerkUserId: userId })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, items: bookings });
  } catch (error) {
    console.log("Get User Bookings Error: ", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
};

export const getStats = async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const totalRevenueAgg = await Booking.aggregate([
      { $match: { paymentStatus: "Paid" } },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]);
    const totalRevenue = (totalRevenueAgg[0] && totalRevenueAgg[0].total) || 0;
    let sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const bookingsLastSevenDays = await Booking.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });
    const topCourses = await Booking.aggregate([
      {
        $group: {
          _id: "$courseName",
          count: { $sum: 1 },
          revenue: { $sum: "$price" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 6 },
      { $project: { courseName: "$_id", count: 1, revenue: 1, _id: 0 } },
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalBookings,
        totalRevenue,
        bookingsLastSevenDays,
        topCourses,
      },
    });
  } catch (error) {
    console.log("Get Stats Error: ", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
};

export const checkBooking = async (req, res) => {
  try {
    const { userId } = getAuth(req) || {};
    if (!userId) {
      return res
        .status(401)
        .json({
          success: false,
          error: "Unauthorized Access",
          enrolled: false,
          booking: null,
        });
    }
    const { courseId } = req.query;
    if (!courseId) {
      return res
        .status(400)
        .json({
          success: false,
          error: "courseId is required",
          enrolled: false,
          booking: null,
        });
    }
    const booking = await Booking.findOne({
      clerkUserId: userId,
      course: courseId,
    })
      .sort({ createdAt: -1 })
      .lean();
    if (!booking) {
      return res
        .status(200)
        .json({
          success: true,
          message: "You are not enrolled in this course",
          enrolled: false,
          booking: null,
        });
    }
    const paid =
      booking.paymentStatus === "Paid" ||
      booking.orderStatus === "paid" ||
      booking.orderStatus === "Confirmed" ||
      booking.orderStatus === "confirmed" ||
      !!booking.paidAt;
    return res
      .status(200)
      .json({
        success: true,
        message: "You are enrolled in this course",
        enrolled: !!paid,
        booking,
      });
  } catch (error) {
    console.log("Check Booking Error: ", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
};
