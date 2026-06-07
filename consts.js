// Base URL of each service — override per-environment via env vars
// (e.g. STUDENT_SERVICE_URL=http://student-service.internal:5003 in staging/prod).
// Falls back to localhost ports for local development.
const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:5001";
const PROFESSOR_SERVICE_BASE_URL = process.env.PROFESSOR_SERVICE_URL || "http://localhost:5002";
const STUDENT_SERVICE_BASE_URL = process.env.STUDENT_SERVICE_URL || "http://localhost:5003";
const COURSE_SERVICE_BASE_URL = process.env.COURSE_SERVICE_URL || "http://localhost:5004";
const ENROLLMENT_SERVICE_BASE_URL = process.env.ENROLLMENT_SERVICE_URL || "http://localhost:5005";
const GRADE_SERVICE_BASE_URL = process.env.GRADE_SERVICE_URL || "http://localhost:5006";

const AUTH_SERVICE = `${AUTH_SERVICE_BASE_URL}/api/v1/login`;

const PROFESSOR__SERVICE = `${PROFESSOR_SERVICE_BASE_URL}/api/v1/professors`;
const PROFESSOR_SERVICE_INTERNAL = `${PROFESSOR_SERVICE_BASE_URL}/api/v1/professors/internal`;

const STUDENT_SERVICE = `${STUDENT_SERVICE_BASE_URL}/api/v1/students`;
const STUDENT_SERVICE_INTERNAL = `${STUDENT_SERVICE_BASE_URL}/api/v1/students/internal`;

const COURSE_SERVICE = `${COURSE_SERVICE_BASE_URL}/api/v1/courses`;
const ENROLLMENT_SERVICE = `${ENROLLMENT_SERVICE_BASE_URL}/api/v1/enrollments`;
const GRADE_SERVICE = `${GRADE_SERVICE_BASE_URL}/api/v1/grades`;

const ROLES = Object.freeze({
  STUDENT: "student",
  PROFESSOR: "professor",
  ADMIN: "admin",
  AUTH_SERVICE: "auth_service",
  ENROLLMENT_SERVICE: "enrollment_service",
  GRADE_SERVICE: "grade_service",
});

const EVENTS = Object.freeze({
  STUDENT_CREATED: "student.created",
  STUDENT_UPDATED: "student.updated",
  STUDENT_DELETED: "student.deleted",
  PROFESSOR_CREATED: "professor.created",
  PROFESSOR_UPDATED: "professor.updated",
  PROFESSOR_DELETED: "professor.deleted",
  COURSE_CREATED: "course.created",
  COURSE_UPDATED: "course.updated",
  COURSE_DELETED: "course.deleted",
  ENROLLMENT_CREATED: "enrollment.created",
  ENROLLMENT_DELETED: "enrollment.deleted",
  GRADE_ASSIGNED: "grade.assigned",
  GRADE_UPDATED: "grade.updated",
});

module.exports = {
  AUTH_SERVICE_BASE_URL,
  PROFESSOR_SERVICE_BASE_URL,
  STUDENT_SERVICE_BASE_URL,
  COURSE_SERVICE_BASE_URL,
  ENROLLMENT_SERVICE_BASE_URL,
  GRADE_SERVICE_BASE_URL,
  AUTH_SERVICE,
  STUDENT_SERVICE,
  STUDENT_SERVICE_INTERNAL,
  PROFESSOR__SERVICE,
  PROFESSOR_SERVICE_INTERNAL,
  COURSE_SERVICE,
  ENROLLMENT_SERVICE,
  GRADE_SERVICE,
  ROLES,
  EVENTS,
};
