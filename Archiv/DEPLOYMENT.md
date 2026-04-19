# Finova Deployment Guide (Vercel + Render)

Dieses Setup macht die App weltweit erreichbar (nicht nur im WLAN).

## Zielarchitektur

- Frontend: Vercel (React Build aus `Archiv`)
- Backend: Render Web Service (Node.js aus `Archiv/backend`)

## Vor dem Deploygit branch -M main
git remote add origin DEIN-GITHUB-LINK
git push -u origin main

1. Code nach GitHub pushen.
2. Sicherstellen, dass Build lokal funktioniert:
   - `cd Archiv && npm run build`
3. Optional Frontend Env lokal testen mit `.env.production.example`.

## 1) Backend auf Render deployen

1. Render-Konto erstellen und mit GitHub verbinden.
2. In Render: `New` -> `Blueprint`.
3. Repository waehlen, Render liest automatisch `render.yaml`.
4. Im Service `finova-backend` diese Variablen setzen:
   - `OPENAI_API_KEY` oder `ANTHROPIC_API_KEY`
   - `ACCESS_CODE` (langes zufaelliges Secret)
   - `CORS_ORIGINS` (deine Vercel-Domain, z. B. `https://finova.vercel.app`)
5. Deploy starten.
6. Backend-URL notieren, z. B. `https://finova-backend.onrender.com`.

## 2) Frontend auf Vercel deployen

1. Vercel-Konto erstellen und GitHub verbinden.
2. Neues Projekt aus dem gleichen Repository anlegen.
3. Root Directory auf `Archiv` setzen.
4. Build Settings:
   - Build Command: `npm run build`
   - Output Directory: `build`
5. Environment Variables setzen:
   - `VITE_API_URL=https://dein-backend.onrender.com`
   - `VITE_ACCESS_CODE=<genau derselbe Wert wie ACCESS_CODE auf Render>`
6. Deploy starten.

Hinweis: `vercel.json` ist bereits fuer SPA-Routing vorbereitet.

## 3) CORS finalisieren

Nach dem ersten Vercel Deploy:

1. Exakte Vercel-Domain kopieren.
2. Auf Render `CORS_ORIGINS` auf diese Domain setzen.
3. Backend redeployen.

## 4) Funktionstest

1. Backend Healthcheck aufrufen:
   - `https://dein-backend.onrender.com/health`
2. Frontend aufrufen:
   - `https://dein-app.vercel.app`
3. Registrieren/Einloggen testen.
4. Asset anlegen und auf zweitem Geraet mit gleichem Account pruefen.

## 5) Wichtige Produktions-Hinweise

- Nie `dev123` in Produktion verwenden.
- Secrets nur in Render/Vercel, nie in Git.
- `CORS_ORIGINS` immer eng begrenzen.
- JSON-Dateien (`users.json`, `sessions.json`) sind fuer MVP okay, aber nicht ideal fuer Skalierung.

## 6) Empfohlener naechster Schritt

Fuer stabile Multi-User-Produktivdaten:

1. Postgres einrichten (Render Postgres, Supabase oder Neon).
2. Nutzer, Sessions und Portfolio in DB speichern.
3. Backup- und Migrationsprozess einfuehren.
