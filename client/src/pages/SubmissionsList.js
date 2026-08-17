import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Download, Trash2, ArrowLeft, ClipboardList, AlertTriangle } from 'lucide-react';

const SubmissionsList = () => {
  const { templateId } = useParams();
  const [template, setTemplate] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [templateId]);

  const fetchData = async () => {
    try {
      const [templateRes, submissionsRes] = await Promise.all([
        axios.get(`/api/templates/${templateId}`),
        axios.get(`/api/submissions/template/${templateId}`),
      ]);
      setTemplate(templateRes.data);
      setSubmissions(submissionsRes.data);
      setError('');
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (submissionId) => {
    if (window.confirm('Delete this submission?')) {
      try {
        await axios.delete(`/api/submissions/${submissionId}`);
        setSubmissions(submissions.filter((s) => s.id !== submissionId));
      } catch (err) {
        setError('Failed to delete submission');
      }
    }
  };

  const handleDownloadPDF = async (submissionId) => {
    try {
      const response = await axios.post(`/api/submissions/${submissionId}/generate-pdf`, {}, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `submission-${submissionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to download PDF');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link to="/dashboard" className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <ArrowLeft size={17} />
          Back
        </Link>
        <h1 style={{ margin: 0 }}>Submissions — {template?.name}</h1>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={17} />
          <span>{error}</span>
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="register">
          <div className="register-empty">
            <ClipboardList size={30} style={{ margin: '0 auto 1rem', color: 'var(--ink-faint)' }} />
            <p>No submissions yet</p>
          </div>
        </div>
      ) : (
        <div className="register">
          <div className="register-head register-cols-submissions">
            <span>ID</span>
            <span>Status</span>
            <span>Submitted</span>
            <span></span>
          </div>
          {submissions.map((submission) => (
            <div key={submission.id} className="register-row register-cols-submissions">
              <span className="docket-number">{submission.id.substring(0, 8)}…</span>
              <span>
                <span className={`stamp-badge ${submission.status === 'submitted' ? 'is-filed' : 'is-pending'}`}>{submission.status}</span>
              </span>
              <span className="register-cell-meta">{new Date(submission.createdAt).toLocaleDateString()}</span>
              <span className="register-actions">
                <button onClick={() => handleDownloadPDF(submission.id)} title="Download PDF" className="btn-ghost">
                  <Download size={17} />
                </button>
                <button onClick={() => handleDelete(submission.id)} title="Delete" className="btn-ghost" style={{ color: 'var(--danger)' }}>
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

export default SubmissionsList;
