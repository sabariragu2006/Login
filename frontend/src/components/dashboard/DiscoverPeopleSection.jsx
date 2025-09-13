import React from 'react';

const DiscoverPeopleSection = ({ 
  currentUser, 
  allUsers, 
  stories, 
  openStoryModal, 
  addStory 
}) => {

  // Debug logs (remove in production)
  console.log('📚 StoriesFeed | stories:', stories);
  console.log('👥 Users:', allUsers);

  // ✅ Filter users who have active stories (for Stories row)
  const usersWithStories = allUsers.filter(user => 
    stories?.some(s => s.author?._id === user._id)
  );

  // ✅ Check if current user has any stories
  const hasYourStories = stories?.some(s => s.author?._id === currentUser._id);

  // ✅ Filter all OTHER users (exclude current user) for Discover section
  const otherUsers = allUsers.filter(user => user._id !== currentUser._id);

  // ✅ Helper to get follow status for a user
  const getFollowStatus = (user) => {
    if (!user || !currentUser) return 'none';
    
    // Already following?
    if (Array.isArray(currentUser.following) && currentUser.following.includes(user._id)) {
      return 'following';
    }

    // Pending request? (Assuming backend sets `followStatus` on target user)
    if (user.followStatus === 'pending') {
      return 'pending';
    }

    return 'none';
  };

  // ✅ Function to send follow request
  const handleFollow = async (targetUserId, targetName) => {
    if (targetUserId === currentUser._id) return; // Prevent self-follow

    try {
      const res = await fetch('http://localhost:5000/send-follow-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fromUserId: currentUser._id,
          toUserId: targetUserId
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Trigger refresh of user list to update followStatus
        window.dispatchEvent(new Event('followRequestSent'));
      } else {
        alert(data.message || 'Failed to send follow request');
      }
    } catch (err) {
      console.error('Error sending follow request:', err);
      alert('Failed to send follow request');
    }
  };

  return (
    <div className="row mb-3">
      <div className="col-12">
        
        {/* 🔹 STORIES SECTION — DUAL CLICK BEHAVIOR */}
        <div className="card shadow-lg border-0" style={{ borderRadius: '15px', overflow: 'hidden' }}>
          <div className="card-header border-0 bg-white py-2" style={{ borderRadius: '15px 15px 0 0' }}>
            <h6 className="mb-0 fw-bold">
              <i className="bi bi-camera me-2"></i>
              Stories
            </h6>
          </div>

          {/* Horizontal Scrollable Stories Row */}
          <div 
            className="card-body p-2"
            style={{ 
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              padding: '4px 0'
            }}
          >
            
            {/* YOUR STORY CIRCLE — CLICK PROFILE TO ADD STORY, CLICK DOT TO ADD STORY */}
            <div 
              className="text-center cursor-pointer flex-shrink-0 position-relative"
              style={{ minWidth: '70px', maxWidth: '70px' }}
            >
              {/* Main Circle — Click to VIEW your story (if exists), otherwise adds */}
              <div
                className="position-relative rounded-circle d-flex align-items-center justify-content-center"
                style={{
                  width: '60px',
                  height: '60px',
                  background: hasYourStories 
                    ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
                    : currentUser.profilePicture ? 'transparent' : '#f0f0f0',
                  padding: hasYourStories ? '2px' : '0',
                  transition: 'transform 0.2s ease',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
                onClick={() => {
                  if (hasYourStories) {
                    openStoryModal(currentUser); // View your own story
                  } else {
                    addStory(); // Add a new story
                  }
                }}
              >
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: hasYourStories ? '52px' : '60px',
                    height: hasYourStories ? '52px' : '60px',
                    backgroundColor: 'white',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  {currentUser.profilePicture ? (
                    <img
                      src={`http://localhost:5000${currentUser.profilePicture}`}
                      alt={currentUser.name}
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
                      {currentUser.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* GREEN DOT (Story Indicator) — Click to ADD STORY */}
              {hasYourStories && (
                <div
                  className="position-absolute rounded-circle bg-success border border-white d-flex align-items-center justify-content-center"
                  style={{
                    width: '12px',
                    height: '12px',
                    bottom: '0px',
                    right: '0px',
                    zIndex: 3, // Higher than the + icon
                    boxShadow: '0 0 0 1px white',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the main circle click
                    addStory(); // Always add story when clicking the green dot
                  }}
                ></div>
              )}

              {/* + ICON FOR ADD STORY - Only show when NO story */}
              {!hasYourStories && (
                <div
                  className="position-absolute rounded-circle bg-primary border border-white d-flex align-items-center justify-content-center"
                  style={{
                    width: '20px',
                    height: '20px',
                    bottom: '0px',
                    right: '0px',
                    zIndex: 2,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    fontSize: '12px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the main circle click
                    addStory();
                  }}
                >
                  <i className="bi bi-plus-lg"></i>
                </div>
              )}

              {/* Label Below */}
              <div className="mt-1" style={{ fontSize: '0.6rem', color: '#6c757d', fontWeight: '600' }}>
                {hasYourStories ? 'Your Story' : 'Add Story'}
              </div>
            </div>

            {/* OTHER USERS' STORIES — CLICK CIRCLE TO VIEW, CLICK DOT TO ADD STORY */}
            {usersWithStories.map((user) => {
              const hasStory = stories?.some(s => s.author?._id === user._id);

              return (
                <div
                  key={user._id}
                  className="text-center cursor-pointer flex-shrink-0"
                  style={{ minWidth: '70px', maxWidth: '70px' }}
                >
                  {/* Main Circle — Click to VIEW their story */}
                  <div
                    className="position-relative rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: '60px',
                      height: '60px',
                      background: hasStory 
                        ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
                        : user.profilePicture ? 'transparent' : '#f0f0f0',
                      padding: hasStory ? '2px' : '0',
                      transition: 'transform 0.2s ease',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (hasStory) e.target.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      if (hasStory) e.target.style.transform = 'scale(1)';
                    }}
                    onClick={() => {
                      if (hasStory) {
                        openStoryModal(user); // View their story
                      } else {
                        addStory(); // If no story, add one (consistent behavior)
                      }
                    }}
                  >
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: hasStory ? '52px' : '60px',
                        height: hasStory ? '52px' : '60px',
                        backgroundColor: 'white',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
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

                  {/* GREEN DOT — Click to ADD STORY */}
                  {hasStory && (
                    <div
                      className="position-absolute rounded-circle bg-success border border-white d-flex align-items-center justify-content-center"
                      style={{
                        width: '12px',
                        height: '12px',
                        bottom: '0px',
                        right: '0px',
                        zIndex: 3, // Higher than the + icon
                        boxShadow: '0 0 0 1px white',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the main circle click
                        addStory(); // Always add story when clicking the green dot
                      }}
                    ></div>
                  )}

                  {/* Label Below - Name ONLY */}
                  <div className="mt-1" style={{ fontSize: '0.6rem', color: '#6c757d', fontWeight: '600', lineHeight: '1' }}>
                    {user.name.length > 8 
                      ? user.name.substring(0, 8) + '…' 
                      : user.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 🔹 DISCOVER PEOPLE SECTION — NO PLUS ICON ON PROFILE PICS */}
        <div className="card shadow-lg border-0 mt-4" style={{ borderRadius: '15px', overflow: 'hidden' }}>
          <div className="card-header border-0 bg-white py-3" style={{ borderRadius: '15px 15px 0 0' }}>
            <h6 className="mb-0 fw-bold">
              <i className="bi bi-people-fill me-2"></i>
              Discover People
            </h6>
          </div>

          <div className="card-body p-0">
            {otherUsers.length === 0 ? (
              <div className="p-4 text-center text-muted">
                <i className="bi bi-people-fill fs-1 mb-2"></i>
                <p>No other users found.</p>
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {otherUsers.map((user) => {
                  const status = getFollowStatus(user);

                  return (
                    <div
                      key={user._id}
                      className="list-group-item border-0 py-3 px-4"
                      style={{ backgroundColor: 'white', borderBottom: '1px solid #eee' }}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        {/* Profile Picture & Name — NO PLUS ICON ADDED HERE */}
                        <div className="d-flex align-items-center gap-3">
                          <img
                            src={user.profilePicture 
                              ? `http://localhost:5000${user.profilePicture}` 
                              : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=8b5cf6&color=fff&size=50`}
                            alt={user.name}
                            className="rounded-circle"
                            style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=8b5cf6&color=fff&size=50`;
                            }}
                          />

                          <div>
                            <h6 className="mb-0 fw-semibold" style={{ fontSize: '1rem' }}>
                              {user.name}
                            </h6>
                            <div className="d-flex gap-3 mt-1">
                              <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                <strong>{user.followers || 0}</strong> followers
                              </small>
                              <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                <strong>{user.following || 0}</strong> following
                              </small>
                            </div>
                            {/* Optional: Show if they have a story */}
                            {stories?.some(s => s.author?._id === user._id) && (
                              <small className="text-primary" style={{ fontSize: '0.8rem' }}>
                                📸 Has Story
                              </small>
                            )}
                          </div>
                        </div>

                        {/* Follow Button */}
                        <button
                          className={`btn btn-sm px-4 py-1 fw-medium ${
                            status === 'following'
                              ? 'btn-outline-secondary'
                              : status === 'pending'
                              ? 'btn-secondary'
                              : 'btn-primary'
                          }`}
                          onClick={() => handleFollow(user._id, user.name)}
                          disabled={status === 'pending'} // Prevent spamming pending requests
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            borderRadius: '20px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {status === 'following' ? 'Following' : status === 'pending' ? 'Pending' : 'Follow'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DiscoverPeopleSection;