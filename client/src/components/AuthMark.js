import React from 'react';

const AuthMark = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '2.5rem' }}>
    <span className="masthead-dot" aria-hidden="true" />
    <strong
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.95rem',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--ink)',
      }}
    >
      PDF Forms
    </strong>
  </div>
);

export default AuthMark;
