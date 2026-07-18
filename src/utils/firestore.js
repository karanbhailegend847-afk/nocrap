import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  increment,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  addDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { generateRoastUsername } from './usernameGenerator';

// Firestore Service Module

export { db };

export async function getOrCreateUser(uid, email = '', displayName = '') {
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);

  let username = '';

  if (!userDoc.exists()) {
    const isRealNameOrEmail = !displayName || displayName.includes(' ') || displayName.includes('@') || displayName === 'Warrior' || displayName === 'Anonymous';
    username = isRealNameOrEmail ? generateRoastUsername() : displayName;

    const newUser = {
      uid,
      username,
      email: email || uid,
      joinedAt: new Date().toISOString()
    };
    await setDoc(userRef, newUser);
    return newUser;
  } else {
    const data = userDoc.data();
    const isInvalid = !data.username || data.username === 'Anonymous' || data.username.includes('@') || data.username === 'Warrior';
    if (isInvalid) {
      const fixedUsername = generateRoastUsername();
      await updateDoc(userRef, { username: fixedUsername });
      data.username = fixedUsername;
    }
    return data;
  }
}

export async function updateUserStreak(uid, streakData) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { streak: streakData });
}

export async function logSlipFirestore(uid, trigger, reflection, intensity) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    slips: arrayUnion({
      date: new Date().toISOString(),
      trigger,
      reflection,
      intensity,
      streakValueAtSlip: 0 // Will be updated in getStreakMetrics
    })
  });
}

