// src/components/StoryModal.jsx
import React, { useState, useEffect, useRef } from 'react';

const StoryModal = ({ 
  show, 
  onClose, 
  currentStoryUser, 
  currentStoryIndex, 
  setCurrentStoryIndex,
  stories 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressIntervalRef = useRef(null);
  const autoAdvanceIntervalRef = useRef(null);

  if (!show || !currentStoryUser) return null;

  // Filter stories by author._id
  const userStories = stories.filter(s => s.author?._id === currentStoryUser._id);
  const currentStory = userStories[currentStoryIndex];

  // Safety: close if story is missing
  if (!currentStory) {
    onClose();
    return null;
  }

  const STORY_DURATION = 5000; // 5 seconds

  const goToNext = () => {
    if (currentStoryIndex < userStories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goToPrev = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setProgress(0);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      goToNext();
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToPrev();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const startProgress = () => {
    setProgress(0);
    const startTime = Date.now();
    
    progressIntervalRef.current = setInterval(() => {
      if (!isPaused) {
        const elapsed = Date.now() - startTime;
        const newProgress = (elapsed / STORY_DURATION) * 100;
        
        if (newProgress >= 100) {
          clearInterval(progressIntervalRef.current);
          goToNext();
        } else {
          setProgress(newProgress);
        }
      }
    }, 50);
  };

  const pauseStory = () => {
    setIsPaused(true);
  };

  const resumeStory = () => {
    setIsPaused(false);
  };

  // Reset progress when story changes
  useEffect(() => {
    setIsLoading(true);
    setProgress(0);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // Start progress after a short delay to allow media to load
    const timer = setTimeout(() => {
      setIsLoading(false);
      startProgress();
    }, 300);

    return () => {
      clearTimeout(timer);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentStoryIndex]);

  // Keyboard events
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStoryIndex, userStories.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (autoAdvanceIntervalRef.current) {
        clearInterval(autoAdvanceIntervalRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 10000,
        backdropFilter: 'blur(10px)',
        animation: 'fadeIn 0.3s ease-out'
      }}
    >
      {/* Backdrop click handler */}
      <div 
        className="position-absolute w-100 h-100"
        onClick={goToNext}
        style={{ cursor: 'pointer' }}
      />

      {/* Main Story Container */}
      <div 
        className="position-relative bg-black rounded-4 overflow-hidden shadow-lg"
        style={{
          width: 'min(90vw, 400px)',
          height: 'min(90vh, 700px)',
          maxWidth: '400px',
          maxHeight: '700px',
          animation: 'storySlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bars */}
        <div className="position-absolute top-0 start-0 w-100 p-3 z-3">
          <div className="d-flex gap-1">
            {userStories.map((_, index) => (
              <div
                key={index}
                className="flex-grow-1 bg-white bg-opacity-25 rounded-pill overflow-hidden"
                style={{ height: '3px' }}
              >
                <div
                  className="h-100 bg-white transition-all"
                  style={{
                    width: index < currentStoryIndex 
                      ? '100%' 
                      : index === currentStoryIndex 
                        ? `${progress}%` 
                        : '0%',
                    transition: index === currentStoryIndex ? 'none' : 'width 0.3s ease'
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="position-absolute top-0 start-0 w-100 p-3 pt-5 z-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <div className="position-relative">
                <img
                  src={currentStoryUser.profilePicture 
                    ? `http://localhost:5000${currentStoryUser.profilePicture}` 
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStoryUser.name)}&background=667eea&color=fff&size=40`}
                  alt={currentStoryUser.name}
                  className="rounded-circle border border-2 border-white"
                  style={{ 
                    width: '40px', 
                    height: '40px', 
                    objectFit: 'cover',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}
                />
              </div>
              <div className="ms-3">
                <h6 className="mb-0 text-white fw-semibold text-shadow">
                  {currentStoryUser.name}
                </h6>
                <small className="text-white-50">
                  {new Date(currentStory.createdAt).toLocaleDateString()}
                </small>
              </div>
            </div>
            
            <button 
              type="button" 
              className="btn btn-link text-white p-0 lh-1"
              onClick={onClose}
              style={{ 
                fontSize: '24px',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Story Content */}
        <div 
          className="w-100 h-100 position-relative overflow-hidden bg-gradient"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
          onMouseDown={pauseStory}
          onMouseUp={resumeStory}
          onTouchStart={pauseStory}
          onTouchEnd={resumeStory}
        >
          {currentStory?.media.includes('.mp4') || 
           currentStory?.media.includes('.mov') || 
           currentStory?.media.includes('.avi') ? (
            <video 
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-100 h-100 object-fit-cover"
              src={`http://localhost:5000${currentStory.media}`}
              onLoadStart={() => setIsLoading(true)}
              onCanPlay={() => setIsLoading(false)}
              style={{
                transition: 'transform 0.3s ease',
                transform: isPaused ? 'scale(1.02)' : 'scale(1)'
              }}
            />
          ) : (
            <img 
              src={`http://localhost:5000${currentStory.media}`} 
              alt="Story" 
              className="w-100 h-100 object-fit-cover"
              onLoad={() => setIsLoading(false)}
              style={{
                transition: 'transform 0.3s ease',
                transform: isPaused ? 'scale(1.02)' : 'scale(1)'
              }}
            />
          )}

          {/* Loading overlay */}
          {isLoading && (
            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-black bg-opacity-50">
              <div className="spinner-border text-light" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}

          {/* Pause indicator */}
          {isPaused && (
            <div className="position-absolute top-50 start-50 translate-middle">
              <div className="bg-black bg-opacity-50 rounded-circle p-3 animate-pulse">
                <i className="bi bi-pause-fill text-white fs-1"></i>
              </div>
            </div>
          )}

          {/* Navigation areas (invisible) */}
          <div 
            className="position-absolute top-0 start-0 h-100"
            style={{ width: '30%', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
          />
          <div 
            className="position-absolute top-0 end-0 h-100"
            style={{ width: '70%', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
          />
        </div>

        {/* Navigation hints (desktop only) */}
        <div className="d-none d-md-block">
          {currentStoryIndex > 0 && (
            <div className="position-absolute top-50 start-0 translate-middle-y ms-2 opacity-50">
              <div className="bg-black bg-opacity-25 rounded-circle p-2">
                <i className="bi bi-chevron-left text-white"></i>
              </div>
            </div>
          )}
          
          {currentStoryIndex < userStories.length - 1 && (
            <div className="position-absolute top-50 end-0 translate-middle-y me-2 opacity-50">
              <div className="bg-black bg-opacity-25 rounded-circle p-2">
                <i className="bi bi-chevron-right text-white"></i>
              </div>
            </div>
          )}
        </div>

        {/* Story Counter */}
        <div className="position-absolute bottom-0 end-0 m-3">
          <span className="badge bg-black bg-opacity-50 text-white px-2 py-1 rounded-pill small">
            {currentStoryIndex + 1} / {userStories.length}
          </span>
        </div>
      </div>

      {/* Custom styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes storySlideIn {
          from { 
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        .text-shadow {
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
        
        .transition-all {
          transition: all 0.3s ease;
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: .8;
          }
        }
        
        /* Hide scrollbar but keep functionality */
        ::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default StoryModal;