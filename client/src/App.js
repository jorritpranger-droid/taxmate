import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const API = '';  // proxied to localhost:3001

const CATEGORIES = [
  { id: 'rates',               label: 'Council Rates',         icon: '🏛️', color: '#3B82F6' },
  { id: 'utilities',           label: 'Utilities',             icon: '⚡', color: '#8B5CF6' },
  { id: 'body_corporate',      label: 'Body Corporate',        icon: '🏢', color: '#10B981' },
  { id: 'insurance',           label: 'Insurance',             icon: '🛡️', color: '#EF4444' },
  { id: 'repairs_maintenance', label: 'Repairs & Maintenance', icon: '🔧', color: '#F59E0B' },
  { id: 'property_management', label: 'Property Management',   icon: '🔑', color: '#06B6D4' },
  { id: 'interest_charges',    label: 'Interest / Loan',       icon: '💳', color: '#EC4899' },
  { id: 'depreciation',        label: 'Depreciation',          icon: '📉', color: '#A78BFA' },
  { id: 'professional_fees',   label: 'Professional Fees',     icon: '📋', color: '#34D399' },
  { id: 'travel',              label: 'Travel',                icon: '✈️', color: '#FBBF24' },
  { id: 'home_office',         label: 'Home Office',           icon: '🖥️', color: '#60A5FA' },
  { id: 'subscriptions',       label: 'Subscriptions',         icon: '📱', color: '#F472B6' },
  { id: 'other',               label: 'Other',                 icon: '📌', color: '#94A3B8' },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app: {
    fontFamily: "'Crimson Text', Georgia, serif",
    background: '#F4F6F9',
    minHeight: '100vh',
    color: '#1A2C42',
  },
  header: {
    background: 'linear-gradient(180deg, #FFFFFF 0%, #F4F6F9 100%)',
    borderBottom: '1px solid #D0DAE8',
    padding: '20px 36px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: { margin: 0, fontSize: 24, color: '#1D4E89', letterSpacing: '-0.5px', fontWeight: 400 },
  logoSub: { margin: '2px 0 0', fontSize: 12, color: '#7A90A8', letterSpacing: '2px', textTransform: 'uppercase' },
  container: { maxWidth: 1120, margin: '0 auto', padding: '0 36px' },
  tab: (active) => ({
    background: 'none', border: 'none', padding: '16px 22px', cursor: 'pointer',
    color: active ? '#1D4E89' : '#7A90A8',
    borderBottom: active ? '2px solid #1D4E89' : '2px solid transparent',
    fontSize: 14, fontFamily: "'Crimson Text', Georgia, serif", letterSpacing: '0.5px',
    transition: 'color 0.2s',
  }),
  badge: (n) => n > 0 ? {
    background: '#DC2626', color: 'white', fontSize: 11,
    padding: '1px 7px', borderRadius: 10, marginLeft: 6,
  } : { display: 'none' },
  btn: (variant = 'primary') => ({
    background: variant === 'primary' ? 'linear-gradient(135deg, #1D4E89, #2563AB)' :
                variant === 'success' ? 'linear-gradient(135deg, #166534, #16A34A)' :
                variant === 'danger'  ? 'none' : 'none',
    color: variant === 'primary' ? '#FFFFFF' :
           variant === 'success' ? '#FFFFFF' :
           variant === 'danger'  ? '#DC2626' : '#4A6080',
    border: variant === 'danger'  ? '1px solid #FECACA' :
            variant === 'ghost'   ? '1px solid #C0CFDF' : 'none',
    padding: '9px 20px', borderRadius: 6, cursor: 'pointer',
    fontSize: 13, fontFamily: "'Crimson Text', Georgia, serif",
    transition: 'opacity 0.2s',
  }),
  card: {
    background: '#FFFFFF', border: '1px solid #D0DAE8',
    borderRadius: 10, padding: 20, marginBottom: 12,
  },
  input: {
    background: '#FFFFFF', border: '1px solid #C0CFDF', color: '#1A2C42',
    padding: '8px 12px', borderRadius: 6, fontSize: 14,
    fontFamily: "'Crimson Text', Georgia, serif", outline: 'none',
  },
  select: {
    background: '#FFFFFF', border: '1px solid #C0CFDF', color: '#1A2C42',
    padding: '8px 12px', borderRadius: 6, fontSize: 13, outline: 'none',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '10px 14px', color: '#7A90A8', fontWeight: 400, fontSize: 12, letterSpacing: '1px', textTransform: 'uppercase', borderBottom: '1px solid #D0DAE8' },
  td: { padding: '11px 14px', borderBottom: '1px solid #EEF1F5' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;
const getCat = (id, extra = []) => [...CATEGORIES, ...extra].find(c => c.id === id) || { label: id, icon: '📌', color: '#94A3B8' };

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.type === 'error' ? '#FEE2E2' : toast.type === 'info' ? '#DBEAFE' : '#DCFCE7';
  const col = toast.type === 'error' ? '#DC2626' : toast.type === 'info' ? '#1D4E89' : '#166534';
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, background: bg, color: col,
      border: `1px solid ${col}33`, padding: '12px 20px', borderRadius: 8, fontSize: 14,
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)', zIndex: 9999, maxWidth: 360,
      animation: 'fadeUp 0.3s ease',
    }}>
      {toast.msg}
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const handleLogin = onLogin || (async () => {
    const res = await fetch(`${API}/auth/url`);
    const { url } = await res.json();
    window.location.href = url;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 32, padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>⚖️</div>
        <h1 style={{ fontSize: 36, color: '#1D4E89', margin: 0, fontWeight: 400 }}>TaxMate</h1>
        <p style={{ color: '#7A90A8', letterSpacing: '2px', fontSize: 12, textTransform: 'uppercase', marginTop: 6 }}>AI Tax Return Organiser</p>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #D0DAE8', borderRadius: 12, padding: '36px 40px', maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, color: '#1A2C42', marginTop: 0, fontWeight: 400 }}>Connect your Gmail</h2>
        <p style={{ color: '#4A6080', fontSize: 15, lineHeight: 1.7 }}>
          TaxMate scans your inbox for invoices, bills, and statements — then uses AI to build your tax deduction table.
        </p>

        <div style={{ textAlign: 'left', margin: '20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['📧', 'Reads emails — never modifies them'],
            ['🔒', 'OAuth — your password is never shared'],
            ['🤖', 'AI extracts & categorises expenses'],
            ['✅', "You review every item before it's saved"],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#7A90A8' }}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleLogin}
          style={{
            width: '100%', padding: '14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #1D4E89, #1A3A60)',
            color: '#FFFFFF', fontSize: 16, fontFamily: "'Crimson Text', Georgia, serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#4285F4" d="M44.5 20H24v8.5h11.7C34.5 33.5 30 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.5 20-21 0-1.4-.2-2.7-.5-4z"/><path fill="#34A853" d="m6.3 14.7 7 5.1C15 16.1 19.1 13 24 13c3 0 5.7 1.1 7.8 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.6 0-14.2 4.2-17.7 10.7z"/><path fill="#FBBC05" d="M24 45c5.4 0 10.3-1.9 14.1-5l-6.5-5.4C29.6 36 27 37 24 37c-5.9 0-10.9-3.6-13.1-8.7l-6.9 5.4C7.8 40.8 15.3 45 24 45z"/><path fill="#EA4335" d="M44.5 20H24v8.5h11.7c-.9 2.8-2.8 5.1-5.3 6.6l6.5 5.4c3.8-3.5 6.1-8.7 6.1-15.5 0-1.4-.2-2.7-.5-4z"/></svg>
          Sign in with Google
        </button>
      </div>

      <p style={{ color: '#9AAFC0', fontSize: 12 }}>Requires read-only Gmail access. No data is stored on external servers.</p>
    </div>
  );
}

// ─── Email List ───────────────────────────────────────────────────────────────
function EmailList({ onAnalyse, analysedIds, activeAccount, financialYear, onScrollSave }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextPageToken, setNextPageToken] = useState(null);
  const [analysing, setAnalysing] = useState(null);

  const fetchEmails = useCallback(async (query = '', pageToken = null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ maxResults: 30 });
      if (query) params.set('query', query);
      if (pageToken) params.set('pageToken', pageToken);
      if (activeAccount) params.set('account', activeAccount);
      if (financialYear) params.set('financialYear', financialYear);
      const res = await fetch(`${API}/gmail/emails?${params}`, { credentials: 'include' });
      const data = await res.json();
      setEmails(prev => pageToken ? [...prev, ...(data.emails || [])] : (data.emails || []));
      setNextPageToken(data.nextPageToken || null);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [activeAccount, financialYear]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchEmails(searchQuery);
  };

  const handleAnalyse = async (email) => {
    if (onScrollSave) onScrollSave();
    setAnalysing(email.id);
    try {
      const params = activeAccount ? `?account=${encodeURIComponent(activeAccount)}` : '';
      const res = await fetch(`${API}/gmail/emails/${email.id}${params}`, { credentials: 'include' });
      const full = await res.json();
      await onAnalyse(full);
    } catch (e) { console.error(e); }
    setAnalysing(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1 }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search emails (leave blank for auto tax-related search)..."
            style={{ ...S.input, flex: 1 }}
          />
          <button type="submit" style={S.btn('primary')}>Search</button>
          <button type="button" onClick={() => { setSearchQuery(''); fetchEmails(''); }} style={S.btn('ghost')}>Reset</button>
        </form>
        <button onClick={() => fetchEmails(searchQuery)} style={S.btn('ghost')}>↻ Refresh</button>
      </div>

      {loading && emails.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#4A6080' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
          <p>Loading your emails...</p>
        </div>
      ) : emails.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#4A6080' }}>
          <div style={{ fontSize: 32 }}>📭</div>
          <p>No matching emails found.</p>
        </div>
      ) : (
        <>
          {emails.map(email => {
            const done = analysedIds.has(email.id);
            const busy = analysing === email.id;
            return (
              <div key={email.id} style={{
                ...S.card,
                opacity: done ? 0.5 : 1,
                borderLeft: done ? '3px solid #16A34A' : '3px solid #D0DAE8',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#0A0F1A', fontWeight: 600, marginBottom: 3, fontSize: 15 }}>{email.subject || '(no subject)'}</div>
                  <div style={{ color: '#4A6080', fontSize: 13 }}>{email.from} · {new Date(email.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  <div style={{ color: '#7A90A8', fontSize: 13, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.snippet}</div>
                </div>
                <button
                  onClick={() => !done && !busy && handleAnalyse(email)}
                  disabled={done || busy}
                  style={{
                    ...S.btn(done ? 'ghost' : 'primary'),
                    whiteSpace: 'nowrap', flexShrink: 0,
                    opacity: done || busy ? 0.5 : 1,
                    cursor: done || busy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {busy ? '⏳ Analysing...' : done ? '✓ Analysed' : '🔍 Analyse'}
                </button>
              </div>
            );
          })}
          {nextPageToken && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button onClick={() => fetchEmails(searchQuery, nextPageToken)} style={S.btn('ghost')}>
                Load more emails
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────
function ReviewCard({ item, extraCats, onApprove, onReject }) {
  const [amount, setAmount]     = useState(item.amount);
  const [category, setCategory] = useState(item.category);
  const [date, setDate]         = useState(item.date);
  const [desc, setDesc]         = useState(item.description);
  const confColor = { high: '#16A34A', medium: '#D97706', low: '#DC2626' }[item.confidence] || '#64748B';
  const allCats = [...CATEGORIES, ...extraCats];

  return (
    <div style={{ ...S.card, borderLeft: `3px solid ${confColor}33` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 16, color: '#1A2C42', fontWeight: 600 }}>{item.vendor}</span>
            <span style={{ background: confColor + '22', color: confColor, fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>
              {item.confidence} confidence
            </span>
          </div>
          <div style={{ color: '#7A90A8', fontSize: 12, marginBottom: 8 }}>From: {item.emailSubject}</div>

          {item.notes && (
            <div style={{ background: '#FFFBEB', borderLeft: '3px solid #D97706', padding: '8px 12px', borderRadius: '0 6px 6px 0', fontSize: 13, color: '#92400E', marginBottom: 10 }}>
              💡 {item.notes}
            </div>
          )}

          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={2}
            style={{ ...S.input, width: '100%', resize: 'vertical', boxSizing: 'border-box', fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignContent: 'start', minWidth: 280 }}>
          <div>
            <label style={{ fontSize: 11, color: '#7A90A8', display: 'block', marginBottom: 4, letterSpacing: '1px' }}>AMOUNT (AUD)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              style={{ ...S.input, width: '100%', color: '#166534', fontWeight: 700, fontSize: 16, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#7A90A8', display: 'block', marginBottom: 4, letterSpacing: '1px' }}>DATE</label>
            <input type="text" value={date} onChange={e => setDate(e.target.value)}
              style={{ ...S.input, width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 11, color: '#7A90A8', display: 'block', marginBottom: 4, letterSpacing: '1px' }}>CATEGORY</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...S.select, width: '100%' }}>
              {allCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button onClick={() => onReject(item.id)} style={S.btn('danger')}>✕ Dismiss</button>
        <button onClick={() => onApprove(item, { amount: parseFloat(amount), category, date, description: desc })}
          style={S.btn('success')}>✓ Approve & Add to Tax Table</button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [accounts, setAccounts]             = useState([]);
  const [activeAccount, setActiveAccount]   = useState(null);
  const [authChecked, setAuthChecked]       = useState(false);
  const [activeTab, setActiveTab]           = useState('emails');
  const emailScrollPos = useRef(0);
  const [pending, setPending]               = useState([]);
  const [entries, setEntries]               = useState([]);
  const [analysedIds, setAnalysedIds]       = useState(new Set());
  const [suggestedCats, setSuggestedCats]   = useState([]);
  const [customCats, setCustomCats]         = useState([]);
  const [financialYear, setFinancialYear]   = useState('2024-25');
  const [toast, setToast]                   = useState(null);
  const [extensionToken, setExtensionToken] = useState(null);

  // Load entries from server on login, migrating any localStorage entries first
  useEffect(() => {
    if (accounts.length === 0) return;
    fetch(`${API}/entries`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const serverEntries = data.entries || [];
        // Check for legacy localStorage entries
        let localEntries = [];
        try { localEntries = JSON.parse(localStorage.getItem('taxmate_entries') || '[]'); } catch {}
        if (localEntries.length > 0) {
          // Merge: add any local entries not already in server entries
          const serverIds = new Set(serverEntries.map(e => e.id));
          const newEntries = localEntries.filter(e => !serverIds.has(e.id));
          const merged = [...serverEntries, ...newEntries];
          setEntries(merged);
          // Save merged to server and clear localStorage
          fetch(`${API}/entries`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entries: merged }),
          }).then(() => {
            localStorage.removeItem('taxmate_entries');
            showToast(`Migrated ${newEntries.length} existing entries to file storage ✓`);
          }).catch(() => {});
        } else {
          setEntries(serverEntries);
        }
      })
      .catch(() => {});
  }, [accounts]);

  // Save entries to server whenever they change
  useEffect(() => {
    if (accounts.length === 0) return;
    fetch(`${API}/entries`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    }).catch(() => {});
  }, [entries]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAuth = useCallback(() => {
    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) {
          setAccounts(data.accounts);
          setActiveAccount(data.activeAccount);
        } else {
          setAccounts([]);
          setActiveAccount(null);
        }
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // Check auth on load
  useEffect(() => {
    loadAuth();
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      window.history.replaceState({}, '', '/');
    }
  }, [loadAuth]);

  const handleExtensionToken = async () => {
    const res = await fetch(`${API}/auth/extension-token`, { method: 'POST', credentials: 'include' });
    const data = await res.json();
    setExtensionToken(data.token);
  };

  const handleAddAccount = async () => {
    const res = await fetch(`${API}/auth/url`);
    const { url } = await res.json();
    window.location.href = url;
  };

  const handleSwitchAccount = async (email) => {
    await fetch(`${API}/auth/switch`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setActiveAccount(email);
    setAnalysedIds(new Set());
  };

  const handleLogout = async (email) => {
    await fetch(`${API}/auth/logout`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    loadAuth();
  };

  const handleAnalyse = async (fullEmail) => {
    try {
      const res = await fetch(`${API}/analyse`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fullEmail, account: activeAccount }),
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setAnalysedIds(prev => new Set([...prev, fullEmail.id]));

      if (data.items.length === 0) {
        showToast('No tax-relevant items found in this email.', 'info');
        return;
      }

      setPending(prev => [...prev, ...data.items]);

      // Add new suggested categories
      setSuggestedCats(prev => {
        const existingIds = new Set([...CATEGORIES, ...customCats, ...prev].map(c => c.id));
        const newOnes = (data.suggested_categories || []).filter(c => !existingIds.has(c.id));
        return [...prev, ...newOnes];
      });

      setActiveTab('review');
      showToast(`${data.items.length} item(s) found — please review them`);
    } catch (err) {
      showToast('Analysis failed: ' + err.message, 'error');
    }
  };

  const approvePending = (item, overrides) => {
    setEntries(prev => [...prev, { ...item, ...overrides, status: 'approved', financialYear }]);
    setPending(prev => prev.filter(i => i.id !== item.id));
    showToast('Added to tax table ✓');
  };

  const rejectPending = (id) => {
    setPending(prev => prev.filter(i => i.id !== id));
    showToast('Item dismissed', 'info');
  };

  const removeEntry = (id) => setEntries(prev => prev.filter(e => e.id !== id));

  const acceptSuggested = (cat) => {
    setCustomCats(prev => [...prev, { id: cat.id, label: cat.label, icon: '🏷️', color: '#94A3B8' }]);
    setSuggestedCats(prev => prev.filter(c => c.id !== cat.id));
    showToast(`Category "${cat.label}" added`);
  };

  const fyEntries = entries.filter(e => e.financialYear === financialYear);
  const allCats = [...CATEGORIES, ...customCats];

  const totals = allCats.reduce((acc, cat) => {
    const sum = fyEntries.filter(e => e.category === cat.id).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    if (sum > 0) acc[cat.id] = sum;
    return acc;
  }, {});

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);

  const exportCSV = () => {
    const rows = [
      ['Date', 'Vendor', 'Description', 'Category', 'Amount', 'Financial Year', 'Confidence', 'Source Email'],
      ...fyEntries.map(e => [
        e.date, e.vendor, e.description, getCat(e.category, customCats).label,
        e.amount, e.financialYear, e.confidence, e.emailSubject || '',
      ]),
      ['', '', '', 'TOTAL', grandTotal.toFixed(2), '', '', ''],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `TaxMate-${financialYear}.csv`;
    a.click();
  };

  if (!authChecked) {
    return (
      <div style={{ ...S.app, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 32, color: '#7A90A8' }}>Loading...</div>
      </div>
    );
  }

  if (accounts.length === 0) return <div style={S.app}><LoginScreen onLogin={handleAddAccount} /></div>;

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { transform: translateY(10px); opacity: 0 } to { transform: none; opacity: 1 } }
        select option { background: #FFFFFF; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #F4F6F9; } ::-webkit-scrollbar-thumb { background: #C0CFDF; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.logo}>⚖️ TaxMate</h1>
          <p style={S.logoSub}>AI Tax Return Organiser</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <select value={financialYear} onChange={e => setFinancialYear(e.target.value)} style={S.select}>
            {['2026-27', '2025-26', '2024-25', '2023-24', '2022-23'].map(y => <option key={y}>{y}</option>)}
          </select>
          {fyEntries.length > 0 && (
            <button onClick={exportCSV} style={S.btn('primary')}>Export CSV</button>
          )}
          <button onClick={handleExtensionToken} style={{ ...S.btn('ghost'), fontSize: 12, padding: '6px 12px' }}>🔌 Connect Extension</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {accounts.map(acc => {
              const isActive = acc.email === activeAccount;
              return (
                <div key={acc.email} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: isActive ? '#EEF4FB' : 'transparent',
                  border: isActive ? '1px solid #C0CFDF' : '1px solid transparent',
                  borderRadius: 20, padding: '4px 10px 4px 6px',
                  cursor: isActive ? 'default' : 'pointer',
                  opacity: isActive ? 1 : 0.55,
                }}
                  onClick={() => !isActive && handleSwitchAccount(acc.email)}
                  title={isActive ? acc.email : `Switch to ${acc.email}`}
                >
                  {acc.picture
                    ? <img src={acc.picture} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                    : <span style={{ fontSize: 18 }}>👤</span>
                  }
                  <span style={{ fontSize: 12, color: isActive ? '#1D4E89' : '#7A90A8', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {acc.email}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); handleLogout(acc.email); }}
                    style={{ background: 'none', border: 'none', color: '#9AAFC0', cursor: 'pointer', fontSize: 13, padding: '0 0 0 2px', lineHeight: 1 }}
                    title="Remove account"
                  >✕</button>
                </div>
              );
            })}
            <button onClick={handleAddAccount} style={{ ...S.btn('ghost'), padding: '5px 12px', fontSize: 12, borderRadius: 20 }}>
              + Add account
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ ...S.container, borderBottom: '1px solid #D0DAE8' }}>
        <div style={{ display: 'flex' }}>
          {[
            { id: 'emails',    label: '📧 Inbox' },
            { id: 'review',    label: '🔍 Review', count: pending.length },
            { id: 'table',     label: '📊 Tax Table' },
            { id: 'categories',label: '🏷️ Categories', count: suggestedCats.length },
          ].map(tab => (
            <button key={tab.id} onClick={() => {
                if (activeTab === 'emails') emailScrollPos.current = window.scrollY;
                setActiveTab(tab.id);
                if (tab.id === 'emails') setTimeout(() => window.scrollTo({ top: emailScrollPos.current, behavior: 'instant' }), 0);
              }} style={S.tab(activeTab === tab.id)}>
              {tab.label}
              {tab.count > 0 && <span style={S.badge(tab.count)}>{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ ...S.container, paddingTop: 28, paddingBottom: 60 }}>

        {/* EMAILS TAB — always mounted so scroll position is preserved */}
        <div style={{ display: activeTab === 'emails' ? 'block' : 'none' }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, color: '#1D4E89', margin: '0 0 6px', fontWeight: 400 }}>Tax-Related Emails</h2>
            <p style={{ color: '#4A6080', fontSize: 14, margin: 0 }}>
              Your inbox is pre-filtered for invoices, bills, and statements. Click Analyse on any email to extract tax items.
            </p>
          </div>
          <EmailList onAnalyse={handleAnalyse} analysedIds={analysedIds} activeAccount={activeAccount} financialYear={financialYear} onScrollSave={() => { emailScrollPos.current = window.scrollY; }} />
        </div>

        {/* REVIEW TAB */}
        {activeTab === 'review' && (
          <div>
            <h2 style={{ fontSize: 20, color: '#1D4E89', margin: '0 0 6px', fontWeight: 400 }}>
              Review Extracted Items
              {pending.length > 0 && <span style={{ ...S.badge(1), marginLeft: 10, fontSize: 13, padding: '3px 10px' }}>{pending.length} pending</span>}
            </h2>
            <p style={{ color: '#4A6080', fontSize: 14, marginBottom: 20 }}>
              Review each item, adjust any details, then approve to add it to your tax table — or dismiss if not applicable.
            </p>
            {pending.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#4A6080' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <p>No items pending. Analyse emails from the Inbox tab.</p>
              </div>
            ) : (
              pending.map(item => (
                <ReviewCard key={item.id} item={item} extraCats={customCats}
                  onApprove={approvePending} onReject={rejectPending} />
              ))
            )}
          </div>
        )}

        {/* TAX TABLE TAB */}
        {activeTab === 'table' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 20, color: '#1D4E89', margin: '0 0 6px', fontWeight: 400 }}>Tax Return Table — FY {financialYear}</h2>
                <p style={{ color: '#4A6080', fontSize: 14, margin: 0 }}>Approved deductions for your tax return submission.</p>
              </div>
              <div style={{ background: '#EEF4FB', border: '1px solid #C0CFDF', borderRadius: 10, padding: '14px 24px', textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#4A6080', letterSpacing: '1px', textTransform: 'uppercase' }}>Total Deductions</div>
                <div style={{ fontSize: 28, color: '#166534', fontWeight: 600, marginTop: 2 }}>{fmt(grandTotal)}</div>
                <div style={{ fontSize: 11, color: '#4A6080' }}>{fyEntries.length} items</div>
              </div>
            </div>

            {/* Category summary tiles */}
            {Object.keys(totals).length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 28 }}>
                {allCats.filter(c => totals[c.id]).map(cat => (
                  <div key={cat.id} style={{ background: '#FFFFFF', borderRadius: 8, padding: '14px 16px', borderLeft: `3px solid ${cat.color}` }}>
                    <div style={{ fontSize: 22 }}>{cat.icon}</div>
                    <div style={{ fontSize: 12, color: '#4A6080', marginTop: 4 }}>{cat.label}</div>
                    <div style={{ fontSize: 18, color: '#1A2C42', fontWeight: 600 }}>{fmt(totals[cat.id])}</div>
                    <div style={{ fontSize: 11, color: '#7A90A8' }}>{fyEntries.filter(e => e.category === cat.id).length} item(s)</div>
                  </div>
                ))}
              </div>
            )}

            {fyEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#4A6080' }}>
                <div style={{ fontSize: 40 }}>📂</div>
                <p>No approved entries for FY {financialYear} yet.<br />Analyse emails and approve items in the Review tab.</p>
              </div>
            ) : (
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Date', 'Vendor', 'Description', 'Category', 'Amount', 'Source', ''].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fyEntries.sort((a, b) => b.date > a.date ? 1 : -1).map(entry => {
                    const cat = getCat(entry.category, customCats);
                    return (
                      <tr key={entry.id} style={{ borderBottom: '1px solid #EEF1F5' }}>
                        <td style={{ ...S.td, color: '#4A6080', whiteSpace: 'nowrap' }}>{entry.date}</td>
                        <td style={{ ...S.td, color: '#1A2C42', fontWeight: 600 }}>{entry.vendor}</td>
                        <td style={{ ...S.td, color: '#4A6080', maxWidth: 220 }}>{entry.description}</td>
                        <td style={S.td}>
                          <span style={{ background: cat.color + '22', color: cat.color, padding: '3px 10px', borderRadius: 12, fontSize: 12, whiteSpace: 'nowrap' }}>
                            {cat.icon} {cat.label}
                          </span>
                        </td>
                        <td style={{ ...S.td, color: '#166534', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(entry.amount)}</td>
                        <td style={{ ...S.td, color: '#7A90A8', fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.emailSubject}</td>
                        <td style={S.td}>
                          <button onClick={() => removeEntry(entry.id)} style={{ background: 'none', border: 'none', color: '#7A90A8', cursor: 'pointer', fontSize: 16 }}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ ...S.td, color: '#4A6080', textAlign: 'right', fontStyle: 'italic' }}>Total</td>
                    <td style={{ ...S.td, color: '#166534', fontWeight: 700, fontSize: 16 }}>{fmt(grandTotal)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div>
            <h2 style={{ fontSize: 20, color: '#1D4E89', margin: '0 0 20px', fontWeight: 400 }}>Categories</h2>

            {suggestedCats.length > 0 && (
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: 20, marginBottom: 28 }}>
                <h3 style={{ margin: '0 0 12px', color: '#166534', fontSize: 16, fontWeight: 400 }}>💡 AI-Suggested Categories</h3>
                <p style={{ color: '#4A6080', fontSize: 14, marginBottom: 16 }}>Based on your emails, these additional categories may be useful:</p>
                {suggestedCats.map(cat => (
                  <div key={cat.id} style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <div style={{ color: '#1A2C42', fontWeight: 600 }}>{cat.label}</div>
                      <div style={{ color: '#4A6080', fontSize: 13 }}>{cat.reason}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => acceptSuggested(cat)} style={S.btn('success')}>Add</button>
                      <button onClick={() => setSuggestedCats(prev => prev.filter(c => c.id !== cat.id))} style={S.btn('ghost')}>Dismiss</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h3 style={{ fontSize: 14, color: '#4A6080', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>Active Categories</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {allCats.map(cat => (
                <div key={cat.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 14, borderLeft: `3px solid ${cat.color}`, padding: '14px 16px' }}>
                  <span style={{ fontSize: 24 }}>{cat.icon}</span>
                  <div>
                    <div style={{ color: '#1A2C42', fontSize: 14 }}>{cat.label}</div>
                    <div style={{ color: '#4A6080', fontSize: 12 }}>{entries.filter(e => e.category === cat.id).length} entries · {fmt(entries.filter(e => e.category === cat.id).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0))}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {extensionToken && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 480, width: '90%', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 8px', color: '#1D4E89', fontSize: 18 }}>🔌 Connect Gmail Extension</h2>
            <p style={{ color: '#4A6080', fontSize: 14, margin: '0 0 16px' }}>Copy this token and paste it into the TaxMate extension in Gmail:</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input readOnly value={extensionToken} style={{ ...S.input, flex: 1, fontSize: 12, fontFamily: 'monospace' }} onClick={e => e.target.select()} />
              <button style={S.btn('primary')} onClick={() => { navigator.clipboard.writeText(extensionToken); showToast('Token copied!'); }}>Copy</button>
            </div>
            <p style={{ color: '#7A90A8', fontSize: 12, margin: '0 0 16px' }}>In Gmail, open the TaxMate panel → click ⚙️ Settings → paste the token. You only need to do this once.</p>
            <button style={{ ...S.btn('ghost'), width: '100%' }} onClick={() => setExtensionToken(null)}>Close</button>
          </div>
        </div>
      )}
      <Toast toast={toast} />
    </div>
  );
}
