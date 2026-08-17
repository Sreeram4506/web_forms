import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import clientApi from '../api/clientApi';
import { useClientAuth } from '../context/ClientAuthContext';
import { AlertTriangle } from 'lucide-react';
import ClientLogin from './ClientLogin';
import ClientFillForm from './ClientFillForm';

const ClientPortal = () => {
  const { token } = useParams();
  const { isAuthenticatedFor } = useClientAuth();
  const [linkInfo, setLinkInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    clientApi
      .get(`/api/assignments/link/${token}`)
      .then((res) => {
        if (active) {
          setLinkInfo(res.data);
          setError('');
        }
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'This link is invalid or has been revoked.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '420px', margin: '5rem auto' }}>
        <div className="alert alert-error">
          <AlertTriangle size={17} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticatedFor(token)) {
    return <ClientLogin token={token} linkInfo={linkInfo} />;
  }

  return <ClientFillForm />;
};

export default ClientPortal;
