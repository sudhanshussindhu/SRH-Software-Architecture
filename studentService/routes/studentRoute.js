const express = require("express");

const Student = require("../models/student");
const { verifyRole, restrictStudentToOwnData, verifyJWTWithJWKS } = require("./auth/util");
const { ROLES, EVENTS } = require("../../consts");
const { publish } = require("../../eventBus");
const { parsePagination, paginatedResponse } = require("../../pagination");
const { studentServiceLogger: logger } = require("../../logging");

const router = express.Router();

// GET /api/students/internal
// Internal-only route used by authService to fetch students with password hashes for login.
// Protected by JWT service identity — only tokens with role AUTH_SERVICE are accepted.
router.get("/internal", async (req, res) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(403).json({ error: "Forbidden" });
    }
    try {
        const token = authHeader.split(" ")[1];
        const payload = await verifyJWTWithJWKS(token);
        if (!payload.roles.includes(ROLES.AUTH_SERVICE)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        const students = await Student.find().sort({ createdAt: -1 });
        return res.status(200).json(students);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Only admins, professors, enrollment service, and auth service can list all students
router.get("/", verifyRole([ROLES.ADMIN, ROLES.PROFESSOR, ROLES.ENROLLMENT_SERVICE, ROLES.AUTH_SERVICE]), async (req, res) => {
    try {
        const pagination = parsePagination(req.query);
        if (!pagination) {
            const students = await Student.find();
            return res.status(200).json(students);
        }
        const { page, limit, skip } = pagination;
        const [students, total] = await Promise.all([
            Student.find().skip(skip).limit(limit),
            Student.countDocuments(),
        ]);
        return res.status(200).json(paginatedResponse(students, total, { page, limit }));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// POST /api/students 
// Registers a new student. Public — no token required.
router.post("/", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
    }

    try {
        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();

        const existingStudent = await Student.findOne({ email: normalizedEmail });
        if (existingStudent) {
            return res.status(409).json({ error: "Email already exists" });
        }

        const student = await Student.create({
            name: normalizedName,
            email: normalizedEmail,
            password,
        });

        await publish(EVENTS.STUDENT_CREATED, { id: student._id, name: student.name, email: student.email });
        return res.status(201).json({
            id: student._id,
            name: student.name,
            email: student.email,
            createdAt: student.createdAt,
            updatedAt: student.updatedAt,
        });
    } catch (error) {
        if (error && error.code === 11000) {
            return res.status(409).json({ error: "Email already exists" });
        }
        return res.status(400).json({ error: error.message });
    }
});

// GET /api/students/:id
// Returns a single student by ID (password excluded).
// Admins and professors can fetch any student; students can only fetch their own record.
router.get(
    "/:id",
    verifyRole([ROLES.ADMIN, ROLES.PROFESSOR, ROLES.STUDENT, ROLES.ENROLLMENT_SERVICE, ROLES.GRADE_SERVICE]),
    restrictStudentToOwnData,
    async (req, res) => {
        try {
            const student = await Student.findById(req.params.id).select("-password");
            if (!student) {
                return res.status(404).json({ error: "Student not found" });
            }
            return res.status(200).json(student);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
);

// PUT /api/students/:id
// Updates a student's name or email.
// Password updates are excluded (use a dedicated change-password route).
// Admins can update any student; students can only update their own record.
router.put(
    "/:id",
    verifyRole([ROLES.ADMIN, ROLES.STUDENT]),
    restrictStudentToOwnData,
    async (req, res) => {
        const { name, email } = req.body;

        const updates = {};
        if (name) updates.name = name.trim();
        if (email) updates.email = email.trim().toLowerCase();

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No valid fields provided for update" });
        }

        try {
            const student = await Student.findByIdAndUpdate(
                req.params.id,
                { $set: updates },
                { new: true, runValidators: true }
            ).select("-password");

            if (!student) {
                return res.status(404).json({ error: "Student not found" });
            }
            await publish(EVENTS.STUDENT_UPDATED, { id: student._id });
            return res.status(200).json(student);
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({ error: "Email already exists" });
            }
            return res.status(400).json({ error: error.message });
        }
    }
);

// DELETE /api/v1/students/:id
// Permanently deletes a student record. Restricted to admins only.
router.delete("/:id", verifyRole([ROLES.ADMIN]), async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }
        await publish(EVENTS.STUDENT_DELETED, { id: student._id });
        return res.status(200).json({ message: "Student deleted successfully" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;

