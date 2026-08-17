import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../api';
import { Copy, Check, Trash2, Download, BookMarked, RefreshCw, AlertTriangle, Stamp } from 'lucide-react';

const generatePassword = () => Math.random().toString(36).slice(-10);

const AssignmentsList = () => {
  const [searchParams] = useSearchParams();
  const [templates, setTemplates] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  const [form, setForm] = useState({
    templateId: searchParams.get('templateId') || '',
    clientName: '',
    clientEmail: '',
    password: generatePassword(),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, assignmentsRes] = await Promise.all([axios.get('/api/templates'), axios.get('/api/assignments')]);
      setTemplates(templatesRes.data);
      setAssignments(assignmentsRes.data);
      setError('');
    } catch (err) {
      setError('Failed to load the docket');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const response = await axios.post('/api/assignments', form);
      const { assignment } = response.data;
      setCreatedLink({
        url: `${window.location.origin}/form/${assignment.token}`,
        email: form.clientEmail,
        password: form.password,
        templateName: assignment.templateName,
        clientName: assignment.clientName,
      });
      setForm({ templateId: form.templateId, clientName: '', clientEmail: '', password: generatePassword() });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create the docket entry');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this docket entry? The client will no longer be able to log in.')) return;
    try {
      await axios.delete(`/api/assignments/${id}`);
      setAssignments(assignments.filter((a) => a.id !== id));
    } catch (err) {
      setError('Failed to revoke');
    }
  };

  const handleDownload = async (assignment) => {
    try {
      const response = await axios.get(`/api/assignments/${assignment.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${assignment.clientName}-${assignment.template?.name || 'filing'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to download the filed PDF');
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 1500);
  };

  return (
    <div>
      <h1>Docket</h1>
      <p style={{ marginBottom: '2rem' }}>Issue a client a link and credentials for one case file, and track it to a stamped filing.</p>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={17} />
          <span>{error}</span>
        </div>
      )}

      <div className="panel" style={{ marginBottom: '2.5rem' }}>
        <h3>New docket entry</h3>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Case file *</label>
            <select value={form.templateId} onChange={(e) => handleChange('templateId', e.target.value)} required>
              <option value="">Select a case file</option>
              {templates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-2">
            <div className="form-group">
              <label>Client name *</label>
              <input type="text" value={form.clientName} onChange={(e) => handleChange('clientName', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Client email *</label>
              <input type="email" value={form.clientEmail} onChange={(e) => handleChange('clientEmail', e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label>Password *</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" value={form.password} onChange={(e) => handleChange('password', e.target.value)} required minLength={6} />
              <button type="button" className="btn-outline" onClick={() => handleChange('password', generatePassword())} title="Generate new password">
                <RefreshCw size={17} />
              </button>
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? 'Filing…' : 'Create docket entry'}
          </button>
        </form>

        {createdLink && (
          <div className="panel panel-tight" style={{ marginTop: '1.5rem', background: 'var(--paper-sunken)', borderStyle: 'dashed' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              <Stamp size={17} style={{ color: 'var(--stamp-dark)' }} />
              Filed for {createdLink.clientName} — {createdLink.templateName}
            </h4>
            <p className="field-hint" style={{ marginBottom: '1rem' }}>
              Save these now and share them with your client yourself — the password won't be shown again.
            </p>
            {[
              { label: 'Link', value: createdLink.url, key: 'url' },
              { label: 'Email', value: createdLink.email, key: 'email' },
              { label: 'Password', value: createdLink.password, key: 'password' },
            ].map((row) => (
              <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <strong style={{ minWidth: '70px', fontSize: '0.85rem' }}>{row.label}</strong>
                <code className="mono" style={{ flex: 1, fontSize: '0.8125rem', wordBreak: 'break-all' }}>
                  {row.value}
                </code>
                <button type="button" onClick={() => copyToClipboard(row.value, row.key)} className="btn-ghost">
                  {copiedField === row.key ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <h3 style={{ marginBottom: '1rem' }}>Docket entries</h3>
      {loading ? (
        <div style={{ textAlign: 'center' }}>
          <div className="spinner"></div>
        </div>
      ) : assignments.length === 0 ? (
        <div className="register">
          <div className="register-empty">
            <BookMarked size={30} style={{ margin: '0 auto 1rem', color: 'var(--ink-faint)' }} />
            <p>No docket entries yet</p>
          </div>
        </div>
      ) : (
        <div className="register">
          <div className="register-head register-cols-docket">
            <span>Client</span>
            <span>Case file</span>
            <span>Status</span>
            <span>Link</span>
            <span></span>
          </div>
          {assignments.map((a) => (
            <div key={a.id} className="register-row register-cols-docket">
              <span>
                <span className="register-cell-name">{a.clientName}</span>
                <div className="register-cell-meta">{a.clientEmail}</div>
              </span>
              <span>{a.template?.name || '—'}</span>
              <span>
                <span className={`stamp-badge ${a.status === 'submitted' ? 'is-filed' : 'is-pending'}`}>
                  {a.status === 'submitted' ? 'Filed' : 'Pending'}
                </span>
              </span>
              <span>
                <button type="button" onClick={() => copyToClipboard(`${window.location.origin}/form/${a.token}`, a.id)} className="btn-outline" style={{ fontSize: '0.8125rem', padding: '0.45rem 0.75rem' }}>
                  {copiedField === a.id ? <Check size={15} /> : <Copy size={15} />}
                  Copy link
                </button>
              </span>
              <span className="register-actions">
                <button
                  onClick={() => handleDownload(a)}
                  title={a.status === 'submitted' ? 'Download filed PDF' : 'Awaiting submission'}
                  disabled={a.status !== 'submitted'}
                  className="btn-ghost"
                >
                  <Download size={17} />
                </button>
                <button onClick={() => handleRevoke(a.id)} title="Revoke" className="btn-ghost" style={{ color: 'var(--danger)' }}>
                  <Trash2 size={17} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignmentsList;
