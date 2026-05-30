const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");
const { courseServiceLogger } = require("../logging");

const courseRoutes = require("./routes/courseRoute");

dotenv.config({ path: path.join(__dirname, ".env") });

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json());

app.use("/api/courses", courseRoutes);

// Start server
const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
  courseServiceLogger.info(`Course Server running on port ${PORT}`);
});
