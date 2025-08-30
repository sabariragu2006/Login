import React, { useEffect, useState } from "react";

const Dashboard = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [bio, setBio] = useState("");
  const [updating, setUpdating] = useState(false);
  const [profileFile, setProfileFile] = useState(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Get user from localStorage (or your auth system)
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        setError("No user found. Please login again.");
        setLoading(false);
        return;
      }

      const userData = JSON.parse(storedUser);
      
      // Fetch latest user data from backend
      const response = await fetch(`http://localhost:5000/users/${userData._id}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      setUser(data.user);
      setBio(data.user.bio || "");
      
      // Update localStorage with fresh data
      localStorage.setItem("user", JSON.stringify(data.user));
      
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBio = async () => {
    if (!user) return;
    
    try {
      setUpdating(true);
      
      const response = await fetch(`http://localhost:5000/update-bio/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ bio: bio.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update bio');
      }

      const data = await response.json();
      
      // Update user state and localStorage
      const updatedUser = { ...user, bio: data.bio };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      setShowEditModal(false);
      
    } catch (err) {
      console.error('Error updating bio:', err);
      alert(err.message || 'Failed to update bio');
    } finally {
      setUpdating(false);
    }
  };

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !user) return;

    try {
      setUploadingProfile(true);
      
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch(`http://localhost:5000/update-profile-picture/${user._id}`, {
        method: 'PUT',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile picture');
      }

      const data = await response.json();
      
      // Update user state and localStorage
      const updatedUser = { ...user, profilePicture: data.profilePicture };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      alert(err.message || 'Failed to update profile picture');
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleLogout = () => {
    // Clear user data from localStorage
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    
    if (onLogout) {
      onLogout();
    } else {
      // Fallback - reload page to trigger login flow
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="login-page">
        <div className="bg-circles">
          <div className="circle purple"></div>
          <div className="circle blue"></div>
          <div className="circle indigo"></div>
        </div>
        <div className="login-container fade-in">
          <div className="login-logo">
            <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 20px' }}></div>
            <h1>Loading Dashboard</h1>
            <p>Fetching your data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="login-page">
        <div className="bg-circles">
          <div className="circle purple"></div>
          <div className="circle blue"></div>
          <div className="circle indigo"></div>
        </div>
        <div className="login-container fade-in">
          <div className="login-logo">
            <div className="logo-box">
              <svg className="logo-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h1>Error Loading Dashboard</h1>
            <p>{error || "Please login to view your dashboard"}</p>
          </div>
          <div className="login-form">
            <button className="login-btn" onClick={() => window.location.href = '/login'}>
              Go to Login
            </button>
            <button 
              onClick={fetchUserData}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(102, 126, 234, 0.1)',
                color: '#667eea',
                border: '2px solid #E5E7EB',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      {/* Animated Background Circles */}
      <div className="bg-circles">
        <div className="circle purple"></div>
        <div className="circle blue"></div>
        <div className="circle indigo"></div>
      </div>

      {/* Main Dashboard Container */}
      <div className="login-container fade-in" style={{ maxWidth: '480px' }}>
        {/* Header Section */}
        <div className="login-logo">
          <div className="profile-upload-container">
            <div className="profile-preview" style={{ width: '100px', height: '100px' }}>
              {uploadingProfile ? (
                <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
              ) : (
                <img
                  src={user.profilePicture ? `http://localhost:5000${user.profilePicture}` : "/api/placeholder/100/100"}
                  alt="Profile"
                  onError={(e) => {
                    e.target.src = "/api/placeholder/100/100";
                  }}
                />
              )}
            </div>
            <div className="profile-upload-btn">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleProfilePictureUpload}
                disabled={uploadingProfile}
              />
              <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </div>
          </div>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
        </div>

        {/* Bio Section */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            background: 'rgba(102, 126, 234, 0.05)',
            border: '1px solid rgba(102, 126, 234, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#374151',
              margin: '0 0 8px 0'
            }}>About Me</h3>
            <p style={{
              fontSize: '14px',
              color: '#6B7280',
              lineHeight: '1.5',
              fontStyle: 'italic',
              margin: '0 0 12px 0',
              minHeight: '20px'
            }}>
              {user.bio || "No bio yet..."}
            </p>
            <button 
              onClick={() => {
                setBio(user.bio || "");
                setShowEditModal(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Edit Bio
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginBottom: '24px',
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '12px',
          border: '1px solid rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '4px'
            }}>
              {user.posts || 0}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '600'
            }}>
              Posts
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '4px'
            }}>
              {user.followers || 0}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '600'
            }}>
              Followers
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '4px'
            }}>
              {user.following || 0}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '600'
            }}>
              Following
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="login-form">
          <button 
            className="login-btn"
            style={{ marginBottom: '12px' }}
            onClick={() => window.location.href = '/posts'}
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
            View My Posts
          </button>
          
          <button 
            className="login-btn"
            style={{ 
              background: 'rgba(102, 126, 234, 0.1)',
              color: '#667eea',
              marginBottom: '12px'
            }}
            onClick={() => window.location.href = '/profile/edit'}
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            Edit Profile
          </button>
          
          <button 
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
            }}
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            Logout
          </button>
        </div>

        {/* Quick Stats Footer */}
        <div className="extra-links">
          <p>Account created • Member since 2024</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button style={{ color: '#6B7280', fontSize: '12px' }}>Settings</button>
            <button style={{ color: '#6B7280', fontSize: '12px' }}>Help</button>
            <button style={{ color: '#6B7280', fontSize: '12px' }}>Privacy</button>
          </div>
        </div>
      </div>

      {/* Edit Bio Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="login-container slide-in" style={{ maxWidth: '400px', margin: '20px' }}>
            <div className="login-logo">
              <h1 style={{ fontSize: '20px' }}>Edit Bio</h1>
              <p>Tell others about yourself</p>
            </div>
            
            <div className="login-form">
              <div className="input-group">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write something about yourself..."
                  disabled={updating}
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    fontSize: '16px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    e.target.style.background = 'rgba(255, 255, 255, 1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                    e.target.style.background = 'rgba(255, 255, 255, 0.8)';
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={handleUpdateBio}
                  disabled={updating}
                  className="login-btn"
                  style={{ 
                    flex: 1,
                    opacity: updating ? 0.7 : 1,
                    cursor: updating ? 'not-allowed' : 'pointer'
                  }}
                >
                  {updating ? (
                    <>
                      <span className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></span>
                      Saving...
                    </>
                  ) : (
                    'Save Bio'
                  )}
                </button>
                <button 
                  onClick={() => setShowEditModal(false)}
                  disabled={updating}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: 'rgba(107, 114, 128, 0.1)',
                    color: '#6B7280',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    opacity: updating ? 0.7 : 1
                  }}
                  onMouseOver={(e) => {
                    if (!updating) {
                      e.target.style.background = 'rgba(107, 114, 128, 0.2)';
                      e.target.style.borderColor = '#9CA3AF';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!updating) {
                      e.target.style.background = 'rgba(107, 114, 128, 0.1)';
                      e.target.style.borderColor = '#E5E7EB';
                    }
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;