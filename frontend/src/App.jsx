import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Register from "./components/Register";
import LoginForm from "./components/LoginForm";
import Dashboard from "./components/Dashboard";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved user data on app load
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error("Error parsing saved user data:", error);
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Default → Dashboard if logged in, otherwise Login */}
          <Route 
            path="/" 
            element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
          />
          
          {/* Login Page */}
          <Route 
            path="/login" 
            element={
              user ? 
                <Navigate to="/dashboard" /> : 
                <LoginForm onLogin={handleLogin} />
            } 
          />
          
          {/* Register Page */}
          <Route 
            path="/register" 
            element={
              user ? 
                <Navigate to="/dashboard" /> : 
                <Register onRegister={handleLogin} />
            } 
          />
          
          {/* Dashboard Page (protected) */}
          <Route
            path="/dashboard"
            element={
              user ? 
                <Dashboard user={user} onLogout={handleLogout} /> : 
                <Navigate to="/login" />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;