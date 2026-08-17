import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ClientAuthProvider } from './context/ClientAuthContext';
import Header from './components/Header';
import TabRail from './components/TabRail';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import UploadTemplate from './pages/UploadTemplate';
import FillForm from './pages/FillForm';
import SubmissionsList from './pages/SubmissionsList';
import AssignmentsList from './pages/AssignmentsList';
import ClientPortal from './pages/ClientPortal';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" />;
  }

  return children;
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isClientPortal = location.pathname.startsWith('/form/');
  const showShell = isAuthenticated && !isClientPortal;

  const routes = (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload-template"
        element={
          <ProtectedRoute>
            <UploadTemplate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fill-form/:templateId"
        element={
          <ProtectedRoute>
            <FillForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/template/:templateId/submissions"
        element={
          <ProtectedRoute>
            <SubmissionsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/links"
        element={
          <ProtectedRoute>
            <AssignmentsList />
          </ProtectedRoute>
        }
      />
      <Route path="/form/:token" element={<ClientPortal />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
    </Routes>
  );

  if (showShell) {
    return (
      <div className="app-shell">
        <Header />
        <div className="app-body">
          <TabRail />
          <main className="main-content">
            <div className="container">{routes}</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="main-content">
        <div className="container">{routes}</div>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ClientAuthProvider>
          <AppContent />
        </ClientAuthProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
