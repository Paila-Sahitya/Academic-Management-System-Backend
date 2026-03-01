const express=require("express");
const {protect, authorize}= require("../middleware/authMiddleware");
const {getPerformance}=require("../controllers/performanceController");

const router=express.Router();

router.get("/", protect, authorize("student"), getPerformance);

module.exports=router;