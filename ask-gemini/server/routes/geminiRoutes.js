const express = require('express');
const router = express.Router();
const { askGemini } = require('../controllers/geminiController');

// POST /api/gemini
router.post('/', askGemini);

module.exports = router;
