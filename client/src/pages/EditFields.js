import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../api';
import { ArrowLeft, Plus, X, AlertTriangle, FileCheck2 } from 'lucide-react';
import { exhibitLetter } from '../utils/exhibitLetter';

const TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'boolean', label: 'Yes / No checkbox' },
  { value: 'choice-single', label: 'Choice — pick one' },
  { value: 'choice-multi', label: 'Choice — pick multiple' },
  { value: 'signature', label: 'Signature upload' },
];

const CHOICE_TYPES = ['choice-single', 'choice-multi'];

// Where in the document this field came from. Auto-detected fields have
// internal names like "__checkbox_table_4" that mean nothing to an admin, so
// show what the field actually is instead of its bookkeeping key.
const fieldOrigin = (field) => {
  if (field.source === 'checkbox-table' || field.source === 'checkbox-group') return 'Tick-box question';
  if (field.source === 'response-line') return 'Written answer';
  return field.name;
};

const EditFields = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    axios
      .get(`/api/templates/${templateId}`)
      .then((res) => {
        setTemplateName(res.data.name);
        setFields(
          res.data.fields.map((f) => ({
            ...f,
            label: f.label || f.name,
            options: f.options || [],
          }))
        );
      })
      .catch(() => setError('Failed to load template'))
      .finally(() => setLoading(false));
  }, [templateId]);

  const updateField = (index, patch) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const updateOption = (fieldIndex, optIndex, text) => {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== fieldIndex) return f;
        const options = [...f.options];
        options[optIndex] = text;
        return { ...f, options };
      })
    );
  };

  const addOption = (fieldIndex) => {
    setFields((prev) =>
      prev.map((f, i) => (i === fieldIndex ? { ...f, options: [...f.options, ''] } : f))
    );
  };

  const removeOption = (fieldIndex, optIndex) => {
    setFields((prev) =>
      prev.map((f, i) => (i === fieldIndex ? { ...f, options: f.options.filter((_, oi) => oi !== optIndex) } : f))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const cleaned = fields.map((f) => ({
        ...f,
        options: CHOICE_TYPES.includes(f.type) ? f.options.filter((o) => o.trim()) : [],
      }));
      await axios.put(`/api/templates/${templateId}`, { fields: cleaned });
      setSuccess('Saved');
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save fields');
    } finally {
      setSaving(false);
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
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.35rem' }}>
        <Link to="/dashboard" className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <ArrowLeft size={17} />
          Back
        </Link>
        <h1 style={{ margin: 0 }}>Exhibits — {templateName}</h1>
      </div>
      <p style={{ marginBottom: '2rem' }}>
        Give each exhibit a clear label and, for anything with options, spell out the choices so whoever fills this form knows exactly what to answer.
      </p>

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

      {fields.length === 0 ? (
        <div className="register">
          <div className="register-empty">
            <p>No exhibits detected on this template.</p>
          </div>
        </div>
      ) : (
        fields.map((field, index) => (
          <div key={field.name} className="panel field-editor-row">
            <div className="field-editor-head">
              <span className="exhibit-letter">{exhibitLetter(index)}</span>
              <span className="docket-number">{fieldOrigin(field)}</span>
            </div>

            <div className="form-group">
              <label>Label shown to whoever fills this out</label>
              <input type="text" value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} />
            </div>

            <div className="form-group">
              <label>Hint (optional)</label>
              <input
                type="text"
                value={field.hint || ''}
                onChange={(e) => updateField(index, { hint: e.target.value })}
                placeholder="e.g., Enter your legal business name as it appears on file"
              />
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label>Answer type</label>
                <select value={field.type} onChange={(e) => updateField(index, { type: e.target.value })}>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.7rem' }}>
                  <input
                    type="checkbox"
                    checked={!!field.required}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                    style={{ width: 'auto' }}
                  />
                  Required
                </label>
              </div>
            </div>

            {CHOICE_TYPES.includes(field.type) && (
              <div className="form-group">
                <label>Choices</label>
                {field.options.map((opt, optIndex) => (
                  <div key={optIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input type="text" value={opt} onChange={(e) => updateOption(index, optIndex, e.target.value)} placeholder={`Choice ${optIndex + 1}`} />
                    <button type="button" className="btn-ghost" onClick={() => removeOption(index, optIndex)} title="Remove choice">
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button type="button" className="btn-outline" onClick={() => addOption(index)} style={{ fontSize: '0.8125rem', padding: '0.5rem 0.85rem' }}>
                  <Plus size={15} />
                  Add choice
                </button>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem', fontWeight: 'normal' }}>
                  <input
                    type="checkbox"
                    checked={!!field.allowOther}
                    onChange={(e) => updateField(index, { allowOther: e.target.checked })}
                    style={{ width: 'auto' }}
                  />
                  Allow "Other" with a typed answer
                </label>
              </div>
            )}
          </div>
        ))
      )}

      <button type="button" className="btn-primary btn-block" onClick={handleSave} disabled={saving || fields.length === 0}>
        {saving ? 'Saving…' : 'Save exhibits'}
      </button>
    </div>
  );
};

export default EditFields;
