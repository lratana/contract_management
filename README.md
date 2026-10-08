# Procurement System — GitHub + Netlify + Apps Script Temporary Architecture

## Structure

```text
procurement-system/
├── apps-script/
│   ├── appsscript.json
│   ├── Code.gs
│   ├── Index.html
│   ├── Styles.html
│   └── App.html
│
└── web/
    ├── src/
    │   ├── App.tsx
    │   ├── api.ts
    │   ├── main.tsx
    │   └── styles.css
    ├── public/
    │   └── _redirects
    ├── netlify/
    │   └── functions/
    │       └── api.mjs
    ├── index.html
    ├── netlify.toml
    └── package.json
```

## Temporary data flow

```text
React
  ↓
Netlify /api
  ↓
Netlify Function
  ↓
Apps Script doPost()
  ↓
Google Sheets
  ↓
Google Drive
```

The existing Apps Script `doGet()` continues to serve the original Apps Script Web App.
The new `doPost()` bridge is appended to the same `Code.gs` file.

## Apps Script setup

1. Open the Apps Script project.
2. Replace the existing five files with the files under `apps-script/`.
3. Create a Script Property:

```text
NETLIFY_API_SECRET = <same value used in Netlify>
```

4. Run `setupSystem()` once and approve permissions.
5. Deploy as Web App.
6. Copy the `/exec` URL.

## Netlify setup

Connect the `web/` project to Netlify. If the GitHub repository root is the parent `procurement-system/`, configure the Netlify base directory as:

```text
web
```

Build:

```text
npm run build
```

Publish:

```text
dist
```

Functions directory:

```text
netlify/functions
```

Environment variables:

```text
GAS_WEB_APP_URL=https://script.google.com/macros/s/XXXXXXXX/exec
APPS_SCRIPT_API_SECRET=<same secret>
```

Do not prefix the secret with `VITE_`, because client-side Vite variables are exposed to the browser bundle.

## Local web development

```bash
cd web
npm install
npm run dev
```

For a real Netlify Function locally:

```bash
netlify dev
```

The temporary bridge expects the Apps Script Web App to be reachable.

## Important authentication note

This package uses an API secret for the temporary Netlify → Apps Script bridge.

The legacy Apps Script backend still determines the current Google user from Apps Script session context. Therefore, this bridge is suitable as a temporary/single-admin architecture, but it is not yet the final multi-user identity layer for a public Netlify application.

For the final production architecture, move authentication and RBAC into Node.js/Hono + Cloudflare and use D1 as the source of truth.

## Current modules

The Apps Script source contains:

- Projects
- Procurement Plan
- Budget Request
- Bidding Process
- Suppliers
- Bids
- Evaluations
- Contracts
- Payments
- Variations
- Deliveries
- Handover
- Warranty
- Warranty Defects
- Documents

The frontend reads the module metadata from the Apps Script bootstrap response and renders a reusable list/form UI.

## Loading UX

- Full-screen blue loading on startup
- Shimmer table loading
- Search debounce
- Create loading
- Update loading
- Modal busy overlay
- Pagination
- Refresh current module only

## GitHub workflow

```bash
git init
git add .
git commit -m "Initial procurement system"
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY>
git push -u origin main
```

Then connect the GitHub repository to Netlify.

## Important production boundary

Do not commit:

- API secrets
- Google OAuth credentials
- production private keys
- database credentials

The `appsscript.json` remains an Apps Script manifest and is not a Netlify manifest.
