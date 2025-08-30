import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Sparkles } from 'lucide-react';
import '../index.css'; // Import normal CSS
import { useNavigate } from 'react-router-dom';

const LoginForm = ({ onLogin }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || 'Invalid email or password');
      } else {
        // Call the onLogin function passed from App component
        onLogin(result.user);
        navigate('/dashboard');
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
          <h1>SocialSphere</h1>
          <p>Connect with your world</p>
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
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          {/* Error */}
          {error && <div className="error-box">{error}</div>}

          {/* Button */}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="extra-links">
          <p>
            Don't have an account?{' '}
            <button onClick={() => navigate('/register')}>
              Create one now
            </button>
          </p>
          <button className="forgot-btn">Forgot your password?</button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;