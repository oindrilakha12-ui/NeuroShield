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
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user info
    api.get('/auth/me').catch(() => {});

    // listen for fraud alerts
    socket.on('fraud_alert', (data) => {
      setAlert(data);
    });
    // auto-refresh transaction list when bank simulator generates new transaction
    socket.on('new_transaction', () => {
      setRefresh(r => r + 1);
    });
    return () => {
      socket.off('fraud_alert');
      socket.off('new_transaction');
    };
  }, []);

  const handleFeedback = async (feedback) => {
    if (!alert) return;
    try {
      await api.post(`/transactions/${alert.transactionId}/feedback`, { feedback });
      setAlert(null);
    } catch (err) {
      console.error('Error sending feedback:', err);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="content">
      <div className="container">
        <div className="header">
          <div>
            <h1>🛡️ NeuroShield Detection</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 14 }}>
              Real-time fraud detection & analysis system
            </p>
          </div>
          <button onClick={logout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>

        {/* Real-time fraud alert banner */}
        {alert && (
          <div className="alert alert-danger">
            <span style={{ fontSize: 24 }}>🚨</span>
            <div className="alert-content">
              <div className="alert-title" style={{ fontSize: 15, fontWeight: 700 }}>Fraud Alert - Immediate Action Required</div>
              <div className="alert-score" style={{ marginTop: 4 }}>{alert.message}</div>
              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.95, fontWeight: 500 }}>
                <strong>Risk Score:</strong> {(alert.score * 100).toFixed(1)}% | <strong>Status:</strong> Flagged for Review
              </div>
            </div>
          </div>
        )}

        {alert && (
          <div className="card" style={{ borderColor: 'rgba(209, 36, 47, 0.3)', background: 'rgba(209, 36, 47, 0.05)' }}>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleFeedback('valid')}
                className="btn btn-success"
                style={{ flex: '1 1 auto', minWidth: '120px' }}
              >
                ✓ Legitimate
              </button>
              <button
                onClick={() => handleFeedback('fraud')}
                className="btn btn-danger"
                style={{ flex: '1 1 auto', minWidth: '120px' }}
              >
                ✗ Report Fraud
              </button>
              <button
                onClick={() => setAlert(null)}
                className="btn btn-secondary"
                style={{ flex: '1 1 auto', minWidth: '120px' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <TransactionForm onSubmitted={() => setRefresh(r => r + 1)} />
        <Transactions key={refresh} />
      </div>
    </div>
  );
}
