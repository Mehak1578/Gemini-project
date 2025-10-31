import React, { useEffect, useRef, useState } from 'react';
import './App.css';

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  // Chat transcript (presentation-only; backend unchanged)
  const [messages, setMessages] = useState([]); // { role: 'user' | 'assistant', content: string }
  // Initialize sessionId synchronously to avoid empty session on first send
  const [sessionId, setSessionId] = useState(() => {
    try {
      let id = localStorage.getItem('ask-gemini-sessionId');
      if (!id) {
        id = (window.crypto && window.crypto.randomUUID)
          ? window.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem('ask-gemini-sessionId', id);
      }
      return id;
    } catch (_) {
      return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
  });
  const [sessions, setSessions] = useState([]); // { sessionId, timestamp, count, preview }
  const [availableModels, setAvailableModels] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  const chatRef = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => {
    // Auto-scroll chat to bottom on new messages
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Load sessions list on mount
  useEffect(() => {
    refreshSessions();
  }, []);

  // Load current session's history when sessionId changes (including first mount)
  useEffect(() => {
    if (!sessionId) return;
    fetch(`http://localhost:3000/api/chats/${sessionId}`)
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        const mapped = (data.messages || []).map((m) => ({
          role: m.role === 'bot' ? 'assistant' : 'user',
          content: m.text,
        }));
        setMessages(mapped);
        setAnswer(mapped.filter((m) => m.role === 'assistant').slice(-1)[0]?.content || '');
      })
      .catch(() => {});
  }, [sessionId]);

  const refreshSessions = async () => {
    try {
  const res = await fetch('http://localhost:3000/api/chats');
      if (!res.ok) return;
      const items = await res.json();
      setSessions(items);
    } catch(_) { /* no-op */ }
  };

  const handlePickSession = async (id) => {
    if (!id) return;
    setSessionId(id);
    localStorage.setItem('ask-gemini-sessionId', id);
    try {
  const res = await fetch(`http://localhost:3000/api/chats/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const mapped = (data.messages || []).map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }));
      setMessages(mapped);
      setAnswer(mapped.filter(m=>m.role==='assistant').slice(-1)[0]?.content || '');
    } catch (_) { /* ignore */ }
  };

  const askGemini = async (e) => {
    e.preventDefault();
    const currentQuestion = question.trim();
    if (!currentQuestion) return;
    // Ensure a sessionId exists
    if (!sessionId) {
      const id = (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setSessionId(id);
      localStorage.setItem('ask-gemini-sessionId', id);
    }
    setLoading(true);
    setError(null);
    setAnswer('');
    // Push user's message into the transcript (UI only)
    setMessages((prev) => [...prev, { role: 'user', content: currentQuestion }]);
    // Persist user message to Mongo (best-effort)
    fetch(`http://localhost:3000/api/chats/${sessionId}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user', text: currentQuestion })
    }).then(() => refreshSessions()).catch(()=>{});
    // Clear input immediately for better UX and keep focus ready for next input
    setQuestion('');
    if (inputRef.current) inputRef.current.focus();
    setIsTyping(true);
    try {
      console.log("Sending request to server...");
      const res = await fetch('http://localhost:3000/api/gemini/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQuestion })
      });
      console.log("Received response from server.");
      const data = await res.json();
        if (!res.ok) {
          // If server returned a list of available models, expose that to the UI
          if (data?.availableModels) {
            setAvailableModels(data.availableModels);
            setError(data.message || data.error || 'No generation-capable models available');
            setIsTyping(false);
            return;
          }
          throw new Error(data.error || data.details || 'Unknown error');
        }

        setAvailableModels(null);
        const text = data.answer || JSON.stringify(data);
        setAnswer(text);
        // Push assistant response into the transcript (UI only)
        setMessages((prev) => [...prev, { role: 'assistant', content: text }]);
        // Persist bot message to Mongo (best-effort)
        fetch(`http://localhost:3000/api/chats/${sessionId}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'bot', text })
        }).then(() => refreshSessions()).catch(()=>{});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsTyping(false);
      // Ensure focus returns to input after cycle
      if (inputRef.current) inputRef.current.focus();
    }
  };

  // Keyboard UX: Enter to send, Shift+Enter for newline, keep focus on input
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (loading || !question.trim()) return;
      // Call the existing submit handler without altering its logic
      askGemini({ preventDefault: () => {} });
      // Ensure focus stays on the input after sending
      setTimeout(() => {
        inputRef.current && inputRef.current.focus();
      }, 0);
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
        <aside className="sidebar">
          <div className="sidebar-header">Sessions</div>
          <button className="new-chat" onClick={() => {
            const id = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
            handlePickSession(id);
            setMessages([]);
            setAnswer('');
          }}>+ New chat</button>
          <ul className="session-list">
            {sessions.map((s, i) => (
              <li key={s.sessionId} className={`session-item ${s.sessionId === sessionId ? 'active' : ''}`}>
                <div className="session-row">
                  <div className="session-info" onClick={() => handlePickSession(s.sessionId)}>
                    <div className="session-title">{s.preview || `Chat ${sessions.length - i}`}</div>
                    <div className="session-meta">{new Date(s.timestamp).toLocaleString()}</div>
                  </div>
                  <button
                    className="delete-chat"
                    title="Delete chat"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const resp = await fetch(`http://localhost:3000/api/chats/${s.sessionId}`, { method: 'DELETE' });
                        if (!resp.ok) return; // do not mutate UI if deletion failed
                        const data = await resp.json();
                        // Update sidebar immediately on success
                        setSessions((prev) => prev.filter((x) => x.sessionId !== s.sessionId));
                        // If the deleted chat was active, switch to a new empty chat
                        if (s.sessionId === sessionId) {
                          const id = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
                          setSessionId(id);
                          localStorage.setItem('ask-gemini-sessionId', id);
                          setMessages([]);
                          setAnswer('');
                        }
                        // Also refresh sessions from server to ensure it won't reappear after reload
                        refreshSessions();
                      } catch (_) {
                        // no-op; we keep UI responsive
                      }
                    }}
                  >🗑️</button>
                </div>
              </li>
            ))}
          </ul>
        </aside>
        <header className="app-header">
        <h1>Ask Gemini</h1>
        {/* Chat transcript (presentation only) */}
        <div className="chat-window" ref={chatRef} aria-label="Chat transcript">
          {messages.map((m, idx) => (
            <div key={idx} className={`message-row ${m.role === 'user' ? 'right' : 'left'}`}>
              <div className={`bubble ${m.role}`}>{m.content}</div>
            </div>
          ))}

          {/* Typing animation bubble for assistant */}
          {isTyping && (
            <div className="message-row left">
              <div className="bubble assistant typing">
                <span className="typing-dots" aria-label="Assistant is typing">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
              </div>
            </div>
          )}
        </div>
        <form onSubmit={askGemini} className="ask-form">
          <textarea
            className="question-input"
            placeholder="Type your question for Gemini..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            ref={inputRef}
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
        {/* Retain existing Answer box for compatibility; it will reflect the last reply */}
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
