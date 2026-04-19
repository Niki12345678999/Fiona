# Finova

Finova ist eine React + Node App fuer Portfolio-Tracking, Login und Analysefunktionen.

## Projektstruktur

- Frontend: dieses Verzeichnis (CRA Build)
- Backend API: `backend/`

## Lokal starten

### Frontend

1. `npm install`
2. `npm start`

### Backend

1. `cd backend`
2. `npm install`
3. `cp .env.example .env`
4. `npm start`

## Production Deployment

Der empfohlene Weg ist:

- Frontend auf Vercel
- Backend auf Render

Alle Details stehen in `DEPLOYMENT.md`.

Kurzfassung:

1. Backend auf Render deployen (Blueprint via `render.yaml`)
2. Backend Secrets auf Render setzen (`ACCESS_CODE`, `OPENAI_API_KEY`, `CORS_ORIGINS`)
3. Frontend auf Vercel deployen (`vercel.json` ist vorbereitet)
4. Frontend Env-Variablen auf Vercel setzen:
	- `VITE_API_URL=https://dein-backend.onrender.com`
	- `VITE_ACCESS_CODE=<dein ACCESS_CODE>`

## Wichtige Env-Dateien

- Frontend Template: `.env.production.example`
- Backend Dev Template: `backend/.env.example`
- Backend Prod Template: `backend/.env.production.example`

## Hinweise fuer Produktivbetrieb

- `ACCESS_CODE` nie auf `dev123` lassen.
- `CORS_ORIGINS` nur auf echte Frontend-Domain(s) setzen.
- Fuer stabile Multi-User-Daten mittelfristig von JSON auf Postgres wechseln.
