import React, { useState } from 'react';
import { api } from '../api/index.js';

export default function SubscriptionModal({ onClose }) {
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await api.createCheckout();
      if (res.url) window.location.href = res.url;
      else alert('Stripe not configured yet.');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="card p-6 w-full max-w-sm animate-slide-up space-y-4">
        <div className="text-center">
          <div className="w-14 h-14 bg-bear-accent/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🐻</span>
          </div>
          <h2 className="text-lg font-bold text-bear-text">Unlock unlimited documents</h2>
          <p className="text-bear-muted text-sm mt-1">Your first document was free. Subscribe to create unlimited RFIs, Change Orders, Submittals, and more.</p>
        </div>

        <div className="bg-bear-accent/10 border border-bear-accent/20 rounded-xl p-4 space-y-2">
          {['Unlimited documents', 'All 8 document types', 'AI-powered generation', 'Document library', 'Cancel anytime'].map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-bear-text">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {f}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <button onClick={handleSubscribe} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : 'Subscribe — $19.99/mo'}
          </button>
          <button onClick={onClose} className="btn-ghost w-full text-sm">Maybe later</button>
        </div>
      </div>
    </div>
  );
}
