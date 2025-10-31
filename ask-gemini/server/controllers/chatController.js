const Chat = require('../models/Chat');

// GET /api/chats
async function listChats(req, res) {
  try {
    const chats = await Chat.find({}, { _id: 0, sessionId: 1, timestamp: 1, messages: 1 })
      .sort({ timestamp: -1 })
      .lean();
    // reduce weight by not sending full messages; provide counts and preview
    const payload = chats.map((c, idx) => ({
      sessionId: c.sessionId,
      timestamp: c.timestamp,
      count: (c.messages || []).length,
      preview: (c.messages || []).find(m => m.role === 'user')?.text?.slice(0, 80) || `Chat ${chats.length - idx}`,
    }));
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list chats', details: err.message });
  }
}

// GET /api/chats/:sessionId
async function getChat(req, res) {
  const { sessionId } = req.params;
  try {
    const chat = await Chat.findOne({ sessionId }).lean();
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json({ sessionId: chat.sessionId, timestamp: chat.timestamp, messages: chat.messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat', details: err.message });
  }
}

// POST /api/chats/:sessionId/messages  { role: 'user'|'bot', text }
async function appendMessage(req, res) {
  const { sessionId } = req.params;
  const { role, text } = req.body || {};
  if (!role || !text) return res.status(400).json({ error: 'role and text are required' });
  try {
    const update = {
      $setOnInsert: { sessionId, timestamp: new Date() },
      $push: { messages: { role, text, timestamp: new Date() } },
    };
    const chat = await Chat.findOneAndUpdate({ sessionId }, update, { upsert: true, new: true }).lean();
    res.json({ ok: true, sessionId: chat.sessionId, count: chat.messages.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to append message', details: err.message });
  }
}

// DELETE /api/chats/:sessionId
async function deleteChat(req, res) {
  const { sessionId } = req.params;
  try {
    const result = await Chat.deleteOne({ sessionId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    res.json({ ok: true, sessionId, message: 'Chat deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete chat', details: err.message });
  }
}

module.exports = { listChats, getChat, appendMessage, deleteChat };
