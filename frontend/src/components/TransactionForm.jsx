// TransactionForm — submit a new transaction and show fraud score
import { useState } from 'react';
import api from '../api/axios';

export default function TransactionForm({ onSubmitted }) {
  const [form, setForm] = useState({ amount: '', time: '', location: '', device: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    try {
      const res = await api.post('/transactions', {
        ...form,
        amount: parseFloat(form.amount),
        time: parseInt(form.time)
      });
      setResult(res.data);
      if (onSubmitted) onSubmitted();
    } catch (err) {
      setError(err.response?.data?.message || 'Error submitting transaction');
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <h3>New Transaction</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input name="amount" placeholder="Amount" value={form.amount} onChange={handleChange} required style={{ padding: 8 }} />
        <input name="time" placeholder="Time (seconds)" value={form.time} onChange={handleChange} required style={{ padding: 8 }} />
        <input name="location" placeholder="Location" value={form.location} onChange={handleChange} required style={{ padding: 8 }} />
        <input name="device" placeholder="Device" value={form.device} onChange={handleChange} required style={{ padding: 8 }} />
        <button type="submit" style={{ padding: '8px 16px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4 }}>Submit</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 12, padding: 12, background: result.fraudLog.isFraud ? '#fdecea' : '#e6f4ea', borderRadius: 4 }}>
          <strong>Fraud Score:</strong> {result.fraudLog.score} &nbsp;
          <strong>Is Fraud:</strong> {result.fraudLog.isFraud ? '⚠️ YES' : '✅ NO'}
        </div>
      )}
    </div>
  );
}
