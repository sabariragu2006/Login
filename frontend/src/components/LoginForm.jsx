import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Sparkles } from 'lucide-react';
import '../index.css';
import { useNavigate } from 'react-router-dom';

const LoginForm = ({ onLogin }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  // ✅ Handle Input Change (with trim for spaces)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value.trimStart() }));
  };

// ✅ Advanced Email Validation
const validateEmail = (email) => {
  // Basic structure check
  const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicRegex.test(email)) return false;

  // Must have valid TLD like .com, .in, .org, .net
  const domainRegex = /\.(com|in|org|net|edu|gov|co)$/i;
  if (!domainRegex.test(email)) return false;

  // Prevent multiple dots in a row (e.g., test..user@mail.com)
  if (email.includes('..')) return false;

  // Prevent leading/trailing dot or @
  if (email.startsWith('.') || email.endsWith('.') || email.endsWith('@')) {
    return false;
  }

  return true;
};


  // ✅ Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { email, password } = formData;

    // Corner Case 1: Empty Fields
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    // Corner Case 2: Invalid Email Format
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Corner Case 3: Weak Password
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error('Invalid server response (not JSON)');
      }

      // Corner Case 4: Handle Unauthorized / Bad Request
      if (!response.ok) {
        setError(result.message || 'Invalid email or password');
        return;
      }

      // Corner Case 5: Unexpected Response Structure
      if (!result.user) {
        setError('Unexpected server response');
        return;
      }

      // ✅ Successful login
      onLogin(result.user);
      navigate('/dashboard');
    } catch (err) {
      // Corner Case 6: Server/Network Failures
      setError('Server error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="bg-circles">
        <div className="circle purple"></div>
        <div className="circle blue"></div>
        <div className="circle indigo"></div>
      </div>

      <div className="login-container">
        <div className="login-logo">
          <div className="logo-box">
            <Sparkles className="logo-icon" />
          </div>
          <h1>Welcome Back</h1>
          <p>Login to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
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
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              className="toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          {/* Error Message */}
          {error && <div className="error-box">{error}</div>}

          {/* Submit Button */}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="extra-links">
          <p>
            Don’t have an account?{' '}
            <button onClick={() => navigate('/register')} disabled={loading}>
              Sign up here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
