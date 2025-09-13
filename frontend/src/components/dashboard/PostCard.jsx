// src/components/PostCard.jsx
import React from 'react';
import ReactionButtons from './ReactionButtons';

const PostCard = ({ 
  post, 
  user,
  commentTexts,
  submittingComment,
  showComments,
  toggleComments,
  handleAddComment,
  handleReaction,
  formatDate,
  setCommentTexts,
  setSubmittingComment,
  setShowComments
}) => {
  return (
    <div key={post._id} className="mb-4 w-100">
      {/* Full-width card */}
      <div className="card border-0 shadow-sm rounded-4">
        {/* Header */}
        <div className="card-header border-0 bg-white rounded-4 rounded-bottom-0">
          <div className="d-flex align-items-center">
            <img
              src={post.author.profilePicture ? `http://localhost:5000${post.author.profilePicture}` : `https://via.placeholder.com/36x36/667eea/ffffff?text=${post.author.name.charAt(0)}`}
              alt={post.author.name}
              className="rounded-circle me-3"
              style={{ width: '36px', height: '36px', objectFit: 'cover' }}
            />
            <div className="flex-grow-1">
              <h6 className="mb-0 fw-semibold text-dark small">{post.author.name}</h6>
              <small className="text-muted">{formatDate(post.createdAt)}</small>
            </div>
            {post.author._id === user._id && (
              <span className="badge bg-primary rounded-pill px-2 py-1 small">You</span>
            )}
          </div>
        </div>

        {/* Image/Video Content */}
        <div className="card-body p-0">
          {post.image && (
            <div className="position-relative overflow-hidden">
              {post.image.includes('.mp4') || post.image.includes('.mov') || post.image.includes('.avi') ? (
                <video 
                  controls 
                  className="w-100" 
                  style={{ maxHeight: '500px', objectFit: 'cover', borderRadius: '0 0 20px 20px' }}
                  src={`http://localhost:5000${post.image}`}
                />
              ) : (
                <img 
                  src={`http://localhost:5000${post.image}`} 
                  alt="Post content" 
                  className="w-100"
                  style={{ maxHeight: '500px', objectFit: 'cover', borderRadius: '0 0 20px 20px' }}
                />
              )}
            </div>
          )}

          {/* Text Content */}
          <div className="p-4">
            <p className="mb-4 text-secondary lh-base" style={{ fontSize: '0.95rem' }}>
              {post.text}
            </p>

            {/* Reactions + Comments Button */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <button
                className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                onClick={() => toggleComments(post._id)}
              >
                <i className="bi bi-chat-dots me-1"></i>
                {post.commentCount}
                <i className={`bi bi-chevron-${showComments[post._id] ? 'up' : 'down'} ms-1`}></i>
              </button>

              {/* Reaction Buttons - Optional but recommended */}
              <ReactionButtons 
                post={post} 
                user={user} 
                onReaction={handleReaction} 
              />
            </div>

            {/* Comments List */}
            {showComments[post._id] && (
              <>
                {post.comments && post.comments.length > 0 && (
                  <div className="mb-4">
                    <div 
                      style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }} 
                      className="pe-2"
                    >
                      {post.comments.map((comment, index) => (
                        <div key={index} className="d-flex mb-3">
                          <img
                            src={comment.author.profilePicture ? `http://localhost:5000${comment.author.profilePicture}` : `https://via.placeholder.com/28x28/667eea/ffffff?text=${comment.author.name.charAt(0)}`}
                            alt={comment.author.name}
                            className="rounded-circle me-3"
                            style={{ width: '28px', height: '28px', objectFit: 'cover' }}
                          />
                          <div className="flex-grow-1">
                            <div className="bg-light rounded-3 p-3" style={{ fontSize: '0.85rem' }}>
                              <div className="d-flex align-items-center mb-1">
                                <strong className="text-dark mb-0">{comment.author.name}</strong>
                                {comment.author._id === user._id && (
                                  <span className="badge bg-primary ms-2 px-2 py-1" style={{ fontSize: '0.65rem' }}>You</span>
                                )}
                              </div>
                              <p className="mb-0 text-secondary">{comment.text}</p>
                            </div>
                            <small className="text-muted d-block mt-1 ms-3">{formatDate(comment.createdAt)}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comment Input */}
                <div className="d-flex gap-3 align-items-center">
                  <img
                    src={user.profilePicture ? `http://localhost:5000${user.profilePicture}` : `https://via.placeholder.com/28x28/667eea/ffffff?text=${user.name.charAt(0)}`}
                    alt="Your profile"
                    className="rounded-circle"
                    style={{ width: '28px', height: '28px', objectFit: 'cover' }}
                  />
                  <div className="flex-grow-1">
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-pill"
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
                        className="btn btn-primary btn-sm rounded-pill px-4"
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
    </div>
  );
};

export default PostCard;