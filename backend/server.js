// server.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const morgan = require('morgan');

const app = express();
const PORT = 5000;

// --- Ensure uploads dir exists ---
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// --- DB ---
mongoose
  .connect('mongodb://localhost:27017/myapp', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// --- Story Schema ---
const storySchema = new mongoose.Schema({
  media: { type: String, required: true }, // image or video path
  mediaType: { type: String, enum: ['image', 'video'], required: true },
  author: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    profilePicture: String
  },
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  }
});

const Story = mongoose.model('Story', storySchema);

// --- Reaction Schema ---
const reactionSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'], 
    required: true 
  },
  user: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    profilePicture: String
  },
  createdAt: { type: Date, default: Date.now }
});

// --- Comment Schema ---
const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    profilePicture: String
  },
  reactions: [reactionSchema],
  createdAt: { type: Date, default: Date.now }
});

// --- Post Schema ---
const postSchema = new mongoose.Schema({
  text: { type: String, required: true },
  image: String,
  author: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    profilePicture: String
  },
  reactions: [reactionSchema],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

// --- User Schema ---
const userSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: { type: String, unique: true, trim: true, lowercase: true },
  passwordHash: String,
  profilePicture: String,
  bio: { type: String, default: 'This is my bio...' },
  followers: { type: Number, default: 0 },
  following: { type: Number, default: 0 },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  stories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }]
});

userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

const User = mongoose.model('User', userSchema);

