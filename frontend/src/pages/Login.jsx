// Login page — handles register and login
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const res = await api.post(endpoint, { email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24, border: '1px solid #ddd', borderRadius: 8 }}>
      <h2>{isRegister ? 'Register' : 'Login'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
          required
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
          required
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ width: '100%', padding: 10, background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4 }}>
          {isRegister ? 'Register' : 'Login'}
        </button>
      </form>
      <p style={{ marginTop: 12, textAlign: 'center' }}>
        {isRegister ? 'Already have an account?' : "Don't have an account?"}
        <button onClick={() => setIsRegister(!isRegister)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer' }}>
          {isRegister ? 'Login' : 'Register'}
        </button>
      </p>
    </div>
  );
}
