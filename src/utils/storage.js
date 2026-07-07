// Local Storage State Management and Database Seeder

const STORAGE_KEYS = {
  USER: 'nocrap_user',
  STREAK: 'nocrap_streak',
  CLAN: 'nocrap_clan', // Accountability Clan
  FORUM: 'nocrap_forum', // Public Forum Clans
  JOURNAL: 'nocrap_journal',
  GAMIFICATION: 'nocrap_gamification',
  CHAT: 'nocrap_chat',
  BADGES: 'nocrap_badges',  // badge progress stats
  JOINED_CLANS: 'nocrap_joined_clans',
  CLANS_LIST: 'nocrap_clans_list'
};

// Auto-moderator trigger word blacklist to filter explicit content
const TRIGGER_WORDS = [
  'porn', 'nsfw', 'cock', 'pussy', 'fuck', 'cum', 'hentai', 'milf', 'anal', 'masturbat',
  'dick', 'vagina', 'clit', 'slut', 'blowjob', 'erotic', 'xxx', 'pornhub', 'xvideo'
];

export function containsTriggerWords(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return TRIGGER_WORDS.some(word => lowerText.includes(word));
}

export function cleanText(text) {
  if (!text) return '';
  let cleaned = text;
  TRIGGER_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    cleaned = cleaned.replace(regex, '***');
  });
  return cleaned;
}

