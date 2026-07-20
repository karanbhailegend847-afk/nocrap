import { useState, useEffect } from 'react';
import { MessageSquare, ArrowUp, ArrowDown, AlertCircle, BookmarkCheck, Share2, Plus, Check } from 'lucide-react';
import { getPostsFS, createPostFS, addCommentFS, getPostCommentsFS, votePostFS, getClansListFS, getUserClansFS, joinClanFS, leaveClanFS, markHelpfulFS, updateClanFS, DEFAULT_CLANS, markUserActiveInClanFS, getClanMemberCountFS, getClanActiveUsersCountFS } from '../utils/firestore';
import { auth } from '../firebase';
import { getStreakMetrics, getJoinedClans, toggleJoinClan, getAllLocalVotes, setLocalVote } from '../utils/storage';

export default function Forum({ selectedPod, user }) {
  const [posts, setPosts] = useState([]);
  const [sortOrder, setSortOrder] = useState('hot'); // default to 'hot' (best)
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dynamic lists from Firestore
  const [clansList, setClansList] = useState([]);
  const [joinedClans, setJoinedClans] = useState([]);
  
  // Post creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [targetPod, setTargetPod] = useState('general');
  const [postError, setPostError] = useState('');
  
  // Active Thread Modal
  const [expandedPost, setExpandedPost] = useState(null);
  const [comments, setComments] = useState([]); // Real-time/Fetched comments from subcollection
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');

  // Keep track of user voted posts
  const [votedPosts, setVotedPosts] = useState({}); // { postId: 'up' | 'down' }

  // Edit Clan Settings state
  const [showEditClanModal, setShowEditClanModal] = useState(false);
  const [editClanDescription, setEditClanDescription] = useState('');
  const [editClanColor, setEditClanColor] = useState('#ff4500');
  const [editClanEmoji, setEditClanEmoji] = useState('👥');
  const [editClanRulesText, setEditClanRulesText] = useState('');
  const [editClanLogoUrl, setEditClanLogoUrl] = useState('');
  const [editClanBannerUrl, setEditClanBannerUrl] = useState('');
  const [editClanBgVideoUrl, setEditClanBgVideoUrl] = useState('');
  const [editClanError, setEditClanError] = useState('');

  // Real-time dynamic clan statistics
  const [realMemberCount, setRealMemberCount] = useState(0);
  const [realOnlineCount, setRealOnlineCount] = useState(1);

  const currentClan = selectedPod && selectedPod !== 'all'
    ? clansList.find(c => c.id === selectedPod)
    : null;

  const isJoined = currentClan && joinedClans.includes(currentClan.id);

  const displayMemberCount = isJoined ? Math.max(realMemberCount, 1) : realMemberCount;

  useEffect(() => {
    if (!currentClan) return;
    const fetchStats = async () => {
      try {
        const [mCount, oCount] = await Promise.all([
          getClanMemberCountFS(currentClan.id),
          getClanActiveUsersCountFS(currentClan.id)
        ]);
        setRealMemberCount(mCount);
        setRealOnlineCount(oCount > 0 ? oCount : 1);
      } catch {
        // Firestore rules may block these reads for non-members — silently ignore
      }
    };
    fetchStats();
  }, [selectedPod, currentClan, joinedClans, user]);

  useEffect(() => {
    if (!currentClan) return;
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) return;

    const ping = async () => {
      try {
        await markUserActiveInClanFS(currentClan.id, uid);
        const oCount = await getClanActiveUsersCountFS(currentClan.id);
        setRealOnlineCount(oCount > 0 ? oCount : 1);
      } catch (err) {
        console.warn(err);
      }
    };
    ping();
    const interval = setInterval(ping, 30000); // ping every 30 seconds
    return () => clearInterval(interval);
  }, [selectedPod, currentClan, user]);

  const loadPosts = async () => {
    let list = await getPostsFS(selectedPod || 'all');

    // Apply search filter if active
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(post =>
        post.title.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q) ||
        post.pod.toLowerCase().includes(q)
      );
    }

    // Sort order
    if (sortOrder === 'new') {
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else {
      list.sort((a, b) => b.upvotes - a.upvotes);
    }
    setPosts(list);
  };

  useEffect(() => {
    const fetchData = async () => {
      await loadPosts();
      // Load clans data
      const clans = await getClansListFS();
      setClansList(clans);
      setJoinedClans(getJoinedClans());
    };
    fetchData();

    const handleClansUpdate = () => {
      setJoinedClans(getJoinedClans());
    };
    window.addEventListener('clans-updated', handleClansUpdate);
    return () => window.removeEventListener('clans-updated', handleClansUpdate);
  }, [selectedPod, sortOrder, searchQuery, user]);
  // Load this user's persisted votes from localStorage (survives page refresh)
  useEffect(() => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) {
      setVotedPosts({});
      return;
    }
    const votes = getAllLocalVotes(uid);
    setVotedPosts(votes);
  }, [user]);
  // Load comments when a post is expanded
  useEffect(() => {
    if (expandedPost) {
      const loadComments = async () => {
        try {
          const list = await getPostCommentsFS(expandedPost.id);
          setComments(list);
        } catch (err) {
          console.error('Failed to load post comments:', err);
        }
      };
      loadComments();
    } else {
      setComments([]);
    }
  }, [expandedPost]);

  useEffect(() => {
    // Listeners for Top Nav actions
    const handleSearch = (e) => {
      setSearchQuery(e.detail || '');
    };
    const handleOpenCreate = () => {
      triggerCreatePost();
    };
    const handleUpdate = () => {
      // Re-fetch from Firestore to stay in sync
      const uid = user?.uid || auth.currentUser?.uid;
      Promise.all([
        getClansListFS(),
        uid ? getUserClansFS(uid) : Promise.resolve([])
      ]).then(([clans, joined]) => {
        setClansList(clans);
        setJoinedClans(joined);
      }).catch(console.warn);
    };

    window.addEventListener('forum-search', handleSearch);
    window.addEventListener('open-create-thread', handleOpenCreate);
    window.addEventListener('clans-updated', handleUpdate);
    
    return () => {
      window.removeEventListener('forum-search', handleSearch);
      window.removeEventListener('open-create-thread', handleOpenCreate);
      window.removeEventListener('clans-updated', handleUpdate);
    };
  }, [user]);

  useEffect(() => {
    if (selectedPod && selectedPod !== 'all') {
      setTargetPod(selectedPod);
    } else {
      setTargetPod('general');
    }
  }, [selectedPod]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024 * 1) { // 1MB limit for firestore document base64 size limits
        setPostError('Image size must be less than 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Compress image to base64 string, max ~200KB to fit in Firestore
  const readImageAsBase64 = (file, maxBytes = 200 * 1024) => new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      // Use a canvas to compress
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const scale = Math.sqrt(maxBytes / file.size);
        canvas.width = Math.floor(width * scale);
        canvas.height = Math.floor(height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = url;
    } else {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }
  });

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setEditClanError('Please select a valid image file for the logo.');
      return;
    }
    try {
      const base64 = await readImageAsBase64(file, 200 * 1024);
      setEditClanLogoUrl(base64);
      setEditClanError('');
    } catch {
      setEditClanError('Could not read the logo image.');
    }
  };

  const handleBannerChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setEditClanError('Please select a valid image file for the banner.');
      return;
    }
    try {
      const base64 = await readImageAsBase64(file, 400 * 1024);
      setEditClanBannerUrl(base64);
      setEditClanError('');
    } catch {
      setEditClanError('Could not read the banner image.');
    }
  };

  const triggerCreatePost = () => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) {
      window.dispatchEvent(new CustomEvent('trigger-auth'));
    } else {
      setShowCreateModal(true);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) {
      setPostError('Title and content cannot be blank.');
      return;
    }

    // Get user info from Firebase Auth
    const uid = user?.uid || auth.currentUser?.uid;
    const username = user?.displayName || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Anonymous';

    if (!uid) {
      window.dispatchEvent(new CustomEvent('trigger-auth'));
      return;
    }

    try {
      await createPostFS(targetPod, postTitle.trim(), postContent.trim(), uid, username, postImageUrl);
      
      // Auto-join the clan if they posted in it and haven't joined yet
      if (!joinedClans.includes(targetPod)) {
        await joinClanFS(uid, targetPod);
        const refreshed = await getUserClansFS(uid);
        setJoinedClans(refreshed);
        window.dispatchEvent(new CustomEvent('clans-updated'));
      }

      setPostTitle('');
      setPostContent('');
      setPostImageUrl('');
      setPostError('');
      setShowCreateModal(false);
      await loadPosts();
      window.dispatchEvent(new CustomEvent('xp-updated'));
    } catch (err) {
      console.error('Create post error:', err);
      setPostError(`Failed to create post: ${err.message || err.toString()}`);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const uid = user?.uid || auth.currentUser?.uid;
    const username = user?.displayName || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Anonymous';
    if (!uid) {
      window.dispatchEvent(new CustomEvent('trigger-auth'));
      return;
    }
    try {
      await addCommentFS(expandedPost.id, commentText.trim(), uid, username);
      setCommentText('');
      setCommentError('');
      
      const [freshComments, freshPost] = await Promise.all([
        getPostCommentsFS(expandedPost.id),
        getPostsFS('all').then(posts => posts.find(p => p.id === expandedPost.id))
      ]);
      setComments(freshComments);
      setExpandedPost(freshPost);
      await loadPosts();
      window.dispatchEvent(new CustomEvent('xp-updated'));
    } catch (err) {
      console.error('Add comment error:', err);
      setCommentError('Failed to add comment. Please try again.');
    }
  };

  const handleVote = async (postId, direction) => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) {
      window.dispatchEvent(new CustomEvent('trigger-auth'));
      return;
    }

    const prevVote = votedPosts[postId];
    const optimisticVote = prevVote === direction ? null : direction;

    // Optimistic UI — update counts immediately so it feels instant
    setVotedPosts(prev => {
      const copy = { ...prev };
      if (optimisticVote) copy[postId] = optimisticVote;
      else delete copy[postId];
      return copy;
    });
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      let up = p.upvotes ?? 0;
      let dn = p.downvotes ?? 0;
      if (prevVote === 'up') up = Math.max(0, up - 1);
      if (prevVote === 'down') dn = Math.max(0, dn - 1);
      if (optimisticVote === 'up') up++;
      if (optimisticVote === 'down') dn++;
      return { ...p, upvotes: up, downvotes: dn };
    }));
    if (expandedPost?.id === postId) {
      setExpandedPost(prev => {
        if (!prev) return prev;
        let up = prev.upvotes ?? 0;
        let dn = prev.downvotes ?? 0;
        if (prevVote === 'up') up = Math.max(0, up - 1);
        if (prevVote === 'down') dn = Math.max(0, dn - 1);
        if (optimisticVote === 'up') up++;
        if (optimisticVote === 'down') dn++;
        return { ...prev, upvotes: up, downvotes: dn };
      });
    }

    try {
      // Calculate Firestore delta values based on prevVote and optimisticVote
      let upvoteDelta = 0;
      let downvoteDelta = 0;
      if (prevVote === 'up') upvoteDelta--;
      if (prevVote === 'down') downvoteDelta--;
      if (optimisticVote === 'up') upvoteDelta++;
      if (optimisticVote === 'down') downvoteDelta++;

      // Update Firestore
      await votePostFS(postId, upvoteDelta, downvoteDelta);
      // Save vote status in localStorage
      setLocalVote(uid, postId, optimisticVote);

      // Re-sync from server to get accurate counts
      await loadPosts();
      if (expandedPost?.id === postId) {
        const fresh = await getPostsFS('all').then(all => all.find(p => p.id === postId));
        if (fresh) setExpandedPost(fresh);
      }
    } catch (err) {
      console.error('Vote error:', err);
      // Revert optimistic update on failure
      setVotedPosts(prev => {
        const copy = { ...prev };
        if (prevVote) copy[postId] = prevVote;
        else delete copy[postId];
        return copy;
      });
      await loadPosts();
    }
  };

  const handleMarkHelpful = async (postId, commentId) => {
    try {
      await markHelpfulFS(postId, commentId);
      const freshComments = await getPostCommentsFS(postId);
      setComments(freshComments);
      await loadPosts();
      window.dispatchEvent(new CustomEvent('xp-updated'));
    } catch (err) {
      console.error('Mark helpful error:', err);
    }
  };

  const handleJoinToggle = async (clanId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      window.dispatchEvent(new CustomEvent('trigger-auth'));
      return;
    }
    const isJoined = joinedClans.includes(clanId);
    
    // Update local storage and local state immediately!
    const updated = toggleJoinClan(clanId);
    setJoinedClans(updated);
    window.dispatchEvent(new CustomEvent('clans-updated'));

    try {
      if (isJoined) {
        await leaveClanFS(uid, clanId);
      } else {
        await joinClanFS(uid, clanId);
      }
    } catch (err) {
      console.error('Clan join/leave error:', err);
    }
  };

  const handleUpdateClan = async (e) => {
    e.preventDefault();
    if (!editClanDescription.trim()) {
      setEditClanError('Description cannot be empty.');
      return;
    }
    // Validate video URL if provided
    if (editClanBgVideoUrl && !/^https?:\/\//i.test(editClanBgVideoUrl)) {
      setEditClanError('Video URL must start with http:// or https://');
      return;
    }
    try {
      await updateClanFS(currentClan.id, {
        description: editClanDescription.trim(),
        color: editClanColor,
        emoji: editClanEmoji,
        logoUrl: editClanLogoUrl,
        logo: editClanLogoUrl,
        bannerUrl: editClanBannerUrl,
        bgVideoUrl: editClanBgVideoUrl.trim() || '',
        rules: editClanRulesText.split('\n').map(r => r.trim()).filter(Boolean)
      });
      setShowEditClanModal(false);
      window.dispatchEvent(new CustomEvent('clans-updated'));
    } catch (err) {
      console.error('Update clan error:', err);
      setEditClanError('Failed to update community settings: ' + (err.message || ''));
    }
  };


  const getRelativeTime = (isoString) => {
    // eslint-disable-next-line react-hooks/purity
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
  };

  const renderThreadDetail = () => {
    if (!expandedPost) return null;
    
    return (
      <div className="thread-detail-container fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '8px' }}>
          <button 
            className="reddit-capsule-btn secondary"
            style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => { setExpandedPost(null); setCommentError(''); }}
          >
            ← Back to Feed
          </button>
        </div>

        {/* Primary Post */}
        <div className="reddit-post-card">
          <div className="reddit-post-header" style={{ padding: '16px 16px 0 16px', marginBottom: '8px' }}>
            <span className="pod-icon-label">p/{expandedPost.pod}</span>
            <span>•</span>
            <span className="reddit-author-u">Posted by u/{expandedPost.username}</span>
            <span>{getRelativeTime(expandedPost.timestamp)}</span>
          </div>

          <h2 style={{ fontSize: '1.35rem', color: 'white', margin: '12px 0 14px 0', padding: '0 16px', fontFamily: 'var(--font-sans)', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: '1.4' }}>
            {expandedPost.title}
          </h2>
          {expandedPost.imageUrl && (
            <div className="reddit-post-image-wrapper" style={{ padding: '0 16px', marginBottom: '16px', borderRadius: '12px', overflow: 'hidden' }}>
              <img 
                src={expandedPost.imageUrl} 
                alt={expandedPost.title} 
                style={{ width: '100%', maxHeight: '500px', objectFit: 'contain', background: '#090c15', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'block' }} 
              />
            </div>
          )}

          <p style={{ fontSize: '0.925rem', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '20px', padding: '0 16px' }}>
            {expandedPost.content}
          </p>

          <div className="reddit-pill-group" style={{ padding: '0 16px 16px 16px' }}>
            <div className="reddit-vote-pill">
              <button 
                onClick={() => handleVote(expandedPost.id, 'up')}
                className="reddit-vote-btn upvote"
                style={{ color: votedPosts[expandedPost.id] === 'up' ? 'var(--color-accent)' : 'var(--text-secondary)' }}
              >
                <ArrowUp size={16} />
              </button>
              <span className="reddit-vote-count">{expandedPost.upvotes}</span>
              <button 
                onClick={() => handleVote(expandedPost.id, 'down')}
                className="reddit-vote-btn downvote"
                style={{ color: votedPosts[expandedPost.id] === 'down' ? 'var(--color-danger)' : 'var(--text-secondary)' }}
              >
                <ArrowDown size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginTop: '12px' }}>
          Comments ({comments.length})
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {comments.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'var(--bg-secondary)', border: 'var(--reddit-border)', borderRadius: '12px' }}>
              No responses yet. Share your clinical or supportive advice.
            </div>
          ) : (
            comments.map(comment => (
              <div 
                key={comment.id} 
                className="reddit-post-card" 
                style={{ 
                  padding: '12px 16px', 
                  background: comment.helpedCount > 0 ? 'rgba(16, 185, 129, 0.02)' : 'var(--bg-secondary)',
                  borderColor: comment.helpedCount > 0 ? 'rgba(16, 185, 129, 0.15)' : 'var(--glass-border)' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: 'white' }}>u/{comment.username}</span>
                  <span>{getRelativeTime(comment.timestamp)}</span>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: '1.4', marginBottom: '10px' }}>
                  {comment.text}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Score: {comment.upvotes}
                  </span>

                  <button 
                    className="reddit-action-pill"
                    style={{ 
                      fontSize: '0.65rem', 
                      color: comment.helpedCount > 0 ? 'var(--color-success-light)' : 'var(--text-secondary)',
                      background: comment.helpedCount > 0 ? 'rgba(16, 185, 129, 0.08)' : 'var(--reddit-pill-bg)'
                    }}
                    onClick={() => handleMarkHelpful(expandedPost.id, comment.id)}
                  >
                    <BookmarkCheck size={12} />
                    {comment.helpedCount > 0 ? `Helpful (${comment.helpedCount})` : 'This helped me'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
          <textarea
            value={commentText}
            onChange={e => { setCommentText(e.target.value); setCommentError(''); }}
            placeholder="Write a supportive reply..."
            rows={3}
            style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '12px', outline: 'none', resize: 'none', fontSize: '0.85rem' }}
          />

          {commentError && (
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '6px', color: 'var(--color-danger)', fontSize: '0.75rem' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{commentError}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ alignSelf: 'flex-end', padding: '8px 16px', fontSize: '0.8rem' }}
            disabled={!commentText.trim()}
          >
            Reply
          </button>
        </form>
      </div>
    );
  };


  return (
    <div className="forum-container fade-in">
      {/* CASE 1: SPECIFIC SUBFORUM COMMUNITY PAGE */}
      {currentClan ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Subforum Header Banner & Meta */}
          <div className="subforum-header-card">
            <div 
              className="subforum-banner" 
              style={{ 
                background: !currentClan.bgVideoUrl && currentClan.bannerUrl 
                  ? `url(${currentClan.bannerUrl}) no-repeat center center / cover`
                  : !currentClan.bgVideoUrl
                    ? currentClan.color || 'var(--color-accent)'
                    : '#0d0e14',
                position: 'relative',
                overflow: 'hidden',
                height: currentClan.bgVideoUrl ? 'auto' : '140px',
                aspectRatio: currentClan.bgVideoUrl ? '16 / 9' : 'auto',
                maxHeight: currentClan.bgVideoUrl ? '320px' : 'none'
              }}
            >
              {currentClan.bgVideoUrl && (
                <video
                  key={currentClan.bgVideoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center center',
                    zIndex: 0,
                    display: 'block'
                  }}
                >
                  <source src={currentClan.bgVideoUrl} />
                </video>
              )}
              <div className="banner-grid-overlay" style={{ position: 'relative', zIndex: 1 }}></div>
            </div>
            
            <div className="subforum-header-row">
              <div className="subforum-header-left">
                <div 
                  className="subforum-avatar-circle" 
                  style={{ 
                    background: (currentClan.logo || currentClan.logoUrl) ? 'transparent' : `linear-gradient(135deg, ${currentClan.color}30, ${currentClan.color}70)`, 
                    border: `4px solid var(--bg-secondary)`, 
                    color: '#fff',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {(currentClan.logo || currentClan.logoUrl) ? (
                    <img src={currentClan.logo || currentClan.logoUrl} alt={currentClan.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span className="subforum-avatar-emoji">{currentClan.emoji}</span>
                  )}
                </div>
                
                <div className="subforum-meta-info">
                  <div className="subforum-title-wrapper">
                    <h2>p/{currentClan.id}</h2>
                    <span className="reddit-snoo-smile" title="Verified Recovery Circle">👽</span>
                    {currentClan.mature && <span className="mature-badge">18+</span>}
                    
                    <div className="subforum-actions-inline">
                      <button 
                        className="reddit-capsule-btn secondary"
                        onClick={() => {
                          setTargetPod(currentClan.id);
                          triggerCreatePost();
                        }}
                      >
                        <Plus size={14} /> Create Post
                      </button>
                      
                      <button 
                        className={`reddit-capsule-btn primary ${isJoined ? 'joined' : ''}`}
                        onClick={() => handleJoinToggle(currentClan.id)}
                      >
                        {isJoined ? (
                          <>
                            <Check size={14} /> Joined
                          </>
                        ) : (
                          'Join'
                        )}
                      </button>

                      <button className="reddit-more-btn" title="More options">
                        •••
                      </button>

                      {currentClan.creatorUid === (user?.uid || auth.currentUser?.uid) && (
                        <button 
                          className="reddit-capsule-btn secondary"
                          style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}
                          onClick={() => {
                            setEditClanDescription(currentClan.description || '');
                            setEditClanColor(currentClan.color || '#ff4500');
                            setEditClanEmoji(currentClan.emoji || '👥');
                            setEditClanLogoUrl(currentClan.logo || currentClan.logoUrl || '');
                            setEditClanBannerUrl(currentClan.bannerUrl || '');
                            setEditClanBgVideoUrl(currentClan.bgVideoUrl || '');
                            setEditClanRulesText(currentClan.rules ? currentClan.rules.join('\n') : 'Keep posts clinical and recovery-focused.\nAvoid triggering descriptions or explicit detailing.\nPractice active, non-judgmental support.');
                            setEditClanError('');
                            setShowEditClanModal(true);
                          }}
                        >
                          ⚙️ Mod Settings
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="subforum-stats-line">
                    <span className="stat-count">{displayMemberCount} {displayMemberCount === 1 ? 'member' : 'members'}</span>
                    <span className="stat-separator">•</span>
                    <span className="stat-status-dot"></span>
                    <span className="stat-online">{realOnlineCount} online</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Subforum 2-Column Grid */}
          <div className="subforum-layout-grid">
            {/* Left Column: Post list */}
            <div className="subforum-feed-col">
              {expandedPost ? (
                renderThreadDetail()
              ) : (
                <>
                  <div className="subforum-sort-bar">
                    <button 
                      className={`subforum-sort-btn ${sortOrder === 'hot' ? 'active' : ''}`}
                      onClick={() => setSortOrder('hot')}
                    >
                      Best
                    </button>
                    <button 
                      className={`subforum-sort-btn ${sortOrder === 'new' ? 'active' : ''}`}
                      onClick={() => setSortOrder('new')}
                    >
                      New
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {posts.length === 0 ? (
                      <div className="reddit-post-card" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {searchQuery ? 'No results found matching your query.' : 'No threads in this pod yet. Start a discussion!'}
                      </div>
                    ) : (
                      posts.map(post => {
                        const userVote = votedPosts[post.id];
                        return (
                          <div 
                            key={post.id} 
                            className="reddit-post-card" 
                            style={{ cursor: 'pointer' }}
                            onClick={() => setExpandedPost(post)}
                          >
                            <div className="reddit-post-header">
                              <div className="reddit-post-avatar-placeholder" style={{ background: (currentClan.logo || currentClan.logoUrl) ? 'transparent' : `${currentClan.color}20`, border: `1px solid ${currentClan.color}40`, color: currentClan.color, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {(currentClan.logo || currentClan.logoUrl) ? (
                                  <img src={currentClan.logo || currentClan.logoUrl} alt={currentClan.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  currentClan.emoji
                                )}
                              </div>
                              <span className="pod-icon-label">p/{post.pod}</span>
                              <span>•</span>
                              <span className="reddit-author-u">Posted by u/{post.username}</span>
                              <span>{getRelativeTime(post.timestamp)}</span>
                            </div>
                            <h3 className="reddit-post-title">
                              {post.title}
                            </h3>
                            <p className="reddit-post-body-text">
                              {post.content}
                            </p>
                            {post.imageUrl && (
                              <div style={{ padding: '0 16px 8px 16px', borderRadius: '8px', overflow: 'hidden' }}>
                                <img 
                                  src={post.imageUrl} 
                                  alt={post.title} 
                                  style={{ width: '100%', maxHeight: '350px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--glass-border)', display: 'block' }} 
                                />
                              </div>
                            )}
                            <div className="reddit-pill-group" onClick={e => e.stopPropagation()}>
                              <div className="reddit-vote-pill">
                                <button 
                                  onClick={() => handleVote(post.id, 'up')}
                                  className="reddit-vote-btn upvote"
                                  style={{ color: userVote === 'up' ? 'var(--color-accent)' : 'var(--text-secondary)' }}
                                >
                                  <ArrowUp size={16} />
                                </button>
                                <span className="reddit-vote-count">{post.upvotes}</span>
                                <button 
                                  onClick={() => handleVote(post.id, 'down')}
                                  className="reddit-vote-btn downvote"
                                  style={{ color: userVote === 'down' ? '#7193ff' : 'var(--text-secondary)' }}
                                >
                                  <ArrowDown size={16} />
                                </button>
                              </div>
                              <button className="reddit-action-pill" onClick={() => setExpandedPost(post)}>
                                <MessageSquare size={14} />
                                <span>{post.comments?.length || 0} Comments</span>
                              </button>
                              <button className="reddit-action-pill" title="Share" onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert('Link copied to clipboard!');
                              }}>
                                <Share2 size={14} />
                                <span>Share</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right Column: About Card */}
            <div className="subforum-sidebar-col">
              <div className="subforum-about-card">
                <div 
                  className="subforum-about-banner" 
                  style={{ 
                    height: '60px', 
                    background: currentClan.bannerUrl 
                      ? `url(${currentClan.bannerUrl}) no-repeat center center / cover`
                      : `linear-gradient(135deg, ${currentClan.color}dd 0%, #15131a 100%)`, 
                    position: 'relative' 
                  }}
                >
                  <span style={{ position: 'absolute', bottom: '8px', left: '16px', fontSize: '1.4rem' }}>
                    {(currentClan.logo || currentClan.logoUrl) ? (
                      <img src={currentClan.logo || currentClan.logoUrl} alt={currentClan.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--bg-secondary)', verticalAlign: 'middle' }} />
                    ) : (
                      currentClan.emoji
                    )}
                  </span>
                </div>
                <div className="about-card-body">
                  <span className="about-card-title-sub" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>About Circle</span>
                  <h3 style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, margin: '2px 0 8px 0' }}>p/{currentClan.id}</h3>
                  <p className="about-desc">{currentClan.description}</p>
                  
                  {/* Two-Column Stats Grid matching Reddit */}
                  <div className="about-stats-row">
                    <div className="about-stat-box">
                      <span className="about-stat-num">{displayMemberCount}</span>
                      <span className="about-stat-label">{displayMemberCount === 1 ? 'member' : 'members'}</span>
                    </div>
                    <div className="about-stat-box">
                      <span className="about-stat-num" style={{ color: '#10b981' }}>{realOnlineCount}</span>
                      <span className="about-stat-label">online</span>
                    </div>
                  </div>

                  <div className="about-metadata-list">
                    <div className="about-metadata-item">
                      <span className="icon">📅</span>
                      <span>Created {currentClan.createdAt ? new Date(currentClan.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Jun 1, 2026'}</span>
                    </div>
                    <div className="about-metadata-item">
                      <span className="icon">🔒</span>
                      <span style={{ textTransform: 'capitalize' }}>{currentClan.privacy || 'Public'} Community</span>
                    </div>
                    <div className="about-metadata-item">
                      <span className="icon">🏷️</span>
                      <span>Category: {currentClan.category}</span>
                    </div>
                  </div>

                  <div className="about-guidelines">
                    <strong>Community Rules</strong>
                    <ul>
                      {currentClan.rules && currentClan.rules.length > 0 ? (
                        currentClan.rules.map((rule, idx) => (
                          <li key={idx}>{rule}</li>
                        ))
                      ) : (
                        <>
                          <li>Keep posts clinical and recovery-focused.</li>
                          <li>Avoid triggering descriptions or explicit detailing.</li>
                          <li>Practice active, non-judgmental support.</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CASE 2: MAIN FEED (All Discussions) */
        <div className="subforum-layout-grid">
          {/* Left Column: Feed content */}
          <div className="subforum-feed-col">
            {expandedPost ? (
              renderThreadDetail()
            ) : (
              <>
                {/* Create Post Card */}
                <div className="create-post-card">
                  <div className="create-post-avatar">
                    <span style={{ fontSize: '1.1rem' }}>🧠</span>
                  </div>
                  <button
                    className="create-post-input-fake"
                    onClick={triggerCreatePost}
                  >
                    Create Post
                  </button>
                  <button
                    className="create-post-icon-btn"
                    onClick={triggerCreatePost}
                    title="Add Image"
                  >
                    🖼
                  </button>
                  <button
                    className="create-post-icon-btn"
                    onClick={triggerCreatePost}
                    title="Add Link"
                  >
                    🔗
                  </button>
                </div>

                {/* Feed Sort Bar */}
                <div className="feed-sort-bar">
                  <button
                    className={`feed-sort-pill ${sortOrder === 'hot' ? 'active' : ''}`}
                    onClick={() => setSortOrder('hot')}
                  >
                    🔥 Best
                  </button>
                  <button
                    className={`feed-sort-pill ${sortOrder === 'new' ? 'active' : ''}`}
                    onClick={() => setSortOrder('new')}
                  >
                    ✨ New
                  </button>
                </div>

                {/* FEED POSTS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {posts.length === 0 ? (
                    <div className="reddit-post-card" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {searchQuery ? 'No results found matching your query.' : 'No threads in this pod yet. Start a discussion!'}
                    </div>
                  ) : (
                    posts.map(post => {
                      const userVote = votedPosts[post.id];
                      // Find post category color and emoji
                      const matchedClan = clansList.find(c => c.id === post.pod);
                      const postColor = matchedClan?.color || 'var(--color-accent)';
                      const postEmoji = matchedClan?.emoji || '👽';
                      return (
                        <div 
                          key={post.id} 
                          className="reddit-post-card" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setExpandedPost(post)}
                        >
                          <div className="reddit-post-header">
                             <div className="reddit-post-avatar-placeholder" style={{ background: (matchedClan?.logo || matchedClan?.logoUrl) ? 'transparent' : `${postColor}20`, border: `1px solid ${postColor}40`, color: postColor, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {(matchedClan?.logo || matchedClan?.logoUrl) ? (
                                <img src={matchedClan.logo || matchedClan.logoUrl} alt={matchedClan.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                postEmoji
                              )}
                            </div>
                            <span className="pod-icon-label">p/{post.pod}</span>
                            <span>•</span>
                            <span className="reddit-author-u">Posted by u/{post.username}</span>
                            <span>{getRelativeTime(post.timestamp)}</span>
                          </div>

                          <h3 className="reddit-post-title">
                            {post.title}
                          </h3>

                          <p className="reddit-post-body-text">
                            {post.content}
                          </p>
                          {post.imageUrl && (
                            <div style={{ padding: '0 16px 8px 16px', borderRadius: '8px', overflow: 'hidden' }}>
                              <img 
                                src={post.imageUrl} 
                                alt={post.title} 
                                style={{ width: '100%', maxHeight: '350px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--glass-border)', display: 'block' }} 
                              />
                            </div>
                          )}
                          <div className="reddit-pill-group" onClick={e => e.stopPropagation()}>
                            <div className="reddit-vote-pill">
                              <button 
                                onClick={() => handleVote(post.id, 'up')}
                                className="reddit-vote-btn upvote"
                                style={{ color: userVote === 'up' ? 'var(--color-accent)' : 'var(--text-secondary)' }}
                              >
                                <ArrowUp size={16} />
                              </button>
                              <span className="reddit-vote-count">{post.upvotes}</span>
                              <button 
                                onClick={() => handleVote(post.id, 'down')}
                                className="reddit-vote-btn downvote"
                                style={{ color: userVote === 'down' ? '#7193ff' : 'var(--text-secondary)' }}
                              >
                                <ArrowDown size={16} />
                              </button>
                            </div>
                            <button className="reddit-action-pill" onClick={() => setExpandedPost(post)}>
                              <MessageSquare size={14} />
                              <span>{post.comments?.length || 0} Comments</span>
                            </button>
                            <button className="reddit-action-pill" title="Share" onClick={() => {
                              navigator.clipboard.writeText(window.location.href);
                              alert('Link copied to clipboard!');
                            }}>
                              <Share2 size={14} />
                              <span>Share</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Column: Home Feed General Sidebar */}
          <div className="subforum-sidebar-col">
            <div className="subforum-about-card">
              <div 
                className="subforum-about-banner" 
                style={{ 
                  height: '60px', 
                  background: 'linear-gradient(135deg, var(--color-accent) 0%, #1b2336 100%)',
                  position: 'relative'
                }}
              >
                <span style={{ position: 'absolute', bottom: '8px', left: '16px', fontSize: '1.5rem' }}>🏆</span>
              </div>
              <div className="about-card-body" style={{ paddingTop: '12px' }}>
                <span className="about-card-title-sub" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Community Dashboard</span>
                <h3 style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, margin: '2px 0 8px 0' }}>Home Feed</h3>
                <p className="about-desc">
                  Welcome to your personalized recovery portal. Track your progress, join discussions, check in with peers, and access tools designed to build neurochemical strength.
                </p>
                
                {/* User Streak Box */}
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '12px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current Streak</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-warning)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      🔥 {getStreakMetrics().current} Days
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Longest Streak</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white' }}>
                      {getStreakMetrics().longest} Days
                    </span>
                  </div>
                </div>

                <div className="about-details" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px' }}>
                  <div className="about-detail-item">
                    <span className="label">Joined Circles</span>
                    <span className="value">{joinedClans.length} Pods</span>
                  </div>
                  
                  <div className="about-detail-item" style={{ marginTop: '10px' }}>
                    <span className="label">Clans Available</span>
                    <span className="value">{clansList.length} Total</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                  <button 
                    className="reddit-capsule-btn primary" 
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={triggerCreatePost}
                  >
                    Create Post
                  </button>
                  <button 
                    className="reddit-capsule-btn secondary" 
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'clan' }));
                    }}
                  >
                    Explore Clans
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Recovery Links */}
            <div className="subforum-about-card" style={{ marginTop: '16px' }}>
              <div className="about-card-header">
                <span>Recovery Resources</span>
              </div>
              <div className="about-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a href="#journal" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'journal' })); }}>
                  📖 Reflector Journal
                </a>
                <a href="#chat" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'chat' })); }}>
                  💬 Public Peer Chatbox
                </a>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* NEW POST MODAL */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7, 10, 18, 0.95)',
          zIndex: 1500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '24px', position: 'relative' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: '16px' }}>Start a Discussion</h3>
            
            <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Select Community Clan</label>
                <select
                  value={targetPod}
                  onChange={e => setTargetPod(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', outline: 'none' }}
                >
                  {(clansList.length > 0 ? clansList : DEFAULT_CLANS).filter(p => p.id !== 'neural-rewirers').map(p => (
                    <option key={p.id} value={p.id} style={{ background: '#121826', color: 'white' }}>
                      p/{p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Title</label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={e => { setPostTitle(e.target.value); setPostError(''); }}
                  placeholder="Summarize your post topic"
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Body Content</label>
                <textarea
                  value={postContent}
                  onChange={e => { setPostContent(e.target.value); setPostError(''); }}
                  placeholder="Share your thoughts. Keep it clinical, scientific, or supportive. Avoid explicit details."
                  rows={5}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', outline: 'none', resize: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Add Image (Optional)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                    id="post-image-file-input"
                  />
                  <label
                    htmlFor="post-image-file-input"
                    style={{
                      padding: '8px 14px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      color: 'white',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    📷 Choose Image File
                  </label>
                  {postImageUrl && (
                    <button
                      type="button"
                      onClick={() => setPostImageUrl('')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-danger)',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                {postImageUrl && (
                  <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', maxWidth: '200px', maxHeight: '120px' }}>
                    <img src={postImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              {postError && (
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', color: 'var(--color-danger)', fontSize: '0.75rem' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{postError}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Post Thread
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLAN SETTINGS MODAL */}
      {showEditClanModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7, 10, 18, 0.95)',
          zIndex: 1500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '24px', position: 'relative', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: '16px' }}>Mod Settings: p/{currentClan.id}</h3>
            
            <form onSubmit={handleUpdateClan} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Community Icon (Emoji)</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {['👥', '⚡', '🌐', '🛡️', '🏆', '🌸', '🌈', '🔬', '🧘', '🧠', '🌱', '💪'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditClanEmoji(emoji)}
                      style={{
                        padding: '6px 10px',
                        background: editClanEmoji === emoji ? 'rgba(255, 69, 0, 0.15)' : 'var(--bg-tertiary)',
                        border: editClanEmoji === emoji ? '2px solid var(--color-accent)' : '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        fontSize: '1.25rem',
                        cursor: 'pointer'
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Theme Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {['#ff4500', '#3b82f6', '#10b981', '#ec4899', '#a855f7', '#06b6d4'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditClanColor(color)}
                      style={{
                        width: '32px',
                        height: '32px',
                        background: color,
                        border: editClanColor === color ? '3px solid white' : '1px solid rgba(0,0,0,0.3)',
                        borderRadius: '50%',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Custom Logo Image (Overrides Emoji)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    style={{ display: 'none' }}
                    id="edit-clan-logo-file"
                  />
                  <label
                    htmlFor="edit-clan-logo-file"
                    style={{
                      padding: '8px 14px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      color: 'white',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    📷 Select Logo File
                  </label>
                  {editClanLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setEditClanLogoUrl('')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
                {editClanLogoUrl && (
                  <div style={{ marginTop: '8px', width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                    <img src={editClanLogoUrl} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Custom Banner Image (Overrides Color)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    style={{ display: 'none' }}
                    id="edit-clan-banner-file"
                  />
                  <label
                    htmlFor="edit-clan-banner-file"
                    style={{
                      padding: '8px 14px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      color: 'white',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    🖼️ Select Banner File
                  </label>
                  {editClanBannerUrl && (
                    <button
                      type="button"
                      onClick={() => setEditClanBannerUrl('')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Remove Banner
                    </button>
                  )}
                </div>
                {editClanBannerUrl && (
                  <div style={{ marginTop: '8px', width: '120px', height: '50px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                    <img src={editClanBannerUrl} alt="Banner Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              {/* BG Video URL */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>🎬 Background Video URL (16:9 · loops)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="url"
                    value={editClanBgVideoUrl}
                    onChange={e => setEditClanBgVideoUrl(e.target.value)}
                    placeholder="https://example.com/my-clip.mp4"
                    style={{ flex: 1, padding: '9px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', outline: 'none', fontSize: '0.82rem' }}
                  />
                  {editClanBgVideoUrl && (
                    <button
                      type="button"
                      onClick={() => setEditClanBgVideoUrl('')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0 }}
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>
                {editClanBgVideoUrl && editClanBgVideoUrl.startsWith('http') && (
                  <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', aspectRatio: '16/9', maxWidth: '240px' }}>
                    <video
                      key={editClanBgVideoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    >
                      <source src={editClanBgVideoUrl} />
                    </video>
                  </div>
                )}
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.4 }}>
                  Paste a direct link to an .mp4 or .webm video (max 5 sec, 16:9). It will loop silently as the banner background.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Description</label>
                <textarea
                  value={editClanDescription}
                  onChange={e => setEditClanDescription(e.target.value)}
                  placeholder="Describe your community..."
                  rows={3}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', outline: 'none', resize: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Community Rules (one per line)</label>
                <textarea
                  value={editClanRulesText}
                  onChange={e => setEditClanRulesText(e.target.value)}
                  placeholder="Keep posts recovery-focused.&#10;Practice support.&#10;No explicit talk."
                  rows={4}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', outline: 'none', resize: 'none', fontSize: '0.85rem' }}
                />
              </div>

              {editClanError && (
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', color: 'var(--color-danger)', fontSize: '0.75rem' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{editClanError}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }} 
                  onClick={() => setShowEditClanModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* SUBFORUM SPECIFIC STYLES */}
      <style>{`
        .forum-container {
          color: #e0e0e2;
          font-family: var(--font-sans);
        }

        .subforum-actions-inline {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: 16px;
        }

        .about-stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding-bottom: 14px;
        }

        .about-stat-box {
          display: flex;
          flex-direction: column;
        }

        .about-stat-num {
          font-size: 1.15rem;
          font-weight: 700;
          color: white;
        }

        .about-stat-label {
          font-size: 0.72rem;
          color: var(--text-muted);
          text-transform: capitalize;
        }

        .about-metadata-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;
        }

        .about-metadata-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        /* ── Create Post Card ── */
        .create-post-card {
          background: var(--bg-secondary);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: border-color 0.2s ease;
        }
        .create-post-card:hover {
          border-color: rgba(255,255,255,0.15);
        }
        .create-post-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1b2336, #2a3a5a);
          border: 2px solid rgba(255,69,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .create-post-input-fake {
          flex: 1;
          background: var(--bg-tertiary);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          padding: 9px 16px;
          color: var(--text-muted);
          font-size: 0.88rem;
          font-family: var(--font-sans);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
        }
        .create-post-input-fake:hover {
          background: #222d44;
          border-color: rgba(255,255,255,0.12);
          color: var(--text-secondary);
        }
        .create-post-icon-btn {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.06);
          color: var(--text-secondary);
          font-size: 1.1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .create-post-icon-btn:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.15);
        }

        /* ── Feed Sort Bar ── */
        .feed-sort-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 0;
        }
        .feed-sort-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: var(--bg-secondary);
          border: 1px solid rgba(255,255,255,0.06);
          color: var(--text-secondary);
          font-size: 0.82rem;
          font-weight: 700;
          padding: 7px 16px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .feed-sort-pill:hover {
          background: var(--bg-tertiary);
          color: white;
          border-color: rgba(255,255,255,0.15);
        }
        .feed-sort-pill.active {
          background: rgba(255,69,0,0.12);
          color: #ff6633;
          border-color: rgba(255,69,0,0.25);
        }

        .subforum-header-card {
          background: var(--bg-secondary);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 8px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        }

        .subforum-banner {
          height: 140px;
          width: 100%;
          position: relative;
          overflow: hidden;
          background: #0d0e14;
        }

        .subforum-banner::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%);
          z-index: 2;
          pointer-events: none;
        }

        .banner-grid-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.08;
          background-image: radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px);
          background-size: 24px 24px;
          z-index: 1;
        }

        .subforum-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px 20px 24px;
          gap: 20px;
          position: relative;
        }

        .subforum-header-left {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .subforum-avatar-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: -44px;
          z-index: 10;
          flex-shrink: 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }

        .subforum-avatar-emoji {
          font-size: 2.4rem;
          line-height: 1;
        }

        .subforum-meta-info {
          display: flex;
          flex-direction: column;
          margin-top: 12px;
        }

        .subforum-title-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .subforum-title-wrapper h2 {
          font-family: var(--font-display);
          font-size: 1.7rem;
          font-weight: 800;
          color: white;
          margin: 0;
          letter-spacing: -0.04em;
        }

        .reddit-snoo-smile {
          font-size: 1.3rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        .subforum-stats-line {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 5px;
        }

        .stat-count {
          font-weight: 700;
          color: white;
        }

        .stat-separator {
          color: var(--text-muted);
        }

        .stat-status-dot {
          width: 7px;
          height: 7px;
          background: #10b981;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px #10b981;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .stat-online {
          color: #10b981;
          font-weight: 600;
        }

        .subforum-actions-group {
          margin-top: 14px;
          display: flex;
          gap: 10px;
          align-items: center;
        }

        /* Reddit capsule buttons */
        .reddit-capsule-btn {
          border-radius: 9999px;
          font-family: var(--font-sans);
          font-size: 0.85rem;
          font-weight: 700;
          padding: 9px 22px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          outline: none;
          letter-spacing: 0.01em;
        }

        .reddit-capsule-btn.primary {
          background: #ff4500;
          color: white;
          box-shadow: 0 2px 8px rgba(255,69,0,0.3);
        }

        .reddit-capsule-btn.primary:hover {
          background: #ff5f1f;
          box-shadow: 0 4px 16px rgba(255, 69, 0, 0.45);
          transform: translateY(-1px);
        }

        .reddit-capsule-btn.primary.joined {
          background: transparent;
          border-color: rgba(255, 255, 255, 0.2);
          color: var(--text-secondary);
          box-shadow: none;
        }

        .reddit-capsule-btn.primary.joined:hover {
          border-color: #ef4444;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
          box-shadow: none;
          transform: none;
        }

        .reddit-capsule-btn.secondary {
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: white;
        }

        .reddit-capsule-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.13);
          border-color: rgba(255, 255, 255, 0.22);
          transform: translateY(-1px);
        }

        .reddit-more-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.09);
          color: var(--text-secondary);
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.2s ease;
          letter-spacing: 2px;
        }

        .reddit-more-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: white;
          border-color: rgba(255, 255, 255, 0.2);
        }

        /* ═══ Post Cards ═══ */
        .reddit-post-card {
          background: var(--bg-secondary);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 0;
          display: flex;
          flex-direction: column;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          overflow: hidden;
        }

        .reddit-post-card:hover {
          border-color: rgba(255, 255, 255, 0.14);
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
        }

        /* Inner padding wrapper inside the post card */
        .reddit-post-card > .reddit-post-header,
        .reddit-post-card > h2,
        .reddit-post-card > h3,
        .reddit-post-card > p,
        .reddit-post-card > .reddit-pill-group {
          padding-left: 16px;
          padding-right: 16px;
        }

        .reddit-post-header {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 0.74rem;
          color: var(--text-secondary);
          padding: 14px 16px 0 16px;
        }

        .reddit-post-avatar-placeholder {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          flex-shrink: 0;
        }

        .pod-icon-label {
          background: linear-gradient(135deg, rgba(255,69,0,0.15), rgba(255,69,0,0.05));
          color: #ff7043;
          font-weight: 700;
          padding: 2px 9px;
          border-radius: 12px;
          font-size: 0.72rem;
          border: 1px solid rgba(255,69,0,0.2);
          letter-spacing: 0.01em;
        }

        .reddit-author-u {
          font-weight: 500;
          color: var(--text-muted);
          cursor: pointer;
        }
        .reddit-author-u:hover {
          text-decoration: underline;
          color: white;
        }

        .reddit-post-title {
          font-family: var(--font-sans);
          font-size: 1.1rem;
          font-weight: 600;
          color: #e8eaf6;
          padding: 8px 16px 4px 16px;
          line-height: 1.45;
          letter-spacing: -0.01em;
          transition: color 0.15s ease;
          cursor: pointer;
        }

        .reddit-post-card:hover .reddit-post-title {
          color: white;
        }

        .reddit-post-body-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.55;
          padding: 0 16px 0 16px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* ── Action bar (pills row) ── */
        .reddit-pill-group {
          display: flex;
          gap: 4px;
          padding: 10px 12px 12px 12px;
          border-top: 1px solid rgba(255,255,255,0.04);
          margin-top: 12px;
          background: rgba(0,0,0,0.08);
        }

        .reddit-vote-pill {
          display: inline-flex;
          align-items: center;
          background: rgba(255,255,255,0.04);
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.06);
          overflow: hidden;
        }

        .reddit-vote-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          padding: 6px 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .reddit-vote-btn.upvote:hover {
          color: #ff4500;
          background: rgba(255, 69, 0, 0.12);
        }

        .reddit-vote-btn.downvote:hover {
          color: #7193ff;
          background: rgba(113, 147, 255, 0.12);
        }

        .reddit-vote-count {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-primary);
          min-width: 20px;
          text-align: center;
          padding: 0 2px;
        }

        .reddit-action-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 0.76rem;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: var(--font-sans);
        }

        .reddit-action-pill:hover {
          background: rgba(255,255,255,0.06);
          color: white;
        }

        .mature-badge {
          font-size: 0.65rem;
          font-weight: 700;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 1px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .subforum-stats-text {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        @media (max-width: 650px) {
          .subforum-header-row {
            flex-direction: column;
            align-items: flex-start;
            padding-bottom: 20px;
          }
          .subforum-actions-group {
            margin-top: 12px;
            width: 100%;
          }
        }

        /* ── 2-Column layout ── */
        .subforum-layout-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 22px;
          align-items: start;
        }

        @media (max-width: 860px) {
          .subforum-layout-grid {
            grid-template-columns: 1fr;
          }
          .subforum-sidebar-col {
            display: none !important;
          }
        }

        .subforum-feed-col {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .subforum-sort-bar {
          display: flex;
          background: var(--bg-secondary);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 4px;
          border-radius: 24px;
          align-self: flex-start;
          gap: 4px;
        }

        .subforum-sort-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 700;
          padding: 6px 18px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: var(--font-sans);
        }
        .subforum-sort-btn:hover {
          color: white;
          background: rgba(255,255,255,0.04);
        }
        .subforum-sort-btn.active {
          background: rgba(255,69,0,0.12);
          color: #ff6633;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }

        /* ── About Card right sidebar ── */
        .subforum-about-card {
          background: var(--bg-secondary);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 16px rgba(0,0,0,0.2);
        }

        .subforum-about-banner {
          position: relative;
        }

        .about-card-header {
          background: rgba(255,255,255,0.03);
          padding: 12px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .about-card-header span {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .about-card-body {
          padding: 18px;
        }

        .about-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.55;
          margin-bottom: 16px;
          word-break: break-word;
        }

        .about-details {
          border-top: 1px solid rgba(255,255,255,0.05);
          padding-top: 14px;
          margin-bottom: 18px;
        }

        .about-detail-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.79rem;
          padding: 3px 0;
        }
        .about-detail-item .label {
          color: var(--text-muted);
        }
        .about-detail-item .value {
          color: white;
          font-weight: 600;
        }

        .about-guidelines {
          border-top: 1px solid rgba(255,255,255,0.05);
          padding-top: 14px;
        }
        .about-guidelines strong {
          font-size: 0.78rem;
          color: var(--text-secondary);
          display: block;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .about-guidelines ul {
          margin: 0;
          padding-left: 16px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .about-guidelines li {
          font-size: 0.77rem;
          color: var(--text-muted);
          line-height: 1.4;
        }
      `}</style>


    </div>
  );
}
