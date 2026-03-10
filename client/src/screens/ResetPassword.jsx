import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/index.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Minimum 8 characters'); return; }
    setLoading(true);
    try {
      await api.resetPassword(params.get('token'), password);
      navigate('/login?reset=1', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-bear-bg flex items-center justify-center px-4">
      <div className="card p-6 max-w-sm w-full">
        <h2 className="text-xl font-bold text-bear-text mb-5">Set new password</h2>
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" placeholder="New password (min 8 chars)" required />
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="input-field" placeholder="Confirm password" required />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Saving...' : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  );
}
