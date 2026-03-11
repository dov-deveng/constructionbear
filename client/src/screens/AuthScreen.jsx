import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';
import { api } from '../api/index.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function AuthScreen({ mode = 'login' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef(null);
  const { login, user, profile } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(profile?.onboarding_complete ? '/' : '/onboarding', { replace: true });
    }
  }, [user]);

  // Google One Tap
  useEffect(() => {
    if (mode === 'forgot' || !GOOGLE_CLIENT_ID || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCallback,
    });
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'filled_black',
      size: 'large',
      width: '100%',
      text: mode === 'login' ? 'signin_with' : 'signup_with',
    });
  }, [mode]);

  async function handleGoogleCallback({ credential }) {
    setError('');
    setLoading(true);
    try {
      const res = await api.googleAuth(credential);
      login(res.token, { id: res.userId, email: '', email_verified: res.emailVerified });
      const [userData, profileData] = await Promise.all([api.me(), api.getProfile()]);
      useAuthStore.setState({ user: userData, profile: profileData });
      navigate(profileData?.onboarding_complete ? '/' : '/onboarding', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        await api.forgotPassword(email);
        setSuccess('If that email is registered, you\'ll receive a reset link shortly.');
        setLoading(false);
        return;
      }

      if (mode === 'register') {
        if (password !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters'); setLoading(false); return; }
        const res = await api.register(email, password);
        login(res.token, { id: res.userId, email, email_verified: false });
        navigate('/onboarding', { replace: true });
      } else {
        const res = await api.login(email, password);
        login(res.token, { id: res.userId, email, email_verified: res.emailVerified });
        const [userData, profileData] = await Promise.all([api.me(), api.getProfile()]);
        useAuthStore.setState({ user: userData, profile: profileData });
        navigate(profileData?.onboarding_complete ? '/' : '/onboarding', { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-bear-bg flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-bear-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
            <img src="/bear.png" alt="Bear" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-bear-text">ConstructionBear.AI</h1>
          <p className="text-bear-muted text-sm mt-1">Construction documents, instantly.</p>
        </div>

        {/* Card */}
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-bear-text">
            {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Reset password'}
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-xl">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-bear-muted mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-sm font-medium text-bear-muted mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field"
                  placeholder={mode === 'register' ? 'Minimum 8 characters' : '••••••••'}
                  required
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-bear-muted mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
            </button>
          </form>

          {mode !== 'forgot' && GOOGLE_CLIENT_ID && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-bear-border" />
                <span className="text-bear-muted text-xs">or</span>
                <div className="flex-1 h-px bg-bear-border" />
              </div>
              <div ref={googleBtnRef} className="w-full" />
            </>
          )}
        </div>

        {/* Footer links */}
        <div className="mt-4 text-center text-sm text-bear-muted space-y-2">
          {mode === 'login' && (
            <>
              <p>
                <Link to="/forgot-password" className="text-bear-accent hover:underline">Forgot password?</Link>
              </p>
              <p>
                Don't have an account?{' '}
                <Link to="/register" className="text-bear-accent hover:underline">Sign up free</Link>
              </p>
            </>
          )}
          {mode === 'register' && (
            <p>
              Already have an account?{' '}
              <Link to="/login" className="text-bear-accent hover:underline">Sign in</Link>
            </p>
          )}
          {mode === 'forgot' && (
            <p>
              <Link to="/login" className="text-bear-accent hover:underline">Back to sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