// Initial Mock Seeding
const INITIAL_MOCK_DATA = {
  user: null, // Set on onboarding
  
  streak: {
    startDate: null,
    currentStreak: 0,
    longestStreak: 0,
    slips: [] // [{ date: string, trigger: string, reflection: string, intensity: number }]
  },
  
  clan: {
    id: 'clan_neural_rewirers',
    name: 'Neural Rewirers',
    description: 'Effort-focused accountability clan. We prioritize daily practice and recovery milestones.',
    members: [
      { id: 'user_1', username: 'CalmWaves', streak: 42, active: true },
      { id: 'user_2', username: 'SovereignMind', streak: 15, active: true },
      { id: 'user_3', username: 'NeuroReset', streak: 28, active: true },
      { id: 'user_4', username: 'PathFinder', streak: 6, active: true },
      { id: 'user_5', username: 'SteadySteps', streak: 0, active: true }
    ],
    messages: [
      { id: 'm1', username: 'CalmWaves', text: 'Daily check-in complete. 42 days today. Cravings have shifted from sharp urges to passing thoughts.', timestamp: new Date(Date.now() - 3600000 * 5).toISOString() },
      { id: 'm2', username: 'NeuroReset', text: 'Had a great conversation in the random chat today. Keeps the isolation away.', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
      { id: 'm3', username: 'SteadySteps', text: 'Hey guys, I had a slip last night. Feeling a bit down, but doing the reflection today to figure out my fatigue triggers.', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
      { id: 'm4', username: 'SovereignMind', text: 'No shame, Steady. You caught it and you are here. That is what counts. What is the plan for tonight?', timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString() },
      { id: 'm5', username: 'SteadySteps', text: 'Keeping my phone out of the bedroom, and joining the clan breathing call if it gets tough.', timestamp: new Date(Date.now() - 3600000).toISOString() }
    ],
    flares: [] // active flares
  },
  
  forum: {
    posts: [
      {
        id: 'p1',
        clan: 'science-discussion',
        title: 'How ΔFosB drives sensitization (and why you aren\'t broken)',
        content: 'ΔFosB is a transcription factor that accumulates in the reward pathway (nucleus accumbens) with repeated high-amplitude dopamine spikes. It essentially rebuilds synapses to make you more sensitive to triggers. The good news? It has a half-life. With streak continuity and active avoidance, the brain starts to prune those paths. Science is on your side.',
        username: 'NeuroDoc_Clinical',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        upvotes: 28,
        downvotes: 0,
        comments: [
          { id: 'c1_1', username: 'CuriousMind', text: 'This helps explain why the first two weeks feel so chemical. It is literally biological wiring.', timestamp: new Date(Date.now() - 3600000 * 20).toISOString(), upvotes: 12, helpedCount: 8 }
        ]
      },
      {
        id: 'p2',
        clan: 'womens-clan',
        title: 'Breaking the silence: women in recovery',
        content: 'Most recovery guides talk about male physiology and triggers, but women experience porn addiction and dopamine dysregulation too. For me, triggers are tied to emotional exhaustion and loneliness rather than visual cues. Let\'s use this clan to share what works for us.',
        username: 'AuraHorizon',
        timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
        upvotes: 19,
        downvotes: 1,
        comments: [
          { id: 'c2_1', username: 'GraceInStrides', text: 'Exactly. For me, stress-induced triggers are huge. Finding a space that isn\'t loaded with locker-room talk is so refreshing.', timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), upvotes: 9, helpedCount: 6 }
        ]
      },
      {
        id: 'p3',
        clan: 'lgbtq-clan',
        title: 'Navigating minority stress and triggers',
        content: 'Compulsive porn use can be a coping mechanism for minority stress or feelings of exclusion. The imagery targeted at our community is often highly hyper-sexualized and hard to escape on mainstream apps. Looking to connect with folks working on mindful scrolling.',
        username: 'PrideReset',
        timestamp: new Date(Date.now() - 3600000 * 15).toISOString(),
        upvotes: 14,
        downvotes: 0,
        comments: [
          { id: 'c3_1', username: 'QueerPath', text: 'This clan is so necessary. Finding healthy community spaces online that aren\'t centered on sex is a massive part of my healing.', timestamp: new Date(Date.now() - 3600000 * 10).toISOString(), upvotes: 6, helpedCount: 4 }
        ]
      },
      {
        id: 'p4',
        clan: 'success-stories',
        title: '90 Days: Resetting the sensitivity baseline',
        content: 'I reached the 90-day mark. The biggest shift isn\'t that I never get urges, it\'s hypofrontality reversing — my prefrontal cortex has control again. I can feel an urge, pause, and make an active decision. Things that felt boring (reading, walks, cooking) now give me genuine pleasure. Hang in there, the baseline does reset.',
        username: 'DawnWalker',
        timestamp: new Date(Date.now() - 3600000 * 30).toISOString(),
        upvotes: 35,
        downvotes: 0,
        comments: [
          { id: 'c4_1', username: 'PathFinder', text: 'This is the cumulative integrated reward we talk about. Real life feeling good again. Inspiring!', timestamp: new Date(Date.now() - 3600000 * 25).toISOString(), upvotes: 10, helpedCount: 3 }
        ]
      }
    ]
  },
  
  journal: {
    entries: [],
    futureLetters: []
  },
  
  gamification: {
    xp: 0,
    level: 1,
    dailyXPEarned: 0,
    lastXPRestartDate: new Date().toDateString(),
    history: [] // [{ date: string, action: string, xpEarned: number }]
  },
  
  chat: {
    sessionsCompleted: 0,
    lastCompleted: null
  },

  badges: {
    // Tracks raw progress values for each badge track
    chat_count: 0,        // number of 1-on-1 chat sessions
    clan_messages: 0,     // total clan messages sent by user
    sos_count: 0,         // total SOS button uses
    sos_wins: 0,          // SOS uses followed by a logged win
    slip_count: 0,        // slips with reflection note
    journal_count: 0,     // total journal entries
    letter_count: 0,      // letters to future self written
    // Snapshot of which badge ids have been awarded (for UI display)
    awarded: []           // [{ id, earnedAt }]
  },
  
  joined_clans: ['general']
};

export function initializeDatabase() {
  Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
    if (localStorage.getItem(storageKey) === null) {
      const defaultValue = INITIAL_MOCK_DATA[key.toLowerCase()];
      localStorage.setItem(storageKey, JSON.stringify(defaultValue));
    }
  });
}

