import React, { useState } from "react";


const Uploads = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [description, setDescription] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file || !description) {
      alert("Please select an image and enter a description!");
      return;
    }

    // TODO: send file + description to backend
    console.log("Uploading:", { file, description });

    // reset form
    setFile(null);
    setPreview(null);
    setDescription("");
  };

  return (
    <div className="uploads-container">
      <h2>Upload Image</h2>
      <form onSubmit={handleSubmit} className="uploads-form">
        <div className="form-group">
          <label htmlFor="file">Select Image:</label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>

        {preview && (
          <div className="preview">
            <img src={preview} alt="Preview" />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a description..."
          ></textarea>
        </div>

        <button type="submit" className="upload-btn">Upload</button>
      </form>
    </div>
  );
  
};

export default Uploads;
