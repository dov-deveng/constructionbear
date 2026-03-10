import React, { useState } from 'react';
import { useAuthStore, useUIStore } from '../store/index.js';
import { api } from '../api/index.js';

export default function SettingsScreen() {
  const { user, subscription, logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  async function handleSubscribe() {
    setCheckoutLoading(true);
    try {
      const res = await api.createCheckout();
      if (res.url) window.location.href = res.url;
      else alert('Stripe not configured yet. Add your Stripe keys to go live.');
    } catch (err) {
      alert(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleManage() {
    setPortalLoading(true);
    try {
      const res = await api.createPortal();
      if (res.url) window.location.href = res.url;
    } catch (err) {
      alert(err.message);
    } finally {
      setPortalLoading(false);
    }
  }

  const isActive = subscription?.status === 'active';
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="h-full flex flex-col bg-bear-bg">
      <div className="safe-top bg-bear-bg border-b border-bear-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={toggleSidebar} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bear-surface transition-colors">
          <svg className="w-5 h-5 text-bear-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-bear-text">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-lg mx-auto p-4 space-y-4">
          {/* Account */}
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-bear-text">Account</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-bear-text">{user?.email}</p>
                <p className="text-xs text-bear-muted mt-0.5">
                  {user?.email_verified ? '✓ Email verified' : 'Email not verified'}
                </p>
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-bear-text">Subscription</h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-bear-text">
                  {isActive ? 'Pro Plan' : 'Free Plan'}
                </p>
                <p className="text-xs text-bear-muted mt-0.5">
                  {isActive
                    ? `Renews ${periodEnd}`
                    : `${subscription?.doc_count || 0}/1 free document used`}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-bear-border text-bear-muted'}`}>
                {isActive ? 'Active' : 'Free'}
              </span>
            </div>

            {!isActive ? (
              <div className="bg-bear-accent/10 border border-bear-accent/20 rounded-xl p-3">
                <p className="text-sm font-semibold text-bear-text mb-1">Upgrade to Pro</p>
                <p className="text-xs text-bear-muted mb-3">Unlimited documents, all types, priority AI. $19.99/month, cancel anytime.</p>
                <button
                  onClick={handleSubscribe}
                  disabled={checkoutLoading}
                  className="btn-primary text-sm py-2.5 w-full flex items-center justify-center gap-2"
                >
                  {checkoutLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Subscribe — $19.99/mo'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleManage}
                disabled={portalLoading}
                className="btn-secondary text-sm py-2.5 w-full"
              >
                {portalLoading ? 'Loading...' : 'Manage Subscription'}
              </button>
            )}
          </div>

          {/* Danger zone */}
          <div className="card p-4 border-red-500/20">
            <h2 className="text-sm font-semibold text-red-400 mb-3">Account Actions</h2>
            <button
              onClick={logout}
              className="text-sm text-red-400 hover:text-red-300 transition-colors font-medium"
            >
              Sign out
            </button>
          </div>

          {/* App info */}
          <div className="text-center py-2">
            <p className="text-xs text-bear-muted">ConstructionBear.AI · v1.0.0</p>
            <p className="text-xs text-bear-muted mt-0.5">Built by Dove & Bear Inc.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
