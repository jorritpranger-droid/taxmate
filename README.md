# ⚖️ TaxMate — AI Tax Return Organiser
### Full Gmail Integration Version

TaxMate connects to your Gmail, scans for invoices and financial statements,
then uses Claude AI to extract and categorise tax deductions for your review.

---

## Project Structure

```
taxmate/
├── server/          ← Node.js/Express backend (API keys live here)
│   ├── index.js     ← Main server
│   ├── .env.example ← Copy to .env and fill in your credentials
│   └── package.json
└── client/          ← React frontend
    ├── src/
    │   ├── App.js   ← Main React app
    │   └── index.js
    ├── public/
    │   └── index.html
    └── package.json
```

---

## Setup Guide

### Step 1 — Google Cloud Console (Gmail OAuth)

1. Go to https://console.cloud.google.com
2. Create a new project (e.g., "TaxMate")
3. Enable the **Gmail API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Gmail API" → Enable it
4. Configure **OAuth consent screen**:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose **External** (or Internal if G Suite)
   - Fill in App name: "TaxMate", your email as support contact
   - Add scopes: `gmail.readonly`, `userinfo.email`, `userinfo.profile`
   - Add your own Gmail address as a **Test User**
5. Create **OAuth 2.0 credentials**:
   - Go to "APIs & Services" → "Credentials" → "+ Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: "TaxMate Local"
   - Authorised redirect URIs: `http://localhost:3001/auth/callback`
   - Copy your **Client ID** and **Client Secret**

### Step 2 — Get your Anthropic API Key

1. Go to https://console.anthropic.com
2. Create an API key
3. Copy it

### Step 3 — Configure the Server

```bash
cd taxmate/server
cp .env.example .env
```

Edit `.env`:
```env
GOOGLE_CLIENT_ID=your_client_id_from_step_1
GOOGLE_CLIENT_SECRET=your_client_secret_from_step_1
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/callback
ANTHROPIC_API_KEY=your_key_from_step_2
SESSION_SECRET=any_long_random_string_here
PORT=3001
CLIENT_URL=http://localhost:3000
```

### Step 4 — Install Dependencies & Run

Open **two terminals**:

**Terminal 1 — Start the server:**
```bash
cd taxmate/server
npm install
npm start
```

You should see: `🚀 TaxMate server running on http://localhost:3001`

**Terminal 2 — Start the React app:**
```bash
cd taxmate/client
npm install
npm start
```

Browser opens at http://localhost:3000 ✓

---

## How It Works

1. **Sign in with Google** — OAuth flow, read-only Gmail access
2. **Inbox tab** — pre-filtered for tax-related emails (invoices, bills, utilities, rates, etc.)
3. **Click "Analyse"** on an email — Claude reads it and extracts deductible items
4. **Review tab** — every extracted item requires your approval before being saved
   - Edit amounts, dates, categories before approving
   - Low-confidence items are flagged with AI's reasoning
5. **Tax Table** — approved entries with category totals and grand total
6. **Export CSV** — download for your accountant or tax authority portal

---

## Deploying to Production (Optional)

For production deployment (e.g., on a VPS or Railway/Render):

1. Update `GOOGLE_REDIRECT_URI` to your real domain
2. Add your production domain to Google OAuth's "Authorised redirect URIs"
3. Set `CLIENT_URL` to your frontend URL
4. Use `https://` for the cookie `secure: true` setting in `server/index.js`
5. Consider using a proper session store (e.g., connect-redis) instead of in-memory

---

## Privacy & Security

- **OAuth read-only** — TaxMate can never send, modify, or delete emails
- **No persistent email storage** — email bodies are processed in memory and discarded
- **Tax entries stored locally** — in your browser's localStorage (client-side only)
- **API keys stay server-side** — never exposed to the browser
- Your data never leaves your own infrastructure (server + browser)

---

## Financial Year Support

Switch between FY 2022-23, 2023-24, 2024-25 in the header dropdown.
Each financial year maintains its own separate tax table.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not authenticated" errors | Check server is running on port 3001 |
| Google OAuth error | Verify redirect URI matches exactly in Google Console |
| No emails showing | Try the Reset button — the default query may be too broad/narrow |
| AI analysis fails | Check ANTHROPIC_API_KEY in .env |
| CORS errors | Ensure CLIENT_URL in .env matches your React dev server URL |
