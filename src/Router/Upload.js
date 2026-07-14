const express = require('express')
const router = express.Router();
const { generateFlashCards, answerQuestion, getJobStatus } = require('../Controllers/Upload');
const uploadWithErrorHandler = require('../../middleware/uploadMiddleware');
const apiLimiter = require('../../middleware/apiLimiter');
const {isAuthenticated} = require('../Controllers/User')

router.post('/uploadFile', isAuthenticated, apiLimiter, uploadWithErrorHandler, generateFlashCards);
router.post('/answer', isAuthenticated, apiLimiter, answerQuestion);
router.get('/job/:jobId', isAuthenticated, getJobStatus);

module.exports = router;