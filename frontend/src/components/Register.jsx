import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Camera, Sparkles } from 'lucide-react';
import '../index.css'

const Register = ({ onRegister }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');      // general form errors
const [fileError, setFileError] = useState('');  // profile picture errors

 

// 👇 Add these two lines
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  const maxSize = 2 * 1024 * 1024; // 2 MB

  // ❌ Check file type
  if (!validTypes.includes(file.type)) {
    setFileError('Unauthorized file');
    setProfilePicture(null);  // 🚫 don't allow upload
    e.target.value = "";      // 🚫 clears file input
    return;
  }

  // ❌ Check file size
  if (file.size > maxSize) {
    setFileError('Unauthorized file');
    setProfilePicture(null);  
    e.target.value = ""; 
    return;
  }

  // ✅ If valid
  setProfilePicture(file);
  setFileError('');
};


  const validateForm = () => {
    const { name, email, password, confirmPassword } = formData;

    // ✅ Name Validations
    if (!name.trim()) return 'Name is required';
    if (name.trim().length < 2 || name.trim().length > 20)
      return 'Name must be between 2–20 characters';
    if (/^[0-9@#]+$/.test(name)) return 'Name cannot contain only numbers/special chars';
    if (/<|>|\//.test(name)) return 'Invalid characters in name';
    if (/[\u{1F600}-\u{1F64F}]/u.test(name)) return 'Name cannot contain emojis';

    // ✅ Email Validations
    if (!email.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Invalid email format';
    if (/\s/.test(email)) return 'Email cannot contain spaces';
    if (email.endsWith('@mailinator.com')) return 'Disposable emails are not allowed';

    // ✅ Password Validations
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (password.length > 30) return 'Password is too long';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
    if (password === name || password === email) return 'Password cannot be same as name/email';
    if (/\s$/.test(password)) return 'Password cannot have trailing spaces';

    // ✅ Confirm Password
    if (confirmPassword !== password) return 'Passwords do not match';

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const submitData = new FormData();
      submitData.append('name', formData.name.trim());
      submitData.append('email', formData.email.trim().toLowerCase());
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
        {/* Profile Picture */}
        <div className="mb-4 text-center">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-full border-2 border-gray-300 overflow-hidden bg-gray-100 mx-auto flex items-center justify-center">
              <User size={32} className="text-gray-400" />
            </div>
            <label className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1 cursor-pointer hover:bg-blue-600 transition">
              <Camera size={16} />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
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

        {/* Unified Error Box */}
        {(error || fileError) && (
          <div className="error-box">
            {error || fileError}
          </div>
        )}

        {/* Submit Button */}
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

}
export default Register;