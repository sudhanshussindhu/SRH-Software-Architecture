const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");
const { studentServiceLogger } = require("../logging");

const studentRoute = require("./routes/studentRoute");

dotenv.config({ path: path.join(__dirname, ".env") });

// Initialize express app
const app = express();

// Middleware
app.use(express.json());

app.use("/api/students", studentRoute);

async function startServer() {
  try {
    // Connect to database before accepting requests.
    await connectDB();

    const PORT = process.env.PORT || 5003;
    app.listen(PORT, () => {
      studentServiceLogger.info(`Student Server running on port ${PORT}`);
    });
  } catch (error) {
    studentServiceLogger.error(`Failed to start student service: ${error.message}`);
    process.exit(1);
  }
}

startServer();
