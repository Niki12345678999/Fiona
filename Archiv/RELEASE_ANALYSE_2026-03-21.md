# Release-Analyse (21.03.2026)

## 1) Kritische Punkte nach Priorität

### P0 Datenschutz / Recht / Sicherheit
- Es fehlte ein klarer In-App-Hinweis, dass keine Finanzberatung erfolgt.
- Es fehlte ein klarer Haftungsausschluss für Berechnungen/KI-Auswertungen.
- Es fehlte Transparenz, welche Daten lokal vs. serverseitig gespeichert werden.
- Es fehlte eine nutzbare Account-/Datenlöschung aus der App heraus.
- Auth konnte durch falsche Backend-URL in lokalen Settings ausfallen.
- Backend hatte keine Session-Ablaufzeit und nur minimale Input-Validierung.

### P1 Funktionalität / Robustheit
- Dividendenübersicht war teils vergangenheitsorientiert statt zukunftsorientiert.
- Dividendenerkennung war bei importierten Werten (z. B. 1,2%) anfällig.

### P2 UX / Release-Vertrauen
- Fehlende in-App Rechtstexte/Privacy/Terms senken Trust für Release.

## 2) Technische Bestandsaufnahme

### Frontend gespeichert in LocalStorage
- ft-assets-v2 (Portfolio-/Assetdaten)
- ft-settings (App-/API-/Backend-Einstellungen)
- auth_token (Session-Token)

### Backend gespeichert
- users.json: Name, E-Mail, Passwort-Hash, createdAt, portfolio, holdings, settings
- In-Memory Sessions (Token -> E-Mail)

## 3) Bereits umgesetzt im Code
- In-App Disclaimer/Haftungshinweis integriert.
- Settings erweitert um Datenschutz-Transparenz und Nutzungsbedingungen.
- Aktionen ergänzt: lokale Daten löschen, serverseitige Nutzerdaten löschen, Account löschen.
- Backend-Endpunkte ergänzt: DELETE /api/auth/data, DELETE /api/auth/account, GET /api/privacy/summary.
- Backend verbessert: E-Mail-Normalisierung, E-Mail-Validierung, Passwort-Mindestlänge, Session-TTL.
- Auth im Frontend robuster: Fallback auf localhost/127.0.0.1 bei Login/Register/User-Check.
- Dividendenrobustheit + Zukunftsmonatssicht verbessert.

## 4) Offene Punkte vor App-Store-Release
- Rate Limiting und Brute-Force-Schutz (Backend) fehlen noch.
- CSP/Helmet/Hardening für produktiven Betrieb fehlen.
- DSGVO-konforme Rechtsdokumente müssen juristisch final geprüft werden.
- Infrastrukturthemen (TLS, Monitoring, Backups, Incident-Prozess) sind außerhalb dieses Code-Scopes.
- Apple Privacy Labels / Google Data Safety müssen im Store-Portal korrekt gepflegt werden.
