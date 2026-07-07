import { useState } from 'react';
import { Settings, Trash2, CheckCheck, MessageSquare, Award, Users, TrendingUp, Heart } from 'lucide-react';
import { getData } from '../utils/storage';

function generateNotifications() {
  const now = Date.now();
  const min = 60000;
  const hr = 3600000;
  const day = 86400000;

  return [
    {
      id: 'n1',
      type: 'milestone',
      icon: '🧠',
      iconBg: '#ff4500',
      title: `NoCrap — You reached a new milestone!`,
      body: `Your prefrontal cortex is actively strengthening. Keep the streak going — every day counts.`,
      time: now - 38 * min,
      read: false,
    },
    {
      id: 'n2',
      type: 'reply',
      icon: <MessageSquare size={16} color="white" />,
      iconBg: '#3b82f6',
      title: `u/CalmWaves replied to your post in p/science-discussion`,
      body: `"This is exactly what I needed to read today. The ΔFosB explanation really clicked for me."`,
      time: now - 2 * hr,
      read: false,
    },
    {
      id: 'n3',
      type: 'upvote',
      icon: <TrendingUp size={16} color="white" />,
      iconBg: '#10b981',
      title: `Your post in p/success-stories is trending`,
      body: `"90 Days: Resetting the sensitivity baseline" just hit 35 upvotes. The community loves it!`,
      time: now - 5 * hr,
      read: false,
    },
    {
      id: 'n4',
      type: 'badge',
      icon: <Award size={16} color="white" />,
      iconBg: '#eab308',
      title: `New badge unlocked — "Neural Starter"`,
      body: `You earned the Neural Starter badge for completing your first week of recovery. Keep going!`,
      time: now - 1 * day,
      read: true,
    },
    {
      id: 'n5',
      type: 'reply',
      icon: <MessageSquare size={16} color="white" />,
      iconBg: '#3b82f6',
      title: `u/NeuroReset replied to your comment in p/general`,
      body: `"Totally agree. The isolation piece is the hardest part for me too."`,
      time: now - 2 * day,
      read: true,
    },
    {
      id: 'n6',
      type: 'clan',
      icon: <Users size={16} color="white" />,
      iconBg: '#a855f7',
      title: `SteadySteps sent a flare in Neural Rewirers`,
      body: `"Cravings are hitting hard tonight. Could use some words of encouragement."`,
      time: now - 3 * day,
      read: true,
    },
    {
      id: 'n7',
      type: 'helpful',
      icon: <Heart size={16} color="white" />,
      iconBg: '#ec4899',
      title: `Your reply was marked "This helped me" by 3 people`,
      body: `Your comment in p/relapse-support is making a real difference for others in recovery.`,
      time: now - 5 * day,
      read: true,
    },
  ];
}

function getRelativeTime(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

export default function Notifications() {
  const user = getData('USER');

  const [notifications, setNotifications] = useState(() => generateNotifications(user?.username || 'You'));

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotif = (id, e) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="notif-page">
      {/* Page Header */}
      <div className="notif-page-header">
        <div className="notif-title-row">
          <h1>Notifications</h1>
          {unreadCount > 0 && (
            <span className="notif-unread-badge">{unreadCount}</span>
          )}
        </div>
        <div className="notif-header-actions">
          <button className="notif-action-btn" onClick={markAllRead} title="Mark all as read">
            <CheckCheck size={16} />
            <span>Mark all as read</span>
          </button>
          <button className="notif-action-btn icon-only" title="Settings">
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="notif-divider" />

      {/* Notification List */}
      {notifications.length === 0 ? (
        <div className="notif-empty">
          <span style={{ fontSize: '2.5rem' }}>🔔</span>
          <h3>You're all caught up!</h3>
          <p>New activity from your clans and posts will appear here.</p>
        </div>
      ) : (
        <div className="notif-list">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`notif-item ${!n.read ? 'unread' : ''}`}
              onClick={() => markRead(n.id)}
            >
              {/* Unread dot */}
              <div className="notif-unread-dot-col">
                {!n.read && <span className="notif-unread-dot" />}
              </div>

              {/* Icon avatar */}
              <div
                className="notif-icon-avatar"
                style={{ background: typeof n.iconBg === 'string' ? n.iconBg : '#333' }}
              >
                {typeof n.icon === 'string' ? (
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>{n.icon}</span>
                ) : (
                  n.icon
                )}
              </div>

              {/* Content */}
              <div className="notif-content">
                <p className="notif-item-title">{n.title}</p>
                <p className="notif-item-body">{n.body}</p>
                <span className="notif-item-time">{getRelativeTime(n.time)}</span>
              </div>

              {/* Delete button */}
              <button
                className="notif-delete-btn"
                onClick={(e) => deleteNotif(n.id, e)}
                title="Remove notification"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .notif-page {
          max-width: 680px;
          margin: 0 auto;
          padding: 8px 0 40px 0;
          font-family: var(--font-sans);
          color: var(--text-primary);
        }

        .notif-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 4px 16px 4px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .notif-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .notif-title-row h1 {
          font-family: var(--font-display);
          font-size: 1.55rem;
          font-weight: 800;
          color: white;
          margin: 0;
        }

        .notif-unread-badge {
          background: #ff4500;
          color: white;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 10px;
          line-height: 1.4;
        }

        .notif-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .notif-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          color: var(--text-secondary);
          font-size: 0.78rem;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .notif-action-btn:hover {
          background: rgba(255,255,255,0.05);
          color: white;
          border-color: rgba(255,255,255,0.18);
        }
        .notif-action-btn.icon-only {
          padding: 6px 10px;
        }

        .notif-divider {
          height: 1px;
          background: rgba(255,255,255,0.05);
          margin-bottom: 8px;
        }

        .notif-empty {
          text-align: center;
          padding: 60px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .notif-empty h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: white;
          margin: 0;
        }
        .notif-empty p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 0;
        }

        .notif-list {
          display: flex;
          flex-direction: column;
        }

        .notif-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s ease;
          position: relative;
        }
        .notif-item:hover {
          background: rgba(255,255,255,0.03);
        }
        .notif-item.unread {
          background: rgba(255, 69, 0, 0.04);
        }
        .notif-item.unread:hover {
          background: rgba(255, 69, 0, 0.07);
        }

        /* Thin left accent line for unread */
        .notif-item.unread::before {
          content: '';
          position: absolute;
          left: 0;
          top: 10px;
          bottom: 10px;
          width: 3px;
          border-radius: 2px;
          background: #ff4500;
        }

        .notif-unread-dot-col {
          width: 10px;
          flex-shrink: 0;
          padding-top: 6px;
          display: flex;
          justify-content: center;
        }

        .notif-unread-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ff4500;
          flex-shrink: 0;
          display: block;
        }

        .notif-icon-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .notif-content {
          flex: 1;
          min-width: 0;
        }

        .notif-item-title {
          font-size: 0.88rem;
          font-weight: 600;
          color: white;
          margin: 0 0 4px 0;
          line-height: 1.4;
        }
        .notif-item.unread .notif-item-title {
          color: white;
        }
        .notif-item:not(.unread) .notif-item-title {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .notif-item-body {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0 0 6px 0;
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .notif-item-time {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .notif-delete-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.15s ease, color 0.15s ease;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .notif-item:hover .notif-delete-btn {
          opacity: 1;
        }
        .notif-delete-btn:hover {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
