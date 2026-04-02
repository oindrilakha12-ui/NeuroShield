// Transactions page — list all transactions with fraud scores and feedback
import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/transactions');
      setTransactions(res.data);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sendFeedback = async (id, feedback) => {
    try {
      await api.post(`/transactions/${id}/feedback`, { feedback });
      load();
    } catch (err) {
      console.error('Error sending feedback:', err);
    }
  };

  return (
    <div className="card">
      <h3>📊 Transaction History & Risk Log</h3>
      
      {loading ? (
        <div className="empty-state">
          <div style={{ fontSize: 24, marginBottom: 12 }}>⏳</div>
          <p>Loading transaction records...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p>No transactions yet. Submit your first transaction to begin fraud analysis.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>💰 Amount</th>
                <th>📍 Location</th>
                <th>📱 Device</th>
                <th>📊 Risk Score</th>
                <th>🔐 Status</th>
                <th>🕐 Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => {
                const scorePercentage = (t.fraudLog?.score * 100 || 0).toFixed(1);
                const isFraud = t.fraudLog?.isFraud;
                let scoreClass = 'low';
                if (t.fraudLog?.score > 0.7) scoreClass = 'high';
                else if (t.fraudLog?.score > 0.4) scoreClass = 'medium';

                return (
                  <tr key={t._id}>
                    <td>
                      <strong style={{ color: '#58a6ff' }}>${t.amount.toFixed(2)}</strong>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{t.location}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{t.device}</td>
                    <td>
                      <span className={`score-display ${scoreClass}`}>
                        {scorePercentage}%
                      </span>
                    </td>
                    <td>
                      <span className={isFraud ? 'badge badge-danger' : 'badge badge-success'}>
                        {isFraud ? '🚨 Fraud' : '✅ Safe'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {new Date(t.createdAt).toLocaleDateString()} <br />
                        {new Date(t.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
