import { useState, useEffect } from 'react';
import { getData, saveJournal, saveFutureLetter } from '../utils/storage';

const MILESTONES = [
  { day: 7, label: 'Day 7 (Intake Reset)' },
  { day: 30, label: 'Day 30 (Neural Pruning)' },
  { day: 90, label: 'Day 90 (Reboot Complete)' }
];

export default function Journal({ currentStreak }) {
  const [journalData, setJournalData] = useState(() => {
    const data = getData('JOURNAL') || { entries: [], futureLetters: [] };
    if (data.entries) {
      data.entries = [...data.entries].reverse();
    }
    return data;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState(() => getData('USER'));

  // Free-form writing states for new page
  const [entryDateText, setEntryDateText] = useState(() => new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }));
  const [entryBodyText, setEntryBodyText] = useState('');
  const [checkInSuccess, setCheckInSuccess] = useState(false);

  // Future Letter state
  const [letterText, setLetterText] = useState('');
  const [targetMilestone, setTargetMilestone] = useState(7);
  const [letterSuccess, setLetterSuccess] = useState(false);

  const loadJournal = () => {
    const data = getData('JOURNAL');
    if (data) {
      // Order entries chronologically (oldest first) so they read front-to-back
      const sortedEntries = [...data.entries].reverse();
      setJournalData({
        ...data,
        entries: sortedEntries
      });
    }
    const u = getData('USER');
    if (u) {
      setUser(u);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const totalPages = 4 + (journalData?.entries?.length || 0);
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage(prev => Math.max(1, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [journalData.entries.length]);

  const handleCheckInSubmit = (e) => {
    e.preventDefault();
    if (!entryBodyText.trim()) return;

    // Use saveJournal. We prepend the custom date they wrote if they changed it
    const logText = `${entryDateText ? `[${entryDateText}] ` : ''}${entryBodyText.trim()}`;
    saveJournal('Freeform', 1, logText);
    setEntryBodyText('');
    setCheckInSuccess(true);
    
    // Refresh journal
    const data = getData('JOURNAL');
    if (data) {
      const sortedEntries = [...data.entries].reverse();
      setJournalData({
        ...data,
        entries: sortedEntries
      });
    }

    window.dispatchEvent(new CustomEvent('xp-updated'));

    setTimeout(() => {
      setCheckInSuccess(false);
      // Flip to the newly saved entry (which is now the last page before the blank page)
      const dataFresh = getData('JOURNAL');
      const newEntryIndex = 4 + (dataFresh?.entries?.length || 0) - 1;
      setCurrentPage(newEntryIndex + 1);
    }, 1500);
  };

  const handleLetterSubmit = (e) => {
    e.preventDefault();
    if (!letterText.trim()) return;

    saveFutureLetter(letterText.trim(), targetMilestone);
    setLetterText('');
    setLetterSuccess(true);
    loadJournal();

    window.dispatchEvent(new CustomEvent('xp-updated'));

    setTimeout(() => {
      setLetterSuccess(false);
      setCurrentPage(2); // Go back to Sealed Locker page
    }, 1500);
  };

  const formatDate = (isoStr) => {
    return new Date(isoStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalPages = 4 + journalData.entries.length;

  const renderPageContent = () => {
    if (currentPage === 1) {
      // Cover Page
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
          <div>
            <div className="minecraft-double-border" style={{ textAlign: 'center', marginTop: '20px' }}>
              <div style={{ fontSize: '1.9rem', color: '#000000', fontWeight: 'bold', textShadow: 'none', lineHeight: 1.1 }}>
                BOOK OF REFLEX
              </div>
              <div style={{ fontSize: '1.05rem', color: '#4a3e31', letterSpacing: '1px' }}>
                COGNITIVE RETRAINING
              </div>
            </div>

            {/* Pixel Art Book Emblem */}
            <div className="minecraft-pixel-art" style={{ fontSize: '0.85rem', color: '#8b5a2b', fontWeight: 'bold' }}>
              {"\n"}
              {"   ■■■■■■■■\n"}
              {"   ■      ■■\n"}
              {"   ■      ■ ■\n"}
              {"   ■      ■  ■\n"}
              {"   ■■■■■■■■■■■\n"}
            </div>

            <div style={{ textAlign: 'center', margin: '20px 0', fontSize: '1.15rem' }}>
              <div style={{ color: '#4a3e31' }}>Volume I</div>
              <div style={{ color: '#000000', fontSize: '1.25rem' }}>By {user ? user.username : 'Adventurer'}</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '1.05rem', color: '#7f6e5c', fontStyle: 'italic', marginBottom: '10px' }}>
            Current Streak: {currentStreak} Days
            <br />
            Turn page to write...
          </div>
        </div>
      );
    }

    if (currentPage === 2) {
      // Sealed Letters Locker List
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h3>SEALED LOCKER</h3>
          <p style={{ fontSize: '1.05rem', color: '#7f6e5c', textAlign: 'center', marginBottom: '8px' }}>
            Letters sent to your future self.
          </p>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '310px', paddingRight: '4px' }}>
            {journalData.futureLetters.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#7f6e5c', marginTop: '40px', fontStyle: 'italic', fontSize: '1.15rem' }}>
                Locker is empty.
                <br />
                Write a letter on Page 3!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {journalData.futureLetters.map(letter => {
                  const isUnlocked = currentStreak >= letter.milestoneDay;
                  return (
                    <div
                      key={letter.id}
                      className={`minecraft-letter-slot ${isUnlocked ? 'unlocked' : ''}`}
                    >
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold' }}>
                          <span>{isUnlocked ? '🔓' : '🔒'} Day {letter.milestoneDay} Letter</span>
                          <span style={{ fontSize: '0.95rem', color: '#7f6e5c' }}>{formatDate(letter.date)}</span>
                        </div>
                        {isUnlocked ? (
                          <div style={{ 
                            fontSize: '1.05rem', 
                            color: '#1b2336', 
                            background: '#e0d8c3', 
                            padding: '6px', 
                            borderLeft: '3px solid #2e7d32',
                            marginTop: '4px',
                            wordBreak: 'break-word',
                            lineHeight: 1.1
                          }}>
                            "{letter.text}"
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.95rem', color: '#8e1c1c', marginTop: '2px' }}>
                            Locked. (Requires {letter.milestoneDay}d streak, you have {currentStreak}d)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (currentPage === 3) {
      // Future Self Letter Form
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h3>LETTER TO FUTURE SELF</h3>
          <p style={{ fontSize: '1.05rem', color: '#4a3e31', lineHeight: '1.2', marginBottom: '8px', textAlign: 'center' }}>
            Write to your future self. It will be sealed and unlocked when your streak hits the milestone.
          </p>

          <form onSubmit={handleLetterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.1rem', color: '#4a3e31' }}>Target Unlock:</span>
                <select
                  value={targetMilestone}
                  onChange={e => setTargetMilestone(Number(e.target.value))}
                  style={{
                    background: '#eae0cc',
                    border: '2px solid #4a3e31',
                    color: '#000',
                    fontFamily: 'VT323, monospace',
                    fontSize: '1.1rem',
                    padding: '2px 6px',
                    outline: 'none'
                  }}
                >
                  {MILESTONES.map(m => (
                    <option key={m.day} value={m.day}>Day {m.day}</option>
                  ))}
                </select>
              </div>

              <textarea
                value={letterText}
                onChange={e => setLetterText(e.target.value)}
                placeholder="Dear future self, remember why you started this. Think of how heavy the brain fog felt..."
                maxLength={400}
                required
                className="minecraft-paper-input"
                style={{
                  height: '140px',
                  resize: 'none',
                  border: '2px dashed #8b7d6b',
                  padding: '8px',
                  background: 'rgba(0,0,0,0.02)',
                  fontSize: '1.1rem',
                  lineHeight: '1.2'
                }}
              />
            </div>

            <div style={{ marginTop: 'auto' }}>
              {letterSuccess && (
                <div style={{ color: '#2e7d32', fontSize: '1.1rem', textAlign: 'center', marginBottom: '8px', fontWeight: 'bold' }}>
                  ✓ Letter sealed! +25 XP.
                </div>
              )}
              <button type="submit" className="minecraft-btn" style={{ width: '100%' }} disabled={!letterText.trim()}>
                SEAL LETTER ✉
              </button>
            </div>
          </form>
        </div>
      );
    }

    // Past entries rendering (Page 4 to Page 4 + N - 1)
    const entryIdx = currentPage - 4;
    const entry = journalData.entries[entryIdx];

    if (entry) {
      // Render saved entry
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #4a3e31', paddingBottom: '4px', marginBottom: '10px' }}>
              <span style={{ fontSize: '1.25rem', color: '#000000', fontWeight: 'bold' }}>
                ENTRY #{entryIdx + 1}
              </span>
              <span style={{ fontSize: '1.05rem', color: '#7f6e5c' }}>
                {formatDate(entry.date)}
              </span>
            </div>

            <div 
              className="minecraft-notebook-lines"
              style={{
                height: '240px',
                overflowY: 'auto',
                padding: '0 4px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                border: 'none',
                background: 'transparent'
              }}
            >
              {entry.reflection}
            </div>
          </div>
          <div style={{ textAlign: 'center', color: '#7f6e5c', fontSize: '0.95rem', fontStyle: 'italic' }}>
            Logged in accountability history.
          </div>
        </div>
      );
    }

    // Writable Blank Page (Page 4 + N)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <h3>WRITE NEW PAGE</h3>
        
        <form onSubmit={handleCheckInSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.1rem', color: '#4a3e31' }}>DATE:</span>
              <input
                type="text"
                value={entryDateText}
                onChange={e => setEntryDateText(e.target.value)}
                placeholder="Today's Date"
                className="minecraft-paper-input"
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 'bold',
                  margin: 0,
                  padding: '2px 0'
                }}
              />
            </div>

            <textarea
              value={entryBodyText}
              onChange={e => setEntryBodyText(e.target.value)}
              placeholder="Start writing anything you feel today... (unlimited blank pages)"
              maxLength={1000}
              required
              className="minecraft-notebook-lines"
            />
          </div>

          <div style={{ marginTop: 'auto' }}>
            {checkInSuccess && (
              <div style={{ color: '#2e7d32', fontSize: '1.1rem', textAlign: 'center', marginBottom: '8px', fontWeight: 'bold' }}>
                ✓ Page signed and saved! +20 XP.
              </div>
            )}
            <button type="submit" className="minecraft-btn" style={{ width: '100%' }} disabled={!entryBodyText.trim()}>
              SIGN PAGE ✍
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="fade-in minecraft-book-container">
      <div className="minecraft-book">
        {/* Binder spirals representing stitching on the left */}
        <div className="minecraft-book-binding">
          <div className="minecraft-stitch"></div>
          <div className="minecraft-stitch"></div>
          <div className="minecraft-stitch"></div>
          <div className="minecraft-stitch"></div>
          <div className="minecraft-stitch"></div>
          <div className="minecraft-stitch"></div>
          <div className="minecraft-stitch"></div>
          <div className="minecraft-stitch"></div>
          <div className="minecraft-stitch"></div>
        </div>

        {/* Paper Page */}
        <div className="minecraft-book-page">
          <div className="minecraft-page-header">
            Page {currentPage} of {totalPages}
          </div>

          {/* Current Page Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {renderPageContent()}
          </div>

          {/* Pagination Controls */}
          <div className="minecraft-page-footer">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="minecraft-arrow-btn"
              aria-label="Previous Page"
            >
              ◀
            </button>
            <div style={{ fontSize: '1.1rem', color: '#4a3e31', fontWeight: 'bold' }}>
              {currentPage === 1 ? 'COVER' : currentPage === 2 ? 'LOCKER' : currentPage === 3 ? 'LETTER' : (currentPage === totalPages ? 'WRITE' : `PAGE ${currentPage - 3}`)}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="minecraft-arrow-btn"
              aria-label="Next Page"
            >
              ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
