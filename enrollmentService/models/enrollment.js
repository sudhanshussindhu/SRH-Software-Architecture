const mongoose = require("mongoose");

// Define the Enrollment Schema
const enrollmentSchema = new mongoose.Schema({});

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

module.exports = Enrollment;
