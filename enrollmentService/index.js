const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");
const { enrollementServiceLogger } = require("../logging");

const enrollmentRoutes = require("./routes/enrollmentRoute");

const publicKeyRoute = require("./routes/auth/publicKeyRoute");

dotenv.config({ path: path.join(__dirname, ".env") });

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json());

app.use("/.well-known/jwks.json", publicKeyRoute);
app.use("/api/enrollments", enrollmentRoutes);

// Start server
const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  enrollementServiceLogger.info(`Enrollment running on port ${PORT}`);
});
