const rateLimit = require('express-rate-limit');

// Limiting to 10 OTP requests per IP per day
const otpIpLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 15,
  message: { message: 'Too many OTP requests from this IP, please try again after 24 hours.' }
});

// Limit to 300 OTP requests total per day (global)
let otpGlobalCount = 0;
let lastReset = Date.now();

function otpGlobalLimiter(req, res, next) {
  const now = Date.now();
  // Reseting the gloabal count every 24 hours
  if (now - lastReset > 24 * 60 * 60 * 1000) {
    otpGlobalCount = 0;
    lastReset = now;
  }
  if (otpGlobalCount >= 300) {
    return res.status(429).json({ message: 'OTP request limit reached for today. Please try again tomorrow.' });
  }
  otpGlobalCount++;
  next();
}

module.exports = { otpIpLimiter, otpGlobalLimiter }; 