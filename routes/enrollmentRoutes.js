const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    enrollCourse,
    dropCourse,
    markAttendance,
    updateMarks,
    getMyEnrollments
} = require("../controllers/enrollmentController");
const validate = require("../middleware/validate");
const {
    enrollSchema,
    marksSchema,
    attendanceSchema
} = require("../schemas/enrollmentSchemas");
const {
    enrollLimiter,
    marksLimiter,
    attendanceLimiter
} = require("../middleware/rateLimiter");


const router = express.Router();

router.post("/", protect, authorize("student"), enrollLimiter, validate(enrollSchema),enrollCourse);
router.delete("/:id/drop", protect, authorize("student"), dropCourse);
router.post("/attendance/:id", protect, authorize("faculty"), attendanceLimiter, validate(attendanceSchema), markAttendance);
router.put("/marks/:id", protect, authorize("faculty"), marksLimiter, validate(marksSchema), updateMarks);
router.get("/my", protect, authorize("student"), getMyEnrollments);

module.exports = router;