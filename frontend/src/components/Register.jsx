import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    profilePicture: null,
  });

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // handle input change
  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'profilePicture') {
      const file = files[0];
      setFormData((prev) => ({ ...prev, profilePicture: file }));

      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('password', formData.password);
      data.append('confirmPassword', formData.confirmPassword);

      if (formData.profilePicture) {
        data.append('profilePicture', formData.profilePicture);
      }

      const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        body: data,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || 'Something went wrong');
      } else {
        alert('Registration successful ✅');

        // ✅ Save user to localStorage immediately
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
          navigate('/dashboard'); // auto-login after register
        } else {
          navigate('/'); // fallback → go to login
        }
      }
    } catch (err) {
      setError('Server error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label><br />
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Email:</label><br />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Password:</label><br />
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Confirm Password:</label><br />
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Profile Picture:</label><br />
          <input
            type="file"
            name="profilePicture"
            accept="image/*"
            onChange={handleChange}
          />
          {preview && (
            <div style={{ marginTop: '10px' }}>
              <img src={preview} alt="Preview" width="100" />
            </div>
          )}
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" style={{ marginTop: '10px' }} disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default Register;
