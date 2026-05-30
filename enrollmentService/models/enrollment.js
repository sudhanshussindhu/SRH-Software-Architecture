const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    student: { type: String, required: true },
    course: { type: String, required: true },
  },
  { timestamps: true }
);

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

module.exports = Enrollment;
