// src/components/CommentSection.jsx
import React from 'react';

const CommentSection = ({ post, user, commentText, onCommentChange, onAddComment, isSubmittingComment, formatDate }) => {
  return (
    <>
      {post.comments && post.comments.length > 0 && (
        <div className="mb-3">
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {post.comments.map((comment, index) => (
              <div key={index} className="d-flex mb-2">
                <img
                  src={comment.author.profilePicture ? `http://localhost:5000${comment.author.profilePicture}` : `https://via.placeholder.com/24x24/667eea/white?text=${comment.author.name.charAt(0)}`}
                  alt={comment.author.name}
                  className="rounded-circle me-2"
                  style={{ width: '24px', height: '24px', objectFit: 'cover' }}
                />
                <div className="flex-grow-1">
                  <div className="bg-light rounded p-2">
                    <h6 className="mb-1 fw-semibold" style={{ fontSize: '0.8rem' }}>
                      {comment.author.name}
                      {comment.author._id === user._id && (
                        <span className="badge bg-primary ms-1" style={{ fontSize: '0.5rem' }}>You</span>
                      )}
                    </h6>
                    <p className="mb-0" style={{ fontSize: '0.75rem' }}>{comment.text}</p>
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
          src={user.profilePicture ? `http://localhost:5000${user.profilePicture}` : `https://via.placeholder.com/24x24/667eea/white?text=${user.name.charAt(0)}`}
          alt="Your profile"
          className="rounded-circle"
          style={{ width: '24px', height: '24px', objectFit: 'cover' }}
        />
        <div className="flex-grow-1">
          <div className="input-group">
            <input
              type="text"
              className="form-control form-control-sm rounded-pill"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => onCommentChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  onAddComment();
                }
              }}
              disabled={isSubmittingComment}
            />
            <button
              className="btn btn-primary btn-sm rounded-pill ms-2"
              onClick={onAddComment}
              disabled={isSubmittingComment || !commentText.trim()}
            >
              {isSubmittingComment ? (
                <span className="spinner-border spinner-border-sm" role="status"></span>
              ) : (
                <i className="bi bi-send"></i>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CommentSection;