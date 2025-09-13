// src/components/UserCard.jsx
import React from 'react';

const UserCard = ({ user, onSendFollowRequest, stories, openStoryModal }) => {
  const displayName = user.name.length > 15 ? user.name.substring(0, 15) + '…' : user.name;
  const username = user.username || user.name.toLowerCase().replace(/\s+/g, '');

  let followButton;
  if (user.followStatus === 'following') {
    followButton = (
      <button
        className="btn btn-light btn-sm px-3 py-1 fw-semibold"
        disabled
        style={{ 
          fontSize: '0.8rem',
          borderRadius: '8px',
          border: '1px solid #dbdbdb',
          color: '#262626',
          backgroundColor: '#fafafa'
        }}
      >
        Following
      </button>
    );
  } else if (user.followStatus === 'pending') {
    followButton = (
      <button
        className="btn btn-light btn-sm px-3 py-1 fw-semibold"
        disabled
        style={{ 
          fontSize: '0.8rem',
          borderRadius: '8px',
          border: '1px solid #dbdbdb',
          color: '#262626',
          backgroundColor: '#fafafa'
        }}
      >
        Requested
      </button>
    );
  } else {
    followButton = (
      <button
        className="btn btn-primary btn-sm px-3 py-1 fw-semibold"
        onClick={() => onSendFollowRequest(user._id)}
        style={{ 
          fontSize: '0.8rem',
          borderRadius: '8px',
          backgroundColor: '#0095f6',
          border: 'none',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#1877f2'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#0095f6'}
      >
        Follow
      </button>
    );
  }

  // Check if this user has any active stories
  const hasStory = stories.some(s => s.userId === user._id);

  return (
    <div 
      className="d-flex align-items-center justify-content-between bg-white p-3"
      style={{
        width: '100%',
        borderRadius: '0',
        border: 'none',
        borderBottom: '1px solid #efefef',
        transition: 'background-color 0.1s ease'
      }}
      onMouseEnter={(e) => e.target.style.backgroundColor = '#fafafa'}
      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
    >
      {/* Left Section: Avatar + User Info */}
      <div className="d-flex align-items-center gap-3">
        {/* Avatar with Story Ring */}
        <div
          className="position-relative cursor-pointer"
          onClick={() => hasStory && openStoryModal(user)}
          style={{ flexShrink: 0 }}
        >
          <div
            className="rounded-circle d-flex align-items-center justify-content-center"
            style={{
              width: '56px',
              height: '56px',
              background: hasStory 
                ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
                : user.profilePicture ? 'transparent' : '#f0f0f0',
              padding: hasStory ? '2px' : '0',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => hasStory && (e.target.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => hasStory && (e.target.style.transform = 'scale(1)')}
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: hasStory ? '52px' : '56px',
                height: hasStory ? '52px' : '56px',
                backgroundColor: 'white',
                overflow: 'hidden'
              }}
            >
              {user.profilePicture ? (
                <img
                  src={`http://localhost:5000${user.profilePicture}`}
                  alt={user.name}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    borderRadius: '50%'
                  }}
                />
              ) : (
                <span 
                  className="fw-bold text-secondary" 
                  style={{ fontSize: '1.4rem' }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          
          {/* Online/Story Indicator */}
          {hasStory && (
            <div
              className="position-absolute rounded-circle bg-success border border-white"
              style={{
                width: '16px',
                height: '16px',
                bottom: '2px',
                right: '2px',
                zIndex: 2
              }}
            ></div>
          )}
        </div>

        {/* User Info */}
        <div className="d-flex flex-column" style={{ minWidth: 0 }}>
          <h6 
            className="mb-0 fw-semibold text-dark"
            style={{ 
              fontSize: '0.9rem',
              lineHeight: '1.2'
            }}
          >
            {displayName}
          </h6>
          <p 
            className="text-muted mb-0" 
            style={{ 
              fontSize: '0.75rem',
              lineHeight: '1.1'
            }}
          >
            @{username}
          </p>
          <p 
            className="text-muted mb-0" 
            style={{ 
              fontSize: '0.7rem',
              lineHeight: '1'
            }}
          >
            {user.postsCount} posts
          </p>
        </div>
      </div>

      {/* Right Section: Follow Button */}
      <div style={{ flexShrink: 0 }}>
        {followButton}
      </div>
    </div>
  );
};

export default UserCard;