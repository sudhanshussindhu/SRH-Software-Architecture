const express = require("express");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const axios = require("axios");
const { authServiceLogger } = require("../../../logging");
const { getCorrelationId } = require("../../../correlationId");

const {
  generateJWTWithPrivateKey,
  fetchStudents,
  fetchProfessors,
} = require("./util");
const { ROLES } = require("../../../consts");


const router = express.Router();

dotenv.config();

// Student Login
router.post("/student", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Get the list of students from the student service
    const students = await fetchStudents();

    // Find the student with the provided email
    const student = students.find((s) => s.email === email);
    if (!student) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = generateJWTWithPrivateKey({
      id: student._id,
      roles: [ROLES.STUDENT],
    });

    authServiceLogger.info(`Student login successful: ${student._id}`);
    return res.status(201).json({ access_token: token });

  } catch (error) {
    authServiceLogger.error(`Student login error: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
});

// Professor Login
router.post("/professor", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Get the list of professors from the professor service
    const professors = await fetchProfessors();

    // Find the professor with the provided email
    const professor = professors.find((p) => p.email === email);
    if (!professor) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, professor.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = generateJWTWithPrivateKey({
      id: professor._id,
      roles: [ROLES.PROFESSOR],
    });

    authServiceLogger.info(`Professor login successful: ${professor._id}`);
    return res.status(200).json({ access_token: token });

  } catch (error) {
    authServiceLogger.error(`Professor login error: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin Login
router.post("/admin", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const adminEmail = "admin@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateJWTWithPrivateKey({
      id: "admin",
      roles: [ROLES.ADMIN],
    });

    authServiceLogger.info(`Admin login successful`);
    return res.status(200).json({ access_token: token });

  } catch (error) {
    authServiceLogger.error(`Admin login error: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

// Debug route to test correlation ID propagation across services
router.get("/debug/error-propagate", async (req, res) => {
  try {
    await axios.get("http://localhost:5999/boom", {
      headers: { "x-correlation-id": getCorrelationId() },
      timeout: 2000,
    });
    res.status(200).json({ message: "unexpectedly succeeded" });
  } catch (err) {
    authServiceLogger.error(`Debug outgoing error: ${err && err.message} - cid:${getCorrelationId()}`);
    res.status(500).json({ message: "Debug: propagated error (see logs for correlation id)" });
  }
});
