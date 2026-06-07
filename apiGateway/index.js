const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, ".env") });

const express = require("express");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");

const { correlationIdMiddleware, getCorrelationId } = require("../correlationId");
const { gatewayLogger } = require("../logging");
const {
  AUTH_SERVICE_BASE_URL,
  PROFESSOR_SERVICE_BASE_URL,
  STUDENT_SERVICE_BASE_URL,
  COURSE_SERVICE_BASE_URL,
  ENROLLMENT_SERVICE_BASE_URL,
  GRADE_SERVICE_BASE_URL,
} = require("../consts");

const app = express();

// Correlation ID middleware (adds/propagates `x-correlation-id`)
app.use(correlationIdMiddleware);

// Rate limiting — enforced once at the edge for all traffic into the system,
// instead of relying on every backend service to configure it identically.
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // higher than a single service's limit since this covers all of them
  message: "Too many requests from this IP, please try again later",
  headers: true,
});
app.use(limiter);

// Request logging
app.use((req, res, next) => {
  gatewayLogger.info(`${req.method} ${req.originalUrl} - cid:${getCorrelationId()}`);
  next();
});

// Carries the correlation ID across the proxy hop so traces stay linked end-to-end
const propagateCorrelationId = (proxyReq) => {
  proxyReq.setHeader("x-correlation-id", getCorrelationId());
};

// Routing table: public path prefix -> backend service base URL.
// `pathFilter` is matched against the original request path, and the proxy
// forwards that same path on to the target — nothing is stripped or rewritten,
// so backend services see requests exactly as they would if called directly.
const routes = [
  { name: "authService", pathFilter: "/api/v1/login", target: AUTH_SERVICE_BASE_URL },
  { name: "professorService", pathFilter: "/api/v1/professors", target: PROFESSOR_SERVICE_BASE_URL },
  { name: "studentService", pathFilter: "/api/v1/students", target: STUDENT_SERVICE_BASE_URL },
  { name: "courseService", pathFilter: "/api/v1/courses", target: COURSE_SERVICE_BASE_URL },
  { name: "enrollmentService", pathFilter: "/api/v1/enrollments", target: ENROLLMENT_SERVICE_BASE_URL },
  { name: "gradeService", pathFilter: "/api/v1/grades", target: GRADE_SERVICE_BASE_URL },
];

routes.forEach(({ name, pathFilter, target }) => {
  app.use(
    createProxyMiddleware({
      target,
      pathFilter,
      changeOrigin: true,
      on: {
        proxyReq: propagateCorrelationId,
        error: (err, req, res) => {
          gatewayLogger.error(`Proxy error forwarding to ${name} (${target}): ${err.message} - cid:${getCorrelationId()}`);
          res.status(502).json({ message: `Bad Gateway: ${name} is unreachable` });
        },
      },
    })
  );
});

// Anything that doesn't match a known service prefix
app.use((req, res) => {
  gatewayLogger.warn(`No route matches ${req.originalUrl} - cid:${getCorrelationId()}`);
  res.status(404).json({ message: "Not Found" });
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  gatewayLogger.info(`API Gateway running on port ${PORT}`);
});
