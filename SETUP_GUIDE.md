# TaxMate — Setup Guide for New Users

## What you need before starting

### 1. Google OAuth Credentials
1. Go to https://console.cloud.google.com
2. Create a new project (e.g. "TaxMate")
3. Go to **APIs & Services → Library** → search "Gmail API" → Enable it
4. Go to **APIs & Services → OAuth consent screen**
   - Choose **External**
   - Fill in App name: "TaxMate", your email as support contact
   - Add scopes: `gmail.readonly`, `userinfo.email`, `userinfo.profile`
   - Add your Gmail address as a **Test User**
5. Go to **APIs & Services → Credentials → + Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorised redirect URIs: `http://localhost:3001/auth/callback`
   - Copy your **Client ID** and **Client Secret**

### 2. Anthropic API Key
1. Go to https://console.anthropic.com
2. Create an API key and copy it

---

## Installation

1. Install **Node.js** from https://nodejs.org (choose the LTS version)
2. Download or copy the TaxMate folder to your Desktop
3. Double-click **setup.bat**
4. Follow the prompts to enter your API keys
5. TaxMate will open in your browser automatically

---

## Starting TaxMate after setup

Double-click **Start TaxMate** on your Desktop.

---

## Your data

Your tax entries are saved locally on your computer in the `data/entries.json` file inside the TaxMate folder. Back this up regularly.
