import { useState, useEffect, useRef } from 'react';
import { Wind, Activity, Users, X, CheckCircle } from 'lucide-react';
import { sendClanFlare, logSOSWin } from '../utils/storage';

export default function SOSOverlay({ isOpen, onClose, onRedirectToChat }) {
  const [activeTab, setActiveTab] = useState('menu'); // 'menu', 'breathing', 'physical', 'flare-sent'
  
  // Breathing state
  const [breathState, setBreathState] = useState('Inhale'); // Inhale, Hold, Exhale
  const [breathTimer, setBreathTimer] = useState(4);
  const breathIntervalRef = useRef(null);

  // Physical exercise state
  const [taskSelected, setTaskSelected] = useState('');
  const [taskTimer, setTaskTimer] = useState(120); // 2 minutes
  const [taskRunning, setTaskRunning] = useState(false);
  const taskIntervalRef = useRef(null);
  
  // Clean up timers on unmount/close
  useEffect(() => {
    return () => {
      clearInterval(breathIntervalRef.current);
      clearInterval(taskIntervalRef.current);
    };
  }, []);

  if (!isOpen) return null;

  // 4-7-8 Breathing Cycle Logic
  const startBreathing = () => {
    setActiveTab('breathing');
    setBreathState('Inhale');
    setBreathTimer(4);
    
    clearInterval(breathIntervalRef.current);
    
    breathIntervalRef.current = setInterval(() => {
      setBreathTimer(prev => {
        if (prev <= 1) {
          // State transition
          setBreathState(curr => {
            if (curr === 'Inhale') {
              setBreathTimer(7);
              return 'Hold';
            } else if (curr === 'Hold') {
              setBreathTimer(8);
              return 'Exhale';
            } else {
              setBreathTimer(4);
              return 'Inhale';
            }
          });
          return 0; // Temp placeholder, will set immediately next run
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopBreathing = () => {
    clearInterval(breathIntervalRef.current);
    setActiveTab('menu');
  };

  // Physical Task Logic
  const selectTask = (taskName) => {
    setTaskSelected(taskName);
    setActiveTab('physical');
    setTaskTimer(120);
    setTaskRunning(true);
    
    clearInterval(taskIntervalRef.current);
    taskIntervalRef.current = setInterval(() => {
      setTaskTimer(prev => {
        if (prev <= 1) {
          clearInterval(taskIntervalRef.current);
          setTaskRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const toggleTaskTimer = () => {
    if (taskRunning) {
      clearInterval(taskIntervalRef.current);
      setTaskRunning(false);
    } else {
      setTaskRunning(true);
      taskIntervalRef.current = setInterval(() => {
        setTaskTimer(prev => {
          if (prev <= 1) {
            clearInterval(taskIntervalRef.current);
            setTaskRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const completeTaskWin = (method) => {
    clearInterval(taskIntervalRef.current);
    logSOSWin(method);
    setActiveTab('success-screen');
  };

  // Clan Flare logic
  const handleSendFlare = () => {
    sendClanFlare();
    setActiveTab('flare-sent');
  };

  const handleCloseSuccess = () => {
    setActiveTab('menu');
    onClose();
  };

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(7, 10, 18, 0.98)',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      overflowY: 'auto'
    }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            background: 'var(--color-danger)',
            color: 'white',
            fontWeight: 800,
            fontSize: '0.75rem',
            padding: '4px 8px',
            borderRadius: '4px'
          }}>SOS MODE</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Urge Interruption</span>
        </div>
        
        {activeTab !== 'success-screen' && (
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }}
          >
            <X size={24} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        
        {/* MENU STATE */}
        {activeTab === 'menu' && (
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '12px' }}>
              Craving Detected
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '32px', maxWidth: '380px', margin: '0 auto 32px auto' }}>
              Your brain is craving a high-amplitude spike. Intercept the automatic loop now by selecting a physical or social displacement activity.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '340px', margin: '0 auto' }}>
              
              {/* Option 1: 4-7-8 Breathing */}
              <button 
                onClick={startBreathing}
                className="glass-panel interactive-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                  color: 'white'
                }}
              >
                <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', color: 'var(--color-accent)' }}>
                  <Wind size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Physiological Breath Reset</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>4-7-8 breathing to regulate heart rate variability.</p>
                </div>
              </button>

              {/* Option 2: Physical Displacement Tasks */}
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px', paddingLeft: '4px' }}>
                  Choose a Physical Task
                </span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { name: '15 Pushups / Squats', label: '15 Pushups / Squats' },
                    { name: 'Splash Cold Water on Face', label: 'Splash Cold Water' },
                    { name: '2-Min Muscle Stretch', label: '2-Minute Muscle Stretch' }
                  ].map(task => (
                    <button
                      key={task.name}
                      onClick={() => selectTask(task.name)}
                      className="glass-panel interactive-card"
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'white',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>{task.label}</span>
                      <Activity size={16} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 3: Clan Escalation Flare */}
              <button 
                onClick={handleSendFlare}
                className="glass-panel interactive-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                  color: 'white',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}
              >
                <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(239,68,68,0.15)', color: 'var(--color-danger)' }}>
                  <Users size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Send Urgent Clan Flare</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>Notify your pod instantly. Do not fight alone.</p>
                </div>
              </button>

              {/* Option 4: Random Peer Chat */}
              <button 
                onClick={() => {
                  onClose();
                  onRedirectToChat();
                }}
                className="glass-panel interactive-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                  color: 'white'
                }}
              >
                <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', color: 'var(--color-success)' }}>
                  <Users size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Talk to someone random</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>Anonymously chat with a peer in recovery right now.</p>
                </div>
              </button>

            </div>
          </div>
        )}

        {/* BREATHING STATE */}
        {activeTab === 'breathing' && (
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '8px' }}>Physiological Regulation</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Follow the expanding circle. Focus fully on the sensation of air.
            </p>

            <div className="breathing-circle-outer">
              <div 
                className="breathing-circle-inner" 
                style={{
                  transform: 
                    breathState === 'Inhale' 
                      ? `scale(${1 + (4 - breathTimer) * 0.2})` 
                      : breathState === 'Hold' 
                      ? 'scale(1.8)' 
                      : `scale(${1 + (breathTimer) * 0.1})`
                }}
              />
            </div>

            <div className="breathing-state">{breathState}</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '8px 0' }}>{breathTimer}s</div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '32px' }}>
              <button 
                className="btn btn-secondary"
                onClick={stopBreathing}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success"
                onClick={() => completeTaskWin('Physiological Breathing')}
              >
                Cravings Subsided
              </button>
            </div>
          </div>
        )}

        {/* PHYSICAL TASK STATE */}
        {activeTab === 'physical' && (
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '12px' }}>
              Task: {taskSelected}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '32px', maxWidth: '300px', margin: '0 auto 32px auto' }}>
              Keep your body active until the countdown ends. The intense physical sensation prunes the dopamine surge.
            </p>

            <div style={{
              fontSize: '4rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: 'var(--color-warning)',
              marginBottom: '32px'
            }}>
              {formatTime(taskTimer)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  clearInterval(taskIntervalRef.current);
                  setActiveTab('menu');
                }}
              >
                Back
              </button>
              <button 
                className="btn btn-outline-danger"
                onClick={toggleTaskTimer}
              >
                {taskRunning ? 'Pause' : 'Resume'}
              </button>
              <button 
                className="btn btn-success"
                onClick={() => completeTaskWin(taskSelected)}
              >
                Done / Urge Gone
              </button>
            </div>
          </div>
        )}

        {/* FLARE SENT STATE */}
        {activeTab === 'flare-sent' && (
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              padding: '16px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--color-danger)',
              marginBottom: '24px',
              animation: 'pulse-out 2s infinite ease-out'
            }}>
              <Users size={40} />
            </div>

            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '12px' }}>
              Flare Dispatched
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '32px', maxWidth: '320px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
              We have alerted your accountability pod, **The Neural Rewirers**. An automated support message has been sent to your private chat. Open the Clan chat when you are ready.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => setActiveTab('menu')}
              >
                SOS Menu
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  onRedirectToChat(); // Actually we want to direct to Clan, App.jsx handles view swapping
                  // We'll pass information to change to clan tab
                  window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'clan' }));
                }}
              >
                Go to Clan Chat
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS / WIN CONFIRMATION */}
        {activeTab === 'success-screen' && (
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              padding: '16px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--color-success)',
              marginBottom: '24px'
            }}>
              <CheckCircle size={44} />
            </div>

            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: '8px' }}>
              Urge Conquered
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              You intercepted the craving loop. This builds physical prefrontal strength.
            </p>
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '12px 18px',
              borderRadius: '8px',
              display: 'inline-block',
              marginBottom: '32px',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: 'var(--color-success-light)'
            }}>
              +25 XP (Effort Win)
            </div>

            <button 
              className="btn btn-success" 
              style={{ width: '100%', maxWidth: '280px' }}
              onClick={handleCloseSuccess}
            >
              Continue Recovery
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
