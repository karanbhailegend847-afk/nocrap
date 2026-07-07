import { useState } from 'react';
import { X, Shield, Lock, Eye, CheckCircle2, ChevronRight, Pencil } from 'lucide-react';
import { auth } from '../firebase';
import { createClanFS, joinClanFS, getClanFS } from '../utils/firestore';

const TOPIC_OPTIONS = [
  'Wellness', 'Health', 'Sciences', 'Technology', 'Identity & Relationships',
  'Q&As & Stories', 'Education & Career', 'Business & Finance', 'Art',
  'Internet Culture', 'Pop Culture', 'Wellness & Fitness', 'Mature Topics'
];

const COLOR_OPTIONS = [
  { hex: '#ff4500', name: 'Orange Red' },
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#10b981', name: 'Green' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#a855f7', name: 'Purple' },
  { hex: '#06b6d4', name: 'Cyan' }
];

const EMOJI_OPTIONS = ['👥', '⚡', '🌐', '🛡️', '🏆', '🌸', '🌈', '🔬', '🧘', '🧠', '🌱', '💪'];

export default function CreateClanModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1); // 1: Topics, 2: Details, 3: Privacy, 4: Style/Launch
  
  // Form states
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [clanName, setClanName] = useState('');
  const [clanDescription, setClanDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [mature, setMature] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#ff4500');
  const [selectedEmoji, setSelectedEmoji] = useState('👥');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleTopicToggle = (topic) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(prev => prev.filter(t => t !== topic));
    } else {
      setSelectedTopics(prev => [...prev, topic]);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && selectedTopics.length === 0) {
      setErrorMsg('Please select at least one topic to continue.');
      return;
    }
    if (step === 2) {
      if (!clanName.trim()) {
        setErrorMsg('Community name is required.');
        return;
      }
      if (clanName.trim().length < 3) {
        setErrorMsg('Community name must be at least 3 characters.');
        return;
      }
      if (!clanDescription.trim()) {
        setErrorMsg('Description is required.');
        return;
      }
    }
    setErrorMsg('');
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setStep(prev => prev - 1);
  };

  const handleLaunch = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setErrorMsg('You must be signed in to create a community.');
      return;
    }

    const id = clanName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    try {
      const existing = await getClanFS(id);
      if (existing) {
        setErrorMsg('A community with this name already exists. Please choose a unique name.');
        setStep(2); // Jump back to Step 2 to edit name
        return;
      }

      await createClanFS({
        name: clanName.trim(),
        emoji: selectedEmoji,
        category: selectedTopics[0] || 'General',
        description: clanDescription.trim(),
        color: selectedColor,
        privacy,
        topics: selectedTopics,
        mature,
        createdAt: new Date().toISOString(),
        creatorUid: uid,
        stats: '1 member · 1 online'
      });

      // Auto-join the creator to their new clan
      await joinClanFS(uid, id);

      // Dispatch events to reload sidebar & forum list
      window.dispatchEvent(new CustomEvent('clans-updated'));
      
      // Redirect to the new subforum
      window.dispatchEvent(new CustomEvent('switch-tab', { 
        detail: { tab: 'forum', pod: id } 
      }));

      // Reset and close
      setStep(1);
      setSelectedTopics([]);
      setClanName('');
      setClanDescription('');
      setPrivacy('public');
      setMature(false);
      setSelectedColor('#ff4500');
      setSelectedEmoji('👥');
      setErrorMsg('');
      onClose();
    } catch (err) {
      console.error('Launch community error:', err);
      setErrorMsg('Failed to create community. Please try again.');
    }
  };

  return (
    <div className="wizard-modal-overlay">
      <div className="wizard-modal-content">
        
        {/* Modal Header */}
        <header className="wizard-modal-header">
          <div className="wizard-step-indicator">
            <span className={`step-dot ${step >= 1 ? 'active' : ''}`} />
            <span className={`step-dot ${step >= 2 ? 'active' : ''}`} />
            <span className={`step-dot ${step >= 3 ? 'active' : ''}`} />
            <span className={`step-dot ${step >= 4 ? 'active' : ''}`} />
          </div>
          <button className="wizard-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        {/* STEP 1: Choose Topics */}
        {step === 1 && (
          <div className="wizard-step-body animate-fade-in">
            <h2>What will your community be about?</h2>
            <p className="wizard-subtitle">Choose a topic to help peers discover your community</p>
            
            <div className="wizard-topics-grid">
              {TOPIC_OPTIONS.map(topic => {
                const selected = selectedTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    onClick={() => handleTopicToggle(topic)}
                    className={`wizard-topic-pill ${selected ? 'selected' : ''}`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
            
            {errorMsg && <div className="wizard-error-banner">{errorMsg}</div>}

            <div className="wizard-footer-actions">
              <span />
              <button className="wizard-btn wizard-primary-btn" onClick={handleNextStep}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Tell us about your community */}
        {step === 2 && (
          <div className="wizard-step-body animate-fade-in">
            <h2>Tell us about your community</h2>
            <p className="wizard-subtitle">A name and description help people understand what your community is all about.</p>

            <div className="wizard-layout-split">
              {/* Left Column Fields */}
              <div className="wizard-fields-column">
                <div className="wizard-input-group">
                  <label>Community name *</label>
                  <div className="wizard-input-wrapper">
                    <span className="wizard-input-prefix">p/</span>
                    <input
                      type="text"
                      placeholder="communityname"
                      maxLength={21}
                      value={clanName}
                      onChange={e => {
                        // Allow only letters, numbers, and dashes
                        const val = e.target.value.replace(/[^a-zA-Z0-9-]/g, '');
                        setClanName(val);
                        setErrorMsg('');
                      }}
                    />
                  </div>
                  <span className="wizard-counter">{clanName.length}/21</span>
                </div>

                <div className="wizard-input-group" style={{ marginTop: '16px' }}>
                  <label>Description *</label>
                  <textarea
                    placeholder="Provide a clear, clinical, or supportive description for your pod"
                    maxLength={200}
                    rows={4}
                    value={clanDescription}
                    onChange={e => {
                      setClanDescription(e.target.value);
                      setErrorMsg('');
                    }}
                  />
                  <span className="wizard-counter">{clanDescription.length}/200</span>
                </div>
              </div>

              {/* Right Column Preview */}
              <div className="wizard-preview-column">
                <span className="wizard-preview-title">Live Preview</span>
                <div className="wizard-preview-card">
                  <div className="wizard-preview-banner" style={{ background: `linear-gradient(135deg, ${selectedColor} 0%, #15131a 80%)` }} />
                  <div className="wizard-preview-avatar">
                    <span>{selectedEmoji}</span>
                  </div>
                  <div className="wizard-preview-card-body">
                    <h4>p/{clanName || 'communityname'}</h4>
                    <span className="wizard-preview-sub">1 weekly visitor · 1 online</span>
                    <p className="wizard-preview-desc">
                      {clanDescription || 'Your community description will appear here as you type.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {errorMsg && <div className="wizard-error-banner">{errorMsg}</div>}

            <div className="wizard-footer-actions">
              <button className="wizard-btn wizard-secondary-btn" onClick={handlePrevStep}>Back</button>
              <button className="wizard-btn wizard-primary-btn" onClick={handleNextStep}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Choose Privacy */}
        {step === 3 && (
          <div className="wizard-step-body animate-fade-in">
            <h2>What kind of community is this?</h2>
            <p className="wizard-subtitle">Decide who can view and contribute in your community. Important: Once set, you will need to submit a request to change your community type.</p>

            <div className="wizard-privacy-list">
              {/* Option 1: Public */}
              <label className={`wizard-privacy-item ${privacy === 'public' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="privacy"
                  checked={privacy === 'public'}
                  onChange={() => setPrivacy('public')}
                />
                <div className="privacy-icon"><Eye size={20} /></div>
                <div className="privacy-meta">
                  <strong>Public</strong>
                  <span>Anyone can view, post, and comment to this community</span>
                </div>
              </label>

              {/* Option 2: Restricted */}
              <label className={`wizard-privacy-item ${privacy === 'restricted' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="privacy"
                  checked={privacy === 'restricted'}
                  onChange={() => setPrivacy('restricted')}
                />
                <div className="privacy-icon"><Shield size={20} /></div>
                <div className="privacy-meta">
                  <strong>Restricted</strong>
                  <span>Anyone can view, but only approved users can contribute</span>
                </div>
              </label>

              {/* Option 3: Private */}
              <label className={`wizard-privacy-item ${privacy === 'private' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="privacy"
                  checked={privacy === 'private'}
                  onChange={() => setPrivacy('private')}
                />
                <div className="privacy-icon"><Lock size={20} /></div>
                <div className="privacy-meta">
                  <strong>Private</strong>
                  <span>Only approved users can view and contribute</span>
                </div>
              </label>
            </div>

            {/* Mature Toggle Option */}
            <div className="wizard-mature-toggle-row">
              <div className="mature-text">
                <strong>Mature (18+)</strong>
                <span>Users must be over 18 to view and contribute</span>
              </div>
              <label className="wizard-switch">
                <input
                  type="checkbox"
                  checked={mature}
                  onChange={e => setMature(e.target.checked)}
                />
                <span className="wizard-slider" />
              </label>
            </div>

            {errorMsg && <div className="wizard-error-banner">{errorMsg}</div>}

            <div className="wizard-footer-actions">
              <button className="wizard-btn wizard-secondary-btn" onClick={handlePrevStep}>Back</button>
              <button className="wizard-btn wizard-primary-btn" onClick={handleNextStep}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Launch & Style */}
        {step === 4 && (
          <div className="wizard-step-body animate-fade-in">
            <div className="wizard-layout-split">
              {/* Left Column Checklist */}
              <div className="wizard-fields-column" style={{ justifyContent: 'center', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: '1.6rem', color: 'white', marginBottom: '8px' }}>You launched a new community!</h2>
                <p className="wizard-subtitle" style={{ marginBottom: '24px' }}>Here's what you should know to get started.</p>

                <div className="wizard-checklist">
                  <div className="checklist-item">
                    <CheckCircle2 size={18} className="icon-success" />
                    <span>Applied clinical safety checklists</span>
                  </div>
                  <div className="checklist-item">
                    <CheckCircle2 size={18} className="icon-success" />
                    <span>Added default recovery guidelines</span>
                  </div>
                  <div className="checklist-item">
                    <CheckCircle2 size={18} className="icon-success" />
                    <span>Configured auto-moderator limits</span>
                  </div>
                </div>
              </div>

              {/* Right Column Customize card */}
              <div className="wizard-preview-column">
                {/* Customize preview card */}
                <div className="wizard-preview-card edit-mode">
                  <div className="wizard-preview-banner" style={{ background: `linear-gradient(135deg, ${selectedColor} 0%, #15131a 80%)` }} />
                  
                  {/* Emoji selector dropdown */}
                  <div className="wizard-avatar-selector-ring">
                    <span className="current-emoji">{selectedEmoji}</span>
                    <label className="emoji-edit-badge" title="Change Emoji">
                      <Pencil size={12} color="white" />
                      <select 
                        value={selectedEmoji} 
                        onChange={e => setSelectedEmoji(e.target.value)}
                        className="emoji-select-dropdown"
                      >
                        {EMOJI_OPTIONS.map(em => (
                          <option key={em} value={em}>{em}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  
                  <div className="wizard-preview-card-body">
                    <h4>p/{clanName || 'communityname'}</h4>
                    <span className="wizard-preview-sub">1 weekly visitor · 1 online</span>
                  </div>

                  {/* Base Color Customizer Picker */}
                  <div className="wizard-color-customizer">
                    <span className="customizer-label">Base Color</span>
                    <div className="color-circles-picker">
                      {COLOR_OPTIONS.map(opt => (
                        <button
                          key={opt.hex}
                          onClick={() => setSelectedColor(opt.hex)}
                          className={`color-circle-btn ${selectedColor === opt.hex ? 'active' : ''}`}
                          style={{ backgroundColor: opt.hex }}
                          title={opt.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {errorMsg && <div className="wizard-error-banner">{errorMsg}</div>}

            <div className="wizard-footer-actions">
              <button className="wizard-btn wizard-secondary-btn" onClick={handlePrevStep}>Back</button>
              <button className="wizard-btn wizard-primary-btn" onClick={handleLaunch}>
                Go To Community Page
              </button>
            </div>
          </div>
        )}

      </div>

      {/* STYLES */}
      <style>{`
        .wizard-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(4px);
          z-index: 3000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .wizard-modal-content {
          background: #110f15;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          width: 100%;
          max-width: 680px;
          padding: 24px;
          position: relative;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
        }

        .wizard-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .wizard-step-indicator {
          display: flex;
          gap: 6px;
        }

        .step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
        }

        .step-dot.active {
          background: #ff4500;
        }

        .wizard-close-btn {
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
        .wizard-close-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        .wizard-step-body h2 {
          font-family: var(--font-display);
          font-size: 1.45rem;
          font-weight: 800;
          color: white;
          margin-bottom: 6px;
        }

        .wizard-subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.45;
          margin-bottom: 20px;
        }

        /* Step 1: Topics pill grid */
        .wizard-topics-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
          max-height: 240px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .wizard-topic-pill {
          background: #1d1b24;
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #a0a0a5;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .wizard-topic-pill:hover {
          background: #272430;
          color: white;
          border-color: rgba(255, 255, 255, 0.15);
        }
        .wizard-topic-pill.selected {
          background: white;
          color: black;
          border-color: white;
        }

        /* Step 2: Split layout */
        .wizard-layout-split {
          display: grid;
          grid-template-columns: 1fr 240px;
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 600px) {
          .wizard-layout-split {
            grid-template-columns: 1fr;
          }
          .wizard-preview-column {
            display: none !important;
          }
        }

        .wizard-fields-column {
          display: flex;
          flex-direction: column;
        }

        .wizard-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          position: relative;
        }

        .wizard-input-group label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .wizard-input-wrapper {
          display: flex;
          align-items: center;
          background: #18161d;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 0 12px;
        }

        .wizard-input-prefix {
          font-size: 0.88rem;
          color: var(--text-muted);
          font-weight: 600;
          margin-right: 2px;
        }

        .wizard-input-wrapper input {
          flex: 1;
          background: transparent;
          border: none;
          color: white;
          padding: 10px 0;
          font-size: 0.88rem;
          outline: none;
        }

        .wizard-input-group textarea {
          background: #18161d;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: white;
          padding: 10px 12px;
          font-size: 0.85rem;
          border-radius: 8px;
          outline: none;
          resize: none;
        }
        .wizard-input-group textarea:focus,
        .wizard-input-wrapper:focus-within {
          border-color: rgba(255, 69, 0, 0.4);
        }

        .wizard-counter {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-align: right;
          margin-top: 2px;
        }

        .wizard-preview-column {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .wizard-preview-title {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .wizard-preview-card {
          background: #15131a;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          overflow: hidden;
          position: relative;
        }

        .wizard-preview-banner {
          height: 64px;
        }

        .wizard-preview-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 3.5px solid #15131a;
          background: #25222b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          margin-top: -24px;
          margin-left: 12px;
          position: relative;
        }

        .wizard-preview-card-body {
          padding: 8px 12px 14px 12px;
        }

        .wizard-preview-card-body h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: white;
          margin-bottom: 2px;
        }

        .wizard-preview-sub {
          font-size: 0.68rem;
          color: var(--text-muted);
          display: block;
          margin-bottom: 8px;
        }

        .wizard-preview-desc {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.4;
          word-break: break-word;
        }

        /* Step 3: Privacy Layout */
        .wizard-privacy-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .wizard-privacy-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #18161d;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .wizard-privacy-item:hover {
          background: #201e26;
          border-color: rgba(255, 255, 255, 0.15);
        }
        .wizard-privacy-item.active {
          border-color: #ff4500;
          background: rgba(255, 69, 0, 0.03);
        }

        .wizard-privacy-item input[type="radio"] {
          accent-color: #ff4500;
          width: 16px;
          height: 16px;
        }

        .privacy-icon {
          color: #a0a0a5;
          display: flex;
          align-items: center;
        }
        .wizard-privacy-item.active .privacy-icon {
          color: #ff4500;
        }

        .privacy-meta {
          display: flex;
          flex-direction: column;
        }
        .privacy-meta strong {
          font-size: 0.85rem;
          color: white;
        }
        .privacy-meta span {
          font-size: 0.72rem;
          color: var(--text-secondary);
          margin-top: 1px;
        }

        .wizard-mature-toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 16px;
          margin-top: 16px;
          margin-bottom: 20px;
        }

        .mature-text {
          display: flex;
          flex-direction: column;
        }
        .mature-text strong {
          font-size: 0.85rem;
          color: white;
        }
        .mature-text span {
          font-size: 0.72rem;
          color: var(--text-secondary);
        }

        /* Toggle switch */
        .wizard-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 22px;
        }
        .wizard-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .wizard-slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background-color: #3e3b47;
          border-radius: 34px;
          transition: .3s;
        }
        .wizard-slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          border-radius: 50%;
          transition: .3s;
        }
        input:checked + .wizard-slider {
          background-color: #ff4500;
        }
        input:checked + .wizard-slider:before {
          transform: translateX(22px);
        }

        /* Step 4: Customize & Launch */
        .wizard-checklist {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .checklist-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.88rem;
          color: var(--text-secondary);
        }
        .icon-success {
          color: #10b981;
        }

        /* Edit mode card overlay */
        .wizard-preview-card.edit-mode .wizard-preview-avatar {
          cursor: pointer;
        }

        .wizard-avatar-selector-ring {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 3.5px solid #15131a;
          background: #25222b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          margin-top: -24px;
          margin-left: 12px;
          position: relative;
        }

        .emoji-edit-badge {
          position: absolute;
          bottom: -4px;
          right: -4px;
          background: #ff4500;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 1.5px solid #15131a;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .emoji-select-dropdown {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
          width: 100%;
          height: 100%;
        }

        .wizard-color-customizer {
          padding: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
        }

        .customizer-label {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          display: block;
          margin-bottom: 8px;
        }

        .color-circles-picker {
          display: flex;
          gap: 8px;
        }

        .color-circle-btn {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid transparent;
          padding: 0;
          transition: transform 0.15s ease;
        }
        .color-circle-btn:hover {
          transform: scale(1.15);
        }
        .color-circle-btn.active {
          border-color: white;
          box-shadow: 0 0 4px rgba(255,255,255,0.4);
        }

        /* Buttons and footer actions */
        .wizard-footer-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 16px;
        }

        .wizard-btn {
          padding: 8px 18px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .wizard-primary-btn {
          background: #ff4500;
          color: white;
        }
        .wizard-primary-btn:hover {
          background: #ff5714;
        }

        .wizard-secondary-btn {
          background: #25222b;
          color: #a0a0a5;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .wizard-secondary-btn:hover {
          background: #2e2a36;
          color: white;
        }

        .wizard-error-banner {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          font-size: 0.75rem;
          padding: 8px 12px;
          border-radius: 6px;
          margin-top: 12px;
          border: 1px solid rgba(239, 68, 68, 0.15);
        }

        .animate-fade-in {
          animation: wizard-fade-in 0.25s ease-out;
        }

        @keyframes wizard-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

    </div>
  );
}
