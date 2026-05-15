const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    createDepartment,
    createDepartmentAdmin,
    getAllDepartments,
    getAllUsers
} = require("../controllers/adminController");
const validate = require("../middleware/validate");
const {
    createDeptSchema,
    createDeptAdminSchema
} = require("../schemas/adminSchemas");

const router = express.Router();

router.post("/department", protect, authorize("admin"), validate(createDeptSchema), createDepartment);

router.post("/dept-admin", protect, authorize("admin"), validate(createDeptAdminSchema), createDepartmentAdmin);

router.get("/departments", protect, getAllDepartments);

router.get("/users", protect, authorize("admin"), getAllUsers);

module.exports = router;