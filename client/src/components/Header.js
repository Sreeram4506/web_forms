import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="masthead">
      <div className="container">
        <Link to="/dashboard" className="masthead-mark">
          <span className="masthead-dot" aria-hidden="true" />
          <strong>PDF Forms</strong>
        </Link>
        <div className="masthead-user">
          <span>{user?.name}</span>
          <button className="btn-ghost" onClick={handleLogout} style={{ color: 'inherit' }}>
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
