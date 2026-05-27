# Nordic Job Agent — Vercel Deployment Guide

## Files
- `index.html` — Frontend app
- `api/chat.js` — Serverless proxy (keeps your API key safe on the server)
- `vercel.json` — Deployment config

---

## Deploy in 5 minutes

### 1. Create a GitHub repo

- Go to https://github.com/new
- Name it `nordic-job-agent`
- Click **Create repository**
- Upload all 3 files:
  - `index.html` (in root)
  - `api/chat.js` (create an `api` folder first, then upload inside it)
  - `vercel.json` (in root)
- Click **Commit changes**

### 2. Deploy on Vercel

- Go to https://vercel.com and sign in with GitHub
- Click **Add New → Project**
- Import your `nordic-job-agent` repo
- Click **Deploy**

### 3. Add your API key as an Environment Variable

This is the important step — your key stays secret on Vercel's servers:

- After deploy, go to your project on Vercel
- Click **Settings → Environment Variables**
- Click **Add New**
  - Name:  `ANTHROPIC_API_KEY`
  - Value: `your-api-key-here`
- Click **Save**
- Go to **Deployments → Redeploy** (so the new env var takes effect)

### 4. Done!

Your app is live at something like `nordic-job-agent.vercel.app`
Bookmark it and open from anywhere — phone, laptop, anywhere.

---

## Why this setup?
- Your API key is NEVER in the HTML file (safe to share)
- The browser calls `/api/chat` on YOUR Vercel server
- Your Vercel server forwards to Anthropic with the secret key
- No CORS errors, no key exposure
