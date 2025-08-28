import React, { useState, useEffect } from "react";
import axios from "axios";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [bio, setBio] = useState("");
  const [post, setPost] = useState("");
  const [posts, setPosts] = useState([]);

  // Load user from localStorage and fetch latest from backend
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser && storedUser._id) {
      fetchUser(storedUser._id);
    }
  }, []);

  // Fetch user details (bio + posts + profilePicture etc.)
  const fetchUser = async (id) => {
    try {
      const res = await axios.get(`http://localhost:5000/users/${id}`);
      const freshUser = res.data.user;
      setUser(freshUser);
      setBio(freshUser.bio || "");
      setPosts(freshUser.posts || []);
      localStorage.setItem("user", JSON.stringify(freshUser)); // keep storage in sync
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  // Update bio
  const handleBioUpdate = async () => {
    try {
      const res = await axios.put(
        `http://localhost:5000/update-bio/${user._id}`,
        { bio }
      );
      setBio(res.data.bio);
      fetchUser(user._id); // re-fetch user to sync state
      alert("Bio updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Error updating bio");
    }
  };

  // Add new post
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (post.trim() === "") return;
    try {
      const res = await axios.post("http://localhost:5000/add-post", {
        userId: user._id,
        content: post,
      });
      setPosts(res.data.posts); // backend returns updated posts
      setPost("");
    } catch (err) {
      console.error(err);
      alert("Error adding post");
    }
  };

  if (!user) return <h2>Loading...</h2>;

  return (
    <div style={styles.container}>
      {/* Profile Section */}
      <div style={styles.profileCard}>
        <img
          src={
            user.profilePicture
              ? `http://localhost:5000${user.profilePicture}`
              : "/default-avatar.png"
          }
          alt="Profile"
          style={styles.profilePic}
        />
        <h2>Hi, {user.name} 👋</h2>
        <p>{user.email}</p>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          style={styles.textarea}
        />
        <button onClick={handleBioUpdate} style={styles.button}>
          Save Bio
        </button>
      </div>

      {/* Create Post */}
      <div style={styles.postBox}>
        <h3>Create a Post</h3>
        <form onSubmit={handlePostSubmit}>
          <textarea
            value={post}
            onChange={(e) => setPost(e.target.value)}
            placeholder="What's on your mind?"
            style={styles.textarea}
          />
          <button type="submit" style={styles.button}>
            Post
          </button>
        </form>
      </div>

      {/* Posts Feed */}
      <div style={styles.feed}>
        <h3>Your Posts</h3>
        {posts.length === 0 ? (
          <p>No posts yet. Start posting!</p>
        ) : (
          posts.map((p) => (
            <div key={p._id} style={styles.postCard}>
              <p>{p.text}</p>
              <small>{new Date(p.createdAt).toLocaleString()}</small>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "800px",
    margin: "20px auto",
    fontFamily: "Arial, sans-serif",
  },
  profileCard: {
    background: "#f4f4f4",
    padding: "20px",
    borderRadius: "10px",
    textAlign: "center",
    marginBottom: "20px",
  },
  profilePic: { width: "100px", height: "100px", borderRadius: "50%" },
  postBox: {
    background: "#fff",
    padding: "20px",
    borderRadius: "10px",
    marginBottom: "20px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  },
  textarea: {
    width: "100%",
    minHeight: "60px",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    marginBottom: "10px",
  },
  button: {
    background: "#007bff",
    color: "#fff",
    padding: "10px 15px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  feed: { background: "#f9f9f9", padding: "20px", borderRadius: "10px" },
  postCard: {
    background: "#fff",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "10px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  },
};

export default Dashboard;