export const DEFAULT_CLANS = [
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

// Posts Collection

export async function getPostsFS(pod = 'all') {
  let q = collection(db, 'posts');
  if (pod !== 'all') {
    q = query(q, where('pod', '==', pod));
  }
  const snapshot = await getDocs(q);
  
  // Fetch comments for each post from its subcollection
  const posts = await Promise.all(snapshot.docs.map(async (postDoc) => {
    const data = postDoc.data();
    
    // Get comments subcollection (sort in-memory to prevent index errors)
    const commentsSnapshot = await getDocs(collection(db, 'posts', postDoc.id, 'comments'));
    const comments = commentsSnapshot.docs.map(cDoc => ({ id: cDoc.id, ...cDoc.data() }));
    comments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (data.authorUsername && !data.username) {
      data.username = data.authorUsername;
    }
    
    return { 
      id: postDoc.id, 
      ...data, 
      comments 
    };
  }));

  // Sort posts by timestamp descending in memory
  posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return posts;
}


export async function createPostFS(pod, title, content, uid, username, imageUrl = '') {
  const newPost = {
    pod,
    title,
    content,
    imageUrl,
    uid,
    userId: uid,
    author: uid,
    authorUid: uid,
    username: username || 'Anonymous',
    authorUsername: username || 'Anonymous',
    timestamp: new Date().toISOString(),
    upvotes: 1,
    downvotes: 0,
    comments: []
  };
  const postRef = await addDoc(collection(db, 'posts'), newPost);
  return postRef.id;
}

export async function addCommentFS(postId, text, uid, username) {
  await addDoc(collection(db, 'posts', postId, 'comments'), {
    text,
    uid,
    username: username || 'Anonymous',
    timestamp: new Date().toISOString(),
    upvotes: 1,
    helpedCount: 0
  });
}

export async function getPostCommentsFS(postId) {
  const snapshot = await getDocs(collection(db, 'posts', postId, 'comments'));
  const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  comments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return comments;
}

export async function votePostFS(postId, direction) {
  const postRef = doc(db, 'posts', postId);
  if (direction === 'up') {
    await updateDoc(postRef, { upvotes: increment(1) });
  } else {
    await updateDoc(postRef, { downvotes: increment(1) });
  }
}

// Helpful comment (mark as helpful)
export async function markHelpfulFS(postId, commentId) {
  const commentRef = doc(db, 'posts', postId, 'comments', commentId);
  await updateDoc(commentRef, {
    helpedCount: increment(1),
    upvotes: increment(3)
  });
}

// Clans Collection

export async function getClansListFS() {
  const snapshot = await getDocs(collection(db, 'clans'));
  if (snapshot.empty) {
    // Auto-seed default clans
    for (const clan of DEFAULT_CLANS) {
      const { id, ...data } = clan;
      await setDoc(doc(db, 'clans', id), data);
    }
    const freshSnapshot = await getDocs(collection(db, 'clans'));
    return freshSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createClanFS(clanData) {
  const id = clanData.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const clanRef = doc(db, 'clans', id);
  await setDoc(clanRef, {
    ...clanData,
    id
  });
  return id;
}

export async function joinClanFS(uid, clanId) {
  await setDoc(doc(db, 'clanMembers', `${clanId}__${uid}`), {
    clanId,
    uid,
    joinedAt: new Date().toISOString()
  });
}

export async function leaveClanFS(uid, clanId) {
  await deleteDoc(doc(db, 'clanMembers', `${clanId}__${uid}`));
}

export async function getUserClansFS(uid) {
  const q = query(collection(db, 'clanMembers'), where('uid', '==', uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data().clanId);
}

// Seed clans to Firestore (runs once, safe to call multiple times — uses setDoc with merge)
export async function seedClansToFirestore(clans) {
  if (!clans || clans.length === 0) return;
  const writes = clans.map(clan => {
    const clanRef = doc(db, 'clans', clan.id);
    return setDoc(clanRef, {
      name: clan.name,
      emoji: clan.emoji || '👥',
      logo: clan.logo || clan.logoUrl || '',
      category: clan.category || 'General',
      description: clan.description || '',
      stats: clan.stats || '',
      color: clan.color || '#3b82f6',
      privacy: clan.privacy || 'public',
      topics: clan.topics || [],
      createdAt: clan.createdAt || new Date().toISOString(),
      mature: clan.mature || false
    }, { merge: true });
  });
  await Promise.all(writes);
}

// Clan Chat (Real-time)

export function onClanChatListener(clanId, callback) {
  const q = query(
    collection(db, 'clanMessages'),
    where('clanId', '==', clanId),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, callback);
}

export async function sendClanMsgFS(clanId, text, uid, username) {
  await addDoc(collection(db, 'clanMessages'), {
    clanId,
    uid,
    username: username || 'Anonymous',
    text,
    timestamp: new Date().toISOString()
  });
}

// Journal Functions

export async function saveJournalFS(uid, mood, urge, reflection) {
  await addDoc(collection(db, 'users', uid, 'journal'), {
    date: new Date().toISOString(),
    mood,
    urgeLevel: urge,
    reflection
  });
}

export async function getJournalEntriesFS(uid) {
  const q = query(collection(db, 'users', uid, 'journal'), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getClanFS(clanId) {
  const clanRef = doc(db, 'clans', clanId);
  const clanDoc = await getDoc(clanRef);
  if (clanDoc.exists()) {
    return { id: clanDoc.id, ...clanDoc.data() };
  }
  return null;
}

export async function updateClanFS(clanId, updatedData) {
  const clanRef = doc(db, 'clans', clanId);
  await updateDoc(clanRef, updatedData);
}

export async function markUserActiveInClanFS(clanId, uid) {
  const activeRef = doc(db, 'clans', clanId, 'activeUsers', uid);
  await setDoc(activeRef, {
    lastActive: new Date().toISOString()
  });
}

export async function getClanMemberCountFS(clanId) {
  const q = query(collection(db, 'clanMembers'), where('clanId', '==', clanId));
  const snapshot = await getDocs(q);
  return snapshot.size;
}

export async function getClanActiveUsersCountFS(clanId) {
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const q = query(
    collection(db, 'clans', clanId, 'activeUsers'),
    where('lastActive', '>=', fifteenMinsAgo)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
}

export async function enterMatchmakingQueueFS(uid, username) {
  // First, clean up any stale queue entries for this user
  const staleQ = query(collection(db, 'matchmakingQueue'), where('uid', '==', uid));
  const staleSnap = await getDocs(staleQ);
  const cleanupBatch = writeBatch(db);
  staleSnap.docs.forEach(d => cleanupBatch.delete(d.ref));
  await cleanupBatch.commit();

  const docRef = await addDoc(collection(db, 'matchmakingQueue'), {
    uid,
    username,
    joinedAt: serverTimestamp(),
    status: 'waiting',
    matchedSessionId: null
  });
  return docRef.id;
}

export async function exitMatchmakingQueueFS(queueDocId) {
  if (!queueDocId) return;
  const queueRef = doc(db, 'matchmakingQueue', queueDocId);
  await deleteDoc(queueRef).catch(() => {});
}

export function listenToMatchmakingQueueFS(queueDocId, callback) {
  const queueRef = doc(db, 'matchmakingQueue', queueDocId);
  return onSnapshot(queueRef, callback);
}

export async function findMatchmakingCandidateFS(myQueueDocId, myUid, myUsername) {
  // Read the entire queue and find oldest waiting peer that isn't us
  const snapshot = await getDocs(collection(db, 'matchmakingQueue'));
  const waitingCandidates = snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => d.status === 'waiting' && d.id !== myQueueDocId && d.uid !== myUid)
    .sort((a, b) => {
      // Sort by joinedAt — serverTimestamp becomes a Timestamp object
      const ta = a.joinedAt?.toMillis ? a.joinedAt.toMillis() : new Date(a.joinedAt).getTime();
      const tb = b.joinedAt?.toMillis ? b.joinedAt.toMillis() : new Date(b.joinedAt).getTime();
      return ta - tb;
    });

  const candidate = waitingCandidates[0];
  if (!candidate) return null;

  const candidateQueueId = candidate.id;
  const candidateUid = candidate.uid;
  const candidateUsername = candidate.username;

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const sessionRef = doc(db, 'chatSessions', sessionId);
  const batch = writeBatch(db);

  batch.set(sessionRef, {
    users: [myUid, candidateUid],
    usernames: { [myUid]: myUsername, [candidateUid]: candidateUsername },
    createdAt: new Date().toISOString(),
    active: true
  });

  batch.update(doc(db, 'matchmakingQueue', candidateQueueId), {
    status: 'matched',
    matchedSessionId: sessionId
  });

  batch.update(doc(db, 'matchmakingQueue', myQueueDocId), {
    status: 'matched',
    matchedSessionId: sessionId
  });

  try {
    await batch.commit();
    return sessionId;
  } catch (err) {
    // Another user matched us first — our doc may already be matched
    console.warn('Batch match failed (likely already matched):', err.message);
    return null;
  }
}

export async function sendChatMessageFS(sessionId, text, uid, username) {
  await addDoc(collection(db, 'chatSessions', sessionId, 'messages'), {
    senderId: uid,
    senderUsername: username,
    text,
    timestamp: new Date().toISOString()
  });
}

export function listenToChatMessagesFS(sessionId, callback) {
  const q = query(
    collection(db, 'chatSessions', sessionId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, callback);
}

export async function closeChatSessionFS(sessionId) {
  const sessionRef = doc(db, 'chatSessions', sessionId);
  await updateDoc(sessionRef, { active: false });
}

export function listenToChatSessionFS(sessionId, callback) {
  const sessionRef = doc(db, 'chatSessions', sessionId);
  return onSnapshot(sessionRef, callback);
}

export function listenToActiveMatchersCountFS(callback) {
  const q = query(
    collection(db, 'matchmakingQueue'),
    where('status', '==', 'waiting')
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}

export function listenToWaitingQueueFS(callback) {
  const q = query(
    collection(db, 'matchmakingQueue'),
    where('status', '==', 'waiting')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(users);
    },
    (error) => {
      console.warn('listenToWaitingQueueFS error:', error);
      callback([]);
    }
  );
}

export async function matchWithCandidateDirectFS(myUid, myUsername, candidateQueueId, candidateUid, candidateUsername) {
  const candidateRef = doc(db, 'matchmakingQueue', candidateQueueId);
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const sessionRef = doc(db, 'chatSessions', sessionId);

  try {
    await runTransaction(db, async (transaction) => {
      const candidateSnap = await transaction.get(candidateRef);
      if (!candidateSnap.exists() || candidateSnap.data().status !== 'waiting') {
        throw new Error('Peer is no longer waiting.');
      }

      transaction.set(sessionRef, {
        users: [myUid, candidateUid],
        usernames: { [myUid]: myUsername, [candidateUid]: candidateUsername },
        createdAt: new Date().toISOString(),
        active: true
      });

      transaction.update(candidateRef, {
        status: 'matched',
        matchedSessionId: sessionId
      });
    });
    return sessionId;
  } catch (err) {
    console.error('Direct match transaction failed:', err);
    throw err;
  }
}

export async function checkQueueItemWaitingFS(queueDocId) {
  if (!queueDocId) return false;
  const docRef = doc(db, 'matchmakingQueue', queueDocId);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() && snapshot.data().status === 'waiting';
}

// Real-time listener for the total member count of a clan
export function listenToClanMemberCountFS(clanId, callback) {
  const q = query(collection(db, 'clanMembers'), where('clanId', '==', clanId));
  return onSnapshot(
    q, 
    (snapshot) => { callback(snapshot.size); },
    (error) => { console.warn('listenToClanMemberCountFS error:', error.code); callback(0); }
  );
}

// Real-time listener for active users count in a clan (active in last 15 minutes)
export function listenToClanActiveCountFS(clanId, callback) {
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const q = query(
    collection(db, 'clans', clanId, 'activeUsers'),
    where('lastActive', '>=', fifteenMinsAgo)
  );
  return onSnapshot(
    q, 
    (snapshot) => { callback(snapshot.size); },
    (error) => { console.warn('listenToClanActiveCountFS error:', error.code); callback(0); }
  );
}

// Fetch real member count for all clans in one batch (for initial load)
export async function getAllClanMemberCountsFS(clanIds) {
  const counts = {};
  await Promise.all(clanIds.map(async (clanId) => {
    try {
      const q = query(collection(db, 'clanMembers'), where('clanId', '==', clanId));
      const snapshot = await getDocs(q);
      counts[clanId] = snapshot.size;
    } catch (error) {
      console.warn('getAllClanMemberCountsFS error:', error.code);
      counts[clanId] = 0;
    }
  }));
  return counts;
}