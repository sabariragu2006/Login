import React, { useEffect, useState } from "react";

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

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAllPosts(); // Changed from fetchUserPosts to fetchAllPosts
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Get user from localStorage
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

  // Changed function name and endpoint to fetch all posts
  const fetchAllPosts = async () => {
    if (!user) return;
    
    try {
      setPostsLoading(true);
      
      const response = await fetch(`http://localhost:5000/posts?userId=${user._id}`, {
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
      
      // Update the specific post with new comment
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
      
      // Clear comment text
      setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      
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
      
      // Update the specific post with new reaction data
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
      
      // Update user state and localStorage
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

  // Calculate user's own post count for the profile card
  const userPostCount = posts.filter(post => post.author._id === user._id).length;

  return (
    <>
      {/* Bootstrap CSS */}
      <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.0/font/bootstrap-icons.min.css" />
      
      {/* Main Dashboard */}
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div className="container">
          <div className="row">
            {/* User Info Card */}
            <div className="col-md-4 mb-4">
              <div className="card shadow-lg border-0" style={{ borderRadius: '20px', position: 'sticky', top: '20px' }}>
                <div className="card-body text-center p-4">
                  {/* Profile Picture */}
                  <div className="position-relative d-inline-block mb-3">
                    <img
                      src={user.profilePicture ? `http://localhost:5000${user.profilePicture}` : "https://via.placeholder.com/100x100/667eea/white?text=" + user.name.charAt(0)}
                      alt="Profile"
                      className="rounded-circle"
                      style={{ width: '100px', height: '100px', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </div>

                  {/* User Info */}
                  <h4 className="card-title fw-bold mb-1">{user.name}</h4>
                  <p className="text-muted mb-3">{user.email}</p>

                  {/* Stats */}
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

                  {/* Profile Button */}
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
                  </button>
                </div>
              </div>
            </div>

            {/* Posts Section */}
            <div className="col-md-8">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="text-white fw-bold mb-0">All Posts</h3>
                <button 
                  className="btn btn-light rounded-pill"
                  onClick={fetchAllPosts}
                  disabled={postsLoading}
                >
                  {postsLoading ? (
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  ) : (
                    <i className="bi bi-arrow-clockwise me-2"></i>
                  )}
                  Refresh
                </button>
              </div>

              {postsLoading ? (
                <div className="text-center text-white">
                  <div className="spinner-border mb-3" role="status">
                    <span className="visually-hidden">Loading posts...</span>
                  </div>
                  <p>Loading all posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="card border-0 shadow-sm" style={{ borderRadius: '20px' }}>
                  <div className="card-body text-center p-5">
                    <i className="bi bi-camera2 text-muted" style={{ fontSize: '3rem' }}></i>
                    <h5 className="mt-3 text-muted">No posts yet</h5>
                    <p className="text-muted">Be the first to share something!</p>
                  </div>
                </div>
              ) : (
                <div className="posts-container">
                  {posts.map((post) => (
                    <div key={post._id} className="card border-0 shadow-sm mb-4" style={{ borderRadius: '20px' }}>
                      {/* Post Header */}
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
                          {/* Show "You" indicator for user's own posts */}
                          {post.author._id === user._id && (
                            <span className="badge bg-primary rounded-pill">You</span>
                          )}
                        </div>
                      </div>

                      <div className="card-body p-0">
                        {/* Post Image/Video */}
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

                        {/* Post Content */}
                        <div className="p-3">
                          <p className="mb-3">{post.text}</p>

                          {/* Reactions */}
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
                            <small className="text-muted">
                              {post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}
                            </small>
                          </div>

                          {/* Comments */}
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

                          {/* Add Comment */}
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

      {/* Bootstrap Modal for Profile Details */}
      {showProfileModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
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
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold text-muted small">Full Name</label>
                    <div className="form-control-plaintext border rounded p-2 bg-light">{user.name}</div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold text-muted small">Email</label>
                    <div className="form-control-plaintext border rounded p-2 bg-light">{user.email}</div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold text-muted small">Your Posts</label>
                    <div className="form-control-plaintext border rounded p-2 bg-light">{userPostCount}</div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold text-muted small">Member Since</label>
                    <div className="form-control-plaintext border rounded p-2 bg-light">2024</div>
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
                        <h4 className="fw-bold mb-0">{posts.length}</h4>
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

      {/* Bootstrap JS */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    </>
  );
};

export default Dashboard;