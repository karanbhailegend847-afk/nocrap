import { useState, useEffect, useRef } from 'react';
import { logChatSession } from '../utils/storage';
import { UserPlus, Bell, MessageSquare, Sparkles, X, SkipForward } from 'lucide-react';
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
  checkQueueItemWaitingFS,
  listenToWaitingQueueFS,
  matchWithCandidateDirectFS
} from '../utils/firestore';

export default function Chatbox() {
  const [matchState, setMatchState] = useState('idle');
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [activeMatchersCount, setActiveMatchersCount] = useState(0);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [waitingQueue, setWaitingQueue] = useState([]);

  const messagesEndRef = useRef(null);
  const queueUnsubscribeRef = useRef(null);
  const chatUnsubscribeRef = useRef(null);
  const sessionUnsubscribeRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const waitTimerRef = useRef(null);
  const queueDocIdRef = useRef(null);
  const matchingRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const unsubscribeActive = listenToActiveMatchersCountFS((count) => {
      setActiveMatchersCount(count);
    });
    const unsubscribeQueue = listenToWaitingQueueFS((queue) => {
      setWaitingQueue(queue);
    });
    return () => {
      unsubscribeActive();
      unsubscribeQueue();
      cleanupChat();
    };
  }, []);

  const cleanupChat = () => {
    matchingRef.current = false;
    if (queueUnsubscribeRef.current) { queueUnsubscribeRef.current(); queueUnsubscribeRef.current = null; }
    if (chatUnsubscribeRef.current) { chatUnsubscribeRef.current(); chatUnsubscribeRef.current = null; }
    if (sessionUnsubscribeRef.current) { sessionUnsubscribeRef.current(); sessionUnsubscribeRef.current = null; }
    if (searchTimeoutRef.current) { clearTimeout(searchTimeoutRef.current); searchTimeoutRef.current = null; }
    if (waitTimerRef.current) { clearInterval(waitTimerRef.current); waitTimerRef.current = null; }
    const qId = queueDocIdRef.current;
    if (qId) { exitMatchmakingQueueFS(qId).catch(() => {}); queueDocIdRef.current = null; }
  };

  const startSearch = async () => {
    cleanupChat();
    setWaitSeconds(0);
    const uid = auth.currentUser?.uid;
    const username = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Peer';
    if (!uid) { setMatchState('failed'); return; }

    setMatchState('matching');
    setPartner(null);
    setMessages([]);
    setSessionId(null);
    matchingRef.current = false;

    waitTimerRef.current = setInterval(() => setWaitSeconds(s => s + 1), 1000);

    try {
      const qId = await enterMatchmakingQueueFS(uid, username);
      queueDocIdRef.current = qId;

      queueUnsubscribeRef.current = listenToMatchmakingQueueFS(qId, (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        if (data.status === 'matched' && data.matchedSessionId && !matchingRef.current) {
          matchingRef.current = true;
          clearTimeout(searchTimeoutRef.current);
          clearInterval(waitTimerRef.current);
          startChat(data.matchedSessionId);
        }
      });

      tryMatch(qId, uid, username);

      searchTimeoutRef.current = setTimeout(() => {
        if (!matchingRef.current) { cleanupChat(); setMatchState('failed'); }
      }, 45000);
    } catch (err) {
      console.error('Matchmaking error:', err);
      cleanupChat();
      setMatchState('failed');
    }
  };

  const tryMatch = async (qId, uid, username) => {
    if (matchingRef.current) return;
    await new Promise(r => setTimeout(r, 800));
    if (matchingRef.current || queueDocIdRef.current !== qId) return;
    const isStillWaiting = await checkQueueItemWaitingFS(qId);
    if (!isStillWaiting || matchingRef.current) return;
    const session = await findMatchmakingCandidateFS(qId, uid, username);
    if (session && !matchingRef.current) {
      matchingRef.current = true;
      clearTimeout(searchTimeoutRef.current);
      clearInterval(waitTimerRef.current);
      startChat(session);
    }
  };

  const connectToPeer = async (peer) => {
    const uid = auth.currentUser?.uid;
    const username = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Peer';
    if (!uid) return;

    setMatchState('matching');
    setPartner(null);
    setMessages([]);
    setSessionId(null);
    matchingRef.current = false;

    try {
      const session = await matchWithCandidateDirectFS(uid, username, peer.id, peer.uid, peer.username);
      if (session) {
        matchingRef.current = true;
        startChat(session);
      }
    } catch (err) {
      console.error('Failed to match directly:', err);
      alert(err.message || 'Failed to connect. The peer might have already matched or disconnected.');
      setMatchState('idle');
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
      const otherUid = data.users?.find(id => id !== uid);
      const otherUsername = otherUid ? (data.usernames?.[otherUid] || 'Peer') : 'Peer';
      setPartner({ name: otherUsername, avatar: 'U+1F91D', color: '#4cc9f0' });
      if (data.active === false) {
        setMessages(prev => {
          if (prev.some(m => m.sender === 'system')) return prev;
          return [...prev, { sender: 'system', text: 'Your partner has disconnected.' }];
        });
      }
    });

    chatUnsubscribeRef.current = listenToChatMessagesFS(sId, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const d = doc.data();
        return { sender: d.senderId === uid ? 'me' : 'partner', text: d.text };
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
    try { await sendChatMessageFS(sessionId, textToSend, uid, username); }
    catch (err) { console.error('Send error:', err); }
  };

  const handleSkip = async () => {
    if (sessionId) await closeChatSessionFS(sessionId).catch(() => {});
    startSearch();
  };

  const handleDisconnect = async () => {
    if (sessionId) await closeChatSessionFS(sessionId).catch(() => {});
    cleanupChat();
    setMatchState('idle');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && matchState === 'chatting') handleSkip();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [matchState, sessionId]);

  const formatWait = (s) => s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + (s % 60) + 's';

  const visiblePeers = waitingQueue.filter(p => p.uid !== auth.currentUser?.uid);

  return (
    <div className="chitchat-container">
      <main className="chitchat-main">
        <header className="chitchat-header">
          <span className="chitchat-header-title">
            {matchState === 'chatting' && partner ? 'Chatting with ' + partner.name : 'Recovery Peer Chat'}
          </span>
          <div className="chitchat-header-icons">
            {matchState === 'chatting' && (
              <button className="chitchat-header-btn" onClick={handleDisconnect} title="Disconnect">
                <X size={18} />
              </button>
            )}
            {matchState !== 'chatting' && (
              <>
                <button className="chitchat-header-btn"><UserPlus size={18} /></button>
                <button className="chitchat-header-btn"><Bell size={18} /></button>
                <button className="chitchat-header-btn"><MessageSquare size={18} /></button>
              </>
            )}
          </div>
        </header>

        <div className="chitchat-feed">
          <div className="chitchat-bg-shape shape1"></div>
          <div className="chitchat-bg-shape shape2"></div>

          {matchState === 'idle' && (
            <div className="chitchat-idle-view">
              <div className="chitchat-centered-state" style={{ margin: '0 auto' }}>
                <div className="chitchat-start-circle">
                  <Sparkles size={40} color="#a393eb" />
                </div>
                <h2>Ready to connect?</h2>
                <p>
                  Skip isolation. Connect anonymously with peers in recovery.
                  {activeMatchersCount > 0 && <><br/><strong style={{color:'#ff6b35'}}>{activeMatchersCount} searching now</strong></>}
                </p>
                <button className="chitchat-start-btn" onClick={startSearch}>Find a Match</button>
              </div>

              <div className="chitchat-directory">
                <h3 className="chitchat-directory-title">
                  <span>Waiting Peers Directory</span>
                  <span className="chitchat-pulse-badge">
                    <span className="pulse-dot"></span>
                    {visiblePeers.length} waiting
                  </span>
                </h3>
                
                <div className="chitchat-directory-list">
                  {visiblePeers.length === 0 ? (
                    <div className="chitchat-directory-empty">
                      No one is waiting right now. Click "Find a Match" to start waiting so others can join you!
                    </div>
                  ) : (
                    visiblePeers.map((peer, idx) => {
                      const joinedTime = peer.joinedAt?.toMillis 
                        ? peer.joinedAt.toMillis() 
                        : (peer.joinedAt ? new Date(peer.joinedAt).getTime() : Date.now());
                      const waitTimeMin = Math.max(0, Math.floor((Date.now() - joinedTime) / 60000));
                      
                      return (
                        <div key={peer.id} className="chitchat-peer-row">
                          <div className="chitchat-peer-info">
                            <span className="chitchat-peer-avatar">👤</span>
                            <div className="chitchat-peer-details">
                              <span className="chitchat-peer-name">u/{peer.username || `peer_${idx + 1}`}</span>
                              <span className="chitchat-peer-wait">
                                waiting {waitTimeMin === 0 ? 'just now' : waitTimeMin + 'm ago'}
                              </span>
                            </div>
                          </div>
                          <button 
                            className="chitchat-connect-btn" 
                            onClick={() => connectToPeer(peer)}
                          >
                            Chat Now
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {matchState === 'matching' && (
            <div className="chitchat-centered-state">
              <div className="chitchat-loading-ring"></div>
              <h2 style={{marginTop:24}}>Finding a peer...</h2>
              <p>
                {activeMatchersCount > 1
                  ? <><strong style={{color:'#4cc9f0'}}>{activeMatchersCount} people</strong> are searching — matching soon!</>
                  : 'Waiting for someone to join...'}
              </p>
              <div className="chitchat-wait-timer">{formatWait(waitSeconds)}</div>
              <button className="chitchat-cancel-btn" onClick={handleDisconnect}>Cancel</button>
            </div>
          )}

          {matchState === 'failed' && (
            <div className="chitchat-centered-state">
              <div className="chitchat-start-circle" style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)'}}>
                <span style={{fontSize:'1.8rem'}}>&#10060;</span>
              </div>
              <h2>No peers online</h2>
              <p>No active members waiting right now. Try again in a few moments!</p>
              <button className="chitchat-start-btn" onClick={startSearch}>Try Again</button>
            </div>
          )}

          {matchState === 'chatting' && (
            <div className="chitchat-message-list">
              <div className="chitchat-match-banner">
                &#127881; Connected with <strong>{partner?.name || 'a peer'}</strong> — say hi!
              </div>
              {messages.map((msg, i) => {
                if (msg.sender === 'system') {
                  return <div key={i} className="chitchat-system-msg">&#8505;&#65039; {msg.text}</div>;
                }
                const isMe = msg.sender === 'me';
                return (
                  <div key={i} className={'chitchat-message-wrapper ' + (isMe ? 'me' : 'partner')}>
                    {!isMe && (
                      <div className="chitchat-msg-avatar" style={{background: partner?.color}}>&#129309;</div>
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

        {matchState === 'chatting' && (
          <footer className="chitchat-footer">
            <div className="chitchat-input-bar">
              <button className="chitchat-skip-btn" onClick={handleSkip} title="Skip to next">
                SKIP
              </button>
              <form onSubmit={handleSend} className="chitchat-form">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Say something supportive..."
                  className="chitchat-input"
                  autoFocus
                />
                <button type="submit" className="chitchat-send-btn" disabled={!inputText.trim()}>Send</button>
              </form>
            </div>
          </footer>
        )}
      </main>

      <style>{`
        .chitchat-container { display:flex; height:calc(100vh - 120px); width:100%; background:#1b1921; color:#e0e0e2; font-family:var(--font-sans); border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.05); }
        .chitchat-main { flex:1; background:#1a1720; display:flex; flex-direction:column; }
        .chitchat-header { height:52px; background:#15131a; border-bottom:1px solid rgba(255,255,255,0.04); display:flex; justify-content:space-between; align-items:center; padding:0 20px; flex-shrink:0; }
        .chitchat-header-title { font-size:0.9rem; font-weight:600; color:#e0e0e2; }
        .chitchat-header-icons { display:flex; gap:12px; }
        .chitchat-header-btn { background:transparent; border:none; color:#65636c; cursor:pointer; padding:4px; border-radius:4px; display:flex; align-items:center; transition:color 0.2s; }
        .chitchat-header-btn:hover { color:white; }
        .chitchat-feed { flex:1; position:relative; display:flex; flex-direction:column; overflow-y:auto; padding:20px; }
        .chitchat-bg-shape { position:absolute; background:#221e2a; border-radius:32px; z-index:0; pointer-events:none; }
        .chitchat-bg-shape.shape1 { width:140px; height:140px; right:-30px; top:40%; transform:rotate(45deg); opacity:0.3; }
        .chitchat-bg-shape.shape2 { width:80px; height:80px; left:40%; bottom:15%; transform:rotate(15deg); opacity:0.2; }
        
        .chitchat-idle-view { display:flex; flex-direction:column; align-items:center; gap:24px; margin:auto; width:100%; max-width:480px; z-index:1; }
        .chitchat-directory { width:100%; background:#15131a; border:1px solid rgba(255,255,255,0.04); border-radius:12px; padding:16px; box-sizing:border-box; }
        .chitchat-directory-title { display:flex; justify-content:space-between; align-items:center; font-size:0.9rem; font-weight:600; color:white; margin:0 0 14px 0; }
        .chitchat-pulse-badge { display:flex; align-items:center; gap:6px; background:rgba(255,107,53,0.1); color:#ff6b35; font-size:0.72rem; padding:2px 8px; border-radius:12px; font-weight:700; }
        .pulse-dot { width:6px; height:6px; background-color:#ff6b35; border-radius:50%; animation:pulse-anim 1.5s infinite; }
        @keyframes pulse-anim {
          0% { transform:scale(0.95); box-shadow:0 0 0 0 rgba(255,107,53,0.7); }
          70% { transform:scale(1); box-shadow:0 0 0 4px rgba(255,107,53,0); }
          100% { transform:scale(0.95); box-shadow:0 0 0 0 rgba(255,107,53,0); }
        }
        .chitchat-directory-list { display:flex; flex-direction:column; gap:8px; max-height:200px; overflow-y:auto; padding-right:4px; }
        .chitchat-directory-empty { text-align:center; color:#65636c; font-size:0.8rem; padding:20px 0; line-height:1.5; }
        .chitchat-peer-row { display:flex; justify-content:space-between; align-items:center; background:#211e26; border:1px solid rgba(255,255,255,0.02); padding:10px 12px; border-radius:8px; transition:background 0.2s; }
        .chitchat-peer-row:hover { background:#282430; }
        .chitchat-peer-info { display:flex; align-items:center; gap:10px; }
        .chitchat-peer-avatar { font-size:1.1rem; opacity:0.8; }
        .chitchat-peer-details { display:flex; flex-direction:column; gap:2px; }
        .chitchat-peer-name { font-size:0.82rem; font-weight:600; color:#e0e0e2; }
        .chitchat-peer-wait { font-size:0.7rem; color:#65636c; }
        .chitchat-connect-btn { background:#00b4d8; color:white; border:none; padding:6px 12px; font-size:0.75rem; font-weight:700; border-radius:6px; cursor:pointer; transition:background 0.2s; }
        .chitchat-connect-btn:hover { background:#0096c7; }

        .chitchat-centered-state { margin:auto; text-align:center; z-index:1; max-width:340px; padding:20px; }
        .chitchat-start-circle { width:72px; height:72px; border-radius:50%; background:rgba(255,69,0,0.1); border:1px solid rgba(255,69,0,0.2); display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto; }
        .chitchat-centered-state h2 { color:white; font-size:1.3rem; margin-bottom:8px; }
        .chitchat-centered-state p { font-size:0.85rem; color:#a0a0a5; line-height:1.5; margin-bottom:20px; }
        .chitchat-start-btn { background:linear-gradient(135deg,var(--color-accent) 0%,#ff7043 100%); border:none; color:white; padding:12px 28px; font-weight:600; font-size:0.9rem; border-radius:24px; cursor:pointer; box-shadow:0 4px 15px rgba(255,69,0,0.3); transition:transform 0.15s,box-shadow 0.15s; }
        .chitchat-start-btn:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(255,69,0,0.4); }
        .chitchat-cancel-btn { margin-top:16px; background:transparent; border:1px solid rgba(255,255,255,0.15); color:#a0a0a5; padding:8px 20px; font-size:0.82rem; border-radius:20px; cursor:pointer; transition:all 0.2s; }
        .chitchat-cancel-btn:hover { color:white; border-color:rgba(255,255,255,0.4); }
        .chitchat-loading-ring { width:60px; height:60px; border:3px solid rgba(255,255,255,0.05); border-top:3px solid var(--color-accent,#ff4500); border-radius:50%; animation:spin 1s linear infinite; margin:0 auto; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .chitchat-wait-timer { font-size:1.5rem; font-weight:700; color:rgba(255,255,255,0.15); margin:8px 0 16px; letter-spacing:2px; }
        .chitchat-message-list { flex:1; display:flex; flex-direction:column; gap:12px; z-index:1; }
        .chitchat-match-banner { text-align:center; font-size:0.82rem; color:#4cc9f0; background:rgba(76,201,240,0.08); border:1px solid rgba(76,201,240,0.15); border-radius:8px; padding:8px 12px; margin-bottom:8px; }
        .chitchat-system-msg { text-align:center; font-size:0.8rem; color:var(--color-danger,#ef4444); margin:8px 0; }
        .chitchat-message-wrapper { display:flex; gap:10px; max-width:80%; }
        .chitchat-message-wrapper.me { align-self:flex-end; flex-direction:row-reverse; }
        .chitchat-message-wrapper.partner { align-self:flex-start; }
        .chitchat-msg-avatar { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1rem; flex-shrink:0; }
        .chitchat-msg-bubble { display:flex; flex-direction:column; background:#25212b; border:1px solid rgba(255,255,255,0.04); padding:10px 14px; border-radius:12px; color:#e0e0e2; }
        .chitchat-message-wrapper.me .chitchat-msg-bubble { background:#2e2a36; border-color:rgba(255,69,0,0.15); }
        .chitchat-msg-sender { font-size:0.7rem; font-weight:700; color:#4cc9f0; margin-bottom:3px; }
        .chitchat-msg-text { font-size:0.88rem; line-height:1.4; word-break:break-word; }
        .chitchat-footer { background:#15131a; padding:14px 20px; border-top:1px solid rgba(255,255,255,0.04); flex-shrink:0; }
        .chitchat-input-bar { display:flex; align-items:center; gap:10px; }
        .chitchat-skip-btn { background:#e65c00; color:white; font-size:0.72rem; font-weight:700; padding:10px 14px; border-radius:6px; border:none; cursor:pointer; white-space:nowrap; flex-shrink:0; }
        .chitchat-skip-btn:hover { background:#f76d13; }
        .chitchat-form { flex:1; display:flex; gap:8px; }
        .chitchat-input { flex:1; background:#282430; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:10px 14px; color:white; font-size:0.88rem; outline:none; }
        .chitchat-input:focus { background:#2f2a39; border-color:rgba(255,69,0,0.35); }
        .chitchat-input::placeholder { color:#555; }
        .chitchat-send-btn { background:var(--color-accent,#ff4500); border:none; color:white; padding:10px 18px; font-weight:600; font-size:0.85rem; border-radius:8px; cursor:pointer; flex-shrink:0; transition:background 0.2s; }
        .chitchat-send-btn:hover:not(:disabled) { background:#f76d13; }
        .chitchat-send-btn:disabled { opacity:0.4; cursor:not-allowed; }
      `}</style>
    </div>
  );
}
