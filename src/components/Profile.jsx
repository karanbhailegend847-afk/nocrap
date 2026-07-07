import { useState, useEffect } from 'react';
import { Lock, CheckCircle, Share2 } from 'lucide-react';
import {
  RANK_LADDER, BADGE_TRACKS,
  getRankForDays, getNextRank, daysUntilNextRank, progressToNextRank,
  computeEarnedBadgeIds
} from '../config/ranks';
import { getStreakMetrics, syncBadgeStats, getData, getPosts } from '../utils/storage';

// ─── Rank badge pill (inline, for posts list) ────────────────────────────────
export function RankPill({ days, size = 'sm' }) {
  const rank = getRankForDays(days);
  const sizes = {
    xs: { emoji: '0.85rem', name: '0.65rem', padding: '2px 6px', gap: '3px', radius: '10px' },
    sm: { emoji: '0.95rem', name: '0.7rem',  padding: '3px 8px', gap: '4px', radius: '12px' },
    md: { emoji: '1.2rem',  name: '0.78rem', padding: '4px 10px', gap: '5px', radius: '16px' },
    lg: { emoji: '1.8rem',  name: '0.95rem', padding: '6px 14px', gap: '6px', radius: '20px' },
  };
  const s = sizes[size] || sizes.sm;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: s.gap,
      padding: s.padding, borderRadius: s.radius,
      background: `${rank.color}18`, border: `1px solid ${rank.color}44`,
      verticalAlign: 'middle'
    }}>
      {rank.img ? (
        <img src={rank.img} alt={rank.name} style={{ width: s.emoji, height: s.emoji, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: s.emoji, lineHeight: 1 }}>{rank.emoji}</span>
      )}
      <span style={{ fontSize: s.name, fontWeight: 700, color: rank.color, fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>
        {rank.name}
      </span>
    </span>
  );
}

