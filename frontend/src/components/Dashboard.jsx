import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FeedSection from './dashboard/FeedSection';
import ProfileModal from './dashboard/ProfileModal';
import Messages from './Messages/Messages';
import StoryModal from './Messages/StoryModal';
import DiscoverPeopleSection from './dashboard/DiscoverPeopleSection';

const Dashboard = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Posts State
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [commentTexts, setCommentTexts] = useState({});
  const [submittingComment, setSubmittingComment] = useState({});
  const [showComments, setShowComments] = useState({});

  // Follow System State
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [followRequests, setFollowRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  // Stories State
  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [currentStoryUser, setCurrentStoryUser] = useState(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  // Profile States
  const [bio, setBio] = useState("");
  const [updating, setUpdating] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);

  const navigate = useNavigate();

  // Initialize user data and bio
  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (user) {
      setBio(user.bio || "");
      fetchAllUsers();
      fetchFollowRequests();
      fetchNotifications();
      fetchPosts();
      fetchStories();
    }
  }, [user]);

  // --- FETCHING DATA ---
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        setError("No user found. Please login again.");
        setLoading(false);
        return;
      }
      const userData = JSON.parse(storedUser);
      const response = await fetch(`http://localhost:5000/users/${userData._id}`, {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      const data = await response.json();
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStories = async () => {
    if (!user) return;
    try {
      setStoriesLoading(true);
      const response = await fetch(`http://localhost:5000/stories/${user._id}`, {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch stories');
      const data = await response.json();
      setStories(data.stories || []);
    } catch (err) {
      console.error('Error fetching stories:', err);
    } finally {
      setStoriesLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    if (!user) return;
    try {
      setUsersLoading(true);
      const timestamp = new Date().getTime();
      const response = await fetch(`http://localhost:5000/users?excludeId=${user._id}&t=${timestamp}`, {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchFollowRequests = async () => {
    if (!user) return;
    try {
      const response = await fetch(`http://localhost:5000/follow-requests/${user._id}`, {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setFollowRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error fetching follow requests:', err);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response = await fetch(`http://localhost:5000/notifications/${user._id}`, {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchPosts = async () => {
    if (!user) return;
    try {
      setPostsLoading(true);
      const response = await fetch(`http://localhost:5000/posts/following/${user._id}`, {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setPostsLoading(false);
    }
  };

  // --- STORY HANDLERS ---
  const handleStoryUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !user) return;
    try {
      const formData = new FormData();
      formData.append('story', file);
      const response = await fetch(`http://localhost:5000/upload-story/${user._id}`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload story');
      }
      fetchStories();
      event.target.value = '';
    } catch (err) {
      console.error('Error uploading story:', err);
      alert(err.message || 'Failed to upload story');
    }
  };

  const openStoryModal = (storyUser) => {
    const userStories = stories.filter(s => s.author?._id === storyUser._id);
    if (userStories.length > 0) {
      setCurrentStoryUser(storyUser);
      setCurrentStoryIndex(0);
      setShowStoryModal(true);
    } else {
      console.warn(`No stories found for user: ${storyUser.name} (${storyUser._id})`);
    }
  };

  const closeStoryModal = () => {
    setShowStoryModal(false);
    setCurrentStoryUser(null);
    setCurrentStoryIndex(0);
  };

  // --- FOLLOW HANDLERS ---
  const sendFollowRequest = async (targetUserId) => {
    if (!user) return;
    try {
      const response = await fetch('http://localhost:5000/send-follow-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fromUserId: user._id,
          toUserId: targetUserId
        })
      });
      if (response.ok) {
        setAllUsers(prev =>
          prev.map(u =>
            u._id === targetUserId
              ? { ...u, followStatus: 'pending' }
              : u
          )
        );
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to send follow request');
      }
    } catch (err) {
      console.error('Error sending follow request:', err);
      alert('Failed to send follow request');
    }
  };

  const handleFollowRequest = async (requestId, action) => {
    if (!user) return;
    try {
      const response = await fetch('http://localhost:5000/handle-follow-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          requestId,
          action
        })
      });
      if (response.ok) {
        fetchFollowRequests();
        fetchNotifications();
        fetchUserData(); // Refreshes following/followers count
        if (action === 'accept') {
          fetchPosts();
          fetchAllUsers(); // IMMEDIATELY refresh all users
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to handle follow request');
      }
    } catch (err) {
      console.error('Error handling follow request:', err);
      alert('Failed to handle follow request');
    }
  };

  // --- COMMENT HANDLERS ---
  const toggleComments = (postId) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleAddComment = async (postId) => {
    const commentText = commentTexts[postId];
    if (!commentText || !commentText.trim() || !user) return;
    try {
      setSubmittingComment(prev => ({ ...prev, [postId]: true }));
      const response = await fetch('http://localhost:5000/add-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user._id,
          postId: postId,
          text: commentText.trim()
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add comment');
      }
      const data = await response.json();
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post._id === postId) {
            return {
              ...post,
              comments: [...post.comments, data.comment],
              commentCount: data.commentCount
            };
          }
          return post;
        })
      );
      setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      setShowComments(prev => ({ ...prev, [postId]: true }));
    } catch (err) {
      console.error('Error adding comment:', err);
      alert(err.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [postId]: false }));
    }
  };

  // --- REACTION HANDLERS --- (REMOVED - NO LONGER USED)
  // Deleted: handleReaction function

  // --- PROFILE HANDLERS ---
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
      const updatedUser = { ...user, bio: data.bio };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
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

  // --- UTILITIES ---
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const userPostCount = posts.filter(post => post.author._id === user?._id).length;

  // --- RENDERING ---
  if (loading) {
    return (
      <>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.0/font/bootstrap-icons.min.css" />
        <div className="socialsphere-loading">
          <div className="loading-container">
            <div className="socialsphere-logo">
              <div className="logo-icon">
                <i className="bi bi-globe"></i>
              </div>
              <h1 className="logo-text">SocialSphere</h1>
            </div>
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <p className="loading-text">Welcome back! Loading your social universe...</p>
          </div>
        </div>
        <style jsx>{`
          .socialsphere-loading {
            min-height: 100vh;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 25%, #a855f7 50%, #c084fc 75%, #e879f9 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
          }
          .socialsphere-loading::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
              radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%);
            animation: float 6s ease-in-out infinite;
          }
          .loading-container {
            text-align: center;
            z-index: 1;
            color: white;
          }
          .socialsphere-logo {
            margin-bottom: 2rem;
            animation: logoGlow 2s ease-in-out infinite alternate;
          }
          .logo-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            background: linear-gradient(45deg, #fff, #e0e7ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
          }
          .logo-text {
            font-size: 2.5rem;
            font-weight: 800;
            margin: 0;
            background: linear-gradient(45deg, #fff, #e0e7ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          .loading-spinner {
            position: relative;
            width: 80px;
            height: 80px;
            margin: 0 auto 2rem;
          }
          .spinner-ring {
            position: absolute;
            width: 80px;
            height: 80px;
            border: 4px solid transparent;
            border-top: 4px solid rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          .spinner-ring:nth-child(2) {
            width: 60px;
            height: 60px;
            top: 10px;
            left: 10px;
            border-top: 4px solid rgba(255, 255, 255, 0.6);
            animation: spin 1.5s linear infinite reverse;
          }
          .spinner-ring:nth-child(3) {
            width: 40px;
            height: 40px;
            top: 20px;
            left: 20px;
            border-top: 4px solid rgba(255, 255, 255, 0.4);
            animation: spin 2s linear infinite;
          }
          .loading-text {
            font-size: 1.1rem;
            opacity: 0.9;
            font-weight: 500;
            margin: 0;
            animation: pulse 2s ease-in-out infinite;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          @keyframes logoGlow {
            0% { filter: drop-shadow(0 4px 8px rgba(255,255,255,0.3)); }
            100% { filter: drop-shadow(0 6px 12px rgba(255,255,255,0.5)); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
          }
        `}</style>
      </>
    );
  }

  if (error || !user) {
    return (
      <>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.0/font/bootstrap-icons.min.css" />
        <div className="socialsphere-error">
          <div className="error-container">
            <div className="error-icon">
              <i className="bi bi-exclamation-triangle"></i>
            </div>
            <h3 className="error-title">Oops! Something went wrong</h3>
            <p className="error-message">{error || "Please login to view your dashboard"}</p>
            <button className="btn-retry" onClick={fetchUserData}>
              <i className="bi bi-arrow-clockwise me-2"></i>
              Try Again
            </button>
          </div>
        </div>
        <style jsx>{`
          .socialsphere-error {
            min-height: 100vh;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 25%, #a855f7 50%, #c084fc 75%, #e879f9 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          }
          .error-container {
            text-align: center;
            max-width: 400px;
            padding: 2rem;
          }
          .error-icon {
            font-size: 4rem;
            margin-bottom: 1.5rem;
            opacity: 0.9;
          }
          .error-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 1rem;
          }
          .error-message {
            font-size: 1rem;
            opacity: 0.8;
            margin-bottom: 2rem;
            line-height: 1.5;
          }
          .btn-retry {
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 12px 24px;
            border-radius: 50px;
            font-weight: 600;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
          }
          .btn-retry:hover {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      {/* Bootstrap CSS & Icons */}
      <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.0/font/bootstrap-icons.min.css" />

      <div className="socialsphere-dashboard">
        <div className="dashboard-background">
          <div className="bg-pattern"></div>
        </div>

        {/* Top Navigation Bar */}
        <nav className="socialsphere-nav">
          <div className="container">
            <div className="nav-content">
              <div className="nav-brand">
                <div className="brand-icon">
                  <i className="bi bi-globe"></i>
                </div>
                <span className="brand-text">SocialSphere</span>
              </div>
              <div className="nav-actions">
                <button 
                  className="nav-btn"
                  onClick={() => navigate('/uploads')}
                  title="Create Post"
                >
                  <i className="bi bi-plus-lg"></i>
                </button>
                <button 
                  className="nav-btn position-relative"
                  onClick={() => setShowMessagesModal(true)}
                  title="Messages"
                >
                  <i className="bi bi-chat-dots"></i>
                </button>
                <button 
                  className="nav-btn position-relative"
                  onClick={() => setShowProfileModal(true)}
                  title="Notifications"
                >
                  <i className="bi bi-bell"></i>
                  {(notifications.length > 0 || followRequests.length > 0) && (
                    <span className="notification-dot"></span>
                  )}
                </button>
                <div 
                  className="nav-profile"
                  onClick={() => setShowProfileModal(true)}
                >
                  <img
                    src={user.profilePicture 
                      ? `http://localhost:5000${user.profilePicture}` 
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=8b5cf6&color=fff&size=40`}
                    alt={user.name}
                  />
                </div>
              </div>
            </div>
          </div>
        </nav>

        <div className="dashboard-content">
          <div className="container-fluid px-0 px-md-3">
            <div className="row g-0 g-md-3">

              {/* LEFT SIDEBAR — Profile + Follow Requests */}
              {/* On mobile: Appears BELOW Stories, not beside */}
              <div className={`col-12 col-md-4 col-lg-3 order-1 order-md-0 ${showProfileModal ? 'd-none' : ''}`}>
                <div className="sidebar-content p-3 p-md-4">
                  {/* User Profile Card */}
                  <div className="profile-card bg-white rounded-4 shadow-sm border mb-4">
                    <div className="profile-header text-center p-3">
                      <div className="profile-avatar-container mb-3">
                        <img
                          src={user.profilePicture 
                            ? `http://localhost:5000${user.profilePicture}` 
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=8b5cf6&color=fff&size=80`}
                          alt={user.name}
                          className="profile-avatar"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=8b5cf6&color=fff&size=80`;
                          }}
                        />
                      </div>
                      <h5 className="profile-name">{user.name}</h5>
                      <p className="profile-bio mb-3">{user.bio || "Welcome to SocialSphere!"}</p>
                      
                      {/* Stats Row */}
                      <div className="d-flex justify-content-center gap-4 mb-3">
                        <div className="text-center cursor-pointer" onClick={() => setShowFollowersModal(true)}>
                          <strong className="d-block fs-6 text-dark">{userPostCount}</strong>
                          <small className="text-muted">Posts</small>
                        </div>
                        <div className="text-center cursor-pointer" onClick={() => setShowFollowersModal(true)}>
                          <strong className="d-block fs-6 text-dark">{Array.isArray(user.followers) ? user.followers.length : 0}</strong>
                          <small className="text-muted">Followers</small>
                        </div>
                        <div className="text-center cursor-pointer" onClick={() => setShowFollowingModal(true)}>
                          <strong className="d-block fs-6 text-dark">{Array.isArray(user.following) ? user.following.length : 0}</strong>
                          <small className="text-muted">Following</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Follow Requests Section */}
                  {followRequests.length > 0 && (
                    <div className="follow-requests-section bg-light rounded-4 p-3 border mb-4" style={{ backgroundColor: '#f9f7ff' }}>
                      <h6 className="mb-3 d-flex align-items-center text-primary">
                        <i className="bi bi-person-plus-fill me-2"></i>
                        Follow Requests ({followRequests.length})
                      </h6>
                      <div className="list-group list-group-flush">
                        {followRequests.map((request) => (
                          <div key={request._id} className="list-group-item border-0 py-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center gap-2">
                                <img
                                  src={request.from.profilePicture 
                                    ? `http://localhost:5000${request.from.profilePicture}` 
                                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(request.from.name)}&background=8b5cf6&color=fff&size=40`}
                                  alt={request.from.name}
                                  className="rounded-circle"
                                  style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                                />
                                <span className="fw-semibold">{request.from.name}</span>
                              </div>
                              <div className="d-flex gap-1">
                                <button 
                                  className="btn btn-sm btn-primary px-2 py-1" 
                                  onClick={() => handleFollowRequest(request._id, 'accept')}
                                  disabled={submittingComment[request._id]}
                                >
                                  Accept
                                </button>
                                <button 
                                  className="btn btn-sm btn-outline-danger px-2 py-1" 
                                  onClick={() => handleFollowRequest(request._id, 'reject')}
                                  disabled={submittingComment[request._id]}
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {followRequests.length === 0 && (
                    <div className="mt-3 p-3 bg-light rounded-4 border text-center" style={{ backgroundColor: '#f9f7ff' }}>
                      <small className="text-muted">
                        <i className="bi bi-person-plus-fill me-1"></i>
                        No follow requests
                      </small>
                    </div>
                  )}
                </div>
              </div>

              {/* MAIN CONTENT — FULL WIDTH ON MOBILE, CENTERED ON DESKTOP */}
              <div className="col-12 col-md-8 col-lg-6 order-0 order-md-1">
                <div className="main-content">
                  
                  {/* STORIES SECTION — Always visible at top */}
                  <div className="stories-section bg-white rounded-4 shadow-sm border p-3 mb-4">
                    <h6 className="section-title mb-3 d-flex align-items-center">
                      <i className="bi bi-camera-reels me-2 text-primary"></i>
                      Stories
                    </h6>
                    <DiscoverPeopleSection 
                      currentUser={user}
                      allUsers={allUsers}
                      stories={stories}
                      openStoryModal={openStoryModal}
                      addStory={() => document.getElementById('story-upload-input')?.click()}
                    />
                  </div>

                  {/* FEED SECTION — Takes full width, no max-width */}
                  <FeedSection 
                    posts={posts} 
                    postsLoading={postsLoading}
                    commentTexts={commentTexts}
                    submittingComment={submittingComment}
                    showComments={showComments}
                    toggleComments={toggleComments}
                    handleAddComment={handleAddComment}
                    user={user}
                    userPostCount={userPostCount}
                    formatDate={formatDate}
                    fetchPosts={fetchPosts}
                    setCommentTexts={setCommentTexts}
                    setSubmittingComment={setSubmittingComment}
                    setShowComments={setShowComments}
                  />
                </div>
              </div>

              {/* RIGHT SIDEBAR — Empty on desktop, hidden on mobile */}
              <div className="col-lg-3 d-none d-lg-block"></div>

            </div>
          </div>
        </div>

        {/* Hidden file input for story upload */}
        <input 
          id="story-upload-input"
          type="file" 
          accept="image/*,video/*" 
          onChange={handleStoryUpload}
          style={{ display: 'none' }}
        />
      </div>

      {/* Modals */}
      {showStoryModal && (
        <StoryModal 
          show={showStoryModal}
          onClose={closeStoryModal}
          currentStoryUser={currentStoryUser}
          currentStoryIndex={currentStoryIndex}
          setCurrentStoryIndex={setCurrentStoryIndex}
          stories={stories}
        />
      )}
      {showProfileModal && (
        <ProfileModal 
          user={user}
          bio={bio}
          setBio={setBio}
          updating={updating}
          uploadingProfile={uploadingProfile}
          handleUpdateBio={handleUpdateBio}
          handleProfilePictureUpload={handleProfilePictureUpload}
          onLogout={onLogout}
          onClose={() => setShowProfileModal(false)}
          notifications={notifications}
          followRequests={followRequests}
          handleFollowRequest={handleFollowRequest}
          formatDate={formatDate}
        />
      )}
      {showMessagesModal && (
        <Messages 
          user={user} 
          onClose={() => setShowMessagesModal(false)} 
        />
      )}

      {/* MODALS FOR FOLLOWERS & FOLLOWING LIST — SIMPLE OVERLAY */}
      {showFollowersModal && (
        <div 
          onClick={() => setShowFollowersModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '20px',
              width: '95%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
          >
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">Followers</h5>
              <button 
                onClick={() => setShowFollowersModal(false)}
                className="btn btn-sm"
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#666' }}
              >
                ×
              </button>
            </div>
            <div className="p-3">
              {Array.isArray(user.followers) && user.followers.length > 0 ? (
                user.followers.map(followerId => {
                  const follower = allUsers.find(u => u._id === followerId);
                  if (!follower) return null;
                  return (
                    <div key={followerId} className="d-flex align-items-center gap-3 p-2 mb-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                      <img
                        src={follower.profilePicture 
                          ? `http://localhost:5000${follower.profilePicture}` 
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(follower.name)}&background=8b5cf6&color=fff&size=40`}
                        alt={follower.name}
                        className="rounded-circle"
                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                      />
                      <div className="flex-grow-1">
                        <h6 className="mb-0 fw-semibold">{follower.name}</h6>
                        <small className="text-muted">Follows you</small>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted py-4">No followers yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showFollowingModal && (
        <div 
          onClick={() => setShowFollowingModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '20px',
              width: '95%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
          >
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">Following</h5>
              <button 
                onClick={() => setShowFollowingModal(false)}
                className="btn btn-sm"
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#666' }}
              >
                ×
              </button>
            </div>
            <div className="p-3">
              {Array.isArray(user.following) && user.following.length > 0 ? (
                user.following.map(followingId => {
                  const following = allUsers.find(u => u._id === followingId);
                  if (!following) return null;
                  return (
                    <div key={followingId} className="d-flex align-items-center gap-3 p-2 mb-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                      <img
                        src={following.profilePicture 
                          ? `http://localhost:5000${following.profilePicture}` 
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(following.name)}&background=8b5cf6&color=fff&size=40`}
                        alt={following.name}
                        className="rounded-circle"
                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                      />
                      <div className="flex-grow-1">
                        <h6 className="mb-0 fw-semibold">{following.name}</h6>
                        <small className="text-muted">You follow them</small>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted py-4">You aren't following anyone yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom SocialSphere Styles */}
      <style jsx>{`
        .socialsphere-dashboard {
          min-height: 100vh;
          background: #fafafa;
          position: relative;
        }
        .dashboard-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 25%, #a855f7 50%, #c084fc 75%, #e879f9 100%);
          z-index: -2;
        }
        .bg-pattern {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: 
            radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
          animation: float 20s ease-in-out infinite;
        }

        /* NAVIGATION */
        .socialsphere-nav {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(139, 92, 246, 0.1);
          padding: 1rem 0;
          position: sticky;
          top: 0;
          z-index: 1000;
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.1);
        }
        .nav-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .nav-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 800;
          font-size: 1.5rem;
          color: #8b5cf6;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .nav-brand:hover {
          transform: scale(1.05);
        }
        .brand-icon {
          font-size: 2rem;
          background: linear-gradient(45deg, #8b5cf6, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .brand-text {
          background: linear-gradient(45deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .nav-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(45deg, #8b5cf6, #c084fc);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }
        .nav-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4);
        }
        .nav-profile {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          cursor: pointer;
          border: 3px solid transparent;
          background: linear-gradient(45deg, #8b5cf6, #c084fc);
          padding: 2px;
          transition: all 0.3s ease;
        }
        .nav-profile:hover {
          transform: scale(1.1);
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4);
        }
        .nav-profile img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          background: white;
        }
        .notification-dot {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid white;
        }

        /* DASHBOARD CONTENT */
        .dashboard-content {
          padding: 2rem 0;
          position: relative;
          z-index: 1;
        }
        .sidebar-content {
          position: sticky;
          top: 120px;
          height: fit-content;
        }
        .profile-card {
          background: white;
          border-radius: 20px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 30px rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.1);
        }
        .profile-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .profile-avatar-container {
          background: linear-gradient(45deg, #8b5cf6, #c084fc);
          border-radius: 50%;
          padding: 3px;
          display: inline-block;
        }
        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          background: white;
        }
        .profile-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }
        .profile-bio {
          color: #6b7280;
          font-size: 0.9rem;
          line-height: 1.4;
          margin: 0;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .stories-section {
          background: white;
          border-radius: 20px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 30px rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.1);
        }
        .section-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
        }
        .section-title i {
          color: #8b5cf6;
        }

        /* RESPONSIVE ADJUSTMENTS */
        @media (max-width: 768px) {
          .sidebar-content {
            position: static;
            padding: 0;
            margin-top: 1rem;
          }
          .stories-section {
            margin: 0 -15px 1.5rem;
            border-radius: 0;
            border-left: none;
            border-right: none;
          }
          .profile-card {
            margin-bottom: 1rem;
            border-radius: 12px;
          }
          .nav-brand {
            font-size: 1.25rem;
          }
          .brand-icon {
            font-size: 1.5rem;
          }
          .dashboard-content {
            padding: 1rem 0;
          }
          .profile-avatar {
            width: 60px;
            height: 60px;
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }
      `}</style>

      {/* Bootstrap JS */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    </>
  );
};

export default Dashboard;