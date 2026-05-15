const express=require("express");
const { register, login}=require("../controllers/authController");
const validate = require("../middleware/validate");
const { registerSchema, loginSchema} = require("../schemas/authSchemas");
const { authLimiter } = require("../middleware/rateLimiter");

const router=express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);

module.exports= router;