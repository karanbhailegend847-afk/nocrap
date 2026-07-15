import { useState, useEffect } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

/* ── Google "G" SVG icon ─────────────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.2 17.7 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8C43.6 37.4 46.5 31.4 46.5 24.5z"/>
      <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z"/>
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.3 0-11.6-3.7-13.5-9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/>
    </svg>
  );
}

export default function AuthScreen({ onAuthSuccess, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode); // 'signin' | 'signup'

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const clearError = () => setError('');

  /* ── Google sign-in ─────────────────────────────────────────────────── */
  const handleGoogle = async () => {
    setLoading(true);
    clearError();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onAuthSuccess(result.user);
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  /* ── Email/password ─────────────────────────────────────────────────── */
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      let result;
      if (mode === 'signin') {
        result = await signInWithEmailAndPassword(auth, email, password);
      } else {
        result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: username });
      }
      onAuthSuccess(result.user);
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const friendlyError = (code) => {
    const map = {
      'auth/user-not-found':      'No account found with that email.',
      'auth/wrong-password':      'Incorrect password.',
      'auth/email-already-in-use':'An account with that email already exists.',
      'auth/weak-password':       'Password must be at least 6 characters.',
      'auth/invalid-email':       'Please enter a valid email address.',
      'auth/popup-closed-by-user':'Sign-in cancelled.',
      'auth/network-request-failed': 'Network error. Check your connection.',
    };
    return map[code] || 'Something went wrong. Please try again.';
  };

  return (
    <div className="auth-overlay">
      {/* Left panel — brand / hero */}
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <div className="auth-logo">
            <img src="/clan_no_crap.jpg" alt="NoCrap" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
            <span>NoCrap</span>
          </div>
          <h1 className="auth-hero-title">Your brain is<br/>worth rewiring.</h1>
          <p className="auth-hero-sub">Join thousands rebuilding dopamine sensitivity, one day at a time. Science-backed. Community-driven.</p>

        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <h2 className="auth-card-title">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="auth-card-sub">
            {mode === 'signin'
              ? 'Sign in to continue your streak.'
              : 'Start your recovery journey today.'}
          </p>

          {/* Google */}
          <button className="auth-btn-google" onClick={handleGoogle} disabled={loading}>
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="auth-divider"><span>or</span></div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth} className="auth-email-form">
            {mode === 'signup' && (
              <div className="auth-input-group">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={20}
                  autoComplete="username"
                />
              </div>
            )}
            <div className="auth-input-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="auth-input-group">
              <label>Password</label>
              <input
                type="password"
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading
                ? 'Please wait…'
                : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="auth-toggle">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); clearError(); }}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          <p className="auth-disclaimer">
            By continuing, you agree to our <span>Terms</span> and <span>Privacy Policy</span>.
          </p>
        </div>
      </div>

      <style>{`
        .auth-overlay {
          display: flex;
          min-height: 520px;
          background: #070a12;
          font-family: var(--font-sans);
          animation: authFadeIn 0.4s ease;
          width: 100%;
        }
        @keyframes authFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Left hero ─────────────────────────────────────────── */
        .auth-hero {
          flex: 1;
          background: linear-gradient(135deg, #0f1420 0%, #1a0a00 60%, #0f1420 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
          position: relative;
          overflow: hidden;
        }
        .auth-hero::before {
          content: '';
          position: absolute;
          top: -120px; left: -120px;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(255,69,0,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .auth-hero::after {
          content: '';
          position: absolute;
          bottom: -80px; right: -80px;
          width: 360px; height: 360px;
          background: radial-gradient(circle, rgba(255,69,0,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .auth-hero-inner {
          position: relative;
          z-index: 1;
          max-width: 440px;
        }
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-display, 'Syne', sans-serif);
          font-size: 1.4rem;
          font-weight: 800;
          color: white;
          margin-bottom: 40px;
        }
        .auth-hero-title {
          font-family: var(--font-display, 'Syne', sans-serif);
          font-size: 3rem;
          font-weight: 900;
          color: white;
          line-height: 1.1;
          margin: 0 0 20px 0;
        }
        .auth-hero-title em { color: #ff4500; font-style: normal; }
        .auth-hero-sub {
          font-size: 1rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.6;
          margin: 0 0 36px 0;
        }
        .auth-hero-stats {
          display: flex;
          gap: 28px;
        }
        .auth-hero-stats div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .auth-hero-stats strong {
          font-size: 1.15rem;
          font-weight: 800;
          color: #ff4500;
        }
        .auth-hero-stats span {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.4);
        }

        /* ── Right form panel ──────────────────────────────────── */
        .auth-form-panel {
          width: 460px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          background: #0d1117;
          border-left: 1px solid rgba(255,255,255,0.05);
        }
        .auth-card {
          width: 100%;
          max-width: 380px;
        }
        .auth-card-title {
          font-family: var(--font-display, 'Syne', sans-serif);
          font-size: 1.7rem;
          font-weight: 800;
          color: white;
          margin: 0 0 6px 0;
        }
        .auth-card-sub {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.45);
          margin: 0 0 28px 0;
        }

        /* Google button */
        .auth-btn-google {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: white;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: var(--font-sans);
        }
        .auth-btn-google:hover:not(:disabled) {
          background: rgba(255,255,255,0.09);
          border-color: rgba(255,255,255,0.2);
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .auth-btn-google:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Divider */
        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
          color: rgba(255,255,255,0.2);
          font-size: 0.75rem;
        }
        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.08);
        }

        /* Email form */
        .auth-email-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .auth-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .auth-input-group label {
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .auth-input-group input {
          width: 100%;
          padding: 11px 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: white;
          font-size: 0.9rem;
          font-family: var(--font-sans);
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .auth-input-group input::placeholder { color: rgba(255,255,255,0.2); }
        .auth-input-group input:focus { border-color: #ff4500; }

        /* Error */
        .auth-error {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 0.8rem;
          color: #f87171;
        }

        /* Primary button */
        .auth-btn-primary {
          width: 100%;
          padding: 13px;
          background: #ff4500;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: var(--font-sans);
          margin-top: 4px;
        }
        .auth-btn-primary:hover:not(:disabled) {
          background: #e03d00;
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(255,69,0,0.35);
        }
        .auth-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Toggle */
        .auth-toggle {
          text-align: center;
          font-size: 0.82rem;
          color: rgba(255,255,255,0.4);
          margin: 18px 0 12px;
        }
        .auth-toggle button {
          background: none;
          border: none;
          color: #ff4500;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.82rem;
          padding: 0;
        }
        .auth-toggle button:hover { text-decoration: underline; }

        /* Disclaimer */
        .auth-disclaimer {
          text-align: center;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.2);
          margin: 0;
          line-height: 1.5;
        }
        .auth-disclaimer span { color: rgba(255,255,255,0.35); cursor: pointer; }
        .auth-disclaimer span:hover { color: #ff4500; }

        /* ── Mobile: stack vertically ──────────────────────────── */
        @media (max-width: 768px) {
          .auth-overlay { flex-direction: column; }
          .auth-hero {
            padding: 32px 24px;
            min-height: 220px;
            align-items: flex-start;
          }
          .auth-hero-title { font-size: 2rem; }
          .auth-hero-stats { gap: 20px; }
          .auth-form-panel {
            width: 100%;
            border-left: none;
            border-top: 1px solid rgba(255,255,255,0.05);
            padding: 28px 20px 40px;
          }
        }
      `}</style>
    </div>
  );
}
