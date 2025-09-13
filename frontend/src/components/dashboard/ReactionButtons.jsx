// src/components/ReactionButtons.jsx
import React from 'react';

const ReactionButtons = ({ post, handleReaction, user }) => {
  const reactionTypes = [
    { type: 'like', icon: '👍' },
    { type: 'love', icon: '❤️' },
    { type: 'laugh', icon: '😂' },
    { type: 'wow', icon: '😮' },
    { type: 'sad', icon: '😢' },
    { type: 'angry', icon: '😠' }
  ];

  if (!post) return null;

  return (
    <div className="d-flex gap-1 flex-wrap">
      {reactionTypes.map(({ type, icon }) => {
        // Use reactionCounts from formatted post (computed server-side)
        const count = post.reactionCounts?.[type] || 0;
        const isActive = post.userReaction === type;

        return (
          <button
            key={type}
            className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-secondary'} rounded-pill px-2 py-1`}
            onClick={() => {
              if (!user) {
                alert('Please log in to react to posts');
                return;
              }
              handleReaction(post._id, type);
            }}
            style={{ 
              fontSize: '0.7rem', 
              minWidth: '35px',
              transition: 'all 0.2s ease'
            }}
            title={!user ? "Log in to react" : `React with ${type}`}
          >
            <span>{icon}</span>
            {count > 0 && <span className="ms-1">{count}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default ReactionButtons;