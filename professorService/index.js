const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, ".env") });

const express = require("express");
const connectDB = require("./config/db");

const professorRoute = require("./routes/professorRoute");

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json());

const { correlationIdMiddleware, getCorrelationId } = require("../correlationId");
const { professorServiceLogger } = require("../logging");

// Correlation ID middleware
app.use(correlationIdMiddleware);

// Request logging
app.use((req, res, next) => {
  professorServiceLogger.info(`${req.method} ${req.originalUrl} - cid:${getCorrelationId()}`);
  next();
});

app.use("/api/v1/professors", professorRoute);

// Error handler
app.use((err, req, res, next) => {
  professorServiceLogger.error(`Unhandled error: ${err && err.message} - cid:${getCorrelationId()}`);
  res.status(500).json({ message: "Internal Server Error" });
});

const { connect } = require("../eventBus");

// Start server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  professorServiceLogger.info(`Professor Server running on port ${PORT}`);
  connect(professorServiceLogger);
});
