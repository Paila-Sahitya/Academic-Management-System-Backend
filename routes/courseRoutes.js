const express=require("express");
const {protect, authorize}=require("../middleware/authMiddleware");
const { createCourse, getCourses, deleteCourse}=require("../controllers/courseController");

const router=express.Router();

router.post("/", protect, authorize("admin"), createCourse);
router.get("/", protect, getCourses);
router.delete("/:id", protect, authorize("admin"), deleteCourse);

module.exports= router;