const express=require("express");
const {protect, authorize}=require("../middleware/authMiddleware");

const {enrollCourse, updateMarks, updateAttendance, getMyEnrollments}=require("../controllers/enrollmentController");

const router=express.Router();

router.post("/", protect, authorize("student"), enrollCourse);

router.put("/marks/:id", protect, authorize("faculty"), updateMarks);

router.put("/attendance/:id", protect, authorize("faculty"), updateAttendance);

router.get("/my", protect, authorize("student"), getMyEnrollments);

module.exports=router;