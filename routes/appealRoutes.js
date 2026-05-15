const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    submitAppeal,
    resolveAppeal,
    getMyAppeals,
    getDeptAppeals
} = require("../controllers/appealController");
const validate = require("../middleware/validate");
const {
    submitAppealSchema,
    resolveAppealSchema
} = require("../schemas/appealSchemas");

const router = express.Router();

router.post("/", protect, authorize("student"), validate(submitAppealSchema), submitAppeal);
router.put("/:id/resolve", protect, authorize("admin", "department_admin"), validate(resolveAppealSchema), resolveAppeal);
router.get("/my", protect, authorize("student"), getMyAppeals);
router.get("/dept", protect, authorize("department_admin"), getDeptAppeals);

module.exports = router;