// Login page — handles register and login
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const res = await api.post(endpoint, { email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: '#0f1117' }}>
      <div style={{ maxWidth: 420, width: '100%' }}>
        <div className="page-wrapper">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, marginBottom: 8, background: 'linear-gradient(135deg, #58a6ff 0%, #1f6feb 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>🛡️ NeuroShield</h1>
            <p style={{ color: '#8b949e', margin: 0, fontSize: 14 }}>
              AI-Powered Fraud Detection System
            </p>
          </div>

          <h2 style={{ fontSize: 20, textAlign: 'center', marginBottom: 24, color: '#c9d1d9', fontWeight: 600 }}>
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="alert alert-danger mb-2">
                <span style={{ fontSize: 16 }}>⚠️</span>
                <div>
                  <div className="alert-title">Error</div>
                  <div className="alert-score">{error}</div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 20 }}
              disabled={loading}
            >
              {loading ? 'Loading...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
              {isRegister ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="btn btn-link"
            >
              {isRegister ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 24 }}>
          © 2026 NeuroShield. All rights reserved.
        </p>
      </div>
    </div>
  );
}
