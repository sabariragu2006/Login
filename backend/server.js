const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Configuration ---
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// --- Ensure uploads directory exists ---
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// --- Connect to MongoDB ---
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// --- Graceful Shutdown ---
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// --- Schemas ---
const defineSchemas = () => {
  // Follow Request Schema
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

  // Message Schema
  const messageSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true },
    sender: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      profilePicture: String
    },
    receiver: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      profilePicture: String
    },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  });

  messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
  messageSchema.index({ receiver: 1, read: 1 });

  // Notification Schema
  const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
      type: String, 
      enum: [
        'follow_request', 
        'follow_accepted', 
        'new_follower', 
        'post_reaction', 
        'post_comment',
        'new_message'
      ], 
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

  // Story Schema
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

  // Reaction Schema (subdocument)
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

  // Comment Schema (subdocument)
  const commentSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true },
    author: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      profilePicture: String
    },
    reactions: [reactionSchema],
    createdAt: { type: Date, default: Date.now }
  });

  // Post Schema
  const postSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true },
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

  // User Schema
  const userSchema = new mongoose.Schema({
    name: { type: String, trim: true, required: true },
    email: { 
      type: String, 
      unique: true, 
      trim: true, 
      lowercase: true,
      required: true
    },
    passwordHash: { type: String, required: true },
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

  return {
    FollowRequest: mongoose.model('FollowRequest', followRequestSchema),
    Message: mongoose.model('Message', messageSchema),
    Notification: mongoose.model('Notification', notificationSchema),
    Story: mongoose.model('Story', storySchema),
    Post: mongoose.model('Post', postSchema),
    User: mongoose.model('User', userSchema)
  };
};

const { FollowRequest, Message, Notification, Story, Post, User } = defineSchemas();

// --- Middleware ---
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Serve static uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Multer Configuration ---
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

// --- Helper Functions ---
const helpers = {
  publicUser: (u) => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    profilePicture: u.profilePicture || null,
    bio: u.bio || '',
    followers: Array.isArray(u.followers) ? u.followers : [],
    following: Array.isArray(u.following) ? u.following : [],
    posts: u.posts?.length || 0
  }),

  formatPost: (post, currentUserId = null) => {
    const reactionsArray = Array.isArray(post.reactions) ? post.reactions : [];

    const reactionCounts = reactionsArray.reduce((acc, reaction) => {
      acc[reaction.type] = (acc[reaction.type] || 0) + 1;
      return acc;
    }, {});

    const userReaction = currentUserId 
      ? reactionsArray.find(r => r.user._id.toString() === currentUserId)?.type || null
      : null;

    return {
      _id: post._id,
      text: post.text,
      image: post.image,
      author: post.author,
      reactions: reactionsArray,
      reactionCounts,
      userReaction,
      comments: post.comments || [],
      commentCount: post.comments?.length || 0,
      createdAt: post.createdAt
    };
  },

  formatStory: (story, currentUserId = null) => ({
    _id: story._id,
    media: story.media,
    mediaType: story.mediaType,
    author: story.author,
    viewCount: story.viewers?.length || 0,
    viewed: currentUserId ? story.viewers.includes(currentUserId) : false,
    createdAt: story.createdAt,
    expiresAt: story.expiresAt
  }),

  createNotification: async (recipientId, type, message, fromUser = null, relatedPost = null) => {
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
  },

  isValidObjectId: (id) => mongoose.Types.ObjectId.isValid(id)
};

