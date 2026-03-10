import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/index.js';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('invalid'); return; }
    api.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('invalid'));
  }, []);

  return (
    <div className="min-h-full bg-bear-bg flex items-center justify-center px-4">
      <div className="card p-8 max-w-sm w-full text-center">
        {status === 'verifying' && (
          <>
            <div className="w-8 h-8 border-2 border-bear-accent/30 border-t-bear-accent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-bear-muted">Verifying your email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-bear-text mb-2">Email verified</h2>
            <p className="text-bear-muted mb-6">Your email has been confirmed.</p>
            <Link to="/" className="btn-primary block">Go to app</Link>
          </>
        )}
        {status === 'invalid' && (
          <>
            <div className="text-4xl mb-4">✗</div>
            <h2 className="text-xl font-bold text-bear-text mb-2">Invalid link</h2>
            <p className="text-bear-muted mb-6">This verification link is invalid or has expired.</p>
            <Link to="/login" className="btn-primary block">Back to login</Link>
          </>
        )}
      </div>
    </div>
  );
}
