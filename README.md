# The Brew Bits POS

The Brew Bits is an offline-first Windows desktop point-of-sale application for a cafe. It runs its API server on the same computer as Electron and stores the complete register—menu, bills, reports, settings, and daily logs—in one local SQLite database file.

## What runs locally

When the desktop app opens, Electron first starts a local HTTP server on `127.0.0.1:47051`. The frontend then uses that server to read and save POS data. Nothing needs an internet connection and the server is not exposed to other devices on the network.

The database is created automatically at:

`%APPDATA%\\The Brew Bits\\brew-bits.sqlite`

Back up that one file while the app is closed to retain all local data. The Settings screen can also export and restore a JSON backup.

## Requirements

- Windows 10 or later
- Node.js 22.5+ (Node 24 LTS recommended; SQLite support is built in)
- Git
- Corepack, included with current Node.js releases

## Clone and install

```powershell
git clone https://github.com/gecstartup656-gif/brew-bites.git
cd brew-bites
corepack enable
corepack pnpm install
```

The project uses pnpm workspaces. Do not use `npm install` or Yarn.

## Run locally during development

Start the frontend development server:

```powershell
corepack pnpm --filter @workspace/brew-bits run dev
```

For the full Electron application, build the frontend and start Electron from the `artifacts/brew-bits` package. The packaged installer described below is the recommended way to test the complete offline SQLite flow because it launches the API server before the POS window.

## Verify the code

```powershell
node --check artifacts/brew-bits/desktop/main.cjs
node --check artifacts/brew-bits/desktop/server.cjs
node_modules/.bin/tsc.cmd -p artifacts/brew-bits/tsconfig.json --noEmit
```

## Build the Windows installer

```powershell
corepack pnpm --filter @workspace/brew-bits run desktop:package
```

The NSIS installer is written to `release/`. Install it, then open **The Brew Bits** from the Start menu or desktop shortcut. The generated `release/` directory is intentionally ignored by Git.

## Project layout

- `artifacts/brew-bits/src` — React POS frontend
- `artifacts/brew-bits/desktop/main.cjs` — Electron startup; waits for the backend before opening the window
- `artifacts/brew-bits/desktop/server.cjs` — local-only HTTP API and SQLite persistence
- `artifacts/brew-bits/dist` — generated web build, ignored by Git
- `release` — generated installers, ignored by Git

## Git workflow

Source files under `artifacts/brew-bits` are versioned. Generated directories such as `release/`, `dist/`, Electron unpacked output, and dependencies are ignored.

```powershell
git add .
git commit -m "Add offline SQLite Electron backend"
git push -u origin main
```
