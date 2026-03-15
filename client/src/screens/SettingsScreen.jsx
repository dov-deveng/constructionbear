import React, { useState, useEffect } from 'react';
import { useAuthStore, useUIStore } from '../store/index.js';
import { api } from '../api/index.js';
import ComposeButton from '../components/ComposeButton.jsx';
import PricingModal from '../components/PricingModal.jsx';

export default function SettingsScreen() {
  const { user, company: storeCompany, subscription, logout, setCompany } = useAuthStore();
  const { toggleSidebar, setView } = useUIStore();
  const [codeCopied, setCodeCopied] = useState(false);
  const [company, setLocalCompany] = useState(storeCompany);
  const [billing, setBilling] = useState(null);
  const [members, setMembers] = useState([]);
  const [removingId, setRemovingId] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const isOwner = company?.owner_id === user?.id;

  useEffect(() => {
    api.getCompany().then(data => { setLocalCompany(data); setCompany(data); }).catch(() => {});
    api.getSubStatus().then(setBilling).catch(() => {});
    api.getMembers().then(r => setMembers(r.members || [])).catch(() => {});
  }, []);

  async function handleRemoveMember(memberId) {
    setRemovingId(memberId);
    try {
      await api.removeMember(memberId);
      setMembers(m => m.filter(u => u.id !== memberId));
      api.getSubStatus().then(setBilling).catch(() => {});
    } catch (err) {
      alert(err.message);
    } finally {
      setRemovingId(null);
      setConfirmRemove(null);
    }
  }

  function copyCode() {
    if (!company?.code) return;
    navigator.clipboard.writeText(company.code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  const [portalLoading, setPortalLoading] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

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

  return (
    <div className="h-full flex flex-col bg-bear-bg">
      <div className="safe-top bg-bear-bg border-b border-bear-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={toggleSidebar} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-bear-surface transition-colors">
          <svg className="w-5 h-5 text-bear-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-bear-text flex-1">Settings</h1>
        <ComposeButton />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-lg mx-auto p-4 space-y-4">
          {/* My Account */}
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-bear-text">My Account</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-bear-text">{user?.email}</p>
                <p className="text-xs text-bear-muted mt-0.5">
                  {user?.email_verified ? '✓ Email verified' : 'Email not verified'}
                </p>
              </div>
            </div>
            <div className="border-t border-bear-border pt-3">
              <button
                onClick={() => setView('projects')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-bear-border/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-bear-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <div className="text-left">
                    <p className="text-sm font-medium text-bear-text">Projects</p>
                    <p className="text-xs text-bear-muted">Manage your active jobs</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-bear-muted group-hover:text-bear-text transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Company Info */}
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-bear-text">Company Info</h2>
            <button
              onClick={() => setView('profile')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-bear-border/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-bear-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div className="text-left">
                  <p className="text-sm font-medium text-bear-text">Company Profile</p>
                  <p className="text-xs text-bear-muted">Name, address, license, logo</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-bear-muted group-hover:text-bear-text transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => setView('contacts')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-bear-border/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-bear-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="text-left">
                  <p className="text-sm font-medium text-bear-text">Contacts</p>
                  <p className="text-xs text-bear-muted">Owners, architects, subs, inspectors</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-bear-muted group-hover:text-bear-text transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Team invite code — always shown, fetched fresh on mount */}
            <div className="border-t border-bear-border pt-3">
              <p className="text-xs font-semibold text-bear-muted uppercase tracking-wide mb-2">Team Invite Code</p>
              {company?.code ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="flex-1 font-mono text-2xl font-bold tracking-[0.2em] text-bear-text bg-bear-surface rounded-xl px-4 py-3 text-center select-all">
                      {company.code}
                    </span>
                    <button
                      onClick={copyCode}
                      className={`flex-shrink-0 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                        codeCopied
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-bear-accent/10 text-bear-accent hover:bg-bear-accent/20'
                      }`}
                    >
                      {codeCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-bear-muted mt-2">Share this code with your team to collaborate on this account.</p>
                </>
              ) : (
                <p className="text-xs text-bear-muted">Loading...</p>
              )}
            </div>
          </div>

          {/* Billing */}
          <div className="card p-4 space-y-4">
            <h2 className="text-sm font-semibold text-bear-text">Billing</h2>

            {/* Plan summary */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-bear-text capitalize">
                  {billing?.plan === 'personal' ? 'Personal Plan' : billing?.plan === 'business' ? 'Business Plan' : 'Free Plan'}
                </p>
                <p className="text-xs text-bear-muted mt-0.5">
                  {billing?.plan === 'free'
                    ? `${billing?.doc_count || 0}/2 free documents used`
                    : billing?.plan === 'personal'
                    ? `${billing?.monthly_doc_count || 0}/100 docs this month · ${billing?.seats || 1} seat${(billing?.seats || 1) !== 1 ? 's' : ''} · $29.99/seat/mo`
                    : `${billing?.seats || 1} seat${(billing?.seats || 1) !== 1 ? 's' : ''} · 5 included + $24.99/extra · Unlimited docs`}
                </p>
                {billing?.plan !== 'free' && billing?.total_monthly > 0 && (
                  <p className="text-xs font-semibold text-bear-accent mt-1">${billing.total_monthly.toFixed(2)}/month total</p>
                )}
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${
                billing?.plan === 'personal' || billing?.plan === 'business'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-bear-border text-bear-muted'
              }`}>
                {billing?.plan === 'personal' ? 'Personal' : billing?.plan === 'business' ? 'Business' : 'Free'}
              </span>
            </div>

            {/* Upgrade options (owner only, non-business plan) */}
            {isOwner && billing?.plan !== 'business' && (
              <button
                onClick={() => setPricingOpen(true)}
                className="btn-primary text-sm py-2.5 w-full"
              >
                {billing?.plan === 'free' ? 'Upgrade Plan' : 'Upgrade to Business'}
              </button>
            )}

            {/* Manage subscription (owner only, paid plan) */}
            {isOwner && billing?.plan !== 'free' && (
              <button onClick={handleManage} disabled={portalLoading} className="btn-secondary text-sm py-2.5 w-full">
                {portalLoading ? 'Loading...' : 'Manage Subscription'}
              </button>
            )}

            {/* Team members table */}
            <div className="border-t border-bear-border pt-3">
              <p className="text-xs font-semibold text-bear-muted uppercase tracking-wide mb-2">
                Team Members ({members.length} seat{members.length !== 1 ? 's' : ''})
              </p>
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="text-sm text-bear-text">{m.owner_name || m.email}</p>
                      <p className="text-xs text-bear-muted">{m.email}{m.is_owner ? ' · Owner' : ''}</p>
                    </div>
                    {isOwner && !m.is_owner && (
                      confirmRemove?.id === m.id ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleRemoveMember(m.id)} disabled={removingId === m.id} className="text-xs text-red-400 font-semibold hover:underline">
                            {removingId === m.id ? 'Removing…' : 'Confirm'}
                          </button>
                          <button onClick={() => setConfirmRemove(null)} className="text-xs text-bear-muted hover:underline">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmRemove({ id: m.id, email: m.email })} className="text-xs text-red-400/60 hover:text-red-400 transition-colors">Remove</button>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Account Actions */}
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

      <PricingModal
        isOpen={pricingOpen}
        onClose={() => setPricingOpen(false)}
        currentPlan={billing?.plan || 'free'}
      />
    </div>
  );
}
