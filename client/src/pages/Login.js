import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle } from 'lucide-react';
import AuthMark from '../components/AuthMark';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '380px', margin: '5rem auto' }}>
      <AuthMark />
      <div className="panel">
        <h1 style={{ fontSize: '1.375rem', marginBottom: '0.35rem' }}>Firm access</h1>
        <p style={{ marginBottom: '1.75rem', fontSize: '0.9rem' }}>Sign in to manage your templates and client filings.</p>

        {error && (
          <div className="alert alert-error">
            <AlertTriangle size={17} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem' }}>
          New to PDF Forms?{' '}
          <Link to="/register" style={{ color: 'var(--ink)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
