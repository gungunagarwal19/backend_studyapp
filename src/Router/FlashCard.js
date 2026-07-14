const express = require('express');
const router = express.Router();
const {reviewCards, swipeCard, updateNext} = require('../Controllers/FlashCard')
const {isAuthenticated} = require('../Controllers/User')

router.post('/review', isAuthenticated, reviewCards);
router.post('/swipeCard', isAuthenticated, swipeCard);
router.post('/update', isAuthenticated, updateNext);

module.exports = router;