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

// --- Follow Request Schema ---
const followRequestSchema = new mongoose.Schema({
  from: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    profilePicture: String
  },
  to: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    profilePicture: String
  },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const FollowRequest = mongoose.model('FollowRequest', followRequestSchema);

// --- Notification Schema ---
const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['follow_request', 'follow_accepted', 'new_follower', 'post_reaction', 'post_comment'], 
    required: true 
  },
  message: { type: String, required: true },
  from: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    profilePicture: String
  },
  relatedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// --- Story Schema ---
const storySchema = new mongoose.Schema({
  media: { type: String, required: true },
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
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: { expireAfterSeconds: 0 }
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

postSchema.index({ 'author._id': 1, createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

// --- User Schema ---
const userSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: { type: String, unique: true, trim: true, lowercase: true },
  passwordHash: String,
  profilePicture: String,
  bio: { type: String, default: 'This is my bio...' },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
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

app.get('/test', (req, res) => {
  res.json({ ok: true, message: 'Server is working!' });
});
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
    fileSize: 50 * 1024 * 1024, // 50MB
  }
});

// --- Helpers ---
const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  profilePicture: u.profilePicture || null,
  bio: u.bio || '',
  followers: Array.isArray(u.followers) ? u.followers.length : 0,
  following: Array.isArray(u.following) ? u.following.length : 0,
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

const createNotification = async (recipientId, type, message, fromUser = null, relatedPost = null) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      type,
      message,
      from: fromUser ? {
        _id: fromUser._id,
        name: fromUser.name,
        profilePicture: fromUser.profilePicture
      } : null,
      relatedPost
    });
    await notification.save();
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};

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
      followers: [],
      following: []
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

// --- Get All Users (except current user) ---
app.get('/users', async (req, res) => {
  try {
    const { excludeId } = req.query;
    
    const users = await User.find(excludeId ? { _id: { $ne: excludeId } } : {})
      .select('-passwordHash')
      .limit(20);

    if (excludeId) {
      const currentUser = await User.findById(excludeId);
      
      const usersWithFollowStatus = await Promise.all(
        users.map(async (user) => {
          const pendingRequest = await FollowRequest.findOne({
            'from._id': excludeId,
            'to._id': user._id,
            status: 'pending'
          });

const isFollowing = Array.isArray(currentUser.following) 
  ? currentUser.following.includes(user._id) 
  : false;
          return {
            ...publicUser(user),
            postsCount: user.posts?.length || 0,
            followStatus: isFollowing ? 'following' : (pendingRequest ? 'pending' : 'none')
          };
        })
      );

      return res.json({ users: usersWithFollowStatus });
    }

    return res.json({ users: users.map(publicUser) });
  } catch (err) {
    console.error('GET USERS ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Send Follow Request ---
app.post('/send-follow-request', async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body;
    
    if (!fromUserId || !toUserId) {
      return res.status(400).json({ message: 'fromUserId and toUserId are required.' });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({ message: 'Cannot follow yourself.' });
    }

    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findById(toUserId);

    if (!fromUser || !toUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (fromUser.following.includes(toUserId)) {
      return res.status(400).json({ message: 'Already following this user.' });
    }

    const existingRequest = await FollowRequest.findOne({
      'from._id': fromUserId,
      'to._id': toUserId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Follow request already sent.' });
    }

    const followRequest = new FollowRequest({
      from: {
        _id: fromUser._id,
        name: fromUser.name,
        profilePicture: fromUser.profilePicture
      },
      to: {
        _id: toUser._id,
        name: toUser.name,
        profilePicture: toUser.profilePicture
      }
    });

    await followRequest.save();

    await createNotification(
      toUserId,
      'follow_request',
      `${fromUser.name} wants to follow you`,
      fromUser
    );

    return res.json({ message: 'Follow request sent successfully' });
  } catch (err) {
    console.error('SEND FOLLOW REQUEST ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Handle Follow Request (Accept/Reject) ---
app.post('/handle-follow-request', async (req, res) => {
  try {
    const { requestId, action } = req.body;
    
    if (!requestId || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid request or action.' });
    }

    const followRequest = await FollowRequest.findById(requestId);
    if (!followRequest) {
      return res.status(404).json({ message: 'Follow request not found.' });
    }

    if (followRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Follow request already handled.' });
    }

    followRequest.status = action === 'accept' ? 'accepted' : 'rejected';
    await followRequest.save();

    if (action === 'accept') {
      await User.findByIdAndUpdate(followRequest.from._id, {
        $addToSet: { following: followRequest.to._id }
      });
      
      await User.findByIdAndUpdate(followRequest.to._id, {
        $addToSet: { followers: followRequest.from._id }
      });

      await createNotification(
        followRequest.from._id,
        'follow_accepted',
        `${followRequest.to.name} accepted your follow request`,
        { 
          _id: followRequest.to._id,
          name: followRequest.to.name,
          profilePicture: followRequest.to.profilePicture
        }
      );
    }

    return res.json({ message: `Follow request ${action}ed successfully` });
  } catch (err) {
    console.error('HANDLE FOLLOW REQUEST ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Get Follow Requests ---
app.get('/follow-requests/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const requests = await FollowRequest.find({ 'to._id': userId, status: 'pending' }).sort({ createdAt: -1 });
    return res.json({ requests });
  } catch (err) {
    console.error('GET FOLLOW REQUESTS ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Get Notifications ---
app.get('/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(20);
    return res.json({ notifications });
  } catch (err) {
    console.error('GET NOTIFICATIONS ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Get Posts from Following Users ---
app.get('/posts/following/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

const followingIds = [
  ...(Array.isArray(user.following) ? user.following : []),
  user._id
];    
    const posts = await Post.find({ 'author._id': { $in: followingIds } })
      .sort({ createdAt: -1 })
      .limit(50);

    const formattedPosts = posts.map(post => formatPost(post, userId));

    return res.json({ posts: formattedPosts });
  } catch (err) {
    console.error('GET FOLLOWING POSTS ERROR:', err);
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
    const posts = await Post.find({ 'author._id': userId }).sort({ createdAt: -1 });
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
    const stories = await Story.find({ expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });

    const groupedStories = {};
    stories.forEach(story => {
      const authorId = story.author._id.toString();
      if (!groupedStories[authorId]) {
        groupedStories[authorId] = { author: story.author, stories: [] };
      }
      groupedStories[authorId].stories.push(formatStory(story, userId));
    });

    return res.json({ stories: Object.values(groupedStories) });
  } catch (err) {
    console.error('GET STORIES ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- View Story ---
app.post('/view-story', async (req, res) => {
  try {
    const { userId, storyId } = req.body;
    if (!userId || !storyId) return res.status(400).json({ message: 'userId and storyId are required.' });

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
    if (!userId || !postId || !reactionType) return res.status(400).json({ message: 'Required fields missing.' });

    const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];
    if (!validReactions.includes(reactionType)) return res.status(400).json({ message: 'Invalid reaction type.' });

    const user = await User.findById(userId);
    const post = await Post.findById(postId);
    if (!user || !post) return res.status(404).json({ message: 'User or post not found.' });

    post.reactions = post.reactions.filter(r => r.user._id.toString() !== userId);
    post.reactions.push({
      type: reactionType,
      user: { _id: user._id, name: user.name, profilePicture: user.profilePicture }
    });

    await post.save();

    return res.json({ message: 'Reaction added', post: formatPost(post, userId) });
  } catch (err) {
    console.error('ADD REACTION ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Remove Reaction ---
app.delete('/remove-reaction', async (req, res) => {
  try {
    const { userId, postId } = req.body;
    if (!userId || !postId) return res.status(400).json({ message: 'userId and postId are required.' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    post.reactions = post.reactions.filter(r => r.user._id.toString() !== userId);
    await post.save();

    return res.json({ message: 'Reaction removed', post: formatPost(post, userId) });
  } catch (err) {
    console.error('REMOVE REACTION ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Add Comment ---
app.post('/add-comment', async (req, res) => {
  try {
    const { userId, postId, text } = req.body;
    if (!userId || !postId || !text) return res.status(400).json({ message: 'All fields are required.' });

    const user = await User.findById(userId);
    const post = await Post.findById(postId);
    if (!user || !post) return res.status(404).json({ message: 'User or post not found.' });

    const newComment = {
      text: text.trim(),
      author: { _id: user._id, name: user.name, profilePicture: user.profilePicture }
    };

    post.comments.push(newComment);
    await post.save();

    await createNotification(
      post.author._id,
      'post_comment',
      `${user.name} commented on your post`,
      user,
      post._id
    );

    return res.json({
      message: 'Comment added',
      comment: newComment,
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
    const { id } = req.params;
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

    if (!userId) return res.status(400).json({ message: 'userId is required.' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    if (post.author._id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    if (post.image) {
      const imagePath = path.join(__dirname, post.image);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    await User.findByIdAndUpdate(userId, { $pull: { posts: postId } });
    await Post.findByIdAndDelete(postId);

    return res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('DELETE POST ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Update Bio ---
app.put('/update-bio/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { bio } = req.body;
    
    const user = await User.findByIdAndUpdate(userId, { bio: bio || '' }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    
    res.json({ bio: user.bio });
  } catch (err) {
    console.error('UPDATE BIO ERROR:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// --- Update Profile Picture ---
app.put('/update-profile-picture/:userId', upload.single('profilePicture'), async (req, res) => {
  try {
    const { userId } = req.params;
    if (!req.file) return res.status(400).json({ message: 'Profile picture is required.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.profilePicture) {
      const oldImagePath = path.join(__dirname, user.profilePicture);
      if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
    }

    user.profilePicture = `/uploads/${req.file.filename}`;
    await user.save();

    await Post.updateMany(
      { 'author._id': userId },
      { 'author.profilePicture': user.profilePicture }
    );

    await Post.updateMany(
      { 'comments.author._id': userId },
      { $set: { 'comments.$.author.profilePicture': user.profilePicture } }
    );

    res.json({ profilePicture: user.profilePicture });
  } catch (err) {
    console.error('UPDATE PROFILE PICTURE ERROR:', err);
    res.status(500).json({ message: 'Server error.' });
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

// --- Clean up expired stories ---
setInterval(async () => {
  try {
    await Story.deleteMany({ expiresAt: { $lt: new Date() } });
    console.log('🧹 Cleaned up expired stories');
  } catch (err) {
    console.error('Story cleanup error:', err);
  }
}, 60 * 60 * 1000); // hourly

// --- Start ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${UPLOADS_DIR}`);
  console.log(`🌐 CORS enabled for: http://localhost:5173`);
});