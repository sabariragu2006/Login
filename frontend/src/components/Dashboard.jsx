import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [bio, setBio] = useState("");
  const [updating, setUpdating] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [commentTexts, setCommentTexts] = useState({});
  const [submittingComment, setSubmittingComment] = useState({});
  const [showComments, setShowComments] = useState({});
  
  // New states for follow system
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [followRequests, setFollowRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [followingUsers, setFollowingUsers] = useState([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAllUsers();
      fetchFollowRequests();
      fetchNotifications();
      fetchPosts(); // Now fetches posts from followed users only
    }
  }, [user]);

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
      setBio(data.user.bio || "");
      
      localStorage.setItem("user", JSON.stringify(data.user));
      
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await fetch(`http://localhost:5000/users?excludeId=${user._id}`, {
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
      
      // Fetch posts only from followed users
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

  const sendFollowRequest = async (targetUserId) => {
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
        const data = await response.json();
        // Update the user's follow status in the UI
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
    try {
      const response = await fetch('http://localhost:5000/handle-follow-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          requestId,
          action // 'accept' or 'reject'
        })
      });

      if (response.ok) {
        // Refresh follow requests and notifications
        fetchFollowRequests();
        fetchNotifications();
        fetchUserData(); // Refresh user data to update follower/following counts
        
        if (action === 'accept') {
          fetchPosts(); // Refresh posts to show new followed user's posts
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

  const toggleComments = (postId) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleAddComment = async (postId) => {
    const commentText = commentTexts[postId];
    if (!commentText || !commentText.trim()) return;

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

  const handleReaction = async (postId, reactionType) => {
    try {
      const response = await fetch('http://localhost:5000/add-reaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user._id,
          postId: postId,
          reactionType: reactionType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add reaction');
      }

      const data = await response.json();
      
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post._id === postId) {
            return data.post;
          }
          return post;
        })
      );
      
    } catch (err) {
      console.error('Error adding reaction:', err);
      alert(err.message || 'Failed to add reaction');
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center text-white">
          <div className="spinner-border text-light mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h4>Loading Dashboard</h4>
          <p>Fetching your data...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center text-white">
          <h4>Error Loading Dashboard</h4>
          <p>{error || "Please login to view your dashboard"}</p>
          <button className="btn btn-light mt-3" onClick={fetchUserData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const userPostCount = posts.filter(post => post.author._id === user._id).length;

  return (
    <>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.0/font/bootstrap-icons.min.css" />
      
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div className="container">
          {/* Other Users Section - Top of page */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                <div className="card-header border-0 bg-white" style={{ borderRadius: '20px 20px 0 0' }}>
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-people me-2"></i>
                    Discover People
                  </h5>
                </div>
                <div className="card-body">
                  {usersLoading ? (
                    <div className="text-center">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading users...</span>
                      </div>
                    </div>
                  ) : allUsers.length === 0 ? (
                    <p className="text-muted text-center mb-0">No other users found</p>
                  ) : (
                    <div className="row">
                      {allUsers.slice(0, 6).map((otherUser) => (
                        <div key={otherUser._id} className="col-md-4 col-sm-6 mb-3">
                          <div className="card border-0 bg-light h-100">
                            <div className="card-body text-center p-3">
                              <img
                                src={otherUser.profilePicture ? `http://localhost:5000${otherUser.profilePicture}` : "https://via.placeholder.com/60x60/667eea/white?text=" + otherUser.name.charAt(0)}
                                alt={otherUser.name}
                                className="rounded-circle mb-2"
                                style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                              />
                              <h6 className="fw-bold mb-1">{otherUser.name}</h6>
                              <p className="text-muted small mb-2">{otherUser.postsCount} posts</p>
                              
                              {otherUser.followStatus === 'following' ? (
                                <button className="btn btn-success btn-sm rounded-pill" disabled>
                                  <i className="bi bi-check-lg me-1"></i>
                                  Following
                                </button>
                              ) : otherUser.followStatus === 'pending' ? (
                                <button className="btn btn-warning btn-sm rounded-pill" disabled>
                                  <i className="bi bi-clock me-1"></i>
                                  Pending
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-primary btn-sm rounded-pill"
                                  onClick={() => sendFollowRequest(otherUser._id)}
                                >
                                  <i className="bi bi-person-plus me-1"></i>
                                  Follow
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            {/* User Info Card */}
            <div className="col-md-4 mb-4">
              <div className="card shadow-lg border-0" style={{ borderRadius: '20px', position: 'sticky', top: '20px' }}>
                <div className="card-body text-center p-4">
                  <div className="position-relative d-inline-block mb-3">
                    <img
                      src={user.profilePicture ? `http://localhost:5000${user.profilePicture}` : "https://via.placeholder.com/100x100/667eea/white?text=" + user.name.charAt(0)}
                      alt="Profile"
                      className="rounded-circle"
                      style={{ width: '100px', height: '100px', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    {/* Notification badge */}
                    {notifications.length > 0 && (
                      <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                        {notifications.length}
                        <span className="visually-hidden">unread notifications</span>
                      </span>
                    )}
                  </div>

                  <h4 className="card-title fw-bold mb-1">{user.name}</h4>
                  <p className="text-muted mb-3">{user.email}</p>

                  <div className="row text-center mb-4">
                    <div className="col-4">
                      <h5 className="fw-bold text-primary mb-0">{userPostCount}</h5>
                      <small className="text-muted">Posts</small>
                    </div>
                    <div className="col-4">
                      <h5 className="fw-bold text-primary mb-0">{user.followers}</h5>
                      <small className="text-muted">Followers</small>
                    </div>
                    <div className="col-4">
                      <h5 className="fw-bold text-primary mb-0">{user.following}</h5>
                      <small className="text-muted">Following</small>
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary btn-lg w-100 rounded-pill"
                    onClick={() => setShowProfileModal(true)}
                    style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      fontWeight: '600'
                    }}
                  >
                    <i className="bi bi-person-circle me-2"></i>
                    View Profile Details
                    {notifications.length > 0 && (
                      <span className="badge bg-light text-primary ms-2">{notifications.length}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Posts Section */}
            <div className="col-md-8">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="text-white fw-bold mb-0">Your Feed</h3>
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-light rounded-pill"
                    onClick={fetchPosts}
                    disabled={postsLoading}
                  >
                    {postsLoading ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    ) : (
                      <i className="bi bi-arrow-clockwise me-2"></i>
                    )}
                    Refresh
                  </button>
                  <button onClick={() => navigate('/uploads')} className="btn btn-light rounded-pill">
                    <i className="bi bi-upload me-2"></i>
                    Upload Posts
                  </button>
                </div>
              </div>

              {postsLoading ? (
                <div className="text-center text-white">
                  <div className="spinner-border mb-3" role="status">
                    <span className="visually-hidden">Loading posts...</span>
                  </div>
                  <p>Loading your feed...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="card border-0 shadow-sm" style={{ borderRadius: '20px' }}>
                  <div className="card-body text-center p-5">
                    <i className="bi bi-people text-muted" style={{ fontSize: '3rem' }}></i>
                    <h5 className="mt-3 text-muted">Your feed is empty</h5>
                    <p className="text-muted">Follow people to see their posts in your feed!</p>
                  </div>
                </div>
              ) : (
                <div className="posts-container">
                  {posts.map((post) => (
                    <div key={post._id} className="card border-0 shadow-sm mb-4" style={{ borderRadius: '20px' }}>
                      <div className="card-header border-0 bg-white" style={{ borderRadius: '20px 20px 0 0' }}>
                        <div className="d-flex align-items-center">
                          <img
                            src={post.author.profilePicture ? `http://localhost:5000${post.author.profilePicture}` : "https://via.placeholder.com/40x40/667eea/white?text=" + post.author.name.charAt(0)}
                            alt={post.author.name}
                            className="rounded-circle me-3"
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                          />
                          <div className="flex-grow-1">
                            <h6 className="mb-0 fw-bold">{post.author.name}</h6>
                            <small className="text-muted">{formatDate(post.createdAt)}</small>
                          </div>
                          {post.author._id === user._id && (
                            <span className="badge bg-primary rounded-pill">You</span>
                          )}
                        </div>
                      </div>

                      <div className="card-body p-0">
                        {post.image && (
                          <div className="position-relative">
                            {post.image.includes('.mp4') || post.image.includes('.mov') || post.image.includes('.avi') ? (
                              <video 
                                controls 
                                className="w-100" 
                                style={{ maxHeight: '400px', objectFit: 'cover' }}
                                src={`http://localhost:5000${post.image}`}
                              />
                            ) : (
                              <img 
                                src={`http://localhost:5000${post.image}`} 
                                alt="Post content" 
                                className="w-100"
                                style={{ maxHeight: '400px', objectFit: 'cover' }}
                              />
                            )}
                          </div>
                        )}

                        <div className="p-3">
                          <p className="mb-3">{post.text}</p>

                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <div className="d-flex gap-3">
                              {['like', 'love', 'laugh', 'wow', 'sad', 'angry'].map((reactionType) => {
                                const count = post.reactions[reactionType] || 0;
                                const isActive = post.userReaction === reactionType;
                                const icons = {
                                  like: '👍',
                                  love: '❤️',
                                  laugh: '😂',
                                  wow: '😮',
                                  sad: '😢',
                                  angry: '😠'
                                };
                                
                                return (
                                  <button
                                    key={reactionType}
                                    className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-secondary'} rounded-pill`}
                                    onClick={() => handleReaction(post._id, reactionType)}
                                    style={{ minWidth: '60px' }}
                                  >
                                    <span className="me-1">{icons[reactionType]}</span>
                                    {count > 0 && <span>{count}</span>}
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => toggleComments(post._id)}
                            >
                              <i className="bi bi-chat me-1"></i>
                              {post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}
                              <i className={`bi bi-chevron-${showComments[post._id] ? 'up' : 'down'} ms-1`}></i>
                            </button>
                          </div>

                          {showComments[post._id] && (
                            <>
                              {post.comments && post.comments.length > 0 && (
                                <div className="mb-3">
                                  <h6 className="fw-bold mb-2">Comments</h6>
                                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {post.comments.map((comment, index) => (
                                      <div key={index} className="d-flex mb-2">
                                        <img
                                          src={comment.author.profilePicture ? `http://localhost:5000${comment.author.profilePicture}` : "https://via.placeholder.com/32x32/667eea/white?text=" + comment.author.name.charAt(0)}
                                          alt={comment.author.name}
                                          className="rounded-circle me-2"
                                          style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                                        />
                                        <div className="flex-grow-1">
                                          <div className="bg-light rounded p-2">
                                            <h6 className="mb-1 fw-semibold" style={{ fontSize: '0.9rem' }}>
                                              {comment.author.name}
                                              {comment.author._id === user._id && (
                                                <span className="badge bg-primary ms-1" style={{ fontSize: '0.6rem' }}>You</span>
                                              )}
                                            </h6>
                                            <p className="mb-0" style={{ fontSize: '0.85rem' }}>{comment.text}</p>
                                          </div>
                                          <small className="text-muted ms-2">{formatDate(comment.createdAt)}</small>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="d-flex gap-2">
                                <img
                                  src={user.profilePicture ? `http://localhost:5000${user.profilePicture}` : "https://via.placeholder.com/32x32/667eea/white?text=" + user.name.charAt(0)}
                                  alt="Your profile"
                                  className="rounded-circle"
                                  style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                                />
                                <div className="flex-grow-1">
                                  <div className="input-group">
                                    <input
                                      type="text"
                                      className="form-control rounded-pill"
                                      placeholder="Write a comment..."
                                      value={commentTexts[post._id] || ''}
                                      onChange={(e) => setCommentTexts(prev => ({ ...prev, [post._id]: e.target.value }))}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          handleAddComment(post._id);
                                        }
                                      }}
                                      disabled={submittingComment[post._id]}
                                    />
                                    <button
                                      className="btn btn-primary rounded-pill ms-2"
                                      onClick={() => handleAddComment(post._id)}
                                      disabled={submittingComment[post._id] || !commentTexts[post._id]?.trim()}
                                    >
                                      {submittingComment[post._id] ? (
                                        <span className="spinner-border spinner-border-sm" role="status"></span>
                                      ) : (
                                        <i className="bi bi-send"></i>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Modal with Notifications */}
      {showProfileModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content" style={{ borderRadius: '20px', border: 'none' }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Profile Details</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowProfileModal(false)}
                ></button>
              </div>
              
              <div className="modal-body">
                <div className="row">
                  {/* Left Column - Profile Info */}
                  <div className="col-md-6">
                    {/* Profile Picture Section */}
                    <div className="text-center mb-4">
                      <div className="position-relative d-inline-block">
                        <img
                          src={user.profilePicture ? `http://localhost:5000${user.profilePicture}` : "https://via.placeholder.com/120x120/667eea/white?text=" + user.name.charAt(0)}
                          alt="Profile"
                          className="rounded-circle"
                          style={{ width: '120px', height: '120px', objectFit: 'cover', border: '4px solid #667eea' }}
                        />
                        <label 
                          className="position-absolute bottom-0 end-0 btn btn-primary btn-sm rounded-circle"
                          style={{ width: '36px', height: '36px', padding: '0' }}
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
                    <div className="row">
                      <div className="col-12 mb-3">
                        <label className="form-label fw-semibold text-muted small">Full Name</label>
                        <div className="form-control-plaintext border rounded p-2 bg-light">{user.name}</div>
                      </div>
                      <div className="col-12 mb-3">
                        <label className="form-label fw-semibold text-muted small">Email</label>
                        <div className="form-control-plaintext border rounded p-2 bg-light">{user.email}</div>
                      </div>
                    </div>

                    {/* Bio Section */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold text-muted small">Bio</label>
                      <textarea
                        value={bio}
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

                    {/* Activity Stats */}
                    <div className="row text-center">
                      <div className="col-4">
                        <div className="card border-0 bg-primary text-white h-100">
                          <div className="card-body py-3">
                            <h4 className="fw-bold mb-0">{userPostCount}</h4>
                            <small>Posts</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="card border-0 bg-success text-white h-100">
                          <div className="card-body py-3">
                            <h4 className="fw-bold mb-0">{user.followers}</h4>
                            <small>Followers</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="card border-0 bg-info text-white h-100">
                          <div className="card-body py-3">
                            <h4 className="fw-bold mb-0">{user.following}</h4>
                            <small>Following</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Notifications */}
                  <div className="col-md-6">
                    <div className="card border-0 bg-light h-100">
                      <div className="card-header bg-transparent border-0">
                        <div className="d-flex justify-content-between align-items-center">
                          <h6 className="mb-0 fw-bold">
                            <i className="bi bi-bell me-2"></i>
                            Notifications
                          </h6>
                          {notifications.length > 0 && (
                            <span className="badge bg-primary rounded-pill">{notifications.length}</span>
                          )}
                        </div>
                      </div>
                      <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {/* Follow Requests */}
                        {followRequests.length > 0 && (
                          <div className="mb-4">
                            <h6 className="fw-semibold text-primary mb-3">Follow Requests</h6>
                            {followRequests.map((request) => (
                              <div key={request._id} className="d-flex align-items-center justify-content-between bg-white rounded p-3 mb-2 shadow-sm">
                                <div className="d-flex align-items-center">
                                  <img
                                    src={request.from.profilePicture ? `http://localhost:5000${request.from.profilePicture}` : "https://via.placeholder.com/40x40/667eea/white?text=" + request.from.name.charAt(0)}
                                    alt={request.from.name}
                                    className="rounded-circle me-3"
                                    style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                  />
                                  <div>
                                    <h6 className="mb-0 fw-semibold">{request.from.name}</h6>
                                    <small className="text-muted">wants to follow you</small>
                                  </div>
                                </div>
                                <div className="d-flex gap-2">
                                  <button
                                    className="btn btn-success btn-sm rounded-pill"
                                    onClick={() => handleFollowRequest(request._id, 'accept')}
                                  >
                                    <i className="bi bi-check-lg"></i>
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm rounded-pill"
                                    onClick={() => handleFollowRequest(request._id, 'reject')}
                                  >
                                    <i className="bi bi-x-lg"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Other Notifications */}
                        {notifications.length > 0 && (
                          <div>
                            <h6 className="fw-semibold text-info mb-3">Recent Activity</h6>
                            {notifications.map((notification, index) => (
                              <div key={index} className="d-flex align-items-center bg-white rounded p-3 mb-2 shadow-sm">
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
                                </div>
                                <div className="flex-grow-1">
                                  <p className="mb-1" style={{ fontSize: '0.9rem' }}>{notification.message}</p>
                                  <small className="text-muted">{formatDate(notification.createdAt)}</small>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Empty State */}
                        {followRequests.length === 0 && notifications.length === 0 && (
                          <div className="text-center text-muted py-5">
                            <i className="bi bi-bell-slash" style={{ fontSize: '3rem' }}></i>
                            <h6 className="mt-3">No notifications</h6>
                            <p className="small">You're all caught up!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-0 pt-0">
                <button 
                  type="button" 
                  className="btn btn-secondary rounded-pill px-4"
                  onClick={() => setShowProfileModal(false)}
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
        </div>
      )}

      <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    </>
  );
};

export default Dashboard;