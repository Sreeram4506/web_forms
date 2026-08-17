import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Download, Save, Send, AlertTriangle, FileCheck2 } from 'lucide-react';

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

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${template.name}-filled.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      setSuccess('PDF downloaded');
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
              <div key={idx} className={`form-group ${field.required ? 'required' : ''}`}>
                <label>{field.name}</label>
                {field.type === 'text' && (
                  <input
                    type="text"
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    placeholder={`Enter ${field.name}`}
                    required={field.required}
                  />
                )}
                {field.type === 'checkbox' && (
                  <input
                    type="checkbox"
                    checked={formData[field.name] === 'true' || formData[field.name] === true}
                    onChange={(e) => handleInputChange(field.name, e.target.checked)}
                    style={{ marginTop: '0.5rem' }}
                  />
                )}
                {field.type === 'dropdown' && (
                  <select value={formData[field.name] || ''} onChange={(e) => handleInputChange(field.name, e.target.value)} required={field.required}>
                    <option value="">Select an option</option>
                    {field.options?.map((opt, i) => (
                      <option key={i} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
                {field.type === 'radio' && (
                  <div>
                    {field.options?.map((opt, i) => (
                      <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal', marginBottom: '0.25rem' }}>
                        <input
                          type="radio"
                          name={field.name}
                          value={opt}
                          checked={formData[field.name] === opt}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
                {!['text', 'checkbox', 'dropdown', 'radio'].includes(field.type) && (
                  <input
                    type="text"
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    placeholder={`Enter ${field.name}`}
                    required={field.required}
                  />
                )}
              </div>
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
              {generating ? 'Generating…' : 'Download PDF'}
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
