import React, { useState } from 'react';
import { api } from '../api/index.js';

// dismissable=false: no "Maybe later", clicking backdrop does nothing
export default function SubscriptionModal({ onClose, dismissable = true, plan = 'free' }) {
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await api.createCheckout('pro');
      if (res.url) window.location.href = res.url;
      else alert('Billing not configured yet — contact support.');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleBackdrop() {
    if (dismissable && onClose) onClose();
  }

  return (
    <div
      className="modal-overlay p-0 sm:p-4"
      onClick={handleBackdrop}
    >
      <div
        className="modal-sheet card p-6 animate-slide-up space-y-4 rounded-b-none sm:rounded-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-14 h-14 bg-bear-accent/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <img src="/bear.png" alt="Bear" className="w-full h-full object-contain" />
          </div>
          <div className="inline-flex items-center gap-1.5 bg-bear-surface border border-bear-border rounded-full px-3 py-1 mb-3">
            <span className="text-xs font-medium text-bear-muted">Current plan:</span>
            <span className="text-xs font-bold text-bear-text uppercase tracking-wide">{plan}</span>
          </div>
          <h2 className="text-lg font-bold text-bear-text">You've used your free document</h2>
          <p className="text-bear-muted text-sm mt-1">
            The Free plan includes 1 document. Upgrade to Pro for unlimited documents, team collaboration, and all document types.
          </p>
        </div>

        <div className="bg-bear-accent/10 border border-bear-accent/20 rounded-xl p-4 space-y-2">
          {[
            'Unlimited documents',
            'All 20+ document types',
            'AI-powered generation',
            'Team collaboration',
            'Document library & search',
            'Cancel anytime',
          ].map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-bear-text">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {f}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Upgrade to Pro — $19.99/seat/mo
              </>
            )}
          </button>
          {dismissable && (
            <button onClick={onClose} className="btn-ghost w-full text-sm">Maybe later</button>
          )}
          {!dismissable && (
            <p className="text-center text-xs text-bear-muted">
              Your existing document is still in your library.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
