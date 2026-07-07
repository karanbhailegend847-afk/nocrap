// ─────────────────────────────────────────────────────────────────────────────
// RANK LADDER — config-driven, adjust thresholds here without touching logic
// Ranks are earned by longest streak (lifetime achievement, never stripped)
// Current streak shows "active rank" as a secondary indicator
// ─────────────────────────────────────────────────────────────────────────────
export const RANK_LADDER = [
  {
    id: 'recruit',
    minDays: 0,
    name: 'Recruit',
    emoji: '🗡️',
    img: '/rank_recruit.png',
    color: '#94a3b8',
    flavor: "Every warrior starts here. Showing up on day one is the hardest part."
  },
  {
    id: 'initiate',
    minDays: 3,
    name: 'Initiate',
    emoji: '🔰',
    img: '/rank_initiate.png',
    color: '#fb923c',
    flavor: "Three days in. The initiation is real — your brain chemistry is already shifting."
  },
  {
    id: 'warrior',
    minDays: 7,
    name: 'Warrior',
    emoji: '🛡️',
    img: '/rank_warrior.png',
    color: '#60a5fa',
    flavor: "A full week of defense. You've held the line where most give up."
  },
  {
    id: 'berserker',
    minDays: 14,
    name: 'Berserker',
    emoji: '🔥',
    img: '/rank_berserker.png',
    color: '#ef4444',
    flavor: "Two weeks. The fog clears and the raw energy hits. Use it."
  },
  {
    id: 'knight',
    minDays: 30,
    name: 'Knight',
    emoji: '⚔️',
    img: '/rank_knight.png',
    color: '#8b5cf6',
    flavor: "One month. You are no longer trying to quit; you are building an empire."
  },
  {
    id: 'templar',
    minDays: 45,
    name: 'Templar',
    emoji: '✦',
    img: '/rank_templar.png',
    color: '#fbbf24',
    flavor: "45 days. The fog is lifting. Your values, not your reflexes, are driving now."
  },
  {
    id: 'vanguard',
    minDays: 60,
    name: 'Vanguard',
    emoji: '🏹',
    img: '/rank_vanguard.png',
    color: '#38bdf8',
    flavor: "Two months at the front. You are proof to everyone watching that it can be done."
  },
  {
    id: 'conqueror',
    minDays: 90,
    name: 'Conqueror',
    emoji: '👑',
    img: '/rank_conqueror.png',
    color: '#c084fc',
    flavor: "The 90-day clinical benchmark. Prefrontal cortex control is fully restored."
  },
  {
    id: 'warlord',
    minDays: 120,
    name: 'Warlord',
    emoji: '⚡',
    img: '/rank_warlord.png',
    color: '#818cf8',
    flavor: "120 days. You lead by example now. The community looks to you."
  },
  {
    id: 'titan',
    minDays: 180,
    name: 'Titan',
    emoji: '🏔️',
    img: '/rank_titan.png',
    color: '#6ee7b7',
    flavor: "Half a year. Immovable. This is identity-level transformation, not willpower."
  },
  {
    id: 'immortal',
    minDays: 270,
    name: 'Immortal',
    emoji: '🌟',
    img: '/rank_immortal.png',
    color: '#fde68a',
    flavor: "270 days. The old reflex loops barely register as threats anymore."
  },
  {
    id: 'legend',
    minDays: 365,
    name: 'Legend',
    emoji: '🌠',
    img: '/rank_legend.png',
    color: '#f0abfc',
    flavor: "One full year. A complete cycle of seasons. You are a Legend in this community."
  },
  {
    id: 'mythic_1',
    minDays: 500,
    name: 'Mythic I',
    emoji: '♛',
    img: '/rank_mythic_1.png',
    color: '#fbbf24',
    flavor: "500 days. Mentor-eligible. Your presence in this space heals others."
  },
  {
    id: 'mythic_2',
    minDays: 600,
    name: 'Mythic II',
    emoji: '♛',
    img: '/rank_mythic_2.png',
    color: '#f59e0b',
    flavor: "600 days of deliberate, sustained transformation. You are evidence."
  },
  {
    id: 'mythic_3',
    minDays: 730,
    name: 'Mythic III',
    emoji: '✦',
    img: '/rank_mythic_3.png',
    color: '#e879f9',
    flavor: "Two years. You've become the living proof of what's possible for everyone who follows."
  }
];



