import { useState } from 'react';
import api from '../api/index.js';

export default function PricingModal({ isOpen, onClose, currentPlan = 'free' }) {
  const [loading, setLoading] = useState(null); // 'personal' | 'business'

  if (!isOpen) return null;

  async function handleSelect(plan) {
    setLoading(plan);
    try {
      const result = await api.createCheckout(plan, window.location.href);
      if (result.url) window.location.href = result.url;
    } catch (err) {
      alert(err.message || 'Failed to start checkout');
    } finally {
      setLoading(null);
    }
  }

  const isPersonal = currentPlan === 'personal';
  const isBusiness = currentPlan === 'business';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-bear-surface rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <h2 className="text-base font-semibold text-bear-text">Choose your plan</h2>
            <p className="text-xs text-bear-muted mt-0.5">Upgrade anytime. Cancel anytime.</p>
          </div>
          <button onClick={onClose} className="text-bear-muted hover:text-bear-text transition-colors p-1 -mr-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-5 space-y-3">
          {/* Personal Plan — Recommended */}
          <div className={`relative rounded-xl border-2 p-4 transition-colors ${
            isPersonal
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-bear-accent bg-bear-accent/5'
          }`}>
            {/* Recommended badge */}
            {!isPersonal && !isBusiness && (
              <span className="absolute -top-2.5 left-4 text-[10px] font-bold uppercase tracking-wider bg-bear-accent text-white px-2 py-0.5 rounded-full">
                Recommended
              </span>
            )}
            {isPersonal && (
              <span className="absolute -top-2.5 left-4 text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Current Plan
              </span>
            )}

            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-bear-text">Personal</p>
                <p className="text-xs text-bear-muted mt-0.5">For solo contractors</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-bear-text">$29.99</p>
                <p className="text-[10px] text-bear-muted">/ user / mo</p>
              </div>
            </div>

            <ul className="space-y-1.5 mb-4">
              {['100 documents / month', 'All document types', 'PDF generation', 'Company profile'].map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-bear-muted">
                  <svg className="w-3.5 h-3.5 text-bear-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {isPersonal ? (
              <div className="w-full text-center text-xs font-semibold text-emerald-400 py-2">
                You're on this plan
              </div>
            ) : (
              <button
                onClick={() => handleSelect('personal')}
                disabled={!!loading || isBusiness}
                className="btn-primary w-full text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading === 'personal'
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : 'Get Started'}
              </button>
            )}
          </div>

          {/* Business Plan */}
          <div className={`relative rounded-xl border p-4 transition-colors ${
            isBusiness
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-bear-border bg-bear-surface-2'
          }`}>
            {isBusiness && (
              <span className="absolute -top-2.5 left-4 text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Current Plan
              </span>
            )}

            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-bear-text">Business</p>
                <p className="text-xs text-bear-muted mt-0.5">For teams &amp; companies</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-bear-text">$129.99</p>
                <p className="text-[10px] text-bear-muted">/ mo</p>
              </div>
            </div>

            <ul className="space-y-1.5 mb-4">
              {['Unlimited documents', '5 users included', '+$24.99 per extra user', 'Everything in Personal'].map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-bear-muted">
                  <svg className="w-3.5 h-3.5 text-bear-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {isBusiness ? (
              <div className="w-full text-center text-xs font-semibold text-emerald-400 py-2">
                You're on this plan
              </div>
            ) : (
              <button
                onClick={() => handleSelect('business')}
                disabled={!!loading}
                className="btn-secondary w-full text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading === 'business'
                  ? <span className="w-4 h-4 border-2 border-bear-muted/30 border-t-bear-muted rounded-full animate-spin" />
                  : 'Get Started'}
              </button>
            )}
          </div>

          <p className="text-center text-[10px] text-bear-muted px-2">
            Secure payment via Stripe. Cancel anytime from your billing settings.
          </p>
        </div>
      </div>
    </div>
  );
}
