const express = require("express");

const Enrollment = require("../models/enrollment");
const router = express.Router();

const {
  verifyRole,
  restrictStudentToOwnData,
  fetchStudents,
  fetchStudentById,
  fetchCourses,
  fetchCourseById,
} = require("./auth/util");
const { ROLES, EVENTS } = require("../../consts");
const { publish } = require("../../eventBus");
const { parsePagination, paginatedResponse } = require("../../pagination");
const { enrollementServiceLogger: logger } = require("../../logging");

// Create a new enrollment
router.post(
  "/",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  async (req, res) => {
    try {
      const { student, course } = req.body;

      if (!student || !course) {
        return res
          .status(400)
          .json({ message: "Student and Course are required" });
      }

      // Verify if student exists
      try {
        await fetchStudentById(student);
      } catch (err) {
        return res
          .status(404)
          .json({ message: `Student not found: ${err.message}` });
      }

      // Verify if course exists
      try {
        await fetchCourseById(course);
      } catch (err) {
        return res
          .status(404)
          .json({ message: `Course not found: ${err.message}` });
      }

      // Check if student is already enrolled in this course
      const existingEnrollment = await Enrollment.findOne({ student, course });
      if (existingEnrollment) {
        return res
          .status(400)
          .json({ message: "Student is already enrolled in this course" });
      }

      const newEnrollment = new Enrollment({ student, course });
      const savedEnrollment = await newEnrollment.save();
      await publish(EVENTS.ENROLLMENT_CREATED, {
        student: savedEnrollment.student.toString(),
        course: savedEnrollment.course.toString(),
        enrollmentId: savedEnrollment._id.toString(),
      });
      return res.status(201).json(savedEnrollment);
    } catch (error) {
      logger.error(`Failed to create enrollment: ${error.message}`);
      return res.status(500).json({
        message: "Server Error: Unable to create enrollment",
      });
    }
  }
);
// Get all enrollments
router.get(
  "/",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  async (req, res) => {
    try {
      const pagination = parsePagination(req.query);
      if (!pagination) {
        const enrollments = await Enrollment.find();
        return res.status(200).json(enrollments);
      }
      const { page, limit, skip } = pagination;
      const [enrollments, total] = await Promise.all([
        Enrollment.find().skip(skip).limit(limit),
        Enrollment.countDocuments(),
      ]);
      return res.status(200).json(paginatedResponse(enrollments, total, { page, limit }));
    } catch (error) {
      return res.status(500).json({
        message: "Server Error: Unable to fetch enrollments",
      });
    }
  }
);

// Lookup specific enrollment by student and course (Admin and Grade Service only)
// Put before /:id so it doesn't match /:id route
router.get(
  "/lookup",
  verifyRole([ROLES.ADMIN, ROLES.GRADE_SERVICE]),
  async (req, res) => {
    try {
      const { student, course } = req.query;
      if (!student || !course) {
        return res
          .status(400)
          .json({ message: "Student and Course parameters are required" });
      }
      const enrollment = await Enrollment.findOne({ student, course });
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      return res.status(200).json(enrollment);
    } catch (error) {
      return res.status(500).json({
        message: "Server Error: Unable to lookup enrollment",
      });
    }
  }
);

// Get enrollment by student ID
router.get(
  "/student/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR, ROLES.STUDENT, ROLES.GRADE_SERVICE]),
  restrictStudentToOwnData,
  async (req, res) => {
    try {
      let enrollments = await Enrollment.find({
        student: req.params.id,
      });

      if (!enrollments.length) {
        return res
          .status(404)
          .json({ message: "No enrollments found for this student" });
      }

      const courses = await fetchCourses();
      enrollments = enrollments.map((enrollment) => {
        const enrollmentObj = enrollment.toObject();
        const course = courses.find(
          (course) => course._id.toString() === enrollmentObj.course.toString()
        );
        if (course) {
          enrollmentObj.course = course;
        }
        return enrollmentObj;
      });

      res.status(200).json(enrollments);
    } catch (error) {
      res.status(500).json({
        message: "Server Error: Unable to fetch enrollments for student",
      });
    }
  }
);

// Get enrollment by course ID
router.get(
  "/course/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR, ROLES.GRADE_SERVICE]),
  async (req, res) => {
    try {
      const enrollments = await Enrollment.find({ course: req.params.id });
      if (!enrollments.length) {
        return res
          .status(404)
          .json({ message: "No enrollments found for this course" });
      }

      const students = await fetchStudents();
      const enriched = enrollments.map((enrollment) => {
        const enrollmentObj = enrollment.toObject();
        const student = students.find(
          (s) => s._id.toString() === enrollmentObj.student.toString()
        );
        if (student) {
          enrollmentObj.student = student;
        }
        return enrollmentObj;
      });

      res.status(200).json(enriched);
    } catch (error) {
      res.status(500).json({
        message: "Server Error: Unable to fetch enrollments for course",
      });
    }
  }
);

// Get a specific enrollment by ID
router.get(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  async (req, res) => {
    try {
      const enrollment = await Enrollment.findById(req.params.id);

      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      return res.status(200).json(enrollment);
    } catch (error) {
      if (error.kind === "ObjectId") {
        return res
          .status(400)
          .json({ message: "Invalid enrollment ID format" });
      }
      return res.status(500).json({
        message: "Server Error: Unable to fetch enrollment",
      });
    }
  }
);

// Delete an enrollment by ID
router.delete(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  async (req, res) => {
    try {
      const enrollment = await Enrollment.findByIdAndDelete(req.params.id);

      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      await publish(EVENTS.ENROLLMENT_DELETED, {
        student: enrollment.student.toString(),
        course: enrollment.course.toString(),
        enrollmentId: enrollment._id.toString(),
      });
      res
        .status(200)
        .json({ message: "Enrollment deleted successfully", enrollment });
    } catch (error) {
      if (error.kind === "ObjectId") {
        return res
          .status(400)
          .json({ message: "Invalid enrollment ID format" });
      }
      res.status(500).json({
        message: "Server Error: Unable to delete enrollment",
      });
    }
  }
);

module.exports = router;
