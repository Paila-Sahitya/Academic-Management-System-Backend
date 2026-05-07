const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    enrollCourse,
    dropCourse,
    markAttendance,
    updateMarks,
    getMyEnrollments
} = require("../controllers/enrollmentController");

const router = express.Router();

router.post("/", protect, authorize("student"), enrollCourse);
router.delete("/:id/drop", protect, authorize("student"), dropCourse);
router.post("/attendance/:id", protect, authorize("faculty"), markAttendance);
router.put("/marks/:id", protect, authorize("faculty"), updateMarks);
router.get("/my", protect, authorize("student"), getMyEnrollments);

module.exports = router;