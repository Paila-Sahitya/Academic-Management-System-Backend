const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const createAdmin = require("./config/createAdmin");
const requestLogger = require("./middleware/requestLogger");
const errorHandler = require("./middleware/errorHandler");
const { globalLimiter, authLimiter } = require("./middleware/rateLimiter");

dotenv.config();
createAdmin();

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use("/api/", globalLimiter);
app.use("/api/auth/login", authLimiter);

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/course", require("./routes/courseRoutes"));
app.use("/api/enrollments", require("./routes/enrollmentRoutes"));
app.use("/api/performance", require("./routes/performanceRoutes"));
app.use("/api/appeals", require("./routes/appealRoutes"));
//health endpoints are public
app.use("/", require("./routes/healthRoutes"));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});