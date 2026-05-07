const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    createDepartment,
    createDepartmentAdmin,
    getAllDepartments,
    getAllUsers
} = require("../controllers/adminController");

const router = express.Router();

router.post("/department", protect, authorize("admin"), createDepartment);

router.post("/dept-admin", protect, authorize("admin"), createDepartmentAdmin);

router.get("/departments", protect, getAllDepartments);

router.get("/users", protect, authorize("admin"), getAllUsers);

module.exports = router;