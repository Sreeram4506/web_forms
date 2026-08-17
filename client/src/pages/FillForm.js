import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api';
import { Download, Save, Send, AlertTriangle, FileCheck2 } from 'lucide-react';
import { downloadBlobResponse } from '../utils/download';
import FieldInput from '../components/FieldInput';

const FillForm = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      const response = await axios.get(`/api/templates/${templateId}`);
      setTemplate(response.data);
      const initialData = {};
      response.data.fields?.forEach((field) => {
        initialData[field.name] = field.defaultValue || '';
      });
      setFormData(initialData);
      setError('');
    } catch (err) {
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError('');
    try {
      await axios.post('/api/submissions', { templateId, data: formData, status: 'draft' });
      setSuccess('Draft saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForm = async () => {
    setSaving(true);
    setError('');
    try {
      await axios.post('/api/submissions', { templateId, data: formData, status: 'submitted' });
      setSuccess('Submitted');
      setTimeout(() => navigate(`/template/${templateId}/submissions`), 1800);
    } catch (err) {
      setError('Failed to submit form');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    setGenerating(true);
    setError('');
    try {
      const submitResponse = await axios.post('/api/submissions', { templateId, data: formData, status: 'submitted' });
      const submissionId = submitResponse.data.submission.id;
      const response = await axios.post(`/api/submissions/${submissionId}/generate-pdf`, {}, { responseType: 'blob' });

      downloadBlobResponse(response, `${template.name}-filled.pdf`);

      setSuccess('Downloaded');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="alert alert-error">
        <AlertTriangle size={17} />
        <span>Template not found</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.35rem' }}>{template.name}</h1>
      <p style={{ marginBottom: '2rem' }}>Previewing this form as it will appear to a client.</p>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={17} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <FileCheck2 size={17} />
          <span>{success}</span>
        </div>
      )}

      <div className="panel">
        <form>
          {template.fields && template.fields.length > 0 ? (
            template.fields.map((field, idx) => (
              <FieldInput
                key={idx}
                field={field}
                value={formData[field.name]}
                onChange={(value) => handleInputChange(field.name, value)}
              />
            ))
          ) : (
            <p style={{ textAlign: 'center' }}>No fields detected on this template</p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleSaveDraft} className="btn-outline" disabled={saving}>
              <Save size={17} />
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button type="button" onClick={handleGeneratePDF} className="btn-primary" disabled={generating || saving}>
              <Download size={17} />
              {generating ? 'Generating…' : `Download ${template.sourceType === 'docx' ? 'DOCX' : 'PDF'}`}
            </button>
            <button type="button" onClick={handleSubmitForm} className="btn-secondary" disabled={saving}>
              <Send size={17} />
              {saving ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FillForm;
