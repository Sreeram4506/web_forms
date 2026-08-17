import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../api';
import { ArrowLeft, Download, AlertTriangle } from 'lucide-react';
import { downloadBlobResponse } from '../utils/download';

const formatValue = (field, raw) => {
  if (field.type === 'boolean') return raw === 'true' || raw === true ? 'Yes' : 'No';
  return raw;
};

const SubmissionDetail = () => {
  const { submissionId } = useParams();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    axios
      .get(`/api/submissions/${submissionId}`)
      .then((res) => setSubmission(res.data))
      .catch(() => setError('Failed to load submission'))
      .finally(() => setLoading(false));
  }, [submissionId]);

  const download = async (kind) => {
    setDownloading(kind);
    try {
      const path =
        kind === 'pdf'
          ? `/api/submissions/${submissionId}/report-pdf`
          : `/api/submissions/${submissionId}/generate-pdf`;
      const response = await axios.post(path, {}, { responseType: 'blob' });
      downloadBlobResponse(response, `${submission.templateId?.name || 'submission'}`);
    } catch (err) {
      setError('Failed to download');
    } finally {
      setDownloading('');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="alert alert-error">
        <AlertTriangle size={17} />
        <span>{error || 'Submission not found'}</span>
      </div>
    );
  }

  const template = submission.templateId || {};
  const fields = template.fields || [];

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
        <Link
          to={`/template/${template._id}/submissions`}
          className="btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
        >
          <ArrowLeft size={17} />
          Back
        </Link>
        <h1 style={{ margin: 0, flex: 1 }}>{template.name}</h1>
        <span className={`stamp-badge ${submission.status === 'submitted' ? 'is-filed' : 'is-pending'}`}>
          {submission.status}
        </span>
      </div>
      <p style={{ marginBottom: '2rem' }}>
        Submitted {new Date(submission.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
      </p>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => download('pdf')} disabled={!!downloading}>
          <Download size={17} />
          {downloading === 'pdf' ? 'Preparing…' : 'Download PDF'}
        </button>
        {template.sourceType === 'docx' && (
          <button className="btn-outline" onClick={() => download('source')} disabled={!!downloading}>
            <Download size={17} />
            {downloading === 'source' ? 'Preparing…' : 'Download DOCX'}
          </button>
        )}
      </div>
      {template.sourceType === 'docx' && (
        <p className="field-hint" style={{ marginTop: '-1rem', marginBottom: '1.5rem' }}>
          The PDF is a clean record of every question and answer. The DOCX is your original
          document with the boxes ticked and the blanks filled in.
        </p>
      )}

      {fields.length === 0 ? (
        <div className="register">
          <div className="register-empty">
            <p>This template has no fields to show answers for.</p>
          </div>
        </div>
      ) : (
        <div className="answer-list">
          {fields.map((field, idx) => {
            const raw = submission.data?.[field.name];
            const value = formatValue(field, raw);
            const isSignature = field.type === 'signature';
            const isEmpty = !raw;

            return (
              <div key={idx} className="answer-row">
                <div className="answer-label">{field.label || field.name}</div>
                {isSignature && !isEmpty ? (
                  <div className="answer-value">
                    <img src={raw} alt={`${field.label} signature`} />
                  </div>
                ) : (
                  <div className={`answer-value ${isEmpty ? 'is-empty' : ''}`}>
                    {isEmpty ? 'Not answered' : value}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SubmissionDetail;