// ─── Main Profile component ──────────────────────────────────────────────────
export default function Profile({ onClose }) {
  const [metrics]     = useState(() => getStreakMetrics());
  const [badgeStats]  = useState(() => syncBadgeStats());
  const [earnedIds]   = useState(() => computeEarnedBadgeIds(badgeStats));
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'badges' | 'ladder'
  const [user]        = useState(() => getData('USER'));
  const [userPosts]   = useState(() => {
    const u = getData('USER');
    if (!u) return [];
    return getPosts('all').filter(p => p.username === u.username);
  });
  const [gamification] = useState(() => getData('GAMIFICATION') || { xp: 0, level: 1 });
  const [now] = useState(() => Date.now());

  useEffect(() => {
    // Only update if needed later or leave empty if no dynamic polling needed
  }, []);

  if (!user) return null;

  const currentRank  = getRankForDays(metrics.current);
  const lifetimeRank = getRankForDays(metrics.longest);
  const nextRank     = getNextRank(metrics.current);
  const daysLeft     = daysUntilNextRank(metrics.current);
  const progress     = progressToNextRank(metrics.current);
  const isSameRank   = currentRank.id === lifetimeRank.id;
  const totalBadges  = Object.values(BADGE_TRACKS).reduce((a, t) => a + t.badges.length, 0);
  const unlockedCount = earnedIds.size;

  const joinedDaysAgo = user.joinedAt
    ? Math.floor((now - new Date(user.joinedAt)) / 86400000)
    : 0;

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'badges',   label: `Badges  ${unlockedCount}/${totalBadges}` },
    { id: 'ladder',   label: 'Rank Ladder' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1800, overflowY: 'auto', background: 'var(--bg-primary)' }}>

      {/* ── BANNER ── */}
      <div style={{
        height: '120px',
        background: `linear-gradient(135deg, ${currentRank.color}33 0%, #161e31 60%, var(--bg-primary) 100%)`,
        borderBottom: `1px solid ${currentRank.color}22`,
        position: 'relative'
      }} />

      {/* ── CLOSE BUTTON ── */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: '12px', right: '16px', zIndex: 1900,
          background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '50%', width: '36px', height: '36px',
          color: 'white', fontSize: '1.2rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >×</button>

      {/* ── PROFILE HEADER ── */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 20px' }}>

        {/* Avatar + name row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginTop: '-52px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src="/default_avatar.png"
              alt="Avatar"
              onError={e => { e.target.onerror = null; e.target.src = `data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="%23ff4500"/><circle cx="50" cy="42" r="18" fill="%23fff"/><path d="M22 80C22 65 34.5 58 50 58C65.5 58 78 65 78 80" stroke="%23fff" stroke-width="8" stroke-linecap="round"/></svg>`; }}
              style={{
                width: '88px', height: '88px', borderRadius: '50%',
                border: `4px solid ${currentRank.color}`,
                objectFit: 'cover', background: 'var(--bg-secondary)'
              }}
            />
            {/* Rank badge over avatar */}
            <div style={{
              position: 'absolute', bottom: '-4px', right: '-4px',
              background: 'var(--bg-secondary)', borderRadius: '50%',
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${currentRank.color}`, fontSize: '0.95rem'
            }}>
              {currentRank.img ? (
                <img src={currentRank.img} alt={currentRank.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : currentRank.emoji}
            </div>
          </div>

          {/* Name + username */}
          <div style={{ flex: 1, paddingBottom: '4px' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>
              {user.username}
            </h1>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
              u/{user.username} · {joinedDaysAgo}d member
            </div>
          </div>

          {/* Share button */}
          <button className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: '0.78rem', gap: '6px', alignSelf: 'flex-end' }}>
            <Share2 size={14} /> Share
          </button>
        </div>

        {/* ── MAIN 2-COLUMN LAYOUT ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '20px', alignItems: 'start' }}>

          {/* ── LEFT: tabs + content ── */}
          <div>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: '20px' }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    padding: '10px 16px', fontSize: '0.82rem', fontWeight: 600,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: activeTab === t.id ? 'white' : 'var(--text-muted)',
                    borderBottom: activeTab === t.id ? `2px solid ${currentRank.color}` : '2px solid transparent',
                    marginBottom: '-1px'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Active rank card */}
                <div style={{
                  padding: '18px', borderRadius: '10px',
                  background: `${currentRank.color}0d`,
                  border: `1px solid ${currentRank.color}30`
                }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                    Current Rank — Day {metrics.current}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    {currentRank.img ? (
                      <img src={currentRank.img} alt={currentRank.name} style={{ width: '2rem', height: '2rem', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '2rem' }}>{currentRank.emoji}</span>
                    )}
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: currentRank.color }}>{currentRank.name}</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: nextRank ? '14px' : 0, lineHeight: 1.5 }}>
                    "{currentRank.flavor}"
                  </p>
                  {nextRank && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
                        <span>
                          → {nextRank.img ? <img src={nextRank.img} alt="" style={{ width: '1em', height: '1em', verticalAlign: 'middle', borderRadius: '50%' }} /> : nextRank.emoji} {nextRank.name} in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <div style={{ height: '5px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: nextRank.color, borderRadius: '3px' }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Lifetime rank (if different) */}
                {!isSameRank && (
                  <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {lifetimeRank.img ? (
                      <img src={lifetimeRank.img} alt={lifetimeRank.name} style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '1.5rem' }}>{lifetimeRank.emoji}</span>
                    )}
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Lifetime Rank (Best: {metrics.longest}d)</div>
                      <div style={{ fontWeight: 700, color: lifetimeRank.color }}>{lifetimeRank.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Earned by longest streak. A slip never strips this.</div>
                    </div>
                  </div>
                )}

                {/* User's posts */}
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '8px', marginBottom: '8px' }}>
                  Posts ({userPosts.length})
                </div>
                {userPosts.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                    No posts yet. Share your recovery experience in the community.
                  </div>
                ) : (
                  userPosts.map(post => (
                    <div key={post.id} style={{ padding: '14px 16px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        p/{post.clan} · {new Date(post.timestamp).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white', marginBottom: '4px' }}>{post.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {post.content}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        ▲ {post.upvotes} · 💬 {post.comments.length}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* BADGES TAB */}
            {activeTab === 'badges' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {Object.entries(BADGE_TRACKS).map(([key, track]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: track.color }}>{track.label}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '8px' }}>{track.description}</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {track.badges.filter(b => earnedIds.has(b.id)).length}/{track.badges.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {track.badges.map(badge => {
                        const unlocked = earnedIds.has(badge.id);
                        return (
                          <div key={badge.id} title={badge.desc} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                            padding: '14px 12px', borderRadius: '10px', textAlign: 'center', position: 'relative',
                            minWidth: '80px', flex: '1 1 80px', maxWidth: '110px',
                            background: unlocked ? `${track.color}14` : 'var(--bg-secondary)',
                            border: `1px solid ${unlocked ? track.color + '33' : 'rgba(255,255,255,0.05)'}`
                          }}>
                            <span style={{ fontSize: '1.8rem', lineHeight: 1, filter: unlocked ? 'none' : 'grayscale(1)', opacity: unlocked ? 1 : 0.25 }}>
                              {badge.emoji}
                            </span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: unlocked ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.3 }}>
                              {badge.name}
                            </span>
                            {!unlocked && <Lock size={10} style={{ color: 'var(--text-muted)', position: 'absolute', top: '7px', right: '7px' }} />}
                            {unlocked && <CheckCircle size={10} style={{ color: track.color, position: 'absolute', top: '7px', right: '7px' }} />}
                          </div>
                        );
                      })}
                    </div>
                    {/* Next badge progress */}
                    {(() => {
                      const next = track.badges.find(b => !earnedIds.has(b.id));
                      if (!next) return <div style={{ fontSize: '0.7rem', color: track.color, marginTop: '8px', fontWeight: 600 }}>✓ All {track.label} badges earned</div>;
                      const val = badgeStats[next.track] || 0;
                      const pct = Math.min(100, Math.round((val / next.threshold) * 100));
                      return (
                        <div style={{ marginTop: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            <span>→ {next.name}</span><span>{val}/{next.threshold}</span>
                          </div>
                          <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: track.color, borderRadius: '2px' }} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}

            {/* RANK LADDER TAB */}
            {activeTab === 'ladder' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
                  Thresholds are fixed and fully predictable — you always know exactly what the next rank requires.
                  Lifetime rank (based on your best streak) is never stripped by a relapse.
                </p>
                {RANK_LADDER.map(rank => {
                  const achieved = metrics.longest >= rank.minDays;
                  const isCurr   = rank.id === currentRank.id;
                  const isLife   = rank.id === lifetimeRank.id && !isSameRank;
                  const isNext   = nextRank && rank.id === nextRank.id;
                  return (
                    <div key={rank.id} style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '11px 16px', borderRadius: '9px',
                      background: isCurr ? `${rank.color}12` : 'transparent',
                      border: isCurr ? `1px solid ${rank.color}33` : isNext ? '1px dashed rgba(255,255,255,0.07)' : '1px solid transparent',
                      opacity: (!achieved && !isNext) ? 0.4 : 1
                    }}>
                      <span style={{ fontSize: '1.4rem', width: '30px', textAlign: 'center', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                        {rank.img ? <img src={rank.img} alt={rank.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} /> : rank.emoji}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: isCurr ? 700 : 500, color: achieved ? rank.color : 'var(--text-muted)' }}>{rank.name}</span>
                          {isCurr && <span style={{ fontSize: '0.58rem', background: `${rank.color}33`, color: rank.color, padding: '1px 6px', borderRadius: '8px', fontWeight: 700 }}>ACTIVE</span>}
                          {isLife && <span style={{ fontSize: '0.58rem', background: '#fbbf2420', color: '#fbbf24', padding: '1px 6px', borderRadius: '8px', fontWeight: 700 }}>LIFETIME BEST</span>}
                          {isNext && <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>Next unlock</span>}
                        </div>
                        {(isCurr || isNext) && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>{rank.flavor}</div>}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: achieved ? rank.color : 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Day {rank.minDays}{achieved ? ' ✓' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'sticky', top: '20px' }}>

            {/* Profile card */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '40px', background: `linear-gradient(90deg, ${currentRank.color}40, ${currentRank.color}15)` }} />
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'white', marginBottom: '12px', marginTop: '4px' }}>
                  {user.username}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  {[
                    { label: 'Current Streak', value: `${metrics.current}d`, color: 'var(--color-success-light)' },
                    { label: 'Best Streak', value: `${metrics.longest}d`, color: '#fbbf24' },
                    { label: 'Total XP', value: gamification.xp, color: 'var(--color-accent)' },
                    { label: 'Member Since', value: `${joinedDaysAgo}d ago`, color: 'var(--text-secondary)' },
                  ].map(stat => (
                    <div key={stat.label}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{stat.label}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '6px' }}>CURRENT RANK</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {currentRank.img ? (
                      <img src={currentRank.img} alt={currentRank.name} style={{ width: '1.4rem', height: '1.4rem', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '1.4rem' }}>{currentRank.emoji}</span>
                    )}
                    <span style={{ fontWeight: 700, color: currentRank.color, fontFamily: 'var(--font-display)' }}>{currentRank.name}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Achievements mini panel (like Reddit's) */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ACHIEVEMENTS</span>
                <button onClick={() => setActiveTab('badges')} style={{ fontSize: '0.68rem', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  View All →
                </button>
              </div>

              {/* Badge grid preview (first 6) */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {Object.values(BADGE_TRACKS).flatMap(t => t.badges).slice(0, 8).map(badge => {
                  const unlocked = earnedIds.has(badge.id);
                  return (
                    <div key={badge.id} title={badge.name} style={{
                      width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: unlocked ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${unlocked ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)'}`,
                      fontSize: '1.1rem', filter: unlocked ? 'none' : 'grayscale(1)', opacity: unlocked ? 1 : 0.3
                    }}>
                      {badge.emoji}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {unlockedCount} unlocked · {totalBadges - unlockedCount} remaining
              </div>
            </div>

            {/* Anti-compulsion note */}
            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Ranks are fixed milestones. No timers. No urgency nudges. Longest-streak rank is permanent.
            </div>
          </div>

        </div>
        <div style={{ height: '60px' }} /> {/* bottom padding for mobile nav */}
      </div>
    </div>
  );
}
