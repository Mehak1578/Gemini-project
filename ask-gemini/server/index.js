require('dotenv').config();
const express = require('express');
const cors = require('cors');
const geminiRoutes = require('./routes/geminiRoutes');
const chatRoutes = require('./routes/chatRoutes');
const { connectDB } = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB if URI provided
connectDB(process.env.MONGODB_URI).catch(() => {
  console.warn('MongoDB connection failed. Chat history APIs may not work.');
});

app.use('/api/gemini', geminiRoutes);
app.use('/api/chats', chatRoutes);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
