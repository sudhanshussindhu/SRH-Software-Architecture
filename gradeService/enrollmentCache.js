const { subscribe } = require("../eventBus");
const { EVENTS } = require("../consts");

// Maps "studentId:courseId" → enrollmentId
// Populated by enrollment.created / enrollment.deleted events.
// On a cache miss the grade route falls back to a synchronous HTTP call.
const cache = new Map();

function init() {
  subscribe(EVENTS.ENROLLMENT_CREATED, ({ student, course, enrollmentId }) => {
    cache.set(`${student}:${course}`, enrollmentId);
  });
  subscribe(EVENTS.ENROLLMENT_DELETED, ({ student, course }) => {
    cache.delete(`${student}:${course}`);
  });
}

function getEnrollmentId(studentId, courseId) {
  return cache.get(`${studentId}:${courseId}`) || null;
}

module.exports = { init, getEnrollmentId };
