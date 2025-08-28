import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Register from "./components/Register";
import LoginForm from "./components/LoginForm";
import Dashboard from "./components/Dashboard";

function App() {
  const user = JSON.parse(localStorage.getItem("user")); // 👈 check if logged in

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Default → Login */}
          <Route path="/" element={<Navigate to="/login" />} />

          {/* Login Page */}
          <Route path="/login" element={<LoginForm />} />

          {/* Register Page */}
          <Route path="/register" element={<Register />} />

          {/* Dashboard Page (protected) */}
          <Route
            path="/dashboard"
            element={user ? <Dashboard user={user} /> : <Navigate to="/login" />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
