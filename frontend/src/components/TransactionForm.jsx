// TransactionForm — submit a new transaction and show fraud score
import { useState } from 'react';
import api from '../api/axios';

export default function TransactionForm({ onSubmitted }) {
  const [form, setForm] = useState({ amount: '', time: '', location: '', device: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await api.post('/transactions', {
        ...form,
        amount: parseFloat(form.amount),
        time: parseInt(form.time)
      });
      setResult(res.data);
      setForm({ amount: '', time: '', location: '', device: '' });
      if (onSubmitted) onSubmitted();
    } catch (err) {
      setError(err.response?.data?.message || 'Error submitting transaction');
    } finally {
      setLoading(false);
    }
  };

  const fraudScore = result?.fraudLog?.score || 0;
  const isFraud = result?.fraudLog?.isFraud || false;
  const scorePercentage = (fraudScore * 100).toFixed(1);

  let scoreClass = 'low';
  if (fraudScore > 0.7) scoreClass = 'high';
  else if (fraudScore > 0.4) scoreClass = 'medium';

  return (
    <div className="card">
      <h3>� Submit Transaction for Analysis</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-inline">
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="amount">Amount ($)</label>
            <input
              id="amount"
              name="amount"
              placeholder="0.00"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="time">Time (seconds)</label>
            <input
              id="time"
              name="time"
              placeholder="0"
              type="number"
              value={form.time}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="location">Location</label>
            <input
              id="location"
              name="location"
              placeholder="City, Country"
              value={form.location}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="device">Device</label>
            <input
              id="device"
              name="device"
              placeholder="e.g., Mobile, Desktop"
              value={form.device}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ marginTop: 16, width: '100%' }}
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Submit Transaction'}
        </button>
      </form>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: 16 }}>
          <span>⚠️</span>
          <div className="alert-content">
            <div className="alert-title">Error</div>
            <div className="alert-score">{error}</div>
          </div>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <div className={`alert ${isFraud ? 'alert-danger' : 'alert-success'}`}>
            <span>{isFraud ? '🚨' : '✅'}</span>
            <div className="alert-content">
              <div className="alert-title" style={{ fontSize: 15, fontWeight: 700 }}>
                {isFraud ? 'High Risk Detected - Review Required' : 'Transaction Cleared'}
              </div>
              <div className="alert-score" style={{ marginTop: 4 }}>
                Fraud probability: {scorePercentage}%
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 16, background: 'rgba(88, 166, 255, 0.08)', border: '1px solid rgba(88, 166, 255, 0.2)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>
                  📊 Analysis Details
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <div>💰 Amount: <strong>${form.amount}</strong></div>
                  <div>📍 Location: <strong>{form.location}</strong></div>
                  <div>📱 Device: <strong>{form.device}</strong></div>
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(88, 166, 255, 0.2)' }}>
                    Risk Level: <span className={`score-display ${scoreClass}`}>{scorePercentage}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
