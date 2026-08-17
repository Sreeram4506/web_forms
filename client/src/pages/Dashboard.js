import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api';
import { FolderOpen, ListChecks, Pencil, Eye, Link2, Trash2, AlertTriangle } from 'lucide-react';

const docketNumber = (index) => `No. ${String(index + 1).padStart(4, '0')}`;

const Dashboard = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/templates');
      setTemplates(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Remove this case file? Its templates and history will be permanently deleted.')) {
      try {
        await axios.delete(`/api/templates/${id}`);
        setTemplates(templates.filter((t) => t._id !== id));
      } catch (err) {
        setError('Failed to delete template');
      }
    }
  };

  return (
    <div>
      <h1>Case files</h1>
      <p style={{ marginBottom: '2rem' }}>Every template you've filed, ready to send to a client or fill yourself.</p>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={17} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="register">
          <div className="register-empty">
            <FolderOpen size={30} style={{ margin: '0 auto 1rem', color: 'var(--ink-faint)' }} />
            <p style={{ marginBottom: '1.25rem' }}>No case files yet. File your first PDF or Word template to get started.</p>
            <Link to="/upload-template" className="btn-primary">
              New filing
            </Link>
          </div>
        </div>
      ) : (
        <div className="register">
          <div className="register-head register-cols-files">
            <span>Docket</span>
            <span>Case file</span>
            <span>Exhibits</span>
            <span>Source</span>
            <span></span>
          </div>
          {templates.map((template, index) => (
            <div key={template._id} className="register-row register-cols-files">
              <span className="docket-number">{docketNumber(index)}</span>
              <span>
                <span className="register-cell-name">{template.name}</span>
                {template.description && <div className="register-cell-meta">{template.description}</div>}
              </span>
              <span className="docket-number">
                <span className="register-mobile-label">Exhibits</span>
                {template.fields?.length || 0}
              </span>
              <span>
                <span className="stamp-badge is-pending" style={{ transform: 'none' }}>
                  {template.sourceType === 'docx' ? 'Word' : 'PDF'}
                </span>
              </span>
              <span className="register-actions">
                <Link to={`/templates/${template._id}/fields`} className="btn-ghost" title="Edit exhibit labels, hints, and choices">
                  <ListChecks size={17} />
                </Link>
                <Link to={`/fill-form/${template._id}`} className="btn-ghost" title="Preview and fill this form yourself">
                  <Pencil size={17} />
                </Link>
                <Link to={`/template/${template._id}/submissions`} className="btn-ghost" title="View submissions">
                  <Eye size={17} />
                </Link>
                <Link to={`/links?templateId=${template._id}`} className="btn-ghost" title="Create a client link">
                  <Link2 size={17} />
                </Link>
                <button onClick={() => handleDelete(template._id)} className="btn-ghost" title="Delete" style={{ color: 'var(--danger)' }}>
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

export default Dashboard;
