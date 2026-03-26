// Transactions page — list all transactions with fraud scores and feedback
import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);

  const load = async () => {
    const res = await api.get('/transactions');
    setTransactions(res.data);
  };

  useEffect(() => { load(); }, []);

  const sendFeedback = async (id, feedback) => {
    await api.post(`/transactions/${id}/feedback`, { feedback });
    load();
  };

  return (
    <div>
      <h3>Transaction History</h3>
      {transactions.length === 0 && <p>No transactions yet.</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f1f3f4' }}>
            <th style={th}>Amount</th>
            <th style={th}>Location</th>
            <th style={th}>Device</th>
            <th style={th}>Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(t => (
            <tr key={t._id}>
              <td style={td}>${t.amount}</td>
              <td style={td}>{t.location}</td>
              <td style={td}>{t.device}</td>
              <td style={td}>{new Date(t.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: 8, textAlign: 'left', borderBottom: '1px solid #ddd' };
const td = { padding: 8, borderBottom: '1px solid #eee' };
