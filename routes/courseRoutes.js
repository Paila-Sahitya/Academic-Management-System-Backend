const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    createCourse,
    getCourses,
    updateCourse,
    deleteCourse
} = require("../controllers/courseController");
const validate = require("../middleware/validate");
const { createCourseSchema, updateCourseSchema } = require("../schemas/courseSchemas");

const router = express.Router();

router.post("/", protect, authorize("admin", "department_admin"), validate(createCourseSchema), createCourse);
router.get("/", protect, getCourses);
router.put("/:id", protect, authorize("admin", "department_admin"), validate(updateCourseSchema), updateCourse);
router.delete("/:id", protect, authorize("admin", "department_admin"), deleteCourse);

module.exports = router;