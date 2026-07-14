const express = require('express');
const router = express.Router();
const {isAuthenticated} = require('../Controllers/User')
const {addSection, getSections, deleteSection} = require('../Controllers/Section')

router.post('/add-section', isAuthenticated ,addSection);
router.get('/get-sections', isAuthenticated, getSections);
router.delete('/delete-section/:id', isAuthenticated, deleteSection)

module.exports = router;