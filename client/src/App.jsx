import { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FDRSubmission from './pages/FDRSubmission';
import ScrutinyWorkbench from './pages/ScrutinyWorkbench';
import FDRDetail from './pages/FDRDetail';
import BankCBS from './pages/BankCBS';
import ReleaseWorkflow from './pages/ReleaseWorkflow';
import AuditTrail from './pages/AuditTrail';
import BulkImport from './pages/BulkImport';
import FDRRepository from './pages/FDRRepository';
import { switchRole, getNotifications } from './api';
import './index.css';

export const AuthContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch {
        logout();
      }
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchNotifications();
  }, [token]);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error('Error fetching notifications');
    }
  };

  const handleLogin = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const handleSwitchRole = async (role) => {
    try {
      const res = await switchRole(role);
      handleLogin(res.data.token, res.data.user);
      showToast(`Switched to ${role.replace('_', ' ')} role`, 'info');
    } catch (err) {
      showToast('Failed to switch role', 'error');
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <AuthContext.Provider value={{ user, token, logout, handleSwitchRole, notifications, unreadCount, fetchNotifications, showToast }}>
      <Router>
        {toast && (
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        )}
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/submit" element={<FDRSubmission />} />
            <Route path="/scrutiny" element={<ScrutinyWorkbench />} />
            <Route path="/fdr/:id" element={<FDRDetail />} />
            <Route path="/bank" element={<BankCBS />} />
            <Route path="/release" element={<ReleaseWorkflow />} />
            <Route path="/repository" element={<FDRRepository />} />
            <Route path="/audit" element={<AuditTrail />} />
            <Route path="/bulk-import" element={<BulkImport />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
