const API = 'http://localhost:3001';

const CATEGORIES = [
  { id: 'rates',               label: 'Council Rates' },
  { id: 'utilities',           label: 'Utilities' },
  { id: 'body_corporate',      label: 'Body Corporate' },
  { id: 'insurance',           label: 'Insurance' },
  { id: 'repairs_maintenance', label: 'Repairs & Maintenance' },
  { id: 'property_management', label: 'Property Management' },
  { id: 'interest_charges',    label: 'Interest / Loan' },
  { id: 'depreciation',        label: 'Depreciation' },
  { id: 'professional_fees',   label: 'Professional Fees' },
  { id: 'travel',              label: 'Travel' },
  { id: 'home_office',         label: 'Home Office' },
  { id: 'subscriptions',       label: 'Subscriptions' },
  { id: 'other',               label: 'Other' },
];

let panelVisible = false;
let currentMsgId = null;
let selectedFY = '2024-25';
let accounts = [];
let selectedAccount = null;
let authToken = null;

// ─── Token storage ────────────────────────────────────────────────────────────
function loadToken() {
  return new Promise(resolve => {
    chrome.storage.local.get(['taxmate_token'], r => resolve(r.taxmate_token || null));
  });
}

function saveToken(token) {
  return new Promise(resolve => {
    chrome.storage.local.set({ taxmate_token: token }, resolve);
  });
}

// ─── Fetch helper that adds token header ──────────────────────────────────────
function apiFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    mode: 'cors',
    credentials: 'omit',
    headers: {
      ...(options.headers || {}),
      ...(authToken ? { 'X-TaxMate-Token': authToken } : {}),
    },
  });
}

// ─── Inject panel into Gmail ──────────────────────────────────────────────────
function injectPanel() {
  if (document.getElementById('taxmate-panel')) return;

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'taxmate-toggle-btn';
  toggleBtn.innerHTML = '⚖️ TaxMate';
  toggleBtn.onclick = () => togglePanel();
  document.body.appendChild(toggleBtn);

  const panel = document.createElement('div');
  panel.id = 'taxmate-panel';
  panel.classList.add('hidden');
  panel.innerHTML = `
    <div id="taxmate-header">
      <h2>⚖️ TaxMate</h2>
      <div style="display:flex;gap:8px;align-items:center">
        <button id="taxmate-settings" style="background:none;border:none;color:white;cursor:pointer;font-size:14px;opacity:0.8">⚙️</button>
        <button id="taxmate-close">✕</button>
      </div>
    </div>
    <div id="taxmate-body"></div>
  `;
  document.body.appendChild(panel);

  document.getElementById('taxmate-close').onclick = () => togglePanel(false);
  document.getElementById('taxmate-settings').onclick = () => showSettings();
}

function togglePanel(force) {
  const panel = document.getElementById('taxmate-panel');
  if (!panel) return;
  panelVisible = force !== undefined ? force : !panelVisible;
  panel.classList.toggle('hidden', !panelVisible);
  if (panelVisible) {
    if (!authToken) showSettings();
    else if (currentMsgId) showEmailReady(currentMsgId);
    else showIdle();
  }
}

// ─── Watch Gmail URL ──────────────────────────────────────────────────────────
function getMsgIdFromUrl() {
  // Gmail stores message ID in data-message-id as "#msg-f:1234567890"
  // Convert the decimal number to hex for the Gmail API
  const el = document.querySelector('[data-message-id]');
  if (el) {
    const raw = el.getAttribute('data-message-id');
    // Format: "#msg-f:1866778946986653534" — extract the decimal number and convert to hex
    const match = raw.match(/msg-f:(\d+)/);
    if (match) {
      return BigInt(match[1]).toString(16);
    }
  }

  // Fallback: URL hash
  const hash = window.location.hash;
  const urlMatch = hash.match(/#[^/]+\/([A-Za-z0-9]+)$/);
  return urlMatch ? urlMatch[1] : null;
}

function onUrlChange() {
  const msgId = getMsgIdFromUrl();
  if (msgId && msgId !== currentMsgId) {
    currentMsgId = msgId;
    if (panelVisible && authToken) showEmailReady(msgId);
  } else if (!msgId) {
    currentMsgId = null;
    if (panelVisible && authToken) showIdle();
  }
}

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    onUrlChange();
  }
}).observe(document.body, { subtree: true, childList: true });

// ─── Panel states ─────────────────────────────────────────────────────────────
function setBody(html) {
  const body = document.getElementById('taxmate-body');
  if (body) body.innerHTML = html;
}

function showIdle() {
  setBody(`
    <div class="tm-status">
      <div class="tm-icon">📧</div>
      <p>Open an email to analyse it for tax deductions.</p>
    </div>
  `);
}

