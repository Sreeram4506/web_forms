import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api';
import { UploadCloud, FileCheck2, AlertTriangle, Info } from 'lucide-react';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const exhibitLetter = (index) => {
  let n = index;
  let label = '';
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
};

const UploadTemplate = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [detectedFields, setDetectedFields] = useState([]);
  const navigate = useNavigate();

  const isAllowedType = (f) => f && (f.type === 'application/pdf' || f.type === DOCX_MIME);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (isAllowedType(selectedFile)) {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a PDF or Word (.docx) file');
      setFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!name || !file) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('description', description);

      const response = await axios.post('/api/templates/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setDetectedFields(response.data.template.fields);
      setSuccess(`Filed. ${response.data.template.fields.length} exhibit${response.data.template.fields.length === 1 ? '' : 's'} detected.`);

      setTimeout(() => {
        navigate('/dashboard');
      }, 2200);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto' }}>
      <h1>New filing</h1>
      <p style={{ marginBottom: '2rem' }}>Upload a PDF or Word document; its fields become the client's form automatically.</p>

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
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Case file name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Client Intake Form" required />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief note about this template" rows="2" />
          </div>

          <div className="form-group">
            <label>Document *</label>
            <div
              className={`intake-tray${file ? ' has-file' : ''}`}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (isAllowedType(droppedFile)) {
                  setFile(droppedFile);
                  setError('');
                } else {
                  setError('Please drop a PDF or Word (.docx) file');
                }
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <input type="file" accept=".pdf,.docx" onChange={handleFileChange} style={{ display: 'none' }} id="file-input" />
              <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
                {file ? (
                  <div>
                    <FileCheck2 size={26} style={{ margin: '0 auto 0.75rem', color: 'var(--ok)' }} />
                    <p style={{ fontWeight: 600, color: 'var(--ink)' }}>{file.name}</p>
                    <p className="field-hint">Click to change</p>
                  </div>
                ) : (
                  <div>
                    <UploadCloud size={26} style={{ margin: '0 auto 0.75rem', color: 'var(--ink-faint)' }} />
                    <p style={{ fontWeight: 600, color: 'var(--ink)' }}>Click to upload, or drag a file into the tray</p>
                    <p className="field-hint">PDF or Word (.docx)</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {file?.type === DOCX_MIME && (
            <div className="alert" style={{ backgroundColor: 'var(--kraft-soft)', color: 'var(--kraft-dark)', borderColor: 'rgba(169,121,44,0.3)' }}>
              <Info size={17} />
              <span>
                Word documents have no fillable fields of their own — mark each spot a client should complete with double curly braces, e.g.{' '}
                <code>{'{{Full Name}}'}</code> or <code>{'{{Date}}'}</code>. Every placeholder becomes an exhibit on the generated form.
              </span>
            </div>
          )}

          {detectedFields.length > 0 && (
            <div className="exhibit-list">
              {detectedFields.map((field, idx) => (
                <div key={idx} className="exhibit-row">
                  <span className="exhibit-letter">{exhibitLetter(idx)}</span>
                  <span>{field.name}</span>
                  <span className="exhibit-type">{field.type}</span>
                </div>
              ))}
            </div>
          )}

          <button type="submit" className="btn-primary btn-block" disabled={loading || !file}>
            {loading ? 'Filing…' : 'File template'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadTemplate;
