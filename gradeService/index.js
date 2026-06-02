const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

const gradeRoutes = require("./routes/gradeRoute");
const publicKeyRoute = require("./routes/auth/publicKeyRoute");

const { correlationIdMiddleware, getCorrelationId } = require("../correlationId");
const { gradeServiceLogger } = require("../logging");

dotenv.config();

const app = express();

connectDB();

app.use(express.json());

app.use(correlationIdMiddleware);

app.use((req, res, next) => {
  gradeServiceLogger.info(
    `${req.method} ${req.originalUrl} - cid:${getCorrelationId()}`
  );
  next();
});

app.use("/.well-known/jwks.json", publicKeyRoute);
app.use("/api/grades", gradeRoutes);

app.use((err, req, res, next) => {
  gradeServiceLogger.error(
    `Unhandled error: ${err && err.message} - cid:${getCorrelationId()}`
  );
  res.status(500).json({ message: "Internal Server Error" });
});

const PORT = process.env.PORT || 5006;
app.listen(PORT, () => {
  gradeServiceLogger.info(`Grade Server running on port ${PORT}`);
});
