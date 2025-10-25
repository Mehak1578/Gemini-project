import React, { useState } from 'react';
import axios from 'axios';
// Use global App.css for styling (glassmorphism). Remove component-local CSS to let App.css take effect.
// If you prefer component-scoped styles, keep or update GeminiChat.css instead.

export default function GeminiChat() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [availableModels, setAvailableModels] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer('');
    try {
      const res = await axios.post('/api/gemini', { question });
      console.log(res);   //debug 
      // If the server returns availableModels (no generation access), show it to the user
      if (res.data?.availableModels) {
        setAvailableModels(res.data.availableModels);
        setError(res.data.message || res.data.error || 'No generation-capable models available');
        setLoading(false);
        return;
      }
      setAnswer(res.data?.answer || JSON.stringify(res.data || 'No answer'));
    } catch (err) {
      const body = err.response?.data;
      if (body?.availableModels) {
        setAvailableModels(body.availableModels);
        setError(body.message || body.error || 'No generation-capable models available');
      } else {
        setError(body?.error || err.message || 'Request failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-root">
      <div className="app-header">
        <h1>Ask Gemini</h1>

        <form className="ask-form" onSubmit={handleSubmit}>
          <textarea
            className="question-input"
            placeholder="Type your question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
          />

          <button className="ask-button" type="submit" disabled={loading}>
            {loading ? 'Asking...' : 'Ask Gemini'}
          </button>
        </form>

        {loading && (
          <div className="loading-indicator">
            <span>Thinking</span>
            <div className="loading-dot" />
            <div className="loading-dot" />
            <div className="loading-dot" />
          </div>
        )}

        {error && <div className="error">Error: {error}</div>}
        {availableModels && (
          <div className="models-box">
            <h3>Available models for this API key</h3>
            <p>
              Your API key does not currently have access to text-generation models. To use chat features,
              enable Generative AI access for your Google Cloud project or use a key from a project that has generation access.
            </p>
            <ul className="models-list">
              {availableModels.map((m) => (
                <li key={m.name} className="model-item">
                  <strong>{m.displayName || m.name}</strong>
                  <div className="model-meta">{m.name}</div>
                  <div className="model-methods">Methods: {Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods.join(', ') : JSON.stringify(m.supportedGenerationMethods)}</div>
                </li>
              ))}
            </ul>
            <p>
              Docs: <a href="https://cloud.google.com/generative-ai/docs" target="_blank" rel="noreferrer">Generative AI docs</a>
            </p>
          </div>
        )}

        {answer && (
          <div className="answer-box">
            <h3>Answer</h3>
            <div className="answer-text">{answer}</div>
          </div>
        )}
      </div>
    </div>
  );
}
