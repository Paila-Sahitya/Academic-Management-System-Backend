const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const createAdmin = require("./config/createAdmin");

dotenv.config();
createAdmin();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/course", require("./routes/courseRoutes"));
app.use("/api/enrollments", require("./routes/enrollmentRoutes"));
app.use("/api/performance", require("./routes/performanceRoutes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});