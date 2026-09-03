const express = require("express");
const router = express.Router();
const {
  signUp,
  logIn,
  logout,
  isAuthenticated,
  getProfile,
  forgotPassword,
  resetPassword,
} = require("../Controllers/User");
const {
  otpIpLimiter,
  otpGlobalLimiter,
} = require("../../middleware/otpLimiter");

// Public routes
router.post("/signup/initiate", signUp.initiate);
router.post("/signup/verify-otp", signUp.verifyOtp);
router.post("/signup/save-user", signUp.saveUser);
router.post("/login", logIn);

router.post('/forgot-password', forgotPassword);

router.post('/reset-password', resetPassword);

// Protected routes
router.get("/getProfile", isAuthenticated, getProfile);
router.post("/logout", isAuthenticated, logout);

module.exports = router;