function showSettings() {
  setBody(`
    <div style="padding:4px 0 12px">
      <p style="color:#4A6080;font-size:13px;margin:0 0 12px">Paste your TaxMate token to connect the extension. Get it from the <strong>Connect Extension</strong> button in the TaxMate app.</p>
      <label class="tm-label">Token</label>
      <input class="tm-input" id="tm-token-input" type="text" placeholder="Paste token here..." value="${authToken || ''}"/>
      <button class="tm-btn tm-btn-primary" id="tm-save-token">Save & Connect</button>
      ${authToken ? `<button class="tm-btn tm-btn-ghost" id="tm-cancel-settings">Cancel</button>` : ''}
      <div style="margin-top:12px;padding:10px;background:#F0F7FF;border-radius:6px;font-size:12px;color:#4A6080">
        <strong>How to get your token:</strong><br>
        1. Open <a href="http://localhost:3000" target="_blank" style="color:#1D4E89">TaxMate app</a><br>
        2. Click <strong>🔌 Connect Extension</strong> in the header<br>
        3. Copy the token and paste it above
      </div>
    </div>
  `);

  document.getElementById('tm-save-token').onclick = async () => {
    const token = document.getElementById('tm-token-input').value.trim();
    if (!token) return;
    authToken = token;
    await saveToken(token);
    await loadAccounts();
    if (currentMsgId) showEmailReady(currentMsgId);
    else showIdle();
  };

  const cancelBtn = document.getElementById('tm-cancel-settings');
  if (cancelBtn) cancelBtn.onclick = () => {
    if (currentMsgId) showEmailReady(currentMsgId);
    else showIdle();
  };
}

function showEmailReady(msgId) {
  const accountOptions = accounts.length > 0
    ? accounts.map(a => `<option value="${a.email}" ${a.email === selectedAccount ? 'selected' : ''}>${a.email}</option>`).join('')
    : `<option value="">Default account</option>`;

  setBody(`
    ${accounts.length > 1 ? `
    <label class="tm-label">Gmail Account</label>
    <select class="tm-fy-select" id="tm-account">
      ${accountOptions}
    </select>` : ''}
    <label class="tm-label">Financial Year</label>
    <select class="tm-fy-select" id="tm-fy">
      ${['2026-27','2025-26','2024-25','2023-24','2022-23'].map(y =>
        `<option value="${y}" ${y === selectedFY ? 'selected' : ''}>${y}</option>`
      ).join('')}
    </select>
    <button class="tm-btn tm-btn-primary" id="tm-analyse-btn">🔍 Analyse this email</button>
    <div class="tm-status" style="padding:12px 0">
      <p style="font-size:12px;color:#7A90A8">Click Analyse to extract tax deductions from this email using AI.</p>
    </div>
  `);

  if (accounts.length > 1) {
    document.getElementById('tm-account').onchange = e => { selectedAccount = e.target.value; };
  }
  document.getElementById('tm-fy').onchange = e => { selectedFY = e.target.value; };
  document.getElementById('tm-analyse-btn').onclick = () => analyseEmail(msgId);
}

function showLoading() {
  setBody(`
    <div class="tm-status">
      <div class="tm-icon">⏳</div>
      <p>Analysing email with AI...</p>
    </div>
  `);
}

function showError(msg) {
  setBody(`
    <div class="tm-status">
      <div class="tm-icon">❌</div>
      <p style="color:#DC2626">${msg}</p>
      <button class="tm-btn tm-btn-ghost" id="tm-retry">Try again</button>
    </div>
  `);
  document.getElementById('tm-retry').onclick = () => showEmailReady(currentMsgId);
}

// ─── Load accounts ────────────────────────────────────────────────────────────
async function loadAccounts() {
  try {
    const res = await apiFetch(`${API}/auth/me`);
    const data = await res.json();
    if (data.authenticated) {
      accounts = data.accounts || [];
      selectedAccount = data.activeAccount;
    }
  } catch {}
}

