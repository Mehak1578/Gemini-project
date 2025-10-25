import React, { useState } from 'react';
import './App.css';

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [availableModels, setAvailableModels] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const askGemini = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer('');
    try {
      console.log("Sending request to server...");
      const res = await fetch('http://localhost:3000/api/gemini/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      console.log("Received response from server.");
      const data = await res.json();
        if (!res.ok) {
          // If server returned a list of available models, expose that to the UI
          if (data?.availableModels) {
            setAvailableModels(data.availableModels);
            setError(data.message || data.error || 'No generation-capable models available');
            return;
          }
          throw new Error(data.error || data.details || 'Unknown error');
        }

        setAvailableModels(null);
        setAnswer(data.answer || JSON.stringify(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // background video source (replace with your preferred video)
  const VIDEO_SRC = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

  return (
    <>
      <video
        className="bg-video"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        poster="https://images.unsplash.com/photo-1519681393784-de3ab941e393?q=80&w=2070"
      >
        <source src={VIDEO_SRC} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="video-overlay" aria-hidden="true" />

      <div className="app-root">
        <header className="app-header">
        <h1>Ask Gemini</h1>
        <form onSubmit={askGemini} className="ask-form">
          <textarea
            className="question-input"
            placeholder="Type your question for Gemini..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
          />
          <button className="ask-button" type="submit" disabled={loading}>
            {loading ? 'Asking...' : 'Ask Gemini'}
          </button>
        </form>
        {error && <div className="error">Error: {error}</div>}
        {availableModels && (
          <div className="models-box">
            <h3>Available models for this API key</h3>
            <p>
              Your API key does not currently have access to text-generation models. Below are the
              models that are available for this key. To enable chat/QA features, enable Generative
              AI access for your Google Cloud project or use a key from a project that has generation access.
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
              Docs and next steps: <a href="https://cloud.google.com/generative-ai/docs" target="_blank" rel="noreferrer">Generative AI docs</a>
            </p>
          </div>
        )}
        {answer && (
          <div className="answer-box">
            <h3>Answer</h3>
            <div className="answer-text">{answer}</div>
          </div>
        )}
      </header>
    </div>
    </>
  );
}

export default App;
