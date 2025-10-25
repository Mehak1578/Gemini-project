const axios = require('axios');

const askGemini = async (req, res) => {
  const { question } = req.body;
  console.log("Received question:", req.body);
  if (!question) return res.status(400).json({ error: 'Question is required in the request body' });

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'Missing GEMINI_API_KEY in server .env' });
  // First, call ListModels to verify what the API key can access.
  // If there are no generation-capable models available for this key we return a clear, actionable error
  // rather than attempting a generate call that will result in a 404 from Google.
  try {
    console.log("Checking available models for the API key...");
    //const listUrl = `https://generativelanguage.googleapis.com/v1beta2/models?key=${API_KEY}`;
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
    const listRes = await axios.get(listUrl);
    const models = listRes.data?.models || [];

    // Determine whether any model supports generation methods beyond embeddings/counting.
    // Observed embedding-only methods include: 'embedText', 'countTextTokens'.
    const EMBED_ONLY = new Set(['embedText', 'countTextTokens']);
    const generationCapableModels = models.filter((m) => {
      const methods = m.supportedGenerationMethods || [];
      // If there exists a method not in EMBED_ONLY, treat as generation-capable
      return methods.some((meth) => !EMBED_ONLY.has(meth));
    });

    if (!generationCapableModels.length) {
      // No generation model available for this key — return helpful payload to frontend.
      return res.status(422).json({
        error: 'No generation-capable models available for this API key',
        message: 'Your API key currently only has access to embedding or non-generation models. To use the text-generation / chat features you must enable Generative AI access for your Google Cloud project or use a key from a project that has generation model access.',
        docs: 'https://cloud.google.com/generative-ai/docs',
        availableModels: models.map((m) => ({ name: m.name, displayName: m.displayName, supportedGenerationMethods: m.supportedGenerationMethods })),
      });
    }

    // If we do have generation-capable models, continue and attempt generation using the existing flow below.
  } catch (listErr) {
    console.error('ListModels (startup) error:', listErr.response?.data || listErr.message);
    // Don't block generation attempts if ListModels call itself fails for some unexpected reason.
    // We'll continue to the generation call and rely on the existing error handling.
  }

  // Use the gemini-2.5-pro-latest model under v1beta (generateContent)
  // This model is commonly available in many projects that have generation access.
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  // Request shape for generateContent (contents -> parts -> text)
  const body = {
    contents: [
      {
        parts: [
          { text: question }
        ]
      }
    ]
  };

  try {
    const response = await axios.post(API_URL, body, {
      headers: { 'Content-Type': 'application/json' }
    });

    const data = response.data || {};

    // Extract answer for generateContent response shapes
    let answer = null;
    try {
      answer = data?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text ||
               data?.candidates?.[0]?.content?.parts?.[0]?.text ||
               data?.candidates?.[0]?.text ||
               data?.text || null;
    } catch (e) {
      // fallthrough
    }

    if (!answer) answer = JSON.stringify(data).slice(0, 1000);

    return res.json({ answer });
  } catch (err) {
    // If model is not available for this API key, call ListModels to show what's available
    console.error('Gemini API error:', err.response?.data || err.message);
    const status = err.response?.status || 500;
    if (status === 404) {
      try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
        const listRes = await axios.get(listUrl);
        const models = listRes.data?.models || [];
        // Return helpful message to frontend with available models
        return res.status(404).json({
          error: 'Model not available for generation',
          message: 'Your API key does not have access to text-generation models for this endpoint.',
          availableModels: models.map((m) => ({ name: m.name, displayName: m.displayName, supportedGenerationMethods: m.supportedGenerationMethods })),
          rawError: err.response?.data || null
        });
      } catch (listErr) {
        console.error('ListModels error:', listErr.response?.data || listErr.message);
        return res.status(502).json({
          error: 'Model not available and failed to list models',
          details: listErr.response?.data || listErr.message
        });
      }
    }

    return res.status(status).json({ error: 'Gemini API Error', details: err.response?.data || err.message });
  }
};

module.exports = { askGemini };