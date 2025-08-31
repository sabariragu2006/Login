import React, { useState } from "react";

const Uploads = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setUploadSuccess(false);

    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file || !description.trim()) {
      alert("Please select a file and enter a description!");
      return;
    }

    // Get user from localStorage
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      alert("Please login to upload posts!");
      return;
    }

    const user = JSON.parse(storedUser);

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('postImage', file);
      formData.append('userId', user._id);
      formData.append('content', description.trim());

      const response = await fetch('http://localhost:5000/add-post', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload post');
      }

      const data = await response.json();
      
      setUploadSuccess(true);
      
      // Reset form
      setFile(null);
      setPreview(null);
      setDescription("");
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      
      setTimeout(() => setUploadSuccess(false), 3000);
      
    } catch (err) {
      console.error('Upload error:', err);
      alert(err.message || 'Failed to upload post');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* Bootstrap CSS */}
      <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.0/font/bootstrap-icons.min.css" />
      
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-6 col-md-8">
              <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                <div className="card-header border-0 text-center" style={{ borderRadius: '20px 20px 0 0', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <h2 className="text-white fw-bold mb-0">
                    <i className="bi bi-cloud-upload me-2"></i>
                    Upload Post
                  </h2>
                </div>
                
                <div className="card-body p-4">
                  {uploadSuccess && (
                    <div className="alert alert-success alert-dismissible fade show" role="alert">
                      <i className="bi bi-check-circle me-2"></i>
                      Post uploaded successfully!
                      <button type="button" className="btn-close" onClick={() => setUploadSuccess(false)}></button>
                    </div>
                  )}
                  
                  <div>
                    {/* File Upload */}
                    <div className="mb-4">
                      <label htmlFor="file" className="form-label fw-semibold">
                        <i className="bi bi-image me-2"></i>
                        Select Image or Video
                      </label>
                      <input 
                        type="file" 
                        id="file"
                        className="form-control"
                        accept="image/*,video/*" 
                        onChange={handleFileChange}
                        disabled={uploading}
                        style={{ borderRadius: '12px' }}
                      />
                      <div className="form-text">
                        <i className="bi bi-info-circle me-1"></i>
                        Supported formats: Images (JPG, PNG, GIF) and Videos (MP4, MOV, AVI). Max size: 50MB
                      </div>
                    </div>

                    {/* Preview */}
                    {preview && (
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Preview</label>
                        <div className="border rounded-3 overflow-hidden" style={{ maxHeight: '300px' }}>
                          {file && (file.type.startsWith('video/') ? (
                            <video 
                              src={preview} 
                              controls 
                              className="w-100 h-100"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <img 
                              src={preview} 
                              alt="Preview" 
                              className="w-100 h-100"
                              style={{ objectFit: 'cover' }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div className="mb-4">
                      <label htmlFor="description" className="form-label fw-semibold">
                        <i className="bi bi-chat-text me-2"></i>
                        Description
                      </label>
                      <textarea
                        id="description"
                        className="form-control"
                        rows="4"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What's on your mind? Share your thoughts about this post..."
                        disabled={uploading}
                        style={{ borderRadius: '12px', resize: 'none' }}
                      />
                      <div className="form-text">
                        {description.length}/500 characters
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="d-grid gap-2">
                      <button 
                        onClick={handleSubmit} 
                        className="btn btn-lg rounded-pill"
                        disabled={uploading || !file || !description.trim()}
                        style={{
                          background: uploading ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: 'none',
                          color: 'white',
                          fontWeight: '600',
                          padding: '16px'
                        }}
                      >
                        {uploading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-upload me-2"></i>
                            Share Post
                          </>
                        )}
                      </button>
                      
                      {(file || description) && !uploading && (
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary rounded-pill"
                          onClick={() => {
                            setFile(null);
                            setPreview(null);
                            setDescription("");
                            const fileInput = document.querySelector('input[type="file"]');
                            if (fileInput) fileInput.value = '';
                          }}
                        >
                          <i className="bi bi-x-circle me-2"></i>
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="card-footer border-0 text-center" style={{ borderRadius: '0 0 20px 20px' }}>
                  <small className="text-muted">
                    <i className="bi bi-shield-check me-1"></i>
                    Your content will be visible to all users
                  </small>
                </div>
              </div>
              
              {/* Back to Dashboard */}
              <div className="text-center mt-3">
                <button 
                  className="btn btn-light rounded-pill px-4"
                  onClick={() => window.location.href = '/dashboard'}
                  disabled={uploading}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Uploads;