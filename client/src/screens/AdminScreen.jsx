import React, { useState, useEffect } from 'react';
import { api } from '../api/index.js';
import ComposeButton from '../components/ComposeButton.jsx';

export default function AdminScreen() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userDetail, setUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([api.adminStats(), api.adminUsers({ limit: 100 })]);
      setStats(s);
      setUsers(u.users);
      setTotal(u.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await api.adminUsers({ search, limit: 100 });
      setUsers(u.users);
      setTotal(u.total);
    } finally {
      setLoading(false);
    }
  }

  async function openUser(id) {
    setSelectedUser(id);
    setDetailLoading(true);
    setUserDetail(null);
    try {
      const d = await api.adminUser(id);
      setUserDetail(d);
    } finally {
      setDetailLoading(false);
    }
  }

  async function grantSub(id) {
    await api.adminGrantSub(id, 12);
    setActionMsg('Subscription granted (12 months)');
    await openUser(id);
    await loadAll();
    setTimeout(() => setActionMsg(''), 3000);
  }

  async function toggleAdmin(user) {
    if (user.is_admin) {
      await api.adminRevokeAdmin(user.id);
      setActionMsg('Admin revoked');
    } else {
      await api.adminGrantAdmin(user.id);
      setActionMsg('Admin granted');
    }
    await openUser(user.id);
    await loadAll();
    setTimeout(() => setActionMsg(''), 3000);
  }

  function fmt(ts) {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function timeAgo(ts) {
    if (!ts) return 'never';
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  if (loading && !stats) {
    return <div className="flex items-center justify-center h-full text-bear-muted text-sm">Loading...</div>;
  }

  return (
    <div className="h-full flex bg-bear-bg overflow-hidden">
      {/* Left panel — user list */}
      <div className="w-full max-w-sm flex-shrink-0 border-r border-bear-border flex flex-col">
        {/* Stats bar */}
        {stats && (
          <div className="px-4 py-3 border-b border-bear-border bg-bear-surface grid grid-cols-3 gap-2">
            <Stat label="Users" value={stats.totalUsers} />
            <Stat label="Paid" value={stats.activeSubscriptions} accent />
            <Stat label="New / 7d" value={stats.newUsersWeek} />
          </div>
        )}

        {stats && (
          <div className="px-4 py-2 border-b border-bear-border bg-bear-surface grid grid-cols-3 gap-2">
            <Stat label="Docs" value={stats.totalDocuments} />
            <Stat label="Projects" value={stats.totalProjects} />
            <Stat label="Messages" value={stats.totalMessages} />
          </div>
        )}

        {/* Search */}
        <form onSubmit={handleSearch} className="px-3 py-2 border-b border-bear-border flex gap-2 items-center">
          <ComposeButton />
          <input
            type="text"
            placeholder="Search email or company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-bear-border/30 border border-bear-border rounded-lg px-2.5 py-1.5 text-xs text-bear-text placeholder-bear-muted focus:outline-none focus:border-bear-accent"
          />
          <button type="submit" className="text-xs px-2.5 py-1.5 bg-bear-accent text-white rounded-lg">Go</button>
        </form>

        <div className="text-xs text-bear-muted px-4 py-1.5 border-b border-bear-border/50">
          {total} user{total !== 1 ? 's' : ''}
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto">
          {users.map(u => (
            <button
              key={u.id}
              onClick={() => openUser(u.id)}
              className={`w-full text-left px-4 py-3 border-b border-bear-border/40 hover:bg-bear-surface/60 transition-colors ${selectedUser === u.id ? 'bg-bear-accent/10 border-l-2 border-l-bear-accent' : ''}`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-sm font-medium text-bear-text truncate flex-1 mr-2">{u.email}</p>
                <SubBadge status={u.subscription_status} isAdmin={u.is_admin} />
              </div>
              {u.company_name && <p className="text-xs text-bear-muted truncate">{u.company_name}</p>}
              <div className="flex gap-3 mt-1">
                <span className="text-xs text-bear-muted">{u.doc_count} docs</span>
                <span className="text-xs text-bear-muted">{u.project_count} projects</span>
                <span className="text-xs text-bear-muted">active {timeAgo(u.last_active)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel — user detail */}
      <div className="flex-1 overflow-y-auto">
        {!selectedUser ? (
          <div className="flex items-center justify-center h-full text-bear-muted text-sm">
            Select a user to view details
          </div>
        ) : detailLoading ? (
          <div className="flex items-center justify-center h-full text-bear-muted text-sm">Loading...</div>
        ) : userDetail ? (
          <div className="p-5 space-y-5 max-w-2xl">
            {actionMsg && (
              <div className="px-4 py-2 bg-green-500/15 border border-green-500/30 rounded-xl text-xs text-green-400">
                {actionMsg}
              </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-bear-text">{userDetail.email}</h2>
                {userDetail.company_name && <p className="text-sm text-bear-muted">{userDetail.company_name}</p>}
                {userDetail.owner_name && <p className="text-xs text-bear-muted">{userDetail.owner_name}</p>}
              </div>
              <div className="flex flex-col gap-2 items-end">
                <SubBadge status={userDetail.subscription_status} isAdmin={userDetail.is_admin} large />
                <div className="flex gap-2">
                  {userDetail.subscription_status !== 'active' && (
                    <button onClick={() => grantSub(userDetail.id)} className="text-xs px-3 py-1.5 bg-bear-accent text-white rounded-lg hover:bg-bear-accent-hover transition-colors">
                      Grant Sub
                    </button>
                  )}
                  <button onClick={() => toggleAdmin(userDetail)} className={`text-xs px-3 py-1.5 rounded-lg transition-colors border ${userDetail.is_admin ? 'border-red-400/50 text-red-400 hover:bg-red-400/10' : 'border-bear-border text-bear-muted hover:text-bear-accent hover:border-bear-accent'}`}>
                    {userDetail.is_admin ? 'Revoke Admin' : 'Make Admin'}
                  </button>
                </div>
              </div>
            </div>

            {/* Account info */}
            <Section title="Account">
              <Grid2>
                <KV label="Joined" value={fmt(userDetail.created_at)} />
                <KV label="Last Active" value={timeAgo(userDetail.last_active)} />
                <KV label="Email Verified" value={userDetail.email_verified ? 'Yes' : 'No'} />
                <KV label="Onboarding" value={userDetail.onboarding_complete ? 'Complete' : 'Pending'} />
                <KV label="Subscription" value={userDetail.subscription_status || 'free'} />
                {userDetail.current_period_end && <KV label="Expires" value={fmt(userDetail.current_period_end)} />}
                {userDetail.license_number && <KV label="License #" value={userDetail.license_number} />}
                {userDetail.phone && <KV label="Phone" value={userDetail.phone} />}
              </Grid2>
            </Section>

            {/* Usage */}
            <Section title="Usage">
              <Grid2>
                <KV label="Documents" value={userDetail.docs?.length} />
                <KV label="Projects" value={userDetail.projects?.length} />
              </Grid2>
            </Section>

            {/* Recent docs */}
            {userDetail.docs?.length > 0 && (
              <Section title={`Recent Documents (${userDetail.docs.length})`}>
                <div className="divide-y divide-bear-border/40">
                  {userDetail.docs.slice(0, 10).map(d => (
                    <div key={d.id} className="py-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-bear-text">{d.title}</p>
                        {d.project_name && <p className="text-xs text-bear-muted">{d.project_name}</p>}
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-bear-muted uppercase tracking-wide">{d.type.replace(/_/g, ' ')}</span>
                        <p className="text-xs text-bear-muted">{fmt(d.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Projects */}
            {userDetail.projects?.length > 0 && (
              <Section title={`Projects (${userDetail.projects.length})`}>
                <div className="divide-y divide-bear-border/40">
                  {userDetail.projects.map(p => (
                    <div key={p.id} className="py-2 flex items-center justify-between">
                      <p className="text-sm text-bear-text">{p.name}</p>
                      <div className="text-right">
                        {p.client_name && <p className="text-xs text-bear-muted">{p.client_name}</p>}
                        <span className={`text-xs px-1.5 py-0.5 rounded-md ${p.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-bear-border/50 text-bear-muted'}`}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-bold ${accent ? 'text-bear-accent' : 'text-bear-text'}`}>{value}</p>
      <p className="text-xs text-bear-muted">{label}</p>
    </div>
  );
}

function SubBadge({ status, isAdmin, large }) {
  const cls = large ? 'text-xs px-2 py-1 rounded-lg font-medium' : 'text-xs px-1.5 py-0.5 rounded-md';
  if (isAdmin) return <span className={`${cls} bg-purple-500/20 text-purple-400`}>Admin</span>;
  if (status === 'active') return <span className={`${cls} bg-green-500/15 text-green-400`}>Paid</span>;
  return <span className={`${cls} bg-bear-border/50 text-bear-muted`}>Free</span>;
}

function Section({ title, children }) {
  return (
    <div className="bg-bear-surface border border-bear-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-bear-border">
        <p className="text-xs font-semibold text-bear-muted uppercase tracking-wide">{title}</p>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function Grid2({ children }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-2">{children}</div>;
}

function KV({ label, value }) {
  return (
    <div>
      <p className="text-xs text-bear-muted">{label}</p>
      <p className="text-sm text-bear-text">{value ?? '—'}</p>
    </div>
  );
}
