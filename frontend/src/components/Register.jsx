import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Camera, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../index.css';

const Register = ({ onRegister }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('email', formData.email);
      submitData.append('password', formData.password);
      submitData.append('confirmPassword', formData.confirmPassword);
      
      if (profilePicture) {
        submitData.append('profilePicture', profilePicture);
      }

      const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        body: submitData,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || 'Registration failed');
      } else {
        // Auto-login after successful registration
        onRegister(result.user);
        navigate('/login');
      }
    } catch (err) {
      setError('Server error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background circles */}
      <div className="bg-circles">
        <div className="circle purple"></div>
        <div className="circle blue"></div>
        <div className="circle indigo"></div>
      </div>

      <div className="login-container">
        {/* Logo */}
        <div className="login-logo">
          <div className="logo-box">
            <Sparkles className="logo-icon" />
          </div>
          <h1>Join SocialSphere</h1>
          <p>Create your account and start connecting</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
         {/* Profile Picture (no preview) */}
<div className="mb-4 text-center">
  <div className="relative inline-block">
    <div className="w-20 h-20 rounded-full border-2 border-gray-300 overflow-hidden bg-gray-100 mx-auto flex items-center justify-center">
      <User size={32} className="text-gray-400" /> {/* Always shows icon */}
    </div>
    <label className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1 cursor-pointer hover:bg-blue-600 transition">
      <Camera size={16} />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setProfilePicture(e.target.files[0])}
        className="hidden"
      />
    </label>
  </div>
  <p className="text-xs text-gray-600 mt-2">Optional profile picture</p>
</div>


          {/* Name */}
          <div className="input-group">
            <User className="input-icon" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          {/* Email */}
          <div className="input-group">
            <Mail className="input-icon" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          {/* Password */}
          <div className="input-group">
            <Lock className="input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              required
            />
            <button
              type="button"
              className="toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="input-group">
            <Lock className="input-icon" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
            />
            <button
              type="button"
              className="toggle-btn"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          {/* Error */}
          {error && <div className="error-box">{error}</div>}

          {/* Button */}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="extra-links">
          <p>
            Already have an account?{' '}
            <button onClick={() => navigate('/login')}>
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;