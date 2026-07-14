const rateLimit = require('express-rate-limit');

// Limit to 15 API requests per minute 
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 15,
  message: { message: 'API rate limit reached. Please try again in a minute.' }
});

module.exports = apiLimiter; 
