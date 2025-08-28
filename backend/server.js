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

// --- Models ---
const userSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: { type: String, unique: true, trim: true, lowercase: true },
  passwordHash: String,
  profilePicture: String, // stored as "/uploads/filename.ext"
  bio: { type: String, default: 'This is my bio...' },
  posts: [
    {
      text: String,
      createdAt: { type: Date, default: Date.now },
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    },
  ],
});

userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

const User = mongoose.model('User', userSchema);

// --- Middleware ---
app.use(
  cors({
    origin: 'http://localhost:5173', // change to your Vite/React port
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
    cb(null, `profile-${unique}${ext}`);
  },
});
const upload = multer({ storage });

// --- Helpers ---
const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  profilePicture: u.profilePicture || null,
  bio: u.bio || '',
  posts: u.posts || [],
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

    // Always include _id so the frontend can use it immediately
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

// --- Fetch current user (optional handy endpoint) ---
app.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id) return res.status(400).json({ message: 'User id is required.' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.error('GET USER ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Update Bio ---
app.put('/update-bio/:id', async (req, res) => {
  try {
    const { id } = req.params || {};
    const { bio } = req.body || {};

    if (!id) return res.status(400).json({ message: 'User id is required.' });
    if (typeof bio !== 'string')
      return res.status(400).json({ message: 'Bio must be a string.' });

    const user = await User.findByIdAndUpdate(id, { bio }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    return res.json({ message: 'Bio updated', bio: user.bio });
  } catch (err) {
    console.error('UPDATE BIO ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- Add Post ---
app.post('/add-post', async (req, res) => {
  try {
    const { userId, content } = req.body || {};
    if (!userId) return res.status(400).json({ message: 'userId is required.' });
    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: 'Post content is required.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.posts.unshift({ text: content });
    await user.save();

    return res.json({
      message: 'Post added',
      post: user.posts[0],
      posts: user.posts,
    });
  } catch (err) {
    console.error('ADD POST ERROR:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// --- 404 fallback (optional) ---
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

// --- Global error handler (optional) ---
app.use((err, _req, res, _next) => {
  console.error('UNCAUGHT ERROR:', err);
  res.status(500).json({ message: 'Server error.' });
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
