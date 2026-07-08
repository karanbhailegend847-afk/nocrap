import { useState, useEffect } from 'react';
import { Home, BookOpen, Users, MessageSquare, Activity, Bell, Search, PlusCircle, LogOut } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import AuthScreen from './components/AuthScreen';
import Clans from './components/Clans';
import Forum from './components/Forum';
import Chatbox from './components/Chatbox';
import Journal from './components/Journal';
import Notifications from './components/Notifications';
import Profile from './components/Profile';
import CreateClanModal from './components/CreateClanModal';
import { initializeDatabase, getData, getStreakMetrics, logSlip, seedUserFromFirebase } from './utils/storage';
import { getClansListFS, getUserClansFS } from './utils/firestore';

export default function App() {
  const [user, setUser] = useState(null);          // local USER record
  const [authReady, setAuthReady] = useState(false); // Firebase resolved
  const [activeTab, setActiveTab] = useState('forum'); // 'forum' is default main view
  const [activePod, setActivePod] = useState('all'); // Filter for forum
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // States to sync metrics globally
  const [userStreak, setUserStreak] = useState(() => getStreakMetrics().current);

  const [joinedClans, setJoinedClans] = useState([]);
  const [clansList, setClansList] = useState([]);
  const [isCreateClanOpen, setIsCreateClanOpen] = useState(false);



  // Relapse form states
  const [slipTrigger, setSlipTrigger] = useState('Boredom/Isolation');
  const [slipReflection, setSlipReflection] = useState('');
  const [slipIntensity, setSlipIntensity] = useState(3);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Default Avatar inline SVG
  const defaultAvatarSVG = `data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="%23ff4500"/><circle cx="50" cy="42" r="18" fill="%23fff"/><path d="M22 80C22 65 34.5 58 50 58C65.5 58 78 65 78 80" stroke="%23fff" stroke-width="8" stroke-linecap="round"/></svg>`;

  const loadAppStates = () => {
    const currentUser = getData('USER');
    if (!currentUser) return;
    setUser(currentUser);

    // Sync metrics
    const metrics = getStreakMetrics();
    setUserStreak(metrics.current);


  };


  useEffect(() => {
    initializeDatabase();

    // Firebase auth state listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const localUser = seedUserFromFirebase(firebaseUser);
        setUser(localUser);
        const metrics = getStreakMetrics();
        setUserStreak(metrics.current);

        try {
          const list = await getClansListFS();
          const joined = await getUserClansFS(firebaseUser.uid);
          setClansList(list);
          setJoinedClans(joined);
        } catch (err) {
          console.warn('Error fetching clans from Firestore:', err);
        }
      } else {
        setUser(null);
        setJoinedClans([]);
        setClansList([]);
      }
      setAuthReady(true);
    });

    const handleSwitchTab = (e) => {
      if (e.detail) {
        if (typeof e.detail === 'string') {
          setActiveTab(e.detail);
        } else if (e.detail.tab) {
          setActiveTab(e.detail.tab);
          if (e.detail.pod) {
            setActivePod(e.detail.pod);
          }
        }
      }
    };
    const handleXPUpdate = () => {
      loadAppStates();
    };
    const handleClansUpdate = () => {
      const uid = auth.currentUser?.uid;
      if (uid) {
        Promise.all([
          getClansListFS(),
          getUserClansFS(uid)
        ]).then(([list, joined]) => {
          setClansList(list);
          setJoinedClans(joined);
        }).catch(console.warn);
      }
    };
    const handleOpenCreateClan = () => {
      setIsCreateClanOpen(true);
    };

    window.addEventListener('switch-tab', handleSwitchTab);
    window.addEventListener('xp-updated', handleXPUpdate);
    window.addEventListener('focus', loadAppStates);
    window.addEventListener('clans-updated', handleClansUpdate);
    window.addEventListener('open-create-clan', handleOpenCreateClan);

    return () => {
      unsubscribeAuth();
      window.removeEventListener('switch-tab', handleSwitchTab);
      window.removeEventListener('xp-updated', handleXPUpdate);
      window.removeEventListener('focus', loadAppStates);
      window.removeEventListener('clans-updated', handleClansUpdate);
      window.removeEventListener('open-create-clan', handleOpenCreateClan);
    };
  }, []);

  const handleAuthSuccess = (firebaseUser) => {
    const localUser = seedUserFromFirebase(firebaseUser);
    setUser(localUser);
    loadAppStates();
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
  };


  const handleSlipSubmit = (e) => {
    e.preventDefault();
    logSlip(slipTrigger, slipReflection.trim(), slipIntensity);
    setSlipReflection('');
    setIsSlipOpen(false);
    loadAppStates();
  };

  // Nav actions
  const selectPodFromSidebar = (podId) => {
    setActivePod(podId);
    setActiveTab('forum');
  };

  // Header quick thread trigger
  const triggerCreateThread = () => {
    setActiveTab('forum');
    // Dispatch event to open Create Thread modal inside Forum.jsx
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-create-thread'));
    }, 50);
  };

  // Show spinner while Firebase resolves auth state
  if (!authReady) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#070a12' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#ff4500', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }




  const searchResults = searchQuery.trim() ? clansList.filter(c => {
    const q = searchQuery.toLowerCase();
    return (c.name && c.name.toLowerCase().includes(q)) || 
           (c.id && c.id.toLowerCase().includes(q)) || 
           (c.description && c.description.toLowerCase().includes(q));
  }) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* REDDIT-STYLE TOP NAVBAR */}
      <header className="top-navbar-reddit">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => selectPodFromSidebar('all')}>
          <img
            src="/clan_no_crap.jpg"
            alt="NoCrap"
            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: 'white', letterSpacing: '-0.025em' }}>
            NoCrap
          </h1>
        </div>

        {/* Search Input Bar */}
        <div className="search-bar-container" style={{ position: 'relative', zIndex: 1001 }}>
          <Search size={16} className="search-bar-icon" />
          <input
            type="text"
            className="search-bar-input"
            placeholder="Search neuroscience, recovery tips, or pods..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // Dispatch query to Forum.jsx
              window.dispatchEvent(new CustomEvent('forum-search', { detail: e.target.value }));
            }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
          />

          {searchFocused && searchQuery.trim() && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              background: '#1a1820',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              maxHeight: '350px',
              overflowY: 'auto',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              zIndex: 1100
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
                        selectPodFromSidebar(clan.id);
                        setSearchQuery('');
                        setSearchFocused(false);
                        window.dispatchEvent(new CustomEvent('forum-search', { detail: '' }));
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        transition: 'background 0.2s ease',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', background: `${clan.color || '#ff4500'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0 }}>
                        {(clan.logo || clan.logoUrl)
                          ? <img src={clan.logo || clan.logoUrl} alt={clan.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: '1.1rem' }}>{clan.emoji || '👥'}</span>
                        }
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'white' }}>p/{clan.id}</span>
                        <span style={{ fontSize: '0.75rem', color: '#a0a0a5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clan.description}</span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ padding: '20px 16px', color: '#a0a0a5', fontSize: '0.85rem', textAlign: 'center' }}>
                  No communities found.
                </div>
              )}
            </div>
          )}
        </div>

        {/* User profile and actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '16px', gap: '4px' }} onClick={triggerCreateThread}>
            <PlusCircle size={14} /> Create
          </button>
          
          <button 
            style={{ background: 'none', border: 'none', color: activeTab === 'notifications' ? 'var(--color-accent)' : 'var(--text-secondary)', cursor: 'pointer', padding: '4px', position: 'relative' }}
            onClick={() => setActiveTab('notifications')}
            title="Notifications"
          >
            <Bell size={20} />
          </button>

          {/* Profile Avatar */}
          <div className="avatar-circle" title={user.username} onClick={() => setIsProfileOpen(true)}>
            <img
              src={user.photoURL || '/default_avatar.png'}
              alt="Avatar"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = defaultAvatarSVG;
              }}
            />
          </div>

          {/* Sign Out */}
          <button
            title="Sign out"
            onClick={handleSignOut}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* 3-COLUMN LAYOUT STRUCTURE */}
      <div className="reddit-layout-grid">
        
        {/* LEFT COLUMN: Sidebar Navigation */}
        <aside className="sidebar-left-reddit">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button 
              className={`sidebar-link ${activeTab === 'forum' && activePod === 'all' ? 'active' : ''}`}
              onClick={() => selectPodFromSidebar('all')}
            >
              <Home size={18} /> Home / Feed
            </button>

            <button 
              className={`sidebar-link ${activeTab === 'clan' ? 'active' : ''}`}
              onClick={() => setActiveTab('clan')}
            >
              <Users size={18} /> Explore Clans
            </button>

            <button 
              className="sidebar-link"
              onClick={() => setIsCreateClanOpen(true)}
            >
              <PlusCircle size={18} style={{ color: 'var(--color-accent-light)' }} /> Start a Clan
            </button>

            <button 
              className={`sidebar-link ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={18} /> Chatbox
            </button>

            <button 
              className={`sidebar-link ${activeTab === 'journal' ? 'active' : ''}`}
              onClick={() => setActiveTab('journal')}
            >
              <BookOpen size={18} /> Journal & Letters
            </button>

          </div>

          {/* Subforum list */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '16px', display: 'block', marginBottom: '8px' }}>
              Clans on NoCrap
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {clansList.filter(pod => joinedClans.includes(pod.id)).map(pod => (
                <button
                  key={pod.id}
                  className={`sidebar-link ${activeTab === 'forum' && activePod === pod.id ? 'active' : ''}`}
                  onClick={() => selectPodFromSidebar(pod.id)}
                  style={{ paddingLeft: '24px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {pod.logoUrl ? (
                    <img src={pod.logoUrl} alt={pod.name} style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span>{pod.emoji || '👥'}</span>
                  )}
                  <span>p/{pod.id}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* MIDDLE COLUMN: Primary Tab Screen */}
        <main className="middle-feed-column">
          {activeTab === 'forum' && <Forum selectedPod={activePod} user={user} />}
          {activeTab === 'clan' && <Clans userStreak={userStreak} user={user} />}
          {activeTab === 'chat' && <Chatbox />}
          {activeTab === 'journal' && <Journal currentStreak={userStreak} />}
          {activeTab === 'notifications' && <Notifications />}
        </main>

        {/* RIGHT COLUMN: empty sidebar */}
        <aside className="sidebar-right-reddit">
        </aside>


      </div>

      {/* NON-PUNITIVE RELAPSE LOG MODAL */}
      {isSlipOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7, 10, 18, 0.98)',
          zIndex: 1500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', marginBottom: '8px', color: 'white' }}>
              Soft Reset & Reflection
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.5', marginBottom: '20px' }}>
              A lapse is a temporary neurochemical event. <strong>It does not erase</strong> the physical healing, synapse pruning, or prefrontal cortex strength you have built over your past streak. Let's study the context to protect your next run.
            </p>

            <form onSubmit={handleSlipSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  What was the primary trigger environment?
                </label>
                <select
                  value={slipTrigger}
                  onChange={e => setSlipTrigger(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', outline: 'none' }}
                >
                  <option value="Boredom/Isolation">Boredom / Isolation</option>
                  <option value="Stress/Anxiety">Stress / Anxiety</option>
                  <option value="Late-night Screens">Late-night Screens</option>
                  <option value="Fatigue/Burnout">Fatigue / Burnout</option>
                  <option value="Social Media Scrolling">Social Media Scrolls</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Urge Intensity at Lapse (1-5)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={slipIntensity}
                  onChange={e => setSlipIntensity(Number(e.target.value))}
                  style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>Mild</span>
                  <span>Moderate</span>
                  <span>Intense</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  What is the plan to handle this specific trigger next time?
                </label>
                <textarea
                  value={slipReflection}
                  onChange={e => setSlipReflection(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Leave my phone charging in the kitchen by 10 PM, or use the SOS breathing cycle immediately."
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', outline: 'none', resize: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsSlipOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Log Reflection & Continue (+15 XP)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROFILE OVERLAY */}
      {isProfileOpen && (
        <Profile onClose={() => setIsProfileOpen(false)} />
      )}

      {/* CLAN CREATION WIZARD */}
      <CreateClanModal 
        isOpen={isCreateClanOpen} 
        onClose={() => setIsCreateClanOpen(false)} 
      />

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="bottom-navbar">
        <button 
          onClick={() => { selectPodFromSidebar('all'); }} 
          className={`nav-item ${activeTab === 'forum' ? 'active' : ''}`}
        >
          <Home size={18} />
          <span>Home</span>
        </button>

        <button 
          onClick={() => setActiveTab('clan')} 
          className={`nav-item ${activeTab === 'clan' ? 'active' : ''}`}
        >
          <Users size={18} />
          <span>Clan</span>
        </button>

        <button 
          onClick={() => setActiveTab('chat')} 
          className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
        >
          <MessageSquare size={18} />
          <span>Chat</span>
        </button>

        <button 
          onClick={() => setActiveTab('journal')} 
          className={`nav-item ${activeTab === 'journal' ? 'active' : ''}`}
        >
          <BookOpen size={18} />
          <span>Journal</span>
        </button>

      </nav>

    </div>
  );
}