// ─── Analyse ──────────────────────────────────────────────────────────────────
async function analyseEmail(msgId) {
  showLoading();
  try {
    const accountParam = selectedAccount ? `?account=${encodeURIComponent(selectedAccount)}` : '';
    const emailRes = await apiFetch(`${API}/gmail/emails/${msgId}${accountParam}`);
    if (emailRes.status === 401) return showSettings();
    const emailData = await emailRes.json();
    if (emailData.error) return showError(emailData.error);

    const analysisRes = await apiFetch(`${API}/analyse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...emailData, account: selectedAccount }),
    });
    if (analysisRes.status === 401) return showSettings();
    const analysis = await analysisRes.json();
    if (analysis.error) return showError(analysis.error);

    if (analysis.items.length === 0) {
      setBody(`
        <div class="tm-status">
          <div class="tm-icon">🔍</div>
          <p>No tax-relevant items found in this email.</p>
          <p style="font-size:12px;color:#7A90A8">${analysis.summary || ''}</p>
          <button class="tm-btn tm-btn-ghost" id="tm-back-btn" style="margin-top:8px">← Back</button>
        </div>
      `);
      document.getElementById('tm-back-btn').onclick = () => showEmailReady(msgId);
      return;
    }

    showResults(analysis.items, emailData);
  } catch (e) {
    showError('Could not connect to TaxMate server. Make sure it is running.');
  }
}

// ─── Results ──────────────────────────────────────────────────────────────────
function showResults(items, emailData) {
  let approved = 0;

  function renderItems() {
    const body = document.getElementById('taxmate-body');
    if (!body) return;
    const pending = items.filter(i => !i._approved && !i._dismissed);

    if (pending.length === 0) {
      body.innerHTML = `
        <div class="tm-success-banner">✅ All items processed!</div>
        ${approved > 0 ? `<p style="text-align:center;color:#166534;font-size:13px">${approved} item(s) added to FY ${selectedFY} tax table.</p>` : ''}
        <a href="http://localhost:3000" target="_blank">
          <button class="tm-btn tm-btn-ghost" style="margin-top:8px">Open TaxMate →</button>
        </a>
        <button class="tm-btn tm-btn-ghost" id="tm-back-btn2">← Analyse another</button>
      `;
      document.getElementById('tm-back-btn2').onclick = () => showEmailReady(currentMsgId);
      return;
    }

    body.innerHTML = `
      <p style="font-size:12px;color:#4A6080;margin-bottom:12px">
        Found <strong>${pending.length}</strong> item(s) — review and approve:
      </p>
      ${pending.map(item => `
        <div class="tm-item" id="item-${item.id}">
          <div class="tm-item-vendor">${item.vendor}</div>
          <div class="tm-item-amount">$${parseFloat(item.amount || 0).toFixed(2)}</div>
          <div class="tm-item-meta">📅 ${item.date || 'Unknown date'}</div>
          <span class="tm-conf tm-conf-${item.confidence}">${item.confidence} confidence</span>
          ${item.notes ? `<div class="tm-item-notes">💡 ${item.notes}</div>` : ''}
          <label class="tm-label">AMOUNT</label>
          <input class="tm-input" id="amt-${item.id}" type="number" value="${item.amount}" step="0.01"/>
          <label class="tm-label">DATE</label>
          <input class="tm-input" id="date-${item.id}" type="text" value="${item.date || ''}"/>
          <label class="tm-label">CATEGORY</label>
          <select class="tm-select" id="cat-${item.id}">
            ${CATEGORIES.map(c => `<option value="${c.id}" ${c.id === item.category ? 'selected' : ''}>${c.label}</option>`).join('')}
          </select>
          <div class="tm-actions">
            <button class="tm-btn tm-btn-ghost" data-dismiss="${item.id}">✕ Dismiss</button>
            <button class="tm-btn tm-btn-success" data-approve="${item.id}">✓ Approve</button>
          </div>
        </div>
      `).join('')}
    `;

    // Attach event listeners instead of inline onclick (required by Gmail's CSP)
    body.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener('click', () => approveItem(btn.getAttribute('data-approve')));
    });
    body.querySelectorAll('[data-dismiss]').forEach(btn => {
      btn.addEventListener('click', () => dismissItem(btn.getAttribute('data-dismiss')));
    });
  }

  async function approveItem(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const amount   = parseFloat(document.getElementById(`amt-${id}`)?.value || item.amount);
    const date     = document.getElementById(`date-${id}`)?.value || item.date;
    const category = document.getElementById(`cat-${id}`)?.value || item.category;
    try {
      const res = await apiFetch(`${API}/entries`);
      const data = await res.json();
      const entries = data.entries || [];
      entries.push({ ...item, amount, date, category, status: 'approved', financialYear: selectedFY, emailSubject: emailData.subject, emailFrom: emailData.from });
      await apiFetch(`${API}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      item._approved = true;
      approved++;
      renderItems();
    } catch (e) {
      alert('Failed to save. Make sure TaxMate server is running.');
    }
  };

  function dismissItem(id) {
    const item = items.find(i => i.id === id);
    if (item) { item._dismissed = true; renderItems(); }
  };

  renderItems();
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  authToken = await loadToken();
  if (authToken) await loadAccounts();
  injectPanel();
  onUrlChange();
}

function waitForGmail() {
  const check = setInterval(() => {
    if (document.querySelector('div[role="banner"]') || document.querySelector('.aeH')) {
      clearInterval(check);
      init();
    }
  }, 500);
  setTimeout(() => clearInterval(check), 15000);
}

waitForGmail();
