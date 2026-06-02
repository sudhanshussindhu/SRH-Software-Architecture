const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, ".env") });

const express = require("express");
const connectDB = require("./config/db");

const courseRoutes = require("./routes/courseRoute");

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json());

const { correlationIdMiddleware, getCorrelationId } = require("../correlationId");
const { courseServiceLogger } = require("../logging");

// Correlation ID middleware
app.use(correlationIdMiddleware);

// Request logging
app.use((req, res, next) => {
  courseServiceLogger.info(`${req.method} ${req.originalUrl} - cid:${getCorrelationId()}`);
  next();
});

app.use("/api/courses", courseRoutes);

// Error handler
app.use((err, req, res, next) => {
  courseServiceLogger.error(`Unhandled error: ${err && err.message} - cid:${getCorrelationId()}`);
  res.status(500).json({ message: "Internal Server Error" });
});

// Start server
const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
  courseServiceLogger.info(`Course Server running on port ${PORT}`);
});
