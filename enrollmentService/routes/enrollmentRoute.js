const express = require("express");

const Enrollment = require("../models/enrollment");
const { enrollementServiceLogger } = require("../../logging");

const router = express.Router();

const {
  verifyRole,
  restrictStudentToOwnData,
  restrictEnrollmentToProfessorCourse,
  fetchStudents,
  fetchCourses,
} = require("./auth/util");
const { ROLES } = require("../../consts");

// Create a new enrollment
router.post(
  "/",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  restrictEnrollmentToProfessorCourse,
  async (req, res) => {
    try {
      const { student, course } = req.body;

      // Ensure both student and course IDs are provided
      if (!student || !course) {
        return res
          .status(400)
          .json({ message: "Student and Course are required" });
      }

      const existing = await Enrollment.findOne({ student, course });
      if (existing) {
        return res
          .status(409)
          .json({ message: "Student is already enrolled in this course" });
      }

      const enrollment = new Enrollment({ student, course });
      await enrollment.save();
      enrollementServiceLogger.info(`Enrollment created: student=${student} course=${course}`);
      res.status(201).json(enrollment);
    } catch (error) {
      enrollementServiceLogger.error(`Create enrollment error: ${error.message}`);
      res.status(500).json({
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
      let enrollments = await Enrollment.find();
      res.status(200).json(enrollments);
    } catch (error) {
      res.status(500).json({
        message: "Server Error: Unable to fetch enrollments",
      });
    }
  }
);

// Get enrollment by student ID
router.get(
  "/student/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR, ROLES.STUDENT]),
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
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
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

      const [students, courses] = await Promise.all([
        fetchStudents(),
        fetchCourses(),
      ]);

      const enrollmentObj = enrollment.toObject();
      const student = students.find(
        (student) => student._id.toString() === enrollmentObj.student.toString()
      );
      const course = courses.find(
        (course) => course._id.toString() === enrollmentObj.course.toString()
      );

      if (student) {
        enrollmentObj.student = student;
      }

      if (course) {
        enrollmentObj.course = course;
      }

      res.status(200).json(enrollmentObj);
    } catch (error) {
      res.status(500).json({
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
