import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';
import { api } from '../api/index.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API_BASE = import.meta.env.VITE_API_URL || '/api';

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

  // Handle redirect-based Google OAuth token in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get('google_token');
    const oauthError = params.get('error');

    if (googleToken) {
      // Remove from URL without reload
      window.history.replaceState({}, '', window.location.pathname);
      setLoading(true);
      // Store token and fetch user data
      login(googleToken, { id: '', email: '', email_verified: true });
      Promise.all([api.me(), api.getProfile(), api.getCompany().catch(() => null)])
        .then(([userData, profileData, companyData]) => {
          useAuthStore.setState({ user: userData, profile: profileData, company: companyData, subscription: null });
          navigate(profileData?.onboarding_complete ? '/' : '/onboarding', { replace: true });
        })
        .catch(() => setError('Google sign-in failed. Please try again.'))
        .finally(() => setLoading(false));
    } else if (oauthError) {
      window.history.replaceState({}, '', window.location.pathname);
      if (oauthError === 'google_not_configured') setError('Google login is not configured yet.');
      else if (oauthError === 'google_denied') setError('Google sign-in was cancelled.');
      else setError('Google sign-in failed. Please try again.');
    }
  }, []);

  // Google One Tap (when script available)
  useEffect(() => {
    if (mode === 'forgot' || !GOOGLE_CLIENT_ID || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleOneTapCallback,
    });
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'filled_black',
      size: 'large',
      width: '100%',
      text: mode === 'login' ? 'signin_with' : 'signup_with',
    });
  }, [mode]);

  async function handleGoogleOneTapCallback({ credential }) {
    setError('');
    setLoading(true);
    try {
      const res = await api.googleAuth(credential);
      login(res.token, { id: res.userId, email: '', email_verified: res.emailVerified });
      const [userData, profileData, companyData] = await Promise.all([api.me(), api.getProfile(), api.getCompany().catch(() => null)]);
      useAuthStore.setState({ user: userData, profile: profileData, company: companyData });
      navigate(profileData?.onboarding_complete ? '/' : '/onboarding', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleRedirect() {
    // Redirect-based OAuth — works without the Google Identity Services script
    window.location.href = `${API_BASE}/auth/google`;
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
        const [userData, profileData, companyData] = await Promise.all([api.me(), api.getProfile(), api.getCompany().catch(() => null)]);
        useAuthStore.setState({ user: userData, profile: profileData, company: companyData });
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

          {mode !== 'forgot' && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-bear-border" />
                <span className="text-bear-muted text-xs">or</span>
                <div className="flex-1 h-px bg-bear-border" />
              </div>
              {/* Redirect-based Google button — always visible */}
              <button
                type="button"
                onClick={handleGoogleRedirect}
                disabled={loading}
                className="w-full min-h-[44px] flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 font-medium text-sm rounded-xl border border-gray-200 transition-colors disabled:opacity-60 px-4 py-2.5"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
              {/* One Tap renders here when script is loaded */}
              {GOOGLE_CLIENT_ID && <div ref={googleBtnRef} className="hidden" />}
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
