const express = require("express");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const { authServiceLogger } = require("../../../logging");

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
      sub: student._id,
      role: ROLES.STUDENT,
    });

    authServiceLogger.info(`Student login successful: ${student._id}`);
    res.status(201).json({ access_token: token });

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
      sub: professor._id,
      role: ROLES.PROFESSOR,
    });

    authServiceLogger.info(`Professor login successful: ${professor._id}`);
    res.status(201).json({ access_token: token });

  } catch (error) {
    authServiceLogger.error(`Professor login error: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
