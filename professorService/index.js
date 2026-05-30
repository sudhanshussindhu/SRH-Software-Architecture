const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");
const { courseServiceLogger: professorServiceLogger } = require("../logging");

const professorRoute = require("./routes/professorRoute");

dotenv.config({ path: path.join(__dirname, ".env") });

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json());

app.use("/api/professors", professorRoute);

// Start server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  professorServiceLogger.info(`Professor Server running on port ${PORT}`);
});
