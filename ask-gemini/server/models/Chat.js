const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'bot'], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ChatSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true, unique: true },
  timestamp: { type: Date, default: Date.now },
  messages: { type: [MessageSchema], default: [] },
});

module.exports = mongoose.model('Chat', ChatSchema);
