// src/components/dashboard/FeedSection.jsx
import React from 'react';
import PostCard from './PostCard';

const FeedSection = ({ 
  posts, 
  postsLoading,
  commentTexts,
  submittingComment,
  showComments,
  toggleComments,
  handleAddComment,
  handleReaction,
  user,
  userPostCount,
  formatDate,
  fetchPosts,
  setCommentTexts,
  setSubmittingComment,
  setShowComments,
  // 👇 NEW: Pass fetchUserData to PostCard
  fetchUserData
}) => {
  return (
    <div className="row">
      <div className="col-12">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="text-white fw-bold mb-0">Your Feed</h3>
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
            <div className="row">
              {posts.map((post) => (
                <PostCard 
                  key={post._id}
                  post={post}
                  user={user}
                  commentTexts={commentTexts}
                  submittingComment={submittingComment}
                  showComments={showComments}
                  toggleComments={toggleComments}
                  handleAddComment={handleAddComment}
                  handleReaction={handleReaction}
                  formatDate={formatDate}
                  setCommentTexts={setCommentTexts}
                  setSubmittingComment={setSubmittingComment}
                  setShowComments={setShowComments}
                  // 👇 CRITICAL: Pass fetchUserData to PostCard
                  fetchUserData={fetchUserData}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedSection;