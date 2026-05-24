const express = require("express");
const Professor = require("../models/professor");
const bcrypt = require("bcrypt");
const { verifyRole, restrictProfessorToOwnData } = require("./auth/util");
const { ROLES } = require("../../consts");
const router = express.Router();

// GET /api/professors/internal
// Internal-only route used by authService to fetch professors with password hashes for login.
// Protected by a shared secret header (x-internal-secret) — never expose this publicly.
router.get("/internal", async (req, res) => {
  if (req.headers["x-internal-secret"] !== process.env.INTERNAL_SERVICE_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const professors = await Professor.find().sort({ createdAt: -1 });
    return res.status(200).json(professors);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
// GET /api/professors
// Returns all professors (sorted newest first).
// Restricted to admins and students — students need to see who teaches them.
router.get("/", verifyRole([ROLES.ADMIN, ROLES.STUDENT]), async (_req, res) => {
  try {
    const professors = await Professor.find()
      .select("-password")
      .sort({ createdAt: -1 });
    return res.status(200).json(professors);
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
      return res.status(200).json(professor);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ error: "Email or phone already exists" });
      }
      return res.status(400).json({ error: error.message });
    }
  }
);

// DELETE /api/professors/:id
// Permanently deletes a professor record. Restricted to admins only.
router.delete("/:id", verifyRole([ROLES.ADMIN]), async (req, res) => {
  try {
    const professor = await Professor.findByIdAndDelete(req.params.id);
    if (!professor) {
      return res.status(404).json({ error: "Professor not found" });
    }
    return res.status(200).json({ message: "Professor deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;

