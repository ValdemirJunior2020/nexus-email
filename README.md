# Nexus Email

A custom email web app for **info@nexusai.com**, built with React/Vite (Netlify-ready), an Express API (Render), and Google Sheets as the requested database.

**Do not deploy the Netlify frontend until local QA is approved.** The frontend has not been deployed by this setup.

## What is implemented

- Password-protected administrator login using bcrypt hash and signed, expiring JWT.
- Inbox, sent, archive, trash, read/unread, starring, search (current folder), and compose.
- Google Sheet tabs: `Mailboxes`, `Messages`, `Contacts`, `Settings`, `Audit`.
- Google Sheets API storage for message metadata and plain-text bodies. This is a **small-mailbox MVP**, not a Gmail-scale email server.
- Resend API for outbound email and Cloudflare Email Routing Worker for inbound.
- Local-only demo mode (does not send real mail) and a responsive React interface.
- No message HTML rendering, reducing cross-site scripting exposure.

## Windows local test (PowerShell)

Requires Node.js 22+ and Git.

```powershell
git clone https://github.com/ValdemirJunior2020/nexus-email.git
cd nexus-email
Copy-Item api/.env.example api/.env
npm install
npm run dev --workspace api
```

Open **a second PowerShell terminal** in the same folder:

```powershell
npm run dev --workspace web
```

Open http://localhost:5173. The demo password is `demo12345` (local only). Compose to yourself; messages saved in demo mode are **not delivered** or synchronized to Sheets. Press Ctrl+C in both terminals to stop.

## Google Sheets connection

Spreadsheet ID: `1nxmEvfWe6WcdUX2Wcc3TQ06oMVWz6LMGTtgXwEmDCog`

1. In Google Cloud, enable Google Sheets API, create a service account, and obtain a JSON key.
2. Share the spreadsheet with the **service account email** as Editor.
3. In Render environment, set `GOOGLE_SERVICE_ACCOUNT_JSON` to the full JSON string and `SHEET_ID` to the ID above.
4. Set `DEMO_MODE=false` and `NODE_ENV=production`.
5. Set `JWT_SECRET` to a long cryptographically random string, and `ADMIN_PASSWORD_HASH` to bcrypt output. Generate hash locally:

```powershell
node -e "console.log(require('bcryptjs').hashSync('REPLACE_WITH_YOUR_LONG_PASSWORD',12))"
```

Never commit credentials or copy private keys into GitHub issues.

## Email sending

Use Resend (or adapt the provider call). Verify **nexusai.com** as a sending domain, publish the exact SPF/DKIM records shown by the provider, and set `RESEND_API_KEY` on Render. An address string alone does not establish ownership or deliverability. Provider use and free tiers may have restrictions.

## Receiving email

Configure Cloudflare DNS and **Email Routing** for the domain, create a route for `info@nexusai.com` to an Email Worker based on `cloudflare/worker.js`, and set Worker secret `INBOUND_SECRET` equal to the Render API setting. Configure `RENDER_API_URL` to the actual service URL. Do **not** change active MX records without accounting for existing mail service. The worker intentionally drops binary attachments and HTML; plain text only for this MVP.

## Render service

`render.yaml` contains the Render Blueprint. Monorepo root build: `npm install`; start: `npm run start --workspace api`; health URL: `/api/health`; plan: free. Set `CORS_ORIGIN` to your Netlify address **after frontend deployment**, or to `http://localhost:5173` during local testing.

To use local UI against Render, create `web/.env.local`:

```env
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
```

Then restart Vite. Production service needs all required secrets before it can start; see `render.yaml`.

## Netlify — prepared, NOT DEPLOYED

After local approval, create a site from GitHub with **base directory `web`**, build command `npm run build`, and publish directory `dist`. Add `VITE_API_URL` as the production Render backend URL, and configure backend `CORS_ORIGIN` to the deployed frontend origin. SPA redirects are in `web/netlify.toml`.

## Limitations and security

- Sheets has quotas, 50,000-character/cell limits, and is unsuitable as unlimited email storage; this app caps message bodies at 40,000 characters.
- A one-admin prototype, not a multi-user isolated mailbox service. Contacts and audit tabs are initialized but not wired into the UI.
- No attachments, rich-text email, thread replies, spam filtering, mailbox import, DKIM signing in-app, or outgoing delivery retries.
- Never expose Sheets service account JSON, Resend key, JWT secret, or inbound secret to the browser.
- Use a private repository before adding any proprietary code. Harden and test external delivery before relying on this for business communications.
