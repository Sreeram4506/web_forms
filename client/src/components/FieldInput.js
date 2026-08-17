import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, X, AlertTriangle } from 'lucide-react';

const OTHER_LABEL = 'Other';
const MAX_SIGNATURE_BYTES = 3 * 1024 * 1024; // 3MB

// A field's resolved value is always a single string — the chosen option's
// text, or (when "Other" is picked) whatever the person typed — so it fills
// the source document as plain, readable text with no extra decoding step.
//
// "Other selected, nothing typed yet" is tracked as local UI state rather
// than derived from the resolved value: an empty resolved value is
// otherwise indistinguishable from "nothing chosen," which would make the
// Other option appear to instantly un-select itself the moment it's picked.
const FieldInput = ({ field, value, onChange }) => {
  const { name, label, hint, type, options = [], required, allowOther } = field;
  const displayLabel = label || name;
  const fileRef = useRef(null);
  const [fileError, setFileError] = useState('');

  const knownValue = value && options.includes(value);
  const [singleOtherActive, setSingleOtherActive] = useState(!!value && !knownValue);
  const [multiOtherActive, setMultiOtherActive] = useState(false);

  useEffect(() => {
    if (value && options.includes(value)) setSingleOtherActive(false);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const labelBlock = (
    <>
      <label>{displayLabel}</label>
      {hint && <p className="field-hint" style={{ marginTop: '-0.2rem', marginBottom: '0.5rem' }}>{hint}</p>}
    </>
  );

  if (type === 'boolean') {
    return (
      <div className={`form-group ${required ? 'required' : ''}`}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={value === 'true' || value === true}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            style={{ width: 'auto' }}
          />
          {displayLabel}
        </label>
        {hint && <p className="field-hint">{hint}</p>}
      </div>
    );
  }

  if (type === 'choice-single') {
    const otherText = singleOtherActive ? value || '' : '';
    const selectedKnown = !singleOtherActive ? value || '' : '';
    const allOptions = allowOther ? [...options, OTHER_LABEL] : options;

    return (
      <div className={`form-group ${required ? 'required' : ''}`}>
        {labelBlock}
        <div className="choice-list">
          {allOptions.map((opt) => (
            <label key={opt} className="choice-row">
              <input
                type="radio"
                name={name}
                checked={opt === OTHER_LABEL ? singleOtherActive : selectedKnown === opt}
                onChange={() => {
                  if (opt === OTHER_LABEL) {
                    setSingleOtherActive(true);
                    onChange('');
                  } else {
                    setSingleOtherActive(false);
                    onChange(opt);
                  }
                }}
              />
              {opt}
            </label>
          ))}
        </div>
        {singleOtherActive && (
          <input
            type="text"
            className="choice-other-input"
            placeholder="Please specify"
            value={otherText}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
        )}
      </div>
    );
  }

  if (type === 'choice-multi') {
    const parts = value ? value.split(', ').filter(Boolean) : [];
    const knownSelected = new Set(parts.filter((p) => options.includes(p)));
    const looseOtherText = parts.find((p) => !options.includes(p)) || '';
    const otherActive = multiOtherActive || !!looseOtherText;
    const otherText = looseOtherText;
    const allOptions = allowOther ? [...options, OTHER_LABEL] : options;

    const resolve = (nextKnown, nextOtherActive, nextOtherText) => {
      const result = allOptions.filter((o) => o !== OTHER_LABEL && nextKnown.has(o));
      if (nextOtherActive && nextOtherText) result.push(nextOtherText);
      onChange(result.join(', '));
    };

    return (
      <div className={`form-group ${required ? 'required' : ''}`}>
        {labelBlock}
        <div className="choice-list">
          {allOptions.map((opt) => {
            const checked = opt === OTHER_LABEL ? otherActive : knownSelected.has(opt);
            return (
              <label key={opt} className="choice-row">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (opt === OTHER_LABEL) {
                      const next = !otherActive;
                      setMultiOtherActive(next);
                      resolve(knownSelected, next, otherText);
                    } else {
                      const next = new Set(knownSelected);
                      if (next.has(opt)) next.delete(opt);
                      else next.add(opt);
                      resolve(next, otherActive, otherText);
                    }
                  }}
                />
                {opt}
              </label>
            );
          })}
        </div>
        {otherActive && (
          <input
            type="text"
            className="choice-other-input"
            placeholder="Please specify"
            value={otherText}
            onChange={(e) => resolve(knownSelected, true, e.target.value)}
            autoFocus
          />
        )}
      </div>
    );
  }

  if (type === 'signature') {
    const handleFile = (file) => {
      setFileError('');
      if (!file) return;
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        setFileError('Please upload a PNG or JPEG image');
        return;
      }
      if (file.size > MAX_SIGNATURE_BYTES) {
        setFileError('Image must be smaller than 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => onChange(reader.result);
      reader.readAsDataURL(file);
    };

    return (
      <div className={`form-group ${required ? 'required' : ''}`}>
        {labelBlock}
        {fileError && (
          <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>
            <AlertTriangle size={16} />
            <span>{fileError}</span>
          </div>
        )}
        {value ? (
          <div className="signature-preview">
            <img src={value} alt="Uploaded signature" />
            <button type="button" className="btn-ghost" onClick={() => onChange('')} title="Remove signature">
              <X size={16} />
              Remove
            </button>
          </div>
        ) : (
          <div className="intake-tray" onClick={() => fileRef.current?.click()}>
            <UploadCloud size={24} style={{ margin: '0 auto 0.6rem', color: 'var(--ink-faint)' }} />
            <p style={{ fontWeight: 600, color: 'var(--ink)' }}>Click to upload your signature</p>
            <p className="field-hint">PNG or JPEG, up to 3MB</p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>
    );
  }

  // 'text' and any unrecognized type fall back to a plain input.
  return (
    <div className={`form-group ${required ? 'required' : ''}`}>
      {labelBlock}
      <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={`Enter ${displayLabel}`} required={required} />
    </div>
  );
};

export default FieldInput;
