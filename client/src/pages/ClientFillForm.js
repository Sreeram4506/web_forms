import React, { useState, useEffect } from 'react';
import clientApi from '../api/clientApi';
import { useClientAuth } from '../context/ClientAuthContext';
import { Save, Send, LogOut, AlertTriangle } from 'lucide-react';
import FieldInput from '../components/FieldInput';

const ClientFillForm = () => {
  const { clientName, clientLogout } = useClientAuth();
  const [assignment, setAssignment] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMine = async () => {
    try {
      const response = await clientApi.get('/api/assignments/mine');
      setAssignment(response.data);
      setSubmitted(response.data.status === 'submitted');

      const initialData = {};
      response.data.template?.fields?.forEach((field) => {
        initialData[field.name] = response.data.submission?.data?.[field.name] ?? field.defaultValue ?? '';
      });
      setFormData(initialData);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your form');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSave = async (status) => {
    const setBusy = status === 'submitted' ? setSubmitting : setSaving;
    setBusy(true);
    setError('');
    try {
      await clientApi.post('/api/assignments/mine/submit', { data: formData, status });
      if (status === 'submitted') {
        setSubmitted(true);
      } else {
        setSuccess('Draft saved');
        setTimeout(() => setSuccess(''), 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div style={{ maxWidth: '420px', margin: '5rem auto' }}>
        <div className="alert alert-error">
          <AlertTriangle size={17} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const fields = assignment?.template?.fields || [];

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
        <h1 style={{ margin: 0 }}>{assignment?.template?.name}</h1>
        <button onClick={clientLogout} className="btn-ghost">
          <LogOut size={16} />
          Log out
        </button>
      </div>
      <p style={{ marginBottom: '2rem' }}>Welcome, {clientName}</p>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={17} />
          <span>{error}</span>
        </div>
      )}
      {success && <div className="alert alert-success">{success}</div>}

      {submitted ? (
        <div className="panel" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <div className="filed-stamp stamp-impress" style={{ marginBottom: '1.75rem' }}>
            <span className="filed-stamp-word">Filed</span>
            <span className="filed-stamp-date">
              {new Date().toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' })}
            </span>
          </div>
          <h3 style={{ marginBottom: '0.5rem' }}>Your filing is complete</h3>
          <p>Thanks — your responses have been sent and this form is now locked.</p>
        </div>
      ) : (
        <div className="panel">
          <form>
            {fields.length > 0 ? (
              fields.map((field, idx) => (
                <FieldInput
                  key={idx}
                  field={field}
                  value={formData[field.name]}
                  onChange={(value) => handleInputChange(field.name, value)}
                />
              ))
            ) : (
              <p style={{ textAlign: 'center' }}>No fields on this form</p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => handleSave('draft')} className="btn-outline" disabled={saving || submitting}>
                <Save size={17} />
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button type="button" onClick={() => handleSave('submitted')} className="btn-stamp" disabled={saving || submitting}>
                <Send size={17} />
                {submitting ? 'Submitting…' : 'Submit filing'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ClientFillForm;
