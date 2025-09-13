import React from 'react';

const ProfileModal = ({ 
  user, 
  bio, 
  setBio,
  updating,
  uploadingProfile,
  handleUpdateBio,
  handleProfilePictureUpload,
  onLogout,
  onClose,
  notifications = [],
  formatDate
}) => {
  // Safe fallback if user is not loaded yet
  const safeUser = user || {
    name: '',
    email: '',
    profilePicture: '',
  };

  // ✅ ONLY include real notifications — NO follow requests here!
  const allNotifications = [
    ...notifications
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Newest first

  return (
    <>
      {/* Overlay */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
      >
        {/* Modal Content */}
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: '20px',
            width: '95%',
            maxWidth: '600px', // More compact width
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            position: 'relative',
          }}
        >
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center p-3 border-bottom" style={{ borderBottom: '1px solid #eee' }}>
            <h5 className="mb-0 fw-bold">Profile Details</h5>
            <button 
              onClick={onClose}
              className="btn btn-sm"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="p-4">

            {/* Profile Picture Section */}
            <div className="text-center mb-4">
              <div className="position-relative d-inline-block">
                <img
                  src={safeUser.profilePicture ? `http://localhost:5000${safeUser.profilePicture}` : `https://via.placeholder.com/120x120/667eea/white?text=${safeUser.name.charAt(0) || '?'}`}
                  alt="Profile"
                  className="rounded-circle"
                  style={{ width: '120px', height: '120px', objectFit: 'cover', border: '4px solid #667eea' }}
                />
                <label 
                  className="position-absolute bottom-0 end-0 btn btn-primary btn-sm rounded-circle"
                  style={{ width: '36px', height: '36px', padding: '0', border: 'none' }}
                >
                  <i className="bi bi-camera"></i>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleProfilePictureUpload}
                    disabled={uploadingProfile}
                    className="d-none"
                  />
                </label>
                {uploadingProfile && (
                  <div className="position-absolute top-50 start-50 translate-middle">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Uploading...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* User Details */}
            <div className="mb-4">
              <label className="form-label fw-semibold text-muted small">Full Name</label>
              <div className="form-control-plaintext border rounded p-2 bg-light">{safeUser.name || 'Loading...'}</div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold text-muted small">Email</label>
              <div className="form-control-plaintext border rounded p-2 bg-light">{safeUser.email || 'Loading...'}</div>
            </div>

            {/* Bio Section */}
            <div className="mb-4">
              <label className="form-label fw-semibold text-muted small">Bio</label>
              <textarea
                value={bio || ''}
                onChange={(e) => setBio(e.target.value)}
                className="form-control"
                rows="4"
                style={{ borderRadius: '12px', resize: 'none' }}
                placeholder="Tell others about yourself..."
              />
              <div className="mt-2">
                <button 
                  onClick={handleUpdateBio}
                  disabled={updating}
                  className="btn btn-success btn-sm"
                >
                  {updating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-1"></i>
                      Save Bio
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Notifications Section — Now directly below bio */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0 fw-bold">
                  <i className="bi bi-bell me-2"></i>
                  Notifications
                </h6>
                {allNotifications.length > 0 && (
                  <span className="badge bg-primary rounded-pill">
                    {allNotifications.length}
                  </span>
                )}
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {allNotifications.length > 0 ? (
                  allNotifications.map((notification) => (
                    <div
                      key={notification._id}
                      className="d-flex align-items-center bg-white rounded p-3 mb-2 shadow-sm"
                    >
                      {/* Icon */}
                      <div className="me-3">
                        {notification.type === 'follow_accepted' && (
                          <i className="bi bi-person-check text-success" style={{ fontSize: '1.5rem' }}></i>
                        )}
                        {notification.type === 'new_follower' && (
                          <i className="bi bi-person-plus text-primary" style={{ fontSize: '1.5rem' }}></i>
                        )}
                        {notification.type === 'post_reaction' && (
                          <i className="bi bi-heart text-danger" style={{ fontSize: '1.5rem' }}></i>
                        )}
                        {notification.type === 'post_comment' && (
                          <i className="bi bi-chat text-info" style={{ fontSize: '1.5rem' }}></i>
                        )}
                        {notification.type === 'new_message' && (
                          <i className="bi bi-envelope text-warning" style={{ fontSize: '1.5rem' }}></i>
                        )}
                      </div>

                      {/* Message */}
                      <div className="flex-grow-1">
                        <p className="mb-1" style={{ fontSize: '0.9rem' }}>
                          {notification.message}
                        </p>
                        <small className="text-muted">{formatDate(notification.createdAt)}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-bell-slash" style={{ fontSize: '2rem' }}></i>
                    <h6 className="mt-2">No notifications</h6>
                    <p className="small">You're all caught up!</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="d-flex justify-content-end p-3 border-top" style={{ borderTop: '1px solid #eee' }}>
            <button 
              type="button" 
              className="btn btn-secondary rounded-pill px-4 me-2"
              onClick={onClose}
            >
              Close
            </button>
            <button 
              onClick={onLogout}
              className="btn btn-danger rounded-pill px-4"
            >
              <i className="bi bi-box-arrow-right me-1"></i>
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileModal;