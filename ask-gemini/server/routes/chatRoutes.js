const express = require('express');
const router = express.Router();
const { listChats, getChat, appendMessage, deleteChat } = require('../controllers/chatController');

router.get('/', listChats);
router.get('/:sessionId', getChat);
router.post('/:sessionId/messages', appendMessage);
router.delete('/:sessionId', deleteChat);

module.exports = router;
