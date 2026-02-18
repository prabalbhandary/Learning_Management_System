import Course from "../models/courseModel.js";
import { getAuth } from "@clerk/express";
import fs from "fs";
import path from "path";

const toNumber = (v, fallback = 0) => {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const parseJSONSafe = (maybe) => {
  if (!maybe) return null;
  if (typeof maybe === "object") return maybe;
  try {
    return JSON.parse(maybe);
  } catch {
    return null;
  }
};

const computeDerivedFields = (courseObj) => {
  let totalCourseMinutes = 0;
  if (!Array.isArray(courseObj.lectures)) courseObj.lectures = [];

  courseObj.lectures = courseObj.lectures.map((lec) => {
    lec = { ...lec };
    lec.duration = lec.duration || {};
    lec.chapters = Array.isArray(lec.chapters) ? lec.chapters : [];

    lec.chapters = lec.chapters.map((ch) => {
      ch = { ...ch };
      ch.duration = ch.duration || {};
      const chHours = toNumber(ch.duration.hours);
      const chMins = toNumber(ch.duration.minutes);
      ch.totalMinutes = ch.totalMinutes
        ? toNumber(ch.totalMinutes)
        : chHours * 60 + chMins;

      ch.duration.hours = chHours;
      ch.duration.minutes = chMins;
      ch.name = ch.name || "";
      ch.topic = ch.topic || "";
      ch.videoUrl = ch.videoUrl || "";

      return ch;
    });

    const lecHours = toNumber(lec.duration.hours);
    const lecMins = toNumber(lec.duration.minutes);
    const lectureOwnMinutes = lecHours * 60 + lecMins;
    const chaptersMinutes = lec.chapters.reduce(
      (s, c) => s + toNumber(c.totalMinutes, 0),
      0,
    );

    lec.totalMinutes = lectureOwnMinutes + chaptersMinutes;

    lec.duration.hours = lecHours;
    lec.duration.minutes = lecMins;

    totalCourseMinutes += lec.totalMinutes;
    lec.title = lec.title || "Untitled lecture";

    return lec;
  });

  courseObj.totalDuration = courseObj.totalDuration || {};
  courseObj.totalDuration.hours = Math.floor(totalCourseMinutes / 60);
  courseObj.totalDuration.minutes = totalCourseMinutes % 60;
  courseObj.totalLectures = Array.isArray(courseObj.lectures)
    ? courseObj.lectures.length
    : 0;

  return courseObj;
};
const makeImageAbsolute = (rawImage, req) => {
  if (!rawImage) return "";
  const image = String(rawImage || "");
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("/")) {
    return `${req.protocol}://${req.get("host")}${image}`;
  }
  if (image.startsWith("uploads/")) {
    return `${req.protocol}://${req.get("host")}/${image}`;
  }
  return `${req.protocol}://${req.get("host")}/uploads/${image}`;
};

