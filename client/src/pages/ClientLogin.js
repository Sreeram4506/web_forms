import React, { useState } from 'react';
import { useClientAuth } from '../context/ClientAuthContext';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import AuthMark from '../components/AuthMark';

const ClientLogin = ({ token, linkInfo }) => {
  const { clientLogin } = useClientAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await clientLogin(token, email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '5rem auto' }}>
      <AuthMark />
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <ShieldCheck size={16} style={{ color: 'var(--ok)' }} />
          <span className="field-hint" style={{ margin: 0 }}>
            {linkInfo?.firmName ? `Filing from ${linkInfo.firmName}` : 'A private client filing'}
          </span>
        </div>
        <h1 style={{ fontSize: '1.375rem', marginBottom: '1.75rem' }}>{linkInfo?.templateName || 'Your form'}</h1>

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
            {loading ? 'Signing in…' : 'Access filing'}
          </button>
        </form>

        <p className="field-hint" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          Use the email and password you were sent for this filing.
        </p>
      </div>
    </div>
  );
};

export default ClientLogin;
