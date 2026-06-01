import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import { google } from 'googleapis';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

// Load .env for local development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: 'C:\\Users\\jpran\\OneDrive\\Desktop\\taxmate\\server\\.env' });
}

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// ─── Database (PostgreSQL in production, file in development) ──────────────────
let pgPool = null;
if (process.env.DATABASE_URL) {
  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: IS_PROD ? { rejectUnauthorized: false } : false,
  });

  // Create entries table if it doesn't exist
  pgPool.query(`
    CREATE TABLE IF NOT EXISTS user_entries (
      email TEXT PRIMARY KEY,
      entries JSONB DEFAULT '[]'::jsonb,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(console.error);
}

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [CLIENT_URL];
    if (
      !origin ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1') ||
      origin === 'https://mail.google.com' ||
      origin.startsWith('chrome-extension://') ||
      origin.startsWith('moz-extension://') ||
      allowedOrigins.includes(origin) ||
      (IS_PROD && origin === CLIENT_URL)
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Session store — PostgreSQL in production, memory in development
const PgSession = connectPgSimple(session);
const sessionStore = pgPool
  ? new PgSession({ pool: pgPool, createTableIfMissing: true })
  : undefined;

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: IS_PROD,
    sameSite: IS_PROD ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}));

// Serve React build in production
if (IS_PROD) {
  const clientBuild = path.join(path.dirname(new URL(import.meta.url).pathname.slice(1)), '..', 'client', 'build');
  app.use(express.static(clientBuild));
}

// ─── Google OAuth ──────────────────────────────────────────────────────────────
function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/callback'
  );
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// ─── Auth Routes ───────────────────────────────────────────────────────────────
app.get('/auth/url', (req, res) => {
  const oauth2Client = createOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
  res.json({ url });
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!req.session.accounts) req.session.accounts = {};
    req.session.accounts[userInfo.email] = {
      tokens,
      user: { email: userInfo.email, name: userInfo.name, picture: userInfo.picture },
    };

    if (!req.session.activeAccount) {
      req.session.activeAccount = userInfo.email;
    }

    res.redirect(`${CLIENT_URL}?auth=success`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`${CLIENT_URL}?auth=error`);
  }
});

app.get('/auth/me', (req, res) => {
  const extToken = req.headers['x-taxmate-token'];
  const sessionData = (extToken && extensionTokens.get(extToken)) || (req.session.accounts ? req.session : null);
  if (!sessionData?.accounts || Object.keys(sessionData.accounts).length === 0) {
    return res.json({ authenticated: false });
  }
  const accounts = Object.values(sessionData.accounts).map(a => a.user);
  res.json({ authenticated: true, accounts, activeAccount: sessionData.activeAccount });
});

app.post('/auth/switch', (req, res) => {
  const { email } = req.body;
  if (!req.session.accounts?.[email]) return res.status(400).json({ error: 'Account not connected' });
  req.session.activeAccount = email;
  res.json({ success: true, activeAccount: email });
});

app.post('/auth/logout', (req, res) => {
  const { email } = req.body;
  if (email && req.session.accounts) {
    delete req.session.accounts[email];
    const remaining = Object.keys(req.session.accounts);
    if (req.session.activeAccount === email) req.session.activeAccount = remaining[0] || null;
    if (remaining.length === 0) req.session.destroy();
  } else {
    req.session.destroy();
  }
  res.json({ success: true });
});

// ─── Extension Token ───────────────────────────────────────────────────────────
const extensionTokens = new Map();

app.post('/auth/extension-token', (req, res) => {
  if (!req.session.accounts || Object.keys(req.session.accounts).length === 0) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
  extensionTokens.set(token, {
    accounts: req.session.accounts,
    activeAccount: req.session.activeAccount,
  });
  res.json({ token });
});

// ─── Auth Middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const extToken = req.headers['x-taxmate-token'];
  if (extToken && extensionTokens.has(extToken)) {
    req.extensionSession = extensionTokens.get(extToken);
    return next();
  }
  if (!req.session.accounts || Object.keys(req.session.accounts).length === 0) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

function getActiveEmail(req) {
  return req.extensionSession?.activeAccount || req.session.activeAccount;
}

function getAuthClientForAccount(req, email) {
  const sessionAccounts = req.extensionSession?.accounts || req.session.accounts;
  const accountEmail = email || getActiveEmail(req);
  const account = sessionAccounts?.[accountEmail];
  if (!account) return null;
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials(account.tokens);
  return oauth2Client;
}

// ─── Gmail Routes ──────────────────────────────────────────────────────────────
app.get('/gmail/emails', requireAuth, async (req, res) => {
  try {
    const { maxResults = 50, pageToken, query = '', account, financialYear } = req.query;
    const auth = getAuthClientForAccount(req, account);
    if (!auth) return res.status(400).json({ error: 'Account not found' });

    const gmail = google.gmail({ version: 'v1', auth });

    let dateFilter = '';
    if (financialYear) {
      const startYear = parseInt(financialYear.split('-')[0]);
      dateFilter = ` after:${startYear}/7/1 before:${startYear + 1}/7/31`;
    }

    const taxQuery = query
      ? query + dateFilter
      : [
          'subject:(invoice OR statement OR receipt OR bill OR "tax invoice" OR "account statement" OR rates OR utilities OR insurance)',
          'has:attachment OR from:(agl OR origin OR jemena OR council OR strata OR "body corporate" OR insurance)',
        ].join(' OR ') + dateFilter;

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: parseInt(maxResults),
      pageToken: pageToken || undefined,
      q: taxQuery,
    });

    const messages = listRes.data.messages || [];
    const nextPageToken = listRes.data.nextPageToken;

    const emailPreviews = await Promise.all(
      messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me', id: msg.id, format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        });
        const headers = detail.data.payload.headers;
        const get = (name) => headers.find((h) => h.name === name)?.value || '';
        return { id: msg.id, subject: get('Subject'), from: get('From'), date: get('Date'), snippet: detail.data.snippet };
      })
    );

    res.json({ emails: emailPreviews, nextPageToken });
  } catch (err) {
    console.error('Gmail list error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/gmail/emails/:id', requireAuth, async (req, res) => {
  try {
    const { account } = req.query;
    const auth = getAuthClientForAccount(req, account);
    if (!auth) return res.status(400).json({ error: 'Account not found' });

    const gmail = google.gmail({ version: 'v1', auth });

    let msgId = req.params.id;
    try {
      const test = await gmail.users.messages.get({ userId: 'me', id: msgId, format: 'minimal' });
      msgId = test.data.id;
    } catch (e) {
      try {
        const thread = await gmail.users.threads.get({ userId: 'me', id: msgId });
        msgId = thread.data.messages[thread.data.messages.length - 1].id;
      } catch (e2) {
        const search = await gmail.users.messages.list({ userId: 'me', q: `rfc822msgid:${msgId}`, maxResults: 1 });
        if (search.data.messages?.length) msgId = search.data.messages[0].id;
        else return res.status(400).json({ error: `Could not resolve message ID: ${msgId}` });
      }
    }

    const detail = await gmail.users.messages.get({ userId: 'me', id: msgId, format: 'full' });
    const payload = detail.data.payload;
    const headers = payload.headers;
    const get = (name) => headers.find((h) => h.name === name)?.value || '';

    let body = '';
    const extractBody = (part) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body += Buffer.from(part.body.data, 'base64').toString('utf8');
      } else if (part.parts) part.parts.forEach(extractBody);
    };
    extractBody(payload);

    if (!body) {
      const extractHtml = (part) => {
        if (part.mimeType === 'text/html' && part.body?.data) {
          body += Buffer.from(part.body.data, 'base64').toString('utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        } else if (part.parts) part.parts.forEach(extractHtml);
      };
      extractHtml(payload);
    }

    res.json({
      id: req.params.id, subject: get('Subject'), from: get('From'), date: get('Date'),
      body: body.substring(0, 8000), account: account || getActiveEmail(req),
    });
  } catch (err) {
    console.error('Gmail get error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Anthropic Analysis ────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a tax return assistant for an Australian taxpayer.
Analyse email content and extract any invoices, statements, or financial documents relevant to a tax return (investment property or personal deductions).

IMPORTANT DATE RULE: Use the invoice/service date from the document itself — NOT the email sent date. An invoice emailed on 2 July 2025 may relate to work done on 27 June 2025, which falls in FY 2024-25. Always extract the date the work was done or the invoice was issued. If the email date and invoice date differ and fall in different financial years, note this in the "notes" field so the user can assign it to the correct year.

For each item found, extract:
- vendor/payee name
- amount (as a number, AUD)
- date (YYYY-MM-DD format) — use the invoice/service date, not the email date
- description of what it is
- suggested category from: rates, utilities, body_corporate, insurance, repairs_maintenance, property_management, interest_charges, depreciation, professional_fees, travel, home_office, subscriptions, other
- confidence: high / medium / low
- notes: include if the invoice date differs from the email date, why this category, anything the user should verify

Respond ONLY in this exact JSON with no markdown fences:
{
  "items": [{"id":"1","vendor":"...","amount":123.45,"date":"2024-06-27","description":"...","category":"utilities","confidence":"high","notes":"..."}],
  "suggested_categories": [{"id":"travel","label":"Travel","reason":"..."}],
  "summary": "Found X items totalling $Y."
}
If no tax-relevant items are found, return: {"items":[],"suggested_categories":[],"summary":"No tax-relevant items found in this email."}`;

app.post('/analyse', requireAuth, async (req, res) => {
  const { emailId, subject, from, date, body, account } = req.body;
  if (!body) return res.status(400).json({ error: 'No email body provided' });
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Analyse this email for Australian tax return items:\n\nFrom: ${from}\nSubject: ${subject}\nDate: ${date}\n\nBody:\n${body}` }],
    });
    const text = message.content.map((c) => c.text || '').join('');
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    parsed.items = parsed.items.map((item, i) => ({
      ...item,
      id: `${emailId}_${i}_${Date.now()}`,
      emailId, emailSubject: subject, emailFrom: from,
      emailAccount: account || getActiveEmail(req),
    }));
    res.json(parsed);
  } catch (err) {
    console.error('Analyse error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Entries Storage ───────────────────────────────────────────────────────────
const LOCAL_DATA_FILE = 'C:\\Users\\jpran\\OneDrive\\Desktop\\taxmate\\data\\entries.json';

async function readEntries(req) {
  const email = getActiveEmail(req);
  if (pgPool && email) {
    const result = await pgPool.query('SELECT entries FROM user_entries WHERE email = $1', [email]);
    return result.rows[0]?.entries || [];
  }
  try {
    if (!fs.existsSync(LOCAL_DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(LOCAL_DATA_FILE, 'utf8'));
  } catch { return []; }
}

async function writeEntries(req, entries) {
  const email = getActiveEmail(req);
  if (pgPool && email) {
    await pgPool.query(
      `INSERT INTO user_entries (email, entries, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (email) DO UPDATE SET entries = $2, updated_at = NOW()`,
      [email, JSON.stringify(entries)]
    );
    return;
  }
  fs.mkdirSync(path.dirname(LOCAL_DATA_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

app.get('/entries', requireAuth, async (req, res) => {
  try {
    res.json({ entries: await readEntries(req) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/entries', requireAuth, async (req, res) => {
  const { entries } = req.body;
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'Invalid entries' });
  try {
    await writeEntries(req, entries);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve React app for all other routes in production
if (IS_PROD) {
  app.get('*', (req, res) => {
    const clientBuild = path.join(path.dirname(new URL(import.meta.url).pathname.slice(1)), '..', 'client', 'build');
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🚀 TaxMate server running on http://localhost:${PORT}`);
  console.log(`   Mode: ${IS_PROD ? 'production' : 'development'}`);
  console.log(`   Database: ${pgPool ? 'PostgreSQL' : 'local file'}\n`);
});
