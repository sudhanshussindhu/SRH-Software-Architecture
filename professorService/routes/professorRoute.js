const express = require("express");
const Professor = require("../models/professor");
const bcrypt = require("bcrypt");
const { verifyRole, restrictProfessorToOwnData, verifyJWTWithJWKS } = require("./auth/util");
const { ROLES, EVENTS } = require("../../consts");
const { publish } = require("../../eventBus");
const { parsePagination, paginatedResponse } = require("../../pagination");
const router = express.Router();

// GET /api/professors/internal
// Internal-only route used by authService to fetch professors with password hashes for login.
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
    const professors = await Professor.find().sort({ createdAt: -1 });
    return res.status(200).json(professors);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
// GET /api/professors
// Returns all professors (sorted newest first).
// Restricted to admins and students — students need to see who teaches them.
router.get("/", verifyRole([ROLES.ADMIN, ROLES.AUTH_SERVICE]), async (req, res) => {
  try {
    const pagination = parsePagination(req.query);
    if (!pagination) {
      const professors = await Professor.find();
      return res.status(200).json(professors);
    }
    const { page, limit, skip } = pagination;
    const [professors, total] = await Promise.all([
      Professor.find().skip(skip).limit(limit),
      Professor.countDocuments(),
    ]);
    return res.status(200).json(paginatedResponse(professors, total, { page, limit }));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/professors
// Registers a new professor. Public — no token required.
// Validates required fields, rejects duplicate email or phone.
router.post("/", async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: "Name, email, phone, and password are required" });
  }

  try {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    const existing = await Professor.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });
    if (existing) {
      const field = existing.email === normalizedEmail ? "Email" : "Phone";
      return res.status(409).json({ error: `${field} already exists` });
    }

    const professor = await Professor.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      password,
    });

    await publish(EVENTS.PROFESSOR_CREATED, { id: professor._id, name: professor.name, email: professor.email });
    return res.status(201).json({
      id: professor._id,
      name: professor.name,
      email: professor.email,
      phone: professor.phone,
      createdAt: professor.createdAt,
      updatedAt: professor.updatedAt,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Email or phone already exists" });
    }
    return res.status(400).json({ error: error.message });
  }
});

// GET /api/professors/:id
// Returns a single professor by ID (password excluded).
// Admins can fetch any professor; professors can only fetch their own record.
router.get(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  restrictProfessorToOwnData,
  async (req, res) => {
    try {
      const professor = await Professor.findById(req.params.id).select("-password");
      if (!professor) {
        return res.status(404).json({ error: "Professor not found" });
      }
      return res.status(200).json(professor);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// PUT /api/professors/:id
// Updates a professor's name, email, or phone.
// Password updates are intentionally excluded here (use a dedicated change-password route).
// Admins can update any professor; professors can only update their own record.
router.put(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  restrictProfessorToOwnData,
  async (req, res) => {
    const { name, email, phone } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (email) updates.email = email.trim().toLowerCase();
    if (phone) updates.phone = phone.trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields provided for update" });
    }

    try {
      const professor = await Professor.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select("-password");

      if (!professor) {
        return res.status(404).json({ error: "Professor not found" });
      }
      await publish(EVENTS.PROFESSOR_UPDATED, { id: professor._id });
      return res.status(200).json(professor);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ error: "Email or phone already exists" });
      }
      return res.status(400).json({ error: error.message });
    }
  }
);

// DELETE /api/v1/professors/:id
// Permanently deletes a professor record. Restricted to admins only.
router.delete("/:id", verifyRole([ROLES.ADMIN]), async (req, res) => {
  try {
    const professor = await Professor.findByIdAndDelete(req.params.id);
    if (!professor) {
      return res.status(404).json({ error: "Professor not found" });
    }
    await publish(EVENTS.PROFESSOR_DELETED, { id: professor._id });
    return res.status(200).json({ message: "Professor deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;