// ─────────────────────────────────────────────────────────────────────────────
// BADGE TRACKS — orthogonal achievement axes beyond streak length
// Prevents a single obsessive number; multiple paths to feel progress
// ─────────────────────────────────────────────────────────────────────────────
export const BADGE_TRACKS = {
  chat_count: {
    label: 'Connection',
    description: '1-on-1 Chatbox sessions completed',
    color: '#0ea5e9', // Light blue
    badges: [
      { id: 'chat_5',  emoji: '🗣️', name: 'Ice Breaker',    desc: 'Completed 5 random chat sessions',  threshold: 5,  track: 'chat_count' },
      { id: 'chat_20', emoji: '🤝', name: 'Peer Support',   desc: 'Completed 20 random chat sessions', threshold: 20, track: 'chat_count' },
      { id: 'chat_50', emoji: '🌐', name: 'Social Anchor',   desc: 'Completed 50 random chat sessions', threshold: 50, track: 'chat_count' }
    ]
  },
  community: {
    label: 'Community',
    description: 'Showing up and supporting others in the clan',
    color: '#34d399',
    badges: [
      { id: 'clan_joined',       emoji: '🤝', name: 'Clan Bound',         desc: 'Joined an accountability clan',          threshold: 1,  track: 'clan_messages' },
      { id: 'clan_messages_10',  emoji: '💬', name: 'Voice in the Room',  desc: 'Sent 10 messages in your clan',          threshold: 10, track: 'clan_messages' },
      { id: 'clan_messages_50',  emoji: '🏛️', name: 'Pillar',             desc: 'Sent 50 messages in your clan',          threshold: 50, track: 'clan_messages' }
    ]
  },
  resilience: {
    label: 'Resilience',
    description: 'Recovering from cravings and setbacks',
    color: '#f97316',
    badges: [
      { id: 'sos_used',     emoji: '🆘', name: 'Called for Help',  desc: 'Used the SOS button during a craving',              threshold: 1, track: 'sos_count' },
      { id: 'sos_returned', emoji: '↩️', name: 'Bounced Back',     desc: 'Used SOS and logged a win afterward',               threshold: 1, track: 'sos_wins' },
      { id: 'slip_reflected', emoji: '📊', name: 'Data Over Shame', desc: 'Logged a slip with a full reflection note',         threshold: 1, track: 'slip_count' }
    ]
  },
  reflection: {
    label: 'Reflection',
    description: 'Self-awareness through journaling and letters',
    color: '#a78bfa',
    badges: [
      { id: 'journal_7',      emoji: '✍️', name: 'Daily Scribe',        desc: 'Journaled 7 different days',                threshold: 7,  track: 'journal_count' },
      { id: 'journal_30',     emoji: '🗺️', name: 'Inner Cartographer',  desc: 'Journaled 30 different days',               threshold: 30, track: 'journal_count' },
      { id: 'letter_written', emoji: '📩', name: 'Letter to Self',       desc: 'Wrote a milestone letter to your future self', threshold: 1, track: 'letter_count' }
    ]
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS — pure, no side effects
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the rank object for a given number of streak days */
export function getRankForDays(days) {
  // Walk backward to find the highest rank the user qualifies for
  for (let i = RANK_LADDER.length - 1; i >= 0; i--) {
    if (days >= RANK_LADDER[i].minDays) return RANK_LADDER[i];
  }
  return RANK_LADDER[0]; // Always at least Spark
}

/** Returns the next rank object (the one to unlock next), or null if maxed */
export function getNextRank(days) {
  for (let i = 0; i < RANK_LADDER.length; i++) {
    if (days < RANK_LADDER[i].minDays) return RANK_LADDER[i];
  }
  return null; // Already at max
}

/** How many days until the next rank unlocks */
export function daysUntilNextRank(days) {
  const next = getNextRank(days);
  if (!next) return 0;
  return next.minDays - days;
}

/** Progress (0–100) toward the next rank */
export function progressToNextRank(days) {
  const current = getRankForDays(days);
  const next = getNextRank(days);
  if (!next) return 100;
  const span = next.minDays - current.minDays;
  const done = days - current.minDays;
  return Math.min(100, Math.round((done / span) * 100));
}

/** Returns flat list of all badge ids that should be unlocked for given stats */
export function computeEarnedBadgeIds(stats) {
  const earned = new Set();

  // Flatten all badges and check each
  Object.values(BADGE_TRACKS).forEach(track => {
    track.badges.forEach(badge => {
      const value = stats[badge.track] || 0;
      if (value >= badge.threshold) {
        earned.add(badge.id);
      }
    });
  });

  return earned;
}

/** Lookup a badge object by id across all tracks */
export function getBadgeById(id) {
  for (const track of Object.values(BADGE_TRACKS)) {
    const found = track.badges.find(b => b.id === id);
    if (found) return found;
  }
  return null;
}