export const getPublicCourses = async (req, res) => {
  try {
    const { home, type = "all", limit } = req.query;
    let filter = {};
    if (home === "true") {
      filter.courseType = "top";
    } else if (type === "top") {
      filter.courseType = "top";
    } else if (type === "regular") {
      filter.courseType = "regular";
    }
    const q = Course.find(filter).sort({ createdAt: -1 });
    if (home === "true") {
      q.limit(Number(limit) || 8);
    } else if (limit) {
      q.limit(Number(limit));
    }
    const courses = await q.lean();
    const mapped = courses.map((c) => {
      const imageUrl = makeImageAbsolute(c.image || "", req);
      return {
        ...c,
        image: imageUrl,
      };
    });
    return res.status(200).json({
      success: true,
      items: mapped,
    });
  } catch (e) {
    console.error("Get Public Courses Error: ", e);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 }).lean();
    const mapped = courses.map((c) => ({
      ...c,
      image: makeImageAbsolute(c.image || "", req),
    }));
    return res.status(200).json({
      success: true,
      items: mapped,
    });
  } catch (e) {
    console.error("Get Courses Error: ", e);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id).lean();
    if (!course) {
      return res.status(404).json({
        success: false,
        error: "Course not found",
      });
    }
    course.image = makeImageAbsolute(course.image || "", req);
    return res.status(200).json({
      success: true,
      course,
    });
  } catch (e) {
    console.error("Get Course By Id Error: ", e);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

export const createCourse = async (req, res) => {
  try {
    const body = req.body || {};
    const imagePath = req.file
      ? `/uploads/${req.file.filename}`
      : body.image || "";
    const priceParsed = parseJSONSafe(body.price) ?? (body.price || {});
    const price = {
      original: toNumber(priceParsed.original ?? body["price.original"] ?? 0),
      sale: toNumber(priceParsed.sale ?? body["price.sale"] ?? 0),
    };
    let lectures = parseJSONSafe(body.lectures) ?? body.lectures ?? [];
    if (!Array.isArray(lectures)) lectures = [];
    lectures = lectures.map((lec) => {
      const lecture = { ...lec };
      lecture.duration = lecture.duration || {};
      lecture.duration.hours = toNumber(lecture.duration.hours);
      lecture.duration.minutes = toNumber(lecture.duration.minutes);
      lecture.chapters = Array.isArray(lecture.chapters)
        ? lecture.chapters
        : [];
      lecture.chapters = lecture.chapters.map((ch) => ({
        ...ch,
        duration: {
          hours: toNumber(ch.duration?.hours),
          minutes: toNumber(ch.duration?.minutes),
        },
        totalMinutes: toNumber(ch.totalMinutes, 0),
        videoUrl: ch.videoUrl || "",
        name: ch.name || "",
        topic: ch.topic || "",
      }));
      return {
        ...lecture,
        title: lecture.title || "Untitled lecture",
        totalMinutes: toNumber(lecture.totalMinutes, 0),
      };
    });
    const courseObj = {
      name: body.name || "",
      teacher: body.teacher || "",
      image: imagePath,
      rating: toNumber(body.rating, 0),
      pricingType: body.pricingType || "free",
      price,
      overview: body.overview || body.description || "",
      totalDuration: parseJSONSafe(body.totalDuration) ?? {
        hours: toNumber(body["totalDuration.hours"]),
        minutes: toNumber(body["totalDuration.minutes"]),
      },
      totalLectures: toNumber(body.totalLectures, lectures.length),
      lectures,
      courseType: body.courseType || "regular",
      category: body.category || null,
      createdBy: body.createdBy || null,
    };
    computeDerivedFields(courseObj);
    const course = new Course(courseObj);
    await course.save();
    const returned = course.toObject();
    returned.image = makeImageAbsolute(returned.image || "", req);
    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      course: returned,
    });
  } catch (e) {
    console.log("Create Course Error: ", e);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
    1;
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: "Course not found",
      });
    }
    try {
      if (course.image && !course.image.startsWith("http")) {
        const filePath = path.join(
          process.cwd(),
          course.image.startsWith("/") ? course.image.slice(1) : course.image,
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (e) {
      console.log("Delete Course Image Error: ", e);
      return res.status(500).json({
        success: false,
        error: "Course image could not be deleted",
      });
    }
    await course.deleteOne();
    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (e) {
    console.log("Delete Course Error: ", e);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

export const rateCourse = async (req, res) => {
  try {
    const { userId } = getAuth(req) || {};
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized Access",
      });
    }
    const { courseId } = req.params;
    const { rating: rawRating, comment = "" } = req.body;
    const rating = Number(rawRating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: "Invalid rating",
      });
    }
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: "Course not found",
      });
    }
    const idx = (course.ratings || []).findIndex(
      (r) => String(r.userId) === String(userId),
    );

    if (idx >= 0) {
      course.ratings[idx].rating = rating;
      if (typeof comment === "string" && comment.trim().length) {
        course.ratings[idx].comment = comment.trim();
      }
      course.ratings[idx].updatedAt = new Date();
    } else {
      course.ratings.push({
        userId,
        rating,
        comment: typeof comment === "string" ? comment.trim() : "",
      });
    }

    const ratingsArr = course.ratings || [];
    const totalRatings = ratingsArr.length;
    const sum = ratingsArr.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    const avgRating =
      totalRatings === 0 ? 0 : Number((sum / totalRatings).toFixed(2));
    course.totalRatings = totalRatings;
    course.avgRating = avgRating;
    await course.save();
    return res.status(200).json({
      success: true,
      avgRating: course.avgRating,
      totalRatings: course.totalRatings,
      myRating: { userId, rating },
    });
  } catch (err) {
    console.error("rateCourse error:", err);
    if (err && err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMyRating = async (req, res) => {
  try {
    const { userId } = getAuth(req) || {};
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized Access",
      });
    }
    const { courseId } = req.params;
    const course = await Course.findById(courseId).lean();
    if (!course) {
      return res.status(404).json({
        success: false,
        error: "Course not found",
      });
    }
    const my =
      (course.ratings || []).find((r) => String(r.userId) === String(userId)) ||
      null;
    return res.status(200).json({
      success: true,
      myRating: my ? { rating: my.rating, comment: my.comment } : null,
    });
  } catch (e) {
    console.log("Get My Course Rating Error: ", e);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};