// Data Getters and Setters
export function getData(key) {
  const raw = localStorage.getItem(STORAGE_KEYS[key.toUpperCase()]);
  if (!raw || raw === 'undefined') return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function saveData(key, data) {
  localStorage.setItem(STORAGE_KEYS[key.toUpperCase()], JSON.stringify(data));
}

// Seeds/updates the local USER record from a Firebase user object.
// Called after every successful sign-in so downstream components work unchanged.
export function seedUserFromFirebase(firebaseUser) {
  const existing = getData('USER') || {};
  const username =
    existing.username ||
    firebaseUser.displayName?.replace(/\s+/g, '_') ||
    firebaseUser.email?.split('@')[0] ||
    'Warrior';

  const updated = {
    ...existing,
    uid:         firebaseUser.uid,
    username,
    email:       firebaseUser.email,
    photoURL:    firebaseUser.photoURL || existing.photoURL || null,
    displayName: firebaseUser.displayName || username,
    joinedAt:    existing.joinedAt || new Date().toISOString(),
  };
  saveData('USER', updated);
  return updated;
}


// User Actions
export function registerUser(username, onboardingAnswers) {
  const user = {
    username,
    joinedAt: new Date().toISOString(),
    goals: onboardingAnswers.goals || [],
    triggers: onboardingAnswers.triggers || [],
    gender: onboardingAnswers.gender || '',
    orientation: onboardingAnswers.orientation || '',
    commitment: onboardingAnswers.commitment || '24h'
  };
  saveData('USER', user);
  
  // Initialize user's streak
  const streak = getData('STREAK');
  streak.startDate = new Date().toISOString();
  streak.currentStreak = 0;
  saveData('STREAK', streak);
  
  // Add user to the Mock Clan list
  const clan = getData('CLAN');
  clan.members.push({
    id: 'user_me',
    username: username,
    streak: 0,
    active: true
  });
  saveData('CLAN', clan);
  
  // Award 50 XP for onboarding completion
  awardXP(50, 'Completed Onboarding Intake');
  
  return user;
}

// XP Gamification Engine
export function awardXP(amount, action) {
  const gamification = getData('GAMIFICATION') || { xp: 0, level: 1, dailyXPEarned: 0, lastXPRestartDate: new Date().toDateString(), history: [] };
  const today = new Date().toDateString();
  
  // Reset daily cap if day changed
  if (gamification.lastXPRestartDate !== today) {
    gamification.dailyXPEarned = 0;
    gamification.lastXPRestartDate = today;
  }
  
  const DAILY_CAP = 200;
  if (gamification.dailyXPEarned >= DAILY_CAP) {
    return { success: false, reason: 'daily_cap_reached', totalXP: gamification.xp };
  }
  
  let awarded = amount;
  if (gamification.dailyXPEarned + amount > DAILY_CAP) {
    awarded = DAILY_CAP - gamification.dailyXPEarned;
  }
  
  gamification.xp += awarded;
  gamification.dailyXPEarned += awarded;
  
  // Level threshold
  const newLevel = Math.floor(gamification.xp / 150) + 1;
  const levelUp = newLevel > gamification.level;
  gamification.level = newLevel;
  
  gamification.history.push({
    date: new Date().toISOString(),
    action,
    xpEarned: awarded
  });
  
  saveData('GAMIFICATION', gamification);
  return { success: true, awarded, levelUp, level: newLevel, totalXP: gamification.xp };
}

// Level to Identity Mapping
export function getIdentityForLevel(level) {
  if (level <= 1) return 'Intake & Insight';
  if (level === 2) return 'Neural Rewiring';
  if (level === 3) return 'Prefrontal Command';
  if (level === 4) return 'Dopamine Stabilization';
  if (level === 5) return 'Habit Autonomy';
  return 'Reboot Complete';
}

// Streak Functions
export function getStreakMetrics() {
  const streak = getData('STREAK');
  if (!streak || !streak.startDate) return { current: 0, longest: 0, daysLeftOfCommitment: 0 };
  
  const diffTime = Math.abs(new Date() - new Date(streak.startDate));
  const currentStreak = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Update current streak locally
  streak.currentStreak = currentStreak;
  if (currentStreak > streak.longestStreak) {
    streak.longestStreak = currentStreak;
  }
  saveData('STREAK', streak);
  
  return {
    current: currentStreak,
    longest: streak.longestStreak,
    slips: streak.slips
  };
}

export function logSlip(trigger, reflection, intensity) {
  const streak = getData('STREAK');
  
  // Save current streak to slips log before reset
  const diffTime = Math.abs(new Date() - new Date(streak.startDate));
  const finalStreakValue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  streak.slips.push({
    date: new Date().toISOString(),
    trigger,
    reflection,
    intensity,
    streakValueAtSlip: finalStreakValue
  });
  
  // Reset starting date to now
  streak.startDate = new Date().toISOString();
  streak.currentStreak = 0;
  saveData('STREAK', streak);
  
  // Update clan streak for user
  const clan = getData('CLAN');
  const meIndex = clan.members.findIndex(m => m.id === 'user_me');
  if (meIndex !== -1) {
    clan.members[meIndex].streak = 0;
    saveData('CLAN', clan);
  }
  
  // Award 15 XP for honest reflection (effort-based reinforcement)
  awardXP(15, 'Logged Slip and Urge Reflection');
}

// SOS Trigger Actions
export function logSOSWin(method) {
  awardXP(25, `Successfully managed craving via SOS: ${method}`);
}

// Clan Messaging & Flares
export function sendClanMessage(text) {
  const clan = getData('CLAN');
  const user = getData('USER') || { username: 'You' };
  
  const newMessage = {
    id: `m_${Date.now()}`,
    username: user.username,
    text,
    timestamp: new Date().toISOString()
  };
  
  clan.messages.push(newMessage);
  saveData('CLAN', clan);
  
  // Award 10 XP for supporting clan
  awardXP(10, 'Messaged Accountability Clan');
  
  return newMessage;
}

export function sendClanFlare() {
  const clan = getData('CLAN');
  const user = getData('USER') || { username: 'You' };
  
  const newFlare = {
    id: `flare_${Date.now()}`,
    username: user.username,
    timestamp: new Date().toISOString(),
    resolved: false
  };
  
  clan.flares.push(newFlare);
  
  // Auto add flare request text into clan message
  const msgText = '🚨 I sent an urgent flare! Cravings are high right now. I could use some distraction or encouraging words.';
  const msg = {
    id: `m_flare_${Date.now()}`,
    username: user.username,
    text: msgText,
    timestamp: new Date().toISOString()
  };
  
  clan.messages.push(msg);
  saveData('CLAN', clan);
  
  // Award 15 XP for raising hand instead of isolating
  awardXP(15, 'Raised Accountability Flare (Avoided Isolation)');
  
  return { flare: newFlare, message: msg };
}

// Forum CRUD (Public Clans)
export function getPosts(clan = 'all') {
  const forum = getData('FORUM');
  if (!forum) return [];
  if (clan === 'all') return forum.posts;
  return forum.posts.filter(post => post.clan === clan);
}

export function createPost(clan, title, content) {
  const forum = getData('FORUM');
  const user = getData('USER') || { username: 'Anonymous' };
  
  // Auto mod check
  const hasTriggerTitle = containsTriggerWords(title);
  const hasTriggerContent = containsTriggerWords(content);
  
  if (hasTriggerTitle || hasTriggerContent) {
    return { success: false, reason: 'trigger_words_detected' };
  }
  
  const newPost = {
    id: `post_${Date.now()}`,
    clan,
    title,
    content,
    username: user.username,
    timestamp: new Date().toISOString(),
    upvotes: 1,
    downvotes: 0,
    comments: []
  };
  
  forum.posts.unshift(newPost);
  saveData('FORUM', forum);
  
  // Award XP
  awardXP(20, `Created post in Public Clan: ${clan}`);
  return { success: true, post: newPost };
}

export function addComment(postId, commentText) {
  const forum = getData('FORUM');
  const user = getData('USER') || { username: 'Anonymous' };
  
  if (containsTriggerWords(commentText)) {
    return { success: false, reason: 'trigger_words_detected' };
  }
  
  const postIndex = forum.posts.findIndex(p => p.id === postId);
  if (postIndex === -1) return { success: false, reason: 'post_not_found' };
  
  const comment = {
    id: `c_${Date.now()}`,
    username: user.username,
    text: commentText,
    timestamp: new Date().toISOString(),
    upvotes: 1,
    helpedCount: 0
  };
  
  forum.posts[postIndex].comments.push(comment);
  saveData('FORUM', forum);
  
  awardXP(10, 'Replied to public thread');
  return { success: true, comment };
}

export function votePost(postId, direction) {
  const forum = getData('FORUM');
  const postIndex = forum.posts.findIndex(p => p.id === postId);
  if (postIndex === -1) return;
  
  if (direction === 'up') {
    forum.posts[postIndex].upvotes += 1;
  } else {
    forum.posts[postIndex].downvotes += 1;
  }
  
  saveData('FORUM', forum);
}

export function markHelpful(postId, commentId) {
  const forum = getData('FORUM');
  const postIndex = forum.posts.findIndex(p => p.id === postId);
  if (postIndex === -1) return;
  
  const comments = forum.posts[postIndex].comments;
  const commentIndex = comments.findIndex(c => c.id === commentId);
  if (commentIndex === -1) return;
  
  comments[commentIndex].helpedCount += 1;
  comments[commentIndex].upvotes += 3; // Boosted upvotes
  
  saveData('FORUM', forum);
  awardXP(5, 'Acknowledged helpful response');
}

// Chatbox Session Tracking
export function logChatSession() {
  const chat = getData('CHAT') || { sessionsCompleted: 0, lastCompleted: null };
  const today = new Date().toDateString();
  
  chat.sessionsCompleted += 1;
  chat.lastCompleted = today;
  
  saveData('CHAT', chat);
  
  // Award 25 XP
  awardXP(25, 'Connected with a peer in 1-on-1 Chatbox');
  incrementBadgeStat('chat_count');
  
  return chat;
}

// Journal Logging
export function saveJournal(mood, urgeLevel, reflection) {
  const journal = getData('JOURNAL');
  
  const entry = {
    date: new Date().toISOString(),
    mood,
    urgeLevel,
    reflection: cleanText(reflection)
  };
  
  journal.entries.unshift(entry);
  saveData('JOURNAL', journal);
  
  // Award 20 XP
  awardXP(20, 'Logged daily emotional check-in');
  return entry;
}

export function saveFutureLetter(letterText, milestoneDay) {
  const journal = getData('JOURNAL');
  const newLetter = {
    id: `letter_${Date.now()}`,
    date: new Date().toISOString(),
    text: letterText,
    milestoneDay,
    unlocked: false
  };
  journal.futureLetters.push(newLetter);
  saveData('JOURNAL', journal);
  
  awardXP(25, `Wrote Future-Self Letter for Day ${milestoneDay}`);

  // Increment letter badge stat
  incrementBadgeStat('letter_count');

  return newLetter;
}

// ─────────────────────────────────────────────────────────────────────────────
// BADGE STAT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Read badge stats object (initialise if missing) */
export function getBadgeStats() {
  const raw = localStorage.getItem('nocrap_badges');
  if (raw) return JSON.parse(raw);
  const defaults = {
    chat_count: 0, clan_messages: 0, sos_count: 0,
    sos_wins: 0, slip_count: 0, journal_count: 0,
    letter_count: 0, awarded: []
  };
  localStorage.setItem('nocrap_badges', JSON.stringify(defaults));
  return defaults;
}

/** Increment a single badge stat key by 1 (or a given amount) */
export function incrementBadgeStat(key, by = 1) {
  const stats = getBadgeStats();
  stats[key] = (stats[key] || 0) + by;
  localStorage.setItem('nocrap_badges', JSON.stringify(stats));
  checkAndAwardNewBadges(stats);
  return stats;
}

/** Called after any stat change — badge award display handled by Profile component */
function checkAndAwardNewBadges() {
  // Badge unlock check runs in Profile.jsx via computeEarnedBadgeIds()
  // keeping this as a hook for future server-side notification integration
}

/** Log that the SOS button was opened */
export function logSOSOpened() {
  incrementBadgeStat('sos_count');
}

/** Log that the user successfully surfed a craving via SOS (overrides logSOSWin) */
export function logSOSSuccess(method) {
  incrementBadgeStat('sos_wins');
  awardXP(25, `Managed craving via SOS: ${method}`);
}

/** Sync computed badge stats from live data on app load */
export function syncBadgeStats() {
  const stats = getBadgeStats();

  // Sync chat count from CHAT data
  const chat = getData('CHAT');
  if (chat) stats.chat_count = chat.sessionsCompleted || 0;

  // Sync journal count
  const journal = getData('JOURNAL');
  if (journal) {
    stats.journal_count = journal.entries ? journal.entries.length : 0;
    stats.letter_count = journal.futureLetters ? journal.futureLetters.length : 0;
  }

  // Sync clan messages count for this user
  const clan = getData('CLAN');
  const user = getData('USER');
  if (clan && user) {
    stats.clan_messages = clan.messages.filter(m => m.username === user.username).length;
  }

  // Sync slip reflections
  const streak = getData('STREAK');
  if (streak) {
    stats.slip_count = (streak.slips || []).filter(s => s.reflection && s.reflection.length > 3).length;
  }

  localStorage.setItem('nocrap_badges', JSON.stringify(stats));
  return stats;
}

export function getJoinedClans() {
  const clans = getData('JOINED_CLANS');
  return clans || ['general'];
}

export function toggleJoinClan(clanId) {
  let clans = getJoinedClans();
  if (clans.includes(clanId)) {
    clans = clans.filter(id => id !== clanId);
  } else {
    clans.push(clanId);
  }
  saveData('JOINED_CLANS', clans);
  return clans;
}

export function getClansList() {
  const clans = getData('CLANS_LIST');
  if (!clans) {
    const defaults = [
      {
        id: 'general',
        name: 'General Recovery',
        emoji: '🌐',
        category: 'General',
        description: 'Join the general recovery community to share tips, count check-ins, and get daily motivation.',
        stats: '4.3K weekly visitors · 1.8K online · 15d avg streak',
        color: '#3b82f6',
        privacy: 'public',
        topics: ['Wellness', 'Health'],
        createdAt: '2026-06-01T00:00:00.000Z'
      },
      {
        id: 'relapse-support',
        name: 'Relapse Support',
        emoji: '🛡️',
        category: 'Support',
        description: 'A non-judgmental space to reflect on slips, study fatigue/scrolling triggers, and rebuild momentum.',
        stats: '850 weekly visitors · 240 online · 8d avg streak',
        color: '#ef4444',
        privacy: 'public',
        topics: ['Wellness', 'Health'],
        createdAt: '2026-06-01T00:00:00.000Z'
      },
      {
        id: 'success-stories',
        name: 'Success Stories',
        emoji: '🏆',
        category: 'Success',
        description: 'Read and share milestones, habits, and physiological proof that the dopamine baseline does stabilize.',
        stats: '1.2K weekly visitors · 450 online · 42d avg streak',
        color: '#eab308',
        privacy: 'public',
        topics: ['Wellness', 'Health', 'Q&As & Stories'],
        createdAt: '2026-06-01T00:00:00.000Z'
      },
      {
        id: 'womens-pod',
        name: "Women's Pod",
        emoji: '🌸',
        category: 'Demographics',
        description: 'Safe, private space for women in recovery to share coping strategies, physiology, and mindful practices.',
        stats: '650 weekly visitors · 180 online · 12d avg streak',
        color: '#ec4899',
        privacy: 'public',
        topics: ['Wellness', 'Identity & Relationships'],
        createdAt: '2026-06-01T00:00:00.000Z'
      },
      {
        id: 'lgbtq-pod',
        name: 'LGBTQ+ Pod',
        emoji: '🌈',
        category: 'Demographics',
        description: 'Supportive community for LGBTQ+ individuals navigating minority stress, hyper-sexualized feeds, and triggers.',
        stats: '420 weekly visitors · 110 online · 9d avg streak',
        color: '#a855f7',
        privacy: 'public',
        topics: ['Wellness', 'Identity & Relationships'],
        createdAt: '2026-06-01T00:00:00.000Z'
      },
      {
        id: 'science-discussion',
        name: 'Science & Research',
        emoji: '🔬',
        category: 'Science',
        description: 'Deep dive into neurobiology: discuss ΔFosB sensitization, prefrontal cortex pruning, and dopamine receptor upregulation.',
        stats: '940 weekly visitors · 310 online · 24d avg streak',
        color: '#10b981',
        privacy: 'public',
        topics: ['Sciences', 'Technology'],
        createdAt: '2026-06-01T00:00:00.000Z'
      },
      {
        id: 'no-crap',
        name: 'No Crap',
        emoji: '🔥',
        logo: '/clan_no_crap.jpg',
        category: 'Hard Mode',
        description: 'Zero tolerance. No excuses. This clan is for those going all in — no PMO, no substitutes, no compromise. Raw discipline only.',
        stats: '1.1K weekly visitors · 380 online · 21d avg streak',
        color: '#dc2626',
        privacy: 'public',
        topics: ['Wellness', 'Hard Mode'],
        createdAt: '2026-06-01T00:00:00.000Z'
      }
    ];
    saveData('CLANS_LIST', defaults);
    return defaults;
  }
  return clans;
}

export function createCustomClan(clanData) {
  const clans = getClansList();
  
  const id = clanData.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  if (clans.some(c => c.id === id)) {
    return { success: false, reason: 'clan_already_exists' };
  }
  
  const newClan = {
    id,
    name: clanData.name,
    emoji: clanData.emoji || '👥',
    category: clanData.category || 'General',
    description: clanData.description || '',
    stats: '1 weekly visitor · 1 online · 0d avg streak',
    color: clanData.color || '#3b82f6',
    privacy: clanData.privacy || 'public',
    topics: clanData.topics || [],
    createdAt: new Date().toISOString(),
    mature: clanData.mature || false
  };
  
  clans.push(newClan);
  saveData('CLANS_LIST', clans);
  return { success: true, clan: newClan };
}
