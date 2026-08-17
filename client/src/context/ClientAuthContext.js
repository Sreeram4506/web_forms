import React, { createContext, useState, useContext } from 'react';
import clientApi from '../api/clientApi';

const ClientAuthContext = createContext();

export const ClientAuthProvider = ({ children }) => {
  const [clientToken, setClientToken] = useState(localStorage.getItem('clientToken') || '');
  const [clientLinkToken, setClientLinkToken] = useState(localStorage.getItem('clientLinkToken') || '');
  const [clientName, setClientName] = useState(localStorage.getItem('clientName') || '');

  const clientLogin = async (linkToken, email, password) => {
    const response = await clientApi.post(`/api/assignments/link/${linkToken}/login`, { email, password });
    const { token, clientName: name } = response.data;
    localStorage.setItem('clientToken', token);
    localStorage.setItem('clientLinkToken', linkToken);
    localStorage.setItem('clientName', name);
    setClientToken(token);
    setClientLinkToken(linkToken);
    setClientName(name);
    return { token, clientName: name };
  };

  const clientLogout = () => {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientLinkToken');
    localStorage.removeItem('clientName');
    setClientToken('');
    setClientLinkToken('');
    setClientName('');
  };

  // A stored session is only valid for the link it was issued for -
  // visiting a different client's link must not reuse a stale session.
  const isAuthenticatedFor = (linkToken) => !!clientToken && clientLinkToken === linkToken;

  return (
    <ClientAuthContext.Provider
      value={{ clientToken, clientName, isAuthenticatedFor, clientLogin, clientLogout }}
    >
      {children}
    </ClientAuthContext.Provider>
  );
};

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (!context) {
    throw new Error('useClientAuth must be used within ClientAuthProvider');
  }
  return context;
};
