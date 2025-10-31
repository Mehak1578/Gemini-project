const mongoose = require('mongoose');

async function connectDB(uri) {
  if (!uri) {
    console.warn('[MongoDB] MONGODB_URI is not set. Chat history endpoints will be unavailable.');
    return null;
  }
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || undefined,
    });
    console.log('[MongoDB] Connected');
    return mongoose.connection;
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    throw err;
  }
}

module.exports = { connectDB };