// --- Routes ---
const setupRoutes = () => {
  // Health Check
  app.get('/', (req, res) => {
    res.json({ ok: true, service: 'myapp-api', timestamp: new Date().toISOString() });
  });

  app.get('/test', (req, res) => {
    res.json({ ok: true, message: 'Server is working!' });
  });

  // --- Authentication Routes ---
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

      res.json({
        message: 'User registered successfully',
        user: helpers.publicUser(user),
      });
    } catch (err) {
      console.error('REGISTER ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  app.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
      }

      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) return res.status(401).json({ message: 'Invalid email or password.' });

      res.json({
        message: 'Login successful',
        user: helpers.publicUser(user),
      });
    } catch (err) {
      console.error('LOGIN ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  // --- User Routes ---
  app.get('/users', async (req, res) => {
    try {
      const { excludeId } = req.query;
      
      let query = {};
      if (excludeId && helpers.isValidObjectId(excludeId)) {
        query = { _id: { $ne: excludeId } };
      }

      const users = await User.find(query)
        .select('-passwordHash')
        .limit(20)
        .lean();

      if (excludeId && helpers.isValidObjectId(excludeId)) {
        const currentUser = await User.findById(excludeId).lean();
        
        const usersWithFollowStatus = await Promise.all(
          users.map(async (user) => {
            const pendingRequest = await FollowRequest.findOne({
              'from._id': excludeId,
              'to._id': user._id,
              status: 'pending'
            }).lean();

            const isFollowing = Array.isArray(currentUser.following) 
              ? currentUser.following.some(id => id.toString() === user._id.toString())
              : false;

            return {
              ...user,
              _id: user._id,
              name: user.name,
              email: user.email,
              profilePicture: user.profilePicture || null,
              bio: user.bio || '',
              followers: Array.isArray(user.followers) ? user.followers.length : 0,
              following: Array.isArray(user.following) ? user.following.length : 0,
              posts: user.posts?.length || 0,
              followStatus: isFollowing ? 'following' : (pendingRequest ? 'pending' : 'none')
            };
          })
        );

        return res.json({ users: usersWithFollowStatus });
      }

      const formattedUsers = users.map(user => ({
        ...user,
        followers: Array.isArray(user.followers) ? user.followers.length : 0,
        following: Array.isArray(user.following) ? user.following.length : 0
      }));

      res.json({ users: formattedUsers });
    } catch (err) {
      console.error('GET USERS ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  app.get('/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!helpers.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
      }

      const user = await User.findById(id).populate('posts').lean();
      if (!user) return res.status(404).json({ message: 'User not found.' });

      const formattedUser = {
        ...user,
        followers: Array.isArray(user.followers) ? user.followers : [],
        following: Array.isArray(user.following) ? user.following : []
      };

      res.json({ user: helpers.publicUser(formattedUser) });
    } catch (err) {
      console.error('GET USER ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  // --- Follow System Routes ---
  app.post('/send-follow-request', async (req, res) => {
    try {
      const { fromUserId, toUserId } = req.body;
      
      if (!fromUserId || !toUserId) {
        return res.status(400).json({ message: 'fromUserId and toUserId are required.' });
      }
      if (fromUserId === toUserId) {
        return res.status(400).json({ message: 'Cannot follow yourself.' });
      }
      if (!helpers.isValidObjectId(fromUserId) || !helpers.isValidObjectId(toUserId)) {
        return res.status(400).json({ message: 'Invalid user IDs.' });
      }

      const [fromUser, toUser] = await Promise.all([
        User.findById(fromUserId).lean(),
        User.findById(toUserId).lean()
      ]);

      if (!fromUser || !toUser) {
        return res.status(404).json({ message: 'User not found.' });
      }

      if (Array.isArray(fromUser.following) && fromUser.following.some(id => id.toString() === toUserId)) {
        return res.status(400).json({ message: 'Already following this user.' });
      }

      const existingRequest = await FollowRequest.findOne({
        'from._id': fromUserId,
        'to._id': toUserId,
        status: 'pending'
      }).lean();

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

      await helpers.createNotification(
        toUserId,
        'follow_request',
        `${fromUser.name} wants to follow you`,
        fromUser
      );

      res.json({ message: 'Follow request sent successfully' });
    } catch (err) {
      console.error('SEND FOLLOW REQUEST ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  app.post('/handle-follow-request', async (req, res) => {
    try {
      const { requestId, action } = req.body;
      
      if (!requestId || !['accept', 'reject'].includes(action)) {
        return res.status(400).json({ message: 'Invalid request or action.' });
      }
      if (!helpers.isValidObjectId(requestId)) {
        return res.status(400).json({ message: 'Invalid request ID.' });
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
        await Promise.all([
          User.findByIdAndUpdate(followRequest.from._id, {
            $addToSet: { following: followRequest.to._id }
          }),
          User.findByIdAndUpdate(followRequest.to._id, {
            $addToSet: { followers: followRequest.from._id }
          })
        ]);

        await helpers.createNotification(
          followRequest.from._id,
          'follow_accepted',
          `${followRequest.to.name} accepted your follow request`,
          { 
            _id: followRequest.to._id,
            name: followRequest.to.name,
            profilePicture: followRequest.to.profilePicture
          }
        );

        await helpers.createNotification(
          followRequest.to._id,
          'new_follower',
          `${followRequest.from.name} is now following you`,
          { 
            _id: followRequest.from._id,
            name: followRequest.from.name,
            profilePicture: followRequest.from.profilePicture
          }
        );
      }

      res.json({ message: `Follow request ${action}ed successfully` });
    } catch (err) {
      console.error('HANDLE FOLLOW REQUEST ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  app.get('/follow-requests/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      if (!helpers.isValidObjectId(userId)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
      }

      const requests = await FollowRequest.find({ 
        'to._id': userId, 
        status: 'pending' 
      })
      .sort({ createdAt: -1 })
      .lean();

      res.json({ requests });
    } catch (err) {
      console.error('GET FOLLOW REQUESTS ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  // --- Notification Routes ---
  app.get('/notifications/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      if (!helpers.isValidObjectId(userId)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
      }

      const notifications = await Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      res.json({ notifications });
    } catch (err) {
      console.error('GET NOTIFICATIONS ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  // --- Post Routes ---
  app.get('/posts/following/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      if (!helpers.isValidObjectId(userId)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
      }

      const user = await User.findById(userId).lean();
      if (!user) return res.status(404).json({ message: 'User not found.' });

      const followingIds = [
        ...(Array.isArray(user.following) ? user.following.map(id => id.toString()) : []),
        user._id.toString()
      ];

      const posts = await Post.find({ 'author._id': { $in: followingIds } })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const formattedPosts = posts.map(post => helpers.formatPost(post, userId));

      res.json({ posts: formattedPosts });
    } catch (err) {
      console.error('GET FOLLOWING POSTS ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  app.post('/add-post', upload.single('postImage'), async (req, res) => {
    try {
      const { userId, content } = req.body;
      if (!userId) return res.status(400).json({ message: 'userId is required.' });
      if (!content || !String(content).trim()) {
        return res.status(400).json({ message: 'Post content is required.' });
      }
      if (!helpers.isValidObjectId(userId)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
      }

      const user = await User.findById(userId).lean();
      if (!user) return res.status(404).json({ message: 'User not found.' });

      const newPost = new Post({
        text: content.trim(),
        image: req.file ? `/uploads/${req.file.filename}` : null,
        author: {
          _id: user._id,
          name: user.name,
          profilePicture: user.profilePicture
        }
      });

      await newPost.save();

      await User.findByIdAndUpdate(userId, {
        $push: { posts: newPost._id }
      });

      res.json({
        message: 'Post added',
        post: helpers.formatPost(newPost, userId),
      });
    } catch (err) {
      console.error('ADD POST ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  app.post('/add-comment', async (req, res) => {
    try {
      const { userId, postId, text } = req.body;
      if (!userId || !postId || !text) {
        return res.status(400).json({ message: 'All fields are required.' });
      }
      if (!helpers.isValidObjectId(userId) || !helpers.isValidObjectId(postId)) {
        return res.status(400).json({ message: 'Invalid IDs.' });
      }

      const [user, post] = await Promise.all([
        User.findById(userId).lean(),
        Post.findById(postId).lean()
      ]);

      if (!user || !post) {
        return res.status(404).json({ message: 'User or post not found.' });
      }

      const newComment = {
        text: text.trim(),
        author: { 
          _id: user._id, 
          name: user.name, 
          profilePicture: user.profilePicture 
        },
        createdAt: new Date()
      };

      await Post.findByIdAndUpdate(postId, {
        $push: { comments: newComment }
      });

      await helpers.createNotification(
        post.author._id,
        'post_comment',
        `${user.name} commented on your post`,
        user,
        postId
      );

      const updatedPost = await Post.findById(postId).lean();
      
      res.json({
        message: 'Comment added',
        comment: newComment,
        commentCount: updatedPost.comments.length
      });
    } catch (err) {
      console.error('ADD COMMENT ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  app.post('/add-reaction', async (req, res) => {
    try {
      const { userId, postId, type } = req.body;

      if (!userId || !postId || !type) {
        return res.status(400).json({ message: 'Required fields missing.' });
      }

      const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];
      if (!validReactions.includes(type)) {
        return res.status(400).json({ message: 'Invalid reaction type.' });
      }

      const [user, post] = await Promise.all([
        User.findById(userId).lean(),
        Post.findById(postId).lean()
      ]);

      if (!user || !post) {
        return res.status(404).json({ message: 'User or post not found.' });
      }

      const updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
          $pull: { reactions: { 'user._id': userId } },
          $push: { reactions: {
            type: type,
            user: { 
              _id: user._id, 
              name: user.name, 
              profilePicture: user.profilePicture 
            }
          }}
        },
        { new: true }
      );

      const formattedPost = helpers.formatPost(updatedPost, userId);

      res.json({ 
        message: 'Reaction added', 
        post: formattedPost 
      });

    } catch (err) {
      console.error('ADD REACTION ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  app.get('/posts/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { currentUserId } = req.query;
      
      if (!helpers.isValidObjectId(userId)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
      }

      const posts = await Post.find({ 'author._id': userId })
        .sort({ createdAt: -1 })
        .lean();

      const formattedPosts = posts.map(post => 
        helpers.formatPost(post, currentUserId)
      );

      res.json({ posts: formattedPosts });
    } catch (err) {
      console.error('GET USER POSTS ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  // --- Story Routes ---
  app.post('/upload-story/:userId', upload.single('story'), async (req, res) => {
    try {
      const { userId } = req.params;
      if (!req.file) {
        return res.status(400).json({ message: 'Story media is required.' });
      }
      if (!helpers.isValidObjectId(userId)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
      }

      const user = await User.findById(userId).lean();
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

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

      await User.findByIdAndUpdate(userId, {
        $push: { stories: newStory._id }
      });

      res.json({
        message: 'Story uploaded',
        story: helpers.formatStory(newStory, userId)
      });
    } catch (err) {
      console.error('UPLOAD STORY ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  app.get('/stories/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      if (!helpers.isValidObjectId(userId)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
      }

      const user = await User.findById(userId).lean();
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const followingIds = [
        ...(Array.isArray(user.following) ? user.following.map(id => id.toString()) : []),
        userId
      ];

      const stories = await Story.find({
        'author._id': { $in: followingIds },
        expiresAt: { $gt: new Date() }
      })
      .sort({ createdAt: -1 })
      .lean();

      const formattedStories = stories.map(story => 
        helpers.formatStory(story, userId)
      );

      res.json({ stories: formattedStories });
    } catch (err) {
      console.error('GET STORIES ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  app.post('/view-story', async (req, res) => {
    try {
      const { userId, storyId } = req.body;
      if (!userId || !storyId) {
        return res.status(400).json({ message: 'userId and storyId are required.' });
      }
      if (!helpers.isValidObjectId(userId) || !helpers.isValidObjectId(storyId)) {
        return res.status(400).json({ message: 'Invalid IDs.' });
      }

      const story = await Story.findById(storyId);
      if (!story) {
        return res.status(404).json({ message: 'Story not found.' });
      }

      if (!story.viewers.includes(userId)) {
        story.viewers.push(userId);
        await story.save();
      }

      res.json({ message: 'Story viewed' });
    } catch (err) {
      console.error('VIEW STORY ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  // --- Message Routes ---
  app.get('/conversations/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      if (!helpers.isValidObjectId(userId)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
      }

      const conversations = await Message.aggregate([
        {
          $match: {
            $or: [
              { 'sender._id': new mongoose.Types.ObjectId(userId) },
              { 'receiver._id': new mongoose.Types.ObjectId(userId) }
            ]
          }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $group: {
            _id: {
              $cond: {
                if: { $eq: ["$sender._id", new mongoose.Types.ObjectId(userId)] },
                then: "$receiver._id",
                else: "$sender._id"
              }
            },
            name: {
              $first: {
                $cond: {
                  if: { $eq: ["$sender._id", new mongoose.Types.ObjectId(userId)] },
                  then: "$receiver.name",
                  else: "$sender.name"
                }
              }
            },
            profilePicture: {
              $first: {
                $cond: {
                  if: { $eq: ["$sender._id", new mongoose.Types.ObjectId(userId)] },
                  then: "$receiver.profilePicture",
                  else: "$sender.profilePicture"
                }
              }
            },
            lastMessage: { $first: "$text" },
            lastMessageAt: { $first: "$createdAt" },
            unreadCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$receiver._id", new mongoose.Types.ObjectId(userId)] },
                      { $eq: ["$read", false] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $sort: { lastMessageAt: -1 }
        }
      ]);

      res.json({ conversations });
    } catch (err) {
      console.error('GET CONVERSATIONS ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  app.get('/messages/:userId/:targetUserId', async (req, res) => {
    try {
      const { userId, targetUserId } = req.params;
      
      if (!helpers.isValidObjectId(userId) || !helpers.isValidObjectId(targetUserId)) {
        return res.status(400).json({ message: 'Invalid user IDs.' });
      }

      const messages = await Message.find({
        $or: [
          {
            'sender._id': userId,
            'receiver._id': targetUserId
          },
          {
            'sender._id': targetUserId,
            'receiver._id': userId
          }
        ]
      })
      .sort({ createdAt: 1 })
      .lean();

      await Message.updateMany(
        {
          'receiver._id': userId,
          'sender._id': targetUserId,
          read: false
        },
        { read: true }
      );

      res.json({ messages });
    } catch (err) {
      console.error('GET MESSAGES ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  app.post('/send-message', async (req, res) => {
    try {
      const { senderId, receiverId, text } = req.body;

      if (!senderId || !receiverId || !text) {
        return res.status(400).json({ message: 'All fields are required.' });
      }
      if (senderId === receiverId) {
        return res.status(400).json({ message: 'Cannot send message to yourself.' });
      }
      if (!helpers.isValidObjectId(senderId) || !helpers.isValidObjectId(receiverId)) {
        return res.status(400).json({ message: 'Invalid user IDs.' });
      }

      const [sender, receiver] = await Promise.all([
        User.findById(senderId).lean(),
        User.findById(receiverId).lean()
      ]);

      if (!sender || !receiver) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const newMessage = new Message({
        text: text.trim(),
        sender: {
          _id: sender._id,
          name: sender.name,
          profilePicture: sender.profilePicture
        },
        receiver: {
          _id: receiver._id,
          name: receiver.name,
          profilePicture: receiver.profilePicture
        }
      });

      await newMessage.save();

      await helpers.createNotification(
        receiverId,
        'new_message',
        `${sender.name} sent you a message`,
        sender
      );

      res.json({
        message: 'Message sent',
        messageId: newMessage._id
      });
    } catch (err) {
      console.error('SEND MESSAGE ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  // --- Profile Update Routes ---
  app.put('/update-bio/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { bio } = req.body;
      
      if (!helpers.isValidObjectId(userId)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
      }

      const user = await User.findByIdAndUpdate(
        userId, 
        { bio: bio || '' }, 
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
      
      res.json({ bio: user.bio });
    } catch (err) {
      console.error('UPDATE BIO ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  app.put('/update-profile-picture/:userId', upload.single('profilePicture'), async (req, res) => {
    try {
      const { userId } = req.params;
      if (!req.file) {
        return res.status(400).json({ message: 'Profile picture is required.' });
      }
      if (!helpers.isValidObjectId(userId)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      if (user.profilePicture) {
        const oldImagePath = path.join(__dirname, user.profilePicture);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      user.profilePicture = `/uploads/${req.file.filename}`;
      await user.save();

      await Promise.all([
        Post.updateMany(
          { 'author._id': userId },
          { 'author.profilePicture': user.profilePicture }
        ),
        Post.updateMany(
          { 'comments.author._id': userId },
          { $set: { 'comments.$[elem].author.profilePicture': user.profilePicture } },
          { arrayFilters: [{ 'elem.author._id': userId }] }
        )
      ]);

      res.json({ profilePicture: user.profilePicture });
    } catch (err) {
      console.error('UPDATE PROFILE PICTURE ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  // --- Delete Post Route ---
  app.delete('/posts/:postId', async (req, res) => {
    try {
      const { postId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'userId is required.' });
      }
      if (!helpers.isValidObjectId(postId) || !helpers.isValidObjectId(userId)) {
        return res.status(400).json({ message: 'Invalid IDs.' });
      }

      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found.' });
      }

      if (post.author._id.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized.' });
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

      res.json({ message: 'Post deleted successfully' });
    } catch (err) {
      console.error('DELETE POST ERROR:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  // --- 404 Handler ---
  app.use((req, res) => {
    res.status(404).json({ 
      message: 'Route not found.',
      path: req.path
    });
  });

  // --- Global Error Handler ---
  app.use((err, req, res, next) => {
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

    res.status(500).json({ 
      message: 'Server error.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });
};

setupRoutes();

// --- Cleanup Job ---
setInterval(async () => {
  try {
    const result = await Story.deleteMany({ 
      expiresAt: { $lt: new Date() } 
    });
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} expired stories`);
    }
  } catch (err) {
    console.error('Story cleanup error:', err);
  }
}, 60 * 60 * 1000); // Run every hour

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${UPLOADS_DIR}`);
  console.log(`🌐 CORS enabled for: ${CLIENT_URL}`);
  console.log(`🗄️  Connected to MongoDB: ${MONGODB_URI}`);
});