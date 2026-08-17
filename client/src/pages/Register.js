import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle } from 'lucide-react';
import AuthMark from '../components/AuthMark';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await register(name, email, password, confirmPassword);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '380px', margin: '5rem auto' }}>
      <AuthMark />
      <div className="panel">
        <h1 style={{ fontSize: '1.375rem', marginBottom: '0.35rem' }}>Open a firm account</h1>
        <p style={{ marginBottom: '1.75rem', fontSize: '0.9rem' }}>You'll manage templates and issue client filings from here.</p>

        {error && (
          <div className="alert alert-error">
            <AlertTriangle size={17} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Confirm password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>

          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem' }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: 'var(--ink)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
