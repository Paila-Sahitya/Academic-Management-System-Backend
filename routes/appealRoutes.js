const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    submitAppeal,
    resolveAppeal,
    getMyAppeals,
    getDeptAppeals
} = require("../controllers/appealController");

const router = express.Router();

router.post("/", protect, authorize("student"), submitAppeal);
router.put("/:id/resolve", protect, authorize("admin", "department_admin"), resolveAppeal);
router.get("/my", protect, authorize("student"), getMyAppeals);
router.get("/dept", protect, authorize("department_admin"), getDeptAppeals);

module.exports = router;