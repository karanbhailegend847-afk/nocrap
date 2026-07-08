import { useState, useEffect, useRef } from 'react';
import { Shield, Send, AlertCircle, Award, ArrowLeft, X } from 'lucide-react';
import { getData, getJoinedClans, toggleJoinClan, getClansList } from '../utils/storage';
import { onClanChatListener, sendClanMsgFS, joinClanFS, leaveClanFS, getUserClansFS, getClansListFS, seedClansToFirestore, listenToClanMemberCountFS, getAllClanMemberCountsFS } from '../utils/firestore';
import { auth } from '../firebase';


export default function Clans({ userStreak }) {
  const [joinedClans, setJoinedClans] = useState(() => getJoinedClans());
  const [clansList, setClansList] = useState(() => getClansList());
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [selectedClan, setSelectedClan] = useState(null); // null or clan object (only neural-rewirers)
  const [clanStats, setClanStats] = useState({}); // { clanId: { members: N, online: N } }

  // Accountability Clan States (neural-rewirers only)
  const [clanData, setClanData] = useState(() => getData('CLAN'));
  const [hasPledged, setHasPledged] = useState(() => localStorage.getItem('nocrap_clan_pledged') === 'true');
  const [messageText, setMessageText] = useState('');
  const [firebaseMessages, setFirebaseMessages] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const handleUpdate = () => {
      setJoinedClans(getJoinedClans());
      setClansList(getClansList());
    };
    window.addEventListener('clans-updated', handleUpdate);

    // Seed clans to Firestore so Forum feeds can find them
    seedClansToFirestore(getClansList()).catch(console.warn);

    // Load joined clans from Firebase too
    const uid = auth.currentUser?.uid;
    if (uid) {
      getUserClansFS(uid).then(clansFromFS => {
        if (clansFromFS.length > 0) {
          setJoinedClans(prev => {
            const merged = Array.from(new Set([...prev, ...clansFromFS]));
            return merged;
          });
        }
      }).catch(console.warn);
    }

    // Load clans list from Firestore for live member counts
    getClansListFS().then(fsClans => {
      if (fsClans && fsClans.length > 0) {
        setClansList(fsClans);
        // Fetch real member counts for all clans after list is loaded
        const ids = fsClans.map(c => c.id);
        getAllClanMemberCountsFS(ids).then(counts => {
          const stats = {};
          ids.forEach(id => { stats[id] = { members: counts[id] || 0, online: 0 }; });
          setClanStats(stats);
        }).catch(console.warn);
      }
    }).catch(console.warn);

    return () => window.removeEventListener('clans-updated', handleUpdate);
  }, []);

  // Real-time listener for neural-rewirers accountability chat
  useEffect(() => {
    if (!selectedClan || selectedClan.id !== 'neural-rewirers') return;
    const unsubscribe = onClanChatListener('neural-rewirers', (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setFirebaseMessages(msgs);
    });
    return () => unsubscribe();
  }, [selectedClan]);

  // Attach real-time member count listeners for each clan in the list
  useEffect(() => {
    if (!clansList || clansList.length === 0) return;
    const unsubs = clansList.map(clan => {
      return listenToClanMemberCountFS(clan.id, (count) => {
        setClanStats(prev => ({
          ...prev,
          [clan.id]: { ...(prev[clan.id] || {}), members: count }
        }));
      });
    });
    return () => unsubs.forEach(u => u && u());
  }, [clansList.length]);

  useEffect(() => {
    // Scroll to bottom of chat inside accountability circle details
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [clanData?.messages, selectedClan]);

  const handlePledge = async () => {
    localStorage.setItem('nocrap_clan_pledged', 'true');
    setHasPledged(true);
    const uid = auth.currentUser?.uid;
    const username = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || getData('USER')?.username || 'Anonymous';
    if (uid) {
      await sendClanMsgFS('neural-rewirers', 'I have pledged my focus. Joined the accountability circle.', uid, username).catch(console.warn);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    const uid = auth.currentUser?.uid;
    const username = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || getData('USER')?.username || 'Anonymous';
    if (!uid) return;
    await sendClanMsgFS('neural-rewirers', messageText.trim(), uid, username).catch(console.warn);
    setMessageText('');
  };

  const handleSendQuickMessage = async (text) => {
    const uid = auth.currentUser?.uid;
    const username = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || getData('USER')?.username || 'Anonymous';
    if (!uid) return;
    await sendClanMsgFS('neural-rewirers', text, uid, username).catch(console.warn);
  };

  const handleJoinToggle = async (clanId, e) => {
    e.stopPropagation(); // Prevent card click trigger
    const uid = auth.currentUser?.uid;
    const isJoined = joinedClans.includes(clanId);
    // Update local state immediately
    const updated = toggleJoinClan(clanId);
    setJoinedClans(updated);
    // Persist to Firestore
    if (uid) {
      try {
        if (isJoined) {
          await leaveClanFS(uid, clanId);
        } else {
          await joinClanFS(uid, clanId);
        }
      } catch (err) { console.warn('Firestore join/leave error:', err); }
    }
    // Dispatch global event to sync left sidebar instantly
    window.dispatchEvent(new CustomEvent('clans-updated'));
  };

  const handleCardClick = (clan) => {
    // Navigate directly to the clan's forum feed
    window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'forum', pod: clan.id } }));
  };

  // Sync user streak in the members list
  const members = clanData?.members.map(m => {
    if (m.id === 'user_me') {
      return { ...m, streak: userStreak };
    }
    return m;
  }) || [];

  const lowestStreak = members.length > 0 ? Math.min(...members.map(m => m.streak)) : 0;
  const averageStreak = members.length > 0 ? (members.reduce((acc, m) => acc + m.streak, 0) / members.length).toFixed(1) : '0';
  const activeFlares = clanData?.flares.filter(f => !f.resolved) || [];

  const filteredAll = clansList.filter(c => {
    return activeCategory === 'All' || c.category === activeCategory;
  });

  const searchResults = searchQuery.trim() ? clansList.filter(c => {
    const q = searchQuery.toLowerCase();
    return (c.name && c.name.toLowerCase().includes(q)) || 
           (c.id && c.id.toLowerCase().includes(q)) || 
           (c.description && c.description.toLowerCase().includes(q));
  }) : [];

  const subscribedClans = filteredAll.filter(c => joinedClans.includes(c.id));
  const recommendedClans = filteredAll.filter(c => !joinedClans.includes(c.id));

  // Recommended limits
  const visibleRecommended = showMore ? recommendedClans : recommendedClans.slice(0, 3);

  const CATEGORIES = ['All', 'General', 'Support', 'Success', 'Demographics', 'Science'];

  return (
    <div className="explore-clans-container">
      {/* HEADER SECTION */}
      <header className="explore-clans-header">
        <h1>Explore Communities</h1>
        <p>Find specialized pods and recovery circles aligned with your demographic identity or science discussion interests.</p>
        <div className="explore-search-bar" style={{ marginTop: '1.5rem', position: 'relative', zIndex: 50 }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search communities by name, topic, or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 40px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#1a1820',
                color: 'white',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none', display: 'flex' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </span>
          </div>

          {searchFocused && searchQuery.trim() && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: '#1a1820',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              maxHeight: '350px',
              overflowY: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              zIndex: 100
            }}>
              {searchResults.length > 0 ? (
                <>
                  <div style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#a0a0a5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Communities
                  </div>
                  {searchResults.map(clan => (
                    <div 
                      key={clan.id}
                      onClick={() => {
                        setSearchQuery('');
                        setSearchFocused(false);
                        handleCardClick(clan);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', background: `${clan.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', flexShrink: 0 }}>
                        {clan.logo
                          ? <img src={clan.logo} alt={clan.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: '1.2rem' }}>{clan.emoji}</span>
                        }
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'white' }}>p/{clan.id}</span>
                        <span style={{ fontSize: '0.8rem', color: '#a0a0a5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clan.description}</span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ padding: '24px 16px', color: '#a0a0a5', fontSize: '0.9rem', textAlign: 'center' }}>
                  No communities found.
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* HORIZONTAL CATEGORY PILLS */}
      <div className="explore-pills-scroll-container">
        <div className="explore-category-pills">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`explore-pill-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* SUBSCRIBED CLANS */}
      {subscribedClans.length > 0 && (
        <section className="explore-section">
          <h2 className="explore-section-title">Your Joined Communities</h2>
          <div className="explore-clans-grid">
            {subscribedClans.map(clan => (
              <div 
                key={clan.id} 
                className="explore-clan-card"
                onClick={() => handleCardClick(clan)}
              >
                <div className="explore-card-top">
                  <div className="explore-card-avatar" style={{ background: `${clan.color}20`, border: `1px solid ${clan.color}50`, overflow: 'hidden' }}>
                    {clan.logo
                      ? <img src={clan.logo} alt={clan.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : <span style={{ color: clan.color }} className="explore-card-emoji">{clan.emoji}</span>
                    }
                  </div>
                  <div className="explore-card-meta">
                    <span className="explore-card-name">p/{clan.id}</span>
                    <span className="explore-card-stats">
                      {clanStats[clan.id]
                        ? `${Math.max(clanStats[clan.id].members, 1)} member${Math.max(clanStats[clan.id].members, 1) !== 1 ? 's' : ''}`
                        : 'Loadingâ€¦'}
                    </span>
                  </div>
                  <button 
                    className="explore-join-btn joined"
                    onClick={(e) => handleJoinToggle(clan.id, e)}
                  >
                    <span className="joined-text">Joined</span>
                    <span className="leave-text">Leave</span>
                  </button>
                </div>
                <p className="explore-card-desc">{clan.description}</p>
                <div className="explore-card-footer">
                  <span className="explore-card-category-badge">{clan.category}</span>
                  <span className="explore-card-action-hint">View feed â†’</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RECOMMENDED CLANS */}
      <section className="explore-section">
        <h2 className="explore-section-title">Recommended for you</h2>
        {recommendedClans.length === 0 ? (
          <div className="explore-empty-state">
            <span style={{ fontSize: '2rem' }}>ðŸ†</span>
            <h3>You are a member of all recovery circles!</h3>
            <p>Keep supporting peers across all joined clans.</p>
          </div>
        ) : (
          <>
            <div className="explore-clans-grid">
              {visibleRecommended.map(clan => (
                <div 
                  key={clan.id} 
                  className="explore-clan-card"
                  onClick={() => handleCardClick(clan)}
                >
                  <div className="explore-card-top">
                    <div className="explore-card-avatar" style={{ background: `${clan.color}20`, border: `1px solid ${clan.color}40` }}>
                      {clan.logo
                      ? <img src={clan.logo} alt={clan.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : <span style={{ color: clan.color }} className="explore-card-emoji">{clan.emoji}</span>
                    }
                    </div>
                    <div className="explore-card-meta">
                      <span className="explore-card-name">p/{clan.id}</span>
                      <span className="explore-card-stats">
                        {clanStats[clan.id]
                          ? `${clanStats[clan.id].members} member${clanStats[clan.id].members !== 1 ? 's' : ''}`
                          : 'Loadingâ€¦'}
                      </span>
                    </div>
                    <button 
                      className="explore-join-btn join"
                      onClick={(e) => handleJoinToggle(clan.id, e)}
                    >
                      Join
                    </button>
                  </div>
                  <p className="explore-card-desc">{clan.description}</p>
                  <div className="explore-card-footer">
                    <span className="explore-card-category-badge">{clan.category}</span>
                    <span className="explore-card-action-hint">View feed â†’</span>
                  </div>
                </div>
              ))}
            </div>

            {recommendedClans.length > 3 && (
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button 
                  className="explore-showmore-btn"
                  onClick={() => setShowMore(!showMore)}
                >
                  {showMore ? 'Show less' : 'Show more'}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <style>{`
        .explore-clans-container {
          padding: 16px 0;
          color: #e0e0e2;
          font-family: var(--font-sans);
        }

        .explore-clans-header {
          margin-bottom: 24px;
        }

        .explore-clans-header h1 {
          font-family: var(--font-display);
          font-size: 1.8rem;
          font-weight: 800;
          color: white;
          margin-bottom: 6px;
        }

        .explore-clans-header p {
          font-size: 0.88rem;
          color: var(--text-secondary);
          max-width: 600px;
          line-height: 1.5;
        }

        /* Pill scrollbar */
        .explore-pills-scroll-container {
          overflow-x: auto;
          padding-bottom: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .explore-category-pills {
          display: flex;
          gap: 8px;
        }

        .explore-pill-btn {
          background: #1d1b24;
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #a0a0a5;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .explore-pill-btn:hover {
          background: #272430;
          color: white;
          border-color: rgba(255, 255, 255, 0.15);
        }

        .explore-pill-btn.active {
          background: white;
          color: black;
          border-color: white;
        }

        /* Section layout */
        .explore-section {
          margin-bottom: 32px;
        }

        .explore-section-title {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 14px;
        }

        /* Grid */
        .explore-clans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        /* Card styles */
        .explore-clan-card {
          background: #15131a;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .explore-clan-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 69, 0, 0.25);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .explore-card-top {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .explore-card-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .explore-card-emoji {
          font-size: 1.3rem;
          line-height: 1;
        }

        .explore-card-meta {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .explore-card-name {
          font-size: 0.92rem;
          font-weight: 700;
          color: white;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .explore-card-stats {
          font-size: 0.72rem;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-top: 1px;
        }

        .explore-join-btn {
          padding: 6px 14px;
          border-radius: 16px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          position: relative;
          z-index: 10;
        }

        .explore-join-btn.join {
          background: #ff4500;
          color: white;
        }
        .explore-join-btn.join:hover {
          background: #ff5714;
        }

        .explore-join-btn.joined {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #a0a0a5;
          min-width: 70px;
        }
        .explore-join-btn.joined .leave-text {
          display: none;
        }
        .explore-join-btn.joined:hover:not(:disabled) {
          border-color: #ef4444;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
        }
        .explore-join-btn.joined:hover:not(:disabled) .joined-text {
          display: none;
        }
        .explore-join-btn.joined:hover:not(:disabled) .leave-text {
          display: inline;
        }
        .explore-join-btn.joined:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .explore-card-desc {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.45;
          margin-bottom: 16px;
          display: -webkit-box;
          WebkitLineClamp: 2;
          WebkitBoxOrient: 'vertical';
          overflow: hidden;
          flex: 1;
        }

        .explore-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid rgba(255, 255, 255, 0.03);
          padding-top: 10px;
          margin-top: auto;
        }

        .explore-card-category-badge {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.04);
          padding: 2px 8px;
          border-radius: 10px;
        }

        .explore-card-action-hint {
          font-size: 0.72rem;
          color: #ff4500;
          font-weight: 600;
          opacity: 0;
          transform: translateX(-4px);
          transition: all 0.2s ease;
        }

        .explore-clan-card:hover .explore-card-action-hint {
          opacity: 1;
          transform: translateX(0);
        }

        .explore-showmore-btn {
          background: #1b1922;
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: white;
          padding: 8px 24px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .explore-showmore-btn:hover {
          background: #25222e;
          border-color: rgba(255, 255, 255, 0.15);
        }

        .explore-empty-state {
          padding: 32px;
          text-align: center;
          background: #15131a;
          border-radius: 12px;
          border: 1px dashed rgba(255,255,255,0.06);
        }
        .explore-empty-state h3 {
          font-size: 1rem;
          font-weight: 700;
          color: white;
          margin: 10px 0 4px 0;
        }
        .explore-empty-state p {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        /* Modal / Overlay background */
        .explore-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(4px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        /* public preview modal */
        .explore-preview-modal {
          background: #15131a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          width: 100%;
          max-width: 440px;
          padding: 24px;
          position: relative;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          animation: cc-modal-in 0.2s ease-out;
        }

        @keyframes cc-modal-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .preview-close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: transparent;
          border: none;
          color: #a0a0a5;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .preview-close-btn:hover {
          color: white;
          background: rgba(255,255,255,0.05);
        }

        .preview-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .preview-avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .preview-header h3 {
          font-family: var(--font-display);
          font-size: 1.3rem;
          font-weight: 800;
          color: white;
          margin-bottom: 3px;
        }

        .preview-category-badge {
          font-size: 0.65rem;
          font-weight: 700;
          color: #ff4500;
          background: rgba(255, 69, 0, 0.1);
          padding: 2px 8px;
          border-radius: 8px;
          display: inline-block;
        }

        .preview-body {
          margin-bottom: 24px;
        }

        .preview-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 16px;
        }

        .preview-stat-row {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 8px;
          padding: 10px 14px;
        }

        .preview-stat-item {
          display: flex;
          flex-direction: column;
        }
        .preview-stat-item .label {
          font-size: 0.68rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 700;
        }
        .preview-stat-item .value {
          font-size: 0.8rem;
          color: white;
          margin-top: 2px;
        }

        .preview-actions {
          display: flex;
          gap: 12px;
        }

        .preview-btn {
          flex: 1;
          padding: 10px 16px;
          border-radius: 20px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview-primary-btn {
          background: #ff4500;
          color: white;
        }
        .preview-primary-btn:hover {
          background: #ff5714;
        }

        .preview-leave-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #a0a0a5;
        }
        .preview-leave-btn:hover {
          border-color: #ef4444;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
        }

        /* TAKEOVER FULL SCREEN PANEL */
        .clan-takeover-panel {
          width: 100%;
          max-width: 900px;
          height: calc(100vh - 120px);
          background: #110f15;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 15px 40px rgba(0,0,0,0.6);
          animation: cc-modal-in 0.25s ease-out;
        }

        .takeover-header {
          background: #16141c;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 20px;
          position: relative;
        }

        .takeover-back-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255,255,255,0.06);
          color: #a0a0a5;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }
        .takeover-back-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: white;
        }

        .takeover-emoji {
          font-size: 1.8rem;
        }

        .takeover-header h2 {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 800;
          color: white;
          line-height: 1.1;
        }

        .takeover-pledge-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .takeover-layout-grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 280px;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .takeover-layout-grid {
            grid-template-columns: 1fr;
            overflow-y: auto;
          }
          .takeover-stats-column {
            border-left: none !important;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            overflow-y: visible !important;
          }
        }

        .takeover-chat-column {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          padding: 16px;
        }

        .takeover-stats-column {
          background: #141219;
          border-left: 1px solid rgba(255, 255, 255, 0.05);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow-y: auto;
          height: 100%;
        }

        .takeover-panel-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 10px;
          padding: 14px;
        }

        .chat-log-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .takeover-messages-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-right: 4px;
          margin-bottom: 12px;
        }

        .takeover-msg-bubble-wrapper {
          display: flex;
          flex-direction: column;
          max-width: 85%;
        }

        .takeover-msg-bubble-wrapper.me {
          align-self: flex-end;
        }

        .takeover-msg-bubble-wrapper.partner {
          align-self: flex-start;
        }

        .takeover-msg-sender {
          font-size: 0.68rem;
          color: #ff4500;
          font-weight: 700;
          margin-bottom: 2px;
          margin-left: 6px;
        }

        .takeover-msg-bubble {
          padding: 9px 12px;
          border-radius: 12px;
          font-size: 0.82rem;
          line-height: 1.4;
          word-break: break-word;
          color: white;
        }

        .takeover-msg-bubble-wrapper.me .takeover-msg-bubble {
          background: linear-gradient(135deg, #ff4500, #ff6a00);
          border-bottom-right-radius: 2px;
        }

        .takeover-msg-bubble-wrapper.partner .takeover-msg-bubble {
          background: #25222b;
          border-bottom-left-radius: 2px;
        }

        /* Quick actions check-ins */
        .takeover-quick-actions {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 6px;
          margin-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }

        .takeover-quick-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255,255,255,0.06);
          color: var(--text-secondary);
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.68rem;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .takeover-quick-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: white;
        }

        /* Chat Form input */
        .takeover-chat-form {
          display: flex;
          gap: 8px;
        }

        .takeover-chat-form input {
          flex: 1;
          background: #201d26;
          border: 1px solid rgba(255,255,255,0.05);
          color: white;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          outline: none;
        }
        .takeover-chat-form input:focus {
          border-color: rgba(255, 69, 0, 0.3);
        }

        .takeover-send-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ff4500;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
        }
        .takeover-send-btn:hover:not(:disabled) {
          background: #ff5714;
        }
        .takeover-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Flare alert */
        .takeover-flare-alert {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid #ef4444;
          padding: 10px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .takeover-support-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 4px 8px;
          font-size: 0.7rem;
          font-weight: 700;
          border-radius: 4px;
          cursor: pointer;
        }
        .takeover-support-btn:hover {
          background: #059669;
        }

        /* Stat boxes */
        .takeover-stat-box {
          background: #1b1921;
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 6px;
          padding: 10px;
          text-align: center;
        }
        .takeover-stat-label {
          font-size: 0.7rem;
          color: var(--text-secondary);
          display: block;
          margin-bottom: 2px;
        }
        .takeover-stat-value {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-family: var(--font-display);
          font-size: 1.15rem;
          font-weight: 800;
          color: white;
        }
        .takeover-stat-subtitle {
          font-size: 0.62rem;
          color: var(--text-muted);
          display: block;
          margin-top: 1px;
        }

        /* Member rows */
        .takeover-member-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 0.78rem;
        }
        .takeover-member-item.me {
          background: rgba(255, 69, 0, 0.08);
          border: 1px solid rgba(255, 69, 0, 0.2);
        }
        .takeover-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .takeover-member-streak {
          font-family: var(--font-display);
          font-weight: 700;
          color: #fbbf24;
        }
      `}</style>
    </div>
  );
}
