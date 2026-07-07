import { useState, useEffect, useRef } from 'react';
import { logChatSession } from '../utils/storage';
import { UserPlus, Bell, MessageSquare, Sparkles } from 'lucide-react';
import { auth } from '../firebase';
import {
  enterMatchmakingQueueFS,
  exitMatchmakingQueueFS,
  listenToMatchmakingQueueFS,
  findMatchmakingCandidateFS,
  sendChatMessageFS,
  listenToChatMessagesFS,
  closeChatSessionFS,
  listenToChatSessionFS,
  listenToActiveMatchersCountFS,
  checkQueueItemWaitingFS
} from '../utils/firestore';

// Real-time matchmaking is backed by live Firestore queries

export default function Chatbox() {
  const [matchState, setMatchState] = useState('idle'); // idle, matching, chatting, failed
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [activeMatchersCount, setActiveMatchersCount] = useState(0);

  const messagesEndRef = useRef(null);
  const queueUnsubscribeRef = useRef(null);
  const chatUnsubscribeRef = useRef(null);
  const sessionUnsubscribeRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const queueDocIdRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const unsubscribe = listenToActiveMatchersCountFS((count) => {
      setActiveMatchersCount(count);
    });
    return () => {
      unsubscribe();
      cleanupChat();
    };
  }, []);

  const cleanupChat = () => {
    if (queueUnsubscribeRef.current) {
      queueUnsubscribeRef.current();
      queueUnsubscribeRef.current = null;
    }
    if (chatUnsubscribeRef.current) {
      chatUnsubscribeRef.current();
      chatUnsubscribeRef.current = null;
    }
    if (sessionUnsubscribeRef.current) {
      sessionUnsubscribeRef.current();
      sessionUnsubscribeRef.current = null;
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    const qId = queueDocIdRef.current;
    if (qId) {
      exitMatchmakingQueueFS(qId).catch(console.error);
      queueDocIdRef.current = null;
    }
  };

  const startSearch = async () => {
    cleanupChat();

    const uid = auth.currentUser?.uid;
    const username = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Peer';

    if (!uid) {
      setMatchState('failed');
      return;
    }

    setMatchState('matching');
    setPartner(null);
    setMessages([]);
    setSessionId(null);

    try {
      const qId = await enterMatchmakingQueueFS(uid, username);
      queueDocIdRef.current = qId;

      queueUnsubscribeRef.current = listenToMatchmakingQueueFS(qId, (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        if (data.status === 'matched' && data.matchedSessionId) {
          if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = null;
          }
          startChat(data.matchedSessionId);
        }
      });

      searchTimeoutRef.current = setTimeout(async () => {
        cleanupChat();
        setMatchState('failed');
      }, 30000);

      // Delay matchmaking trigger by 1.5s to resolve race conditions and detect other concurrent requests
      setTimeout(async () => {
        if (queueDocIdRef.current === qId) {
          const isWaiting = await checkQueueItemWaitingFS(qId);
          if (isWaiting) {
            const matchedSession = await findMatchmakingCandidateFS(qId, uid, username);
            if (matchedSession) {
              startChat(matchedSession);
            }
          }
        }
      }, 1500);

    } catch (err) {
      console.error('Matchmaking error:', err);
      cleanupChat();
      setMatchState('failed');
    }
  };

  const startChat = (sId) => {
    const uid = auth.currentUser?.uid;
    setSessionId(sId);
    setMatchState('chatting');
    logChatSession();

    sessionUnsubscribeRef.current = listenToChatSessionFS(sId, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      const otherUid = data.users.find(id => id !== uid);
      const otherUsername = data.usernames[otherUid] || 'Peer';
      
      setPartner({
        name: otherUsername,
        avatar: '🤝',
        color: '#4cc9f0'
      });

      if (data.active === false) {
        setMessages(prev => {
          if (prev.some(m => m.sender === 'system')) return prev;
          return [...prev, { sender: 'system', text: 'Your partner has disconnected from this chat.' }];
        });
      }
    });

    chatUnsubscribeRef.current = listenToChatMessagesFS(sId, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          sender: data.senderId === uid ? 'me' : 'partner',
          text: data.text
        };
      });
      setMessages(msgs);
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !sessionId) return;

    const uid = auth.currentUser?.uid;
    const username = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Peer';
    if (!uid) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      await sendChatMessageFS(sessionId, textToSend, uid, username);
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

  const handleSkip = async () => {
    if (sessionId) {
      await closeChatSessionFS(sessionId).catch(console.error);
    }
    startSearch();
  };

  // Keyboard binding for ESC to skip
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && (matchState === 'chatting' || matchState === 'matching')) {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchState]);

  return (
    <div className="chitchat-container">


      {/* RIGHT MAIN CHAT AREA */}
      <main className="chitchat-main">
        {/* Header */}
        <header className="chitchat-header">
          <span className="chitchat-header-title">New Chat</span>
          <div className="chitchat-header-icons">
            <button className="chitchat-header-btn"><UserPlus size={18} /></button>
            <button className="chitchat-header-btn"><Bell size={18} /></button>
            <button className="chitchat-header-btn"><MessageSquare size={18} /></button>
          </div>
        </header>

        {/* Chat Feed / Main Window */}
        <div className="chitchat-feed">
          {/* BACKGROUND DECORATIONS */}
          <div className="chitchat-bg-shape shape1"></div>
          <div className="chitchat-bg-shape shape2"></div>

          {/* Idle / Initial State */}
          {matchState === 'idle' && (
            <div className="chitchat-centered-state">
              <div className="chitchat-start-circle">
                <Sparkles size={40} color="#a393eb" />
              </div>
              <h2>Ready to connect?</h2>
              <p>Skip isolation. Connect anonymously with peers in recovery instantly. ({activeMatchersCount} searching now)</p>
              <button className="chitchat-start-btn" onClick={startSearch}>
                Find a Match
              </button>
            </div>
          )}

          {/* Matching State */}
          {matchState === 'matching' && (
            <div className="chitchat-centered-state">
              <div className="chitchat-loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <p style={{ color: '#888', marginTop: '16px' }}>Connecting to recovery circle... ({activeMatchersCount} online)</p>
            </div>
          )}

          {/* Failed Matchmaking State */}
          {matchState === 'failed' && (
            <div className="chitchat-centered-state">
              <div className="chitchat-start-circle" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                ❌
              </div>
              <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '8px' }}>No peers online</h2>
              <p style={{ fontSize: '0.82rem', color: '#a0a0a5', lineHeight: '1.45', marginBottom: '24px' }}>There are no other active members waiting in the chatbox right now. Try again in a few moments!</p>
              <button className="chitchat-start-btn" onClick={startSearch}>
                Try Matching Again
              </button>
            </div>
          )}

          {/* Chatting State */}
          {matchState === 'chatting' && (
            <div className="chitchat-message-list">
              {messages.map((msg, i) => {
                if (msg.sender === 'system') {
                  return (
                    <div key={i} style={{ textAlign: 'center', margin: '14px 0', fontSize: '0.8rem', color: 'var(--color-danger)' }}>
                      ℹ️ {msg.text}
                    </div>
                  );
                }
                const isMe = msg.sender === 'me';
                return (
                  <div key={i} className={`chitchat-message-wrapper ${isMe ? 'me' : 'partner'}`}>
                    {!isMe && (
                      <div className="chitchat-msg-avatar" style={{ background: partner?.color }}>
                        {partner?.avatar}
                      </div>
                    )}
                    <div className="chitchat-msg-bubble">
                      {!isMe && <span className="chitchat-msg-sender">{partner?.name}</span>}
                      <span className="chitchat-msg-text">{msg.text}</span>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* BOTTOM PANEL & INPUT */}
        {(matchState === 'chatting' || matchState === 'matching') && (
          <footer className="chitchat-footer">
            {/* Status / Matching Info */}
            {matchState === 'matching' && (
              <div className="chitchat-status-indicator">
                ⌛ ✨ Searching for someone with similar interests...
              </div>
            )}

            <div className="chitchat-input-bar">
              <button className="chitchat-esc-btn" onClick={handleSkip}>
                ESC
              </button>
              <button className="chitchat-skip-btn" onClick={handleSkip}>
                SKIP
              </button>

              <form onSubmit={handleSend} className="chitchat-form">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Send a message"
                  className="chitchat-input"
                  disabled={matchState === 'matching'}
                />
                
                <div className="chitchat-input-decorations">
                  <span className="chitchat-gif-badge">GIF</span>
                  <span className="chitchat-emoji-icon">☺</span>
                </div>
              </form>
            </div>
          </footer>
        )}
      </main>

      {/* SELF-CONTAINED CSS TO DUPLICATE SCREENSHOT */}
      <style>{`
        .chitchat-container {
          display: flex;
          height: calc(100vh - 120px);
          width: 100%;
          background: #1b1921;
          color: #e0e0e2;
          font-family: var(--font-sans);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }



        /* Right Side Content Pane */
        .chitchat-main {
          flex: 1;
          background: #1a1720;
          display: flex;
          flex-direction: column;
        }

        .chitchat-header {
          height: 52px;
          background: #15131a;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 20px;
        }

        .chitchat-header-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: #a0a0a5;
        }

        .chitchat-header-icons {
          display: flex;
          gap: 12px;
        }

        .chitchat-header-btn {
          background: transparent;
          border: none;
          color: #65636c;
          cursor: pointer;
          padding: 4px;
        }
        .chitchat-header-btn:hover {
          color: white;
        }

        /* Feed container */
        .chitchat-feed {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          padding: 20px;
        }

        /* Shape background vector decorations */
        .chitchat-bg-shape {
          position: absolute;
          background: #221e2a;
          border-radius: 32px;
          z-index: 0;
          pointer-events: none;
        }

        .chitchat-bg-shape.shape1 {
          width: 140px;
          height: 140px;
          right: -30px;
          top: 40%;
          transform: rotate(45deg);
          opacity: 0.3;
        }

        .chitchat-bg-shape.shape2 {
          width: 80px;
          height: 80px;
          left: 40%;
          bottom: 15%;
          transform: rotate(15deg);
          opacity: 0.2;
        }

        .chitchat-centered-state {
          margin: auto;
          text-align: center;
          z-index: 1;
          max-width: 320px;
        }

        .chitchat-start-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(255, 69, 0, 0.1);
          border: 1px solid rgba(255, 69, 0, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px auto;
        }

        .chitchat-centered-state h2 {
          color: white;
          font-size: 1.25rem;
          margin-bottom: 8px;
        }

        .chitchat-centered-state p {
          font-size: 0.82rem;
          color: #a0a0a5;
          line-height: 1.45;
          margin-bottom: 24px;
        }

        .chitchat-start-btn {
          background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%);
          border: none;
          color: white;
          padding: 10px 24px;
          font-weight: 600;
          font-size: 0.85rem;
          border-radius: 20px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(255, 69, 0, 0.25);
        }

        /* Message feed list */
        .chitchat-message-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
          z-index: 1;
        }

        .chitchat-message-wrapper {
          display: flex;
          gap: 10px;
          max-width: 80%;
        }

        .chitchat-message-wrapper.me {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .chitchat-message-wrapper.partner {
          align-self: flex-start;
        }

        .chitchat-msg-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }

        .chitchat-msg-bubble {
          display: flex;
          flex-direction: column;
          background: #25212b;
          border: 1px solid rgba(255, 255, 255, 0.03);
          padding: 10px 14px;
          border-radius: 12px;
          color: #e0e0e2;
        }

        .chitchat-message-wrapper.me .chitchat-msg-bubble {
          background: #2e2a36;
          border-color: rgba(255, 69, 0, 0.1);
        }

        .chitchat-msg-sender {
          font-size: 0.7rem;
          font-weight: 700;
          color: #a0a0a5;
          margin-bottom: 2px;
        }

        .chitchat-msg-text {
          font-size: 0.88rem;
          line-height: 1.4;
          word-break: break-word;
        }

        /* Footer turn styling */
        .chitchat-footer {
          background: #15131a;
          padding: 16px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          z-index: 1;
        }

        .chitchat-status-indicator {
          font-size: 0.78rem;
          color: #8a8894;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .chitchat-input-bar {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chitchat-esc-btn {
          background: #211e26;
          color: #a0a0a5;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          cursor: pointer;
        }
        .chitchat-esc-btn:hover {
          background: #2a2631;
          color: white;
        }

        .chitchat-skip-btn {
          background: #e65c00;
          color: white;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 10px 14px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
        }
        .chitchat-skip-btn:hover {
          background: #f76d13;
        }

        .chitchat-form {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }

        .chitchat-input {
          width: 100%;
          background: #282430;
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 6px;
          padding: 10px 64px 10px 14px;
          color: white;
          font-size: 0.85rem;
          outline: none;
        }
        .chitchat-input:focus {
          background: #2f2a39;
          border-color: rgba(255, 69, 0, 0.3);
        }

        .chitchat-input-decorations {
          position: absolute;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          pointer-events: none;
        }

        .chitchat-gif-badge {
          background: #3e3849;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 4px;
          border-radius: 3px;
          color: #a0a0a5;
        }

        .chitchat-emoji-icon {
          font-size: 1rem;
          color: #65636c;
        }

        /* Loading circles animations */
        .chitchat-loading-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
        }
        .chitchat-loading-dots span {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--color-accent);
          animation: cc-dots 1.2s infinite ease-in-out;
        }
        .chitchat-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .chitchat-loading-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes cc-dots {
          0%, 100% { transform: scale(0.3); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 1; }
        }

        /* Typing dots */
        .chitchat-typing-dots {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 4px 0;
        }
        .chitchat-typing-dots span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #a0a0a5;
          animation: cc-typing 1.4s infinite both;
        }
        .chitchat-typing-dots span:nth-child(2) { animation-delay: .2s; }
        .chitchat-typing-dots span:nth-child(3) { animation-delay: .4s; }

        @keyframes cc-typing {
          0%, 80%, 100% { transform: scale(0.3); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