// --- Middleware ---
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Multer (file uploads) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '');
    let prefix = 'file';
    
    if (file.fieldname === 'profilePicture') prefix = 'profile';
    else if (file.fieldname === 'postImage') prefix = 'post';
    else if (file.fieldname === 'storyMedia') prefix = 'story';
    
    cb(null, `${prefix}-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos
  }
});

// --- Helpers ---
const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  profilePicture: u.profilePicture || null,
  bio: u.bio || '',
  followers: u.followers || 0,
  following: u.following || 0,
  posts: u.posts?.length || 0
});

const formatPost = (post, currentUserId = null) => {
  const reactionCounts = post.reactions.reduce((acc, reaction) => {
    acc[reaction.type] = (acc[reaction.type] || 0) + 1;
    return acc;
  }, {});

  const userReaction = currentUserId 
    ? post.reactions.find(r => r.user._id.toString() === currentUserId)?.type || null
    : null;

  return {
    _id: post._id,
    text: post.text,
    image: post.image,
    author: post.author,
    reactions: reactionCounts,
    userReaction,
    comments: post.comments || [],
    commentCount: post.comments?.length || 0,
    createdAt: post.createdAt
  };
};

const formatStory = (story, currentUserId = null) => ({
  _id: story._id,
  media: story.media,
  mediaType: story.mediaType,
  author: story.author,
  viewCount: story.viewers?.length || 0,
  viewed: currentUserId ? story.viewers.includes(currentUserId) : false,
  createdAt: story.createdAt,
  expiresAt: story.expiresAt
});

// --- Health ---
app.get('/', (_req, res) => res.json({ ok: true, service: 'myapp-api' }));

// --- Register ---
app.post('/register', upload.single('profilePicture'), async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Please fill all required fields.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User already exists.' });
    }

    const user = new User({
      name,
      email,
      profilePicture: req.file ? `/uploads/${req.file.filename}` : null,
    });
    await user.setPassword(password);
    await user.save();

    return res.json({
      message: 'User registered successfully',
      user: publicUser(user),
    });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Login ---
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return res.status(401).json({ message: 'Invalid email or password.' });

    return res.json({
      message: 'Login successful',
      user: publicUser(user),
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Add Post ---
app.post('/add-post', upload.single('postImage'), async (req, res) => {
  try {
    const { userId, content } = req.body || {};
    if (!userId) return res.status(400).json({ message: 'userId is required.' });
    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: 'Post content is required.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const newPost = new Post({
      text: content,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      author: {
        _id: user._id,
        name: user.name,
        profilePicture: user.profilePicture
      }
    });

    await newPost.save();

    user.posts.push(newPost._id);
    await user.save();

    return res.json({
      message: 'Post added',
      post: formatPost(newPost, userId),
    });
  } catch (err) {
    console.error('ADD POST ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Add Story ---
app.post('/add-story', upload.single('storyMedia'), async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) return res.status(400).json({ message: 'userId is required.' });
    if (!req.file) return res.status(400).json({ message: 'Story media is required.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

    const newStory = new Story({
      media: `/uploads/${req.file.filename}`,
      mediaType,
      author: {
        _id: user._id,
        name: user.name,
        profilePicture: user.profilePicture
      }
    });

    await newStory.save();

    user.stories.push(newStory._id);
    await user.save();

    return res.json({
      message: 'Story added',
      story: formatStory(newStory, userId)
    });
  } catch (err) {
    console.error('ADD STORY ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Get All Posts ---
app.get('/posts', async (req, res) => {
  try {
    const { userId } = req.query;
    
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .limit(50);

    const formattedPosts = posts.map(post => formatPost(post, userId));

    return res.json({ posts: formattedPosts });
  } catch (err) {
    console.error('GET POSTS ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Get User's Posts ---
app.get('/posts/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentUserId } = req.query;
    
    const posts = await Post.find({ 'author._id': userId })
      .sort({ createdAt: -1 });

    const formattedPosts = posts.map(post => formatPost(post, currentUserId));

    return res.json({ posts: formattedPosts });
  } catch (err) {
    console.error('GET USER POSTS ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Get All Stories ---
app.get('/stories', async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Get stories that haven't expired and group by user
    const stories = await Story.find({
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    // Group stories by user
    const groupedStories = {};
    stories.forEach(story => {
      const authorId = story.author._id.toString();
      if (!groupedStories[authorId]) {
        groupedStories[authorId] = {
          author: story.author,
          stories: []
        };
      }
      groupedStories[authorId].stories.push(formatStory(story, userId));
    });

    return res.json({ 
      stories: Object.values(groupedStories)
    });
  } catch (err) {
    console.error('GET STORIES ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- View Story ---
app.post('/view-story', async (req, res) => {
  try {
    const { userId, storyId } = req.body;
    
    if (!userId || !storyId) {
      return res.status(400).json({ message: 'userId and storyId are required.' });
    }

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: 'Story not found.' });

    if (!story.viewers.includes(userId)) {
      story.viewers.push(userId);
      await story.save();
    }

    return res.json({ message: 'Story viewed' });
  } catch (err) {
    console.error('VIEW STORY ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Add Reaction ---
app.post('/add-reaction', async (req, res) => {
  try {
    const { userId, postId, reactionType } = req.body;
    
    if (!userId || !postId || !reactionType) {
      return res.status(400).json({ message: 'userId, postId, and reactionType are required.' });
    }

    const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];
    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ message: 'Invalid reaction type.' });
    }

    const user = await User.findById(userId);
    const post = await Post.findById(postId);

    if (!user || !post) {
      return res.status(404).json({ message: 'User or post not found.' });
    }

    // Remove existing reaction from this user
    post.reactions = post.reactions.filter(r => r.user._id.toString() !== userId);

    // Add new reaction
    post.reactions.push({
      type: reactionType,
      user: {
        _id: user._id,
        name: user.name,
        profilePicture: user.profilePicture
      }
    });

    await post.save();

    return res.json({
      message: 'Reaction added',
      post: formatPost(post, userId)
    });
  } catch (err) {
    console.error('ADD REACTION ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Remove Reaction ---
app.delete('/remove-reaction', async (req, res) => {
  try {
    const { userId, postId } = req.body;
    
    if (!userId || !postId) {
      return res.status(400).json({ message: 'userId and postId are required.' });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    post.reactions = post.reactions.filter(r => r.user._id.toString() !== userId);
    await post.save();

    return res.json({
      message: 'Reaction removed',
      post: formatPost(post, userId)
    });
  } catch (err) {
    console.error('REMOVE REACTION ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Add Comment ---
app.post('/add-comment', async (req, res) => {
  try {
    const { userId, postId, text } = req.body || {};
    
    if (!userId || !postId || !text) {
      return res.status(400).json({ message: 'userId, postId, and text are required.' });
    }

    if (!text.trim()) {
      return res.status(400).json({ message: 'Comment text cannot be empty.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    const newComment = {
      text: text.trim(),
      author: {
        _id: user._id,
        name: user.name,
        profilePicture: user.profilePicture
      }
    };

    post.comments.push(newComment);
    await post.save();

    const addedComment = post.comments[post.comments.length - 1];

    return res.json({
      message: 'Comment added',
      comment: addedComment,
      commentCount: post.comments.length
    });
  } catch (err) {
    console.error('ADD COMMENT ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Get User Info ---
app.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id) return res.status(400).json({ message: 'User id is required.' });

    const user = await User.findById(id).populate('posts');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.error('GET USER ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Delete Post ---
app.delete('/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required.' });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    if (post.author._id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this post.' });
    }

    if (post.image) {
      const imagePath = path.join(__dirname, post.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await User.findByIdAndUpdate(userId, {
      $pull: { posts: postId }
    });

    await Post.findByIdAndDelete(postId);

    return res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('DELETE POST ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- 404 fallback ---
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

// --- Global error handler ---
app.use((err, _req, res, _next) => {
  console.error('UNCAUGHT ERROR:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 50MB.' });
    }
    return res.status(400).json({ message: 'File upload error.' });
  }

  if (err.message === 'Only image and video files are allowed!') {
    return res.status(400).json({ message: 'Only image and video files are allowed.' });
  }

  res.status(500).json({ message: 'Server error.' });
});

// --- Clean up expired stories (optional cron job) ---
setInterval(async () => {
  try {
    await Story.deleteMany({ expiresAt: { $lt: new Date() } });
    console.log('🧹 Cleaned up expired stories');
  } catch (err) {
    console.error('Story cleanup error:', err);
  }
}, 60 * 60 * 1000); // Run every hour

// --- Start ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${UPLOADS_DIR}`);
  console.log(`🌐 CORS enabled for: http://localhost:5173`);
});