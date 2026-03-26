// Dashboard — main page with transaction form, history, and real-time fraud alerts
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TransactionForm from '../components/TransactionForm';
import Transactions from './Transactions';
import socket from '../socket';
import api from '../api/axios';

export default function Dashboard() {
  const [alert, setAlert] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for real-time fraud alerts via Socket.io
    socket.on('fraud_alert', (data) => {
      setAlert(data);
    });
    return () => socket.off('fraud_alert');
  }, []);

  const handleFeedback = async (feedback) => {
    if (!alert) return;
    await api.post(`/transactions/${alert.transactionId}/feedback`, { feedback });
    setAlert(null);
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Fraud Detection Dashboard</h2>
        <button onClick={logout} style={{ padding: '6px 14px', cursor: 'pointer' }}>Logout</button>
      </div>

      {/* Real-time fraud alert banner */}
      {alert && (
        <div style={{ background: '#fdecea', border: '1px solid #f44336', padding: 16, borderRadius: 6, marginBottom: 20 }}>
          <strong>⚠️ {alert.message}</strong> — Score: {alert.score}
          <div style={{ marginTop: 10 }}>
            <button onClick={() => handleFeedback('valid')} style={{ marginRight: 8, padding: '6px 14px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              YES (Valid)
            </button>
            <button onClick={() => handleFeedback('fraud')} style={{ padding: '6px 14px', background: '#f44336', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              NO (Fraud)
            </button>
          </div>
        </div>
      )}

      <TransactionForm onSubmitted={() => setRefresh(r => r + 1)} />
      <Transactions key={refresh} />
    </div>
  );
}
