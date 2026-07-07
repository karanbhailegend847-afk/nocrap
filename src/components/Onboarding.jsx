import { useState } from 'react';
import { Sparkles, Brain, Shield, User, ArrowRight, RefreshCw, Zap } from 'lucide-react';
import { registerUser } from '../utils/storage';

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0); // 0: Value Prop, 1: Goal/Intake, 2: Commitment, 3: Username
  const [answers, setAnswers] = useState({
    goals: [],
    triggers: [],
    gender: '',
    orientation: '',
    commitment: '24h'
  });
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  // Random username generator for anonymity
  const generateRandomUsername = () => {
    const prefixes = ['Quiet', 'Focus', 'Calm', 'Steadfast', 'Sovereign', 'Resilient', 'Clear', 'Mindful', 'Noble', 'Anchor'];
    const suffixes = ['Path', 'Wave', 'Mind', 'Summit', 'Shield', 'Breather', 'Horizon', 'Reset', 'Walker', 'Vibe'];
    const num = Math.floor(Math.random() * 900) + 100;
    const pre = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suf = suffixes[Math.floor(Math.random() * suffixes.length)];
    setUsername(`${pre}${suf}${num}`);
  };

  const toggleAnswerArray = (field, value) => {
    setAnswers(prev => {
      const current = prev[field];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please choose a username or generate a random one.');
      return;
    }
    const registeredUser = registerUser(username.trim(), answers);
    onComplete(registeredUser);
  };

  return (
    <div className="fade-in" style={{ padding: '24px 8px', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* STEP 0: Neuroscience Value Proposition */}
      {step === 0 && (
        <div className="glass-panel" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', marginBottom: '24px' }}>
            <Brain size={44} className="text-accent" style={{ color: 'var(--color-accent)' }} />
          </div>
          
          <h2 style={{ fontSize: '1.8rem', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>
            Welcome to <span style={{ color: 'var(--color-accent-light)' }}>NoCrap</span>
          </h2>
          
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Pornography delivers fast, passive, high-amplitude dopamine that hijacks your prefrontal cortex. NoCrap helps you compete by building <strong>cumulative, effort-based rewards</strong>: social bonds, neuro-retraining exercises, and visible identity milestones.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left', marginBottom: '32px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--color-success)', marginTop: '2px' }}><Shield size={20} /></div>
              <div>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>100% Client-Side Privacy</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No email required. Your journals, streaks, and scores stay in local storage.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--color-accent-light)', marginTop: '2px' }}><Zap size={20} /></div>
              <div>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Neuroscience Tools</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Craving-interrupt techniques and 1-on-1 peer chat to build connection.</p>
              </div>
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setStep(1)}>
            Begin Neuro-Intake <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* STEP 1: Intake Questions */}
      {step === 1 && (
        <div className="glass-panel" style={{ padding: '28px 20px' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>Personalize Your Plan</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Answers are confidential and used to customize clinical trigger examples and support guidelines.
          </p>

          {/* Goals Intake */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '10px' }}>
              What goals are you prioritizing? (Select all)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {['Regain Focus', 'Heal Sensitization', 'Rebuild Intimacy', 'Establish Autonomy', 'Emotional Stability'].map(goal => {
                const selected = answers.goals.includes(goal);
                return (
                  <button
                    key={goal}
                    type="button"
                    className={`btn ${selected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 14px', fontSize: '0.85rem', borderRadius: '20px' }}
                    onClick={() => toggleAnswerArray('goals', goal)}
                  >
                    {goal}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Triggers Intake */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '10px' }}>
              What environments or states trigger you? (Select all)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {['Boredom/Isolation', 'Stress/Anxiety', 'Late-night Screens', 'Social Media Scrolls', 'Fatigue/Burnout'].map(trigger => {
                const selected = answers.triggers.includes(trigger);
                return (
                  <button
                    key={trigger}
                    type="button"
                    className={`btn ${selected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 14px', fontSize: '0.85rem', borderRadius: '20px' }}
                    onClick={() => toggleAnswerArray('triggers', trigger)}
                  >
                    {trigger}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Demographics */}
          <div style={{ marginBottom: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '10px' }}>
              Demographics (Optional - helps tailor inclusive copy)
            </label>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Gender</span>
                <select
                  value={answers.gender}
                  onChange={e => setAnswers(prev => ({ ...prev, gender: e.target.value }))}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', outline: 'none' }}
                >
                  <option value="">Select Gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-Binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Orientation</span>
                <select
                  value={answers.orientation}
                  onChange={e => setAnswers(prev => ({ ...prev, orientation: e.target.value }))}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', outline: 'none' }}
                >
                  <option value="">Select Orientation</option>
                  <option value="heterosexual">Heterosexual</option>
                  <option value="lgbtq+">LGBTQ+</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => setStep(2)}
            disabled={answers.goals.length === 0}
          >
            Next: Set Commitment
          </button>
        </div>
      )}

      {/* STEP 2: Momentum Commitments */}
      {step === 2 && (
        <div className="glass-panel" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(245, 158, 5, 0.12)', marginBottom: '24px' }}>
            <Sparkles size={40} className="text-warning" style={{ color: 'var(--color-warning)' }} />
          </div>

          <h3 style={{ fontSize: '1.4rem', marginBottom: '12px', fontFamily: 'var(--font-display)' }}>Commit to Momentum</h3>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.5' }}>
            Rather than planning for a daunting 90-day goal, neuroscience proves that setting **small, achievable micro-goals** build early dopamine wins and momentum. Commit to a manageable milestone first.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {[
              { id: '24h', label: '24 Hours (Highly Recommended)', desc: 'Build initial confidence and break the immediate loop.' },
              { id: '3d', label: '3 Days (Steady Steps)', desc: 'Surpass the initial acute withdrawal window.' },
              { id: '7d', label: '7 Days (Neural Reset)', desc: 'Demonstrate active cognitive control over triggers.' }
            ].map(commit => {
              const selected = answers.commitment === commit.id;
              return (
                <button
                  key={commit.id}
                  type="button"
                  className={`glass-panel interactive-card`}
                  style={{
                    padding: '16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderColor: selected ? 'var(--color-warning)' : 'var(--glass-border)',
                    background: selected ? 'rgba(245, 158, 5, 0.08)' : 'var(--glass-bg)',
                    width: '100%',
                    display: 'block'
                  }}
                  onClick={() => setAnswers(prev => ({ ...prev, commitment: commit.id }))}
                >
                  <div style={{ fontWeight: 600, color: selected ? 'var(--color-warning)' : 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '4px' }}>
                    {commit.label}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {commit.desc}
                  </div>
                </button>
              );
            })}
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => {
            generateRandomUsername();
            setStep(3);
          }}>
            Next: Choose Handle
          </button>
        </div>
      )}

      {/* STEP 3: Anonymous Registration */}
      {step === 3 && (
        <div className="glass-panel" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', marginBottom: '24px' }}>
            <User size={40} className="text-success" style={{ color: 'var(--color-success)' }} />
          </div>

          <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>Anonymous Account</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
            You will participate anonymously in community forums. No emails or real names required.
          </p>

          <form onSubmit={handleRegister} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Your Username
              </label>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  maxLength={20}
                  placeholder="Enter custom handle"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--glass-border)',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
                
                <button
                  type="button"
                  onClick={generateRandomUsername}
                  className="btn btn-secondary"
                  style={{ padding: '12px' }}
                  title="Generate Username"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
              
              {error && (
                <div style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '6px' }}>
                  {error}
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', marginBottom: '24px', borderLeft: '3px solid var(--color-success)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                🔑 <strong>No Password?</strong> Since NoCrap is localized in your browser, clearing website cookies or local storage will wipe progress. Keep your database safe by avoiding private browsing modes while using this device.
              </p>
            </div>

            <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
              Complete Setup & Join Clan
            </button>
          </form>
        </div>
      )}
      
    </div>
  );
}
