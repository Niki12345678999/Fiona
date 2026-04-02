# Release-Checkliste

## 1. Schon umgesetzt
- In-App Finanzberatungs-Disclaimer und Haftungshinweis sichtbar.
- Nutzungsbedingungen in der App integriert (Settings-Bereich).
- Datenschutz-Transparenz in der App integriert (lokal vs. serverseitig).
- Funktion fuer lokale Datenloeschung integriert.
- Funktion fuer serverseitige Datenloeschung integriert.
- Funktion fuer Account-Loeschung (mit Passwort) integriert.
- Backend-Endpunkte fuer Daten-/Account-Loeschung implementiert.
- Session-Handling verbessert (TTL fuer Sessions).
- Rate Limiting fuer Login/Register implementiert.
- Security-Header-Hardening per Helmet/CSP umgesetzt.
- Persistenter Session-Store (dateibasiert) statt rein In-Memory umgesetzt.
- E-Mail-/Passwort-Validierung im Backend verbessert.
- Auth-Fallback auf localhost/127.0.0.1 integriert.
- Dividenden-Monatsansicht auf Zukunft ausgerichtet.

## 2. Noch offen (Code/Infra)
- Session-Store fuer echtes Scaling auf Redis/DB migrieren (derzeit dateibasiert).
- Audit-Logging / Security-Monitoring etablieren.
- Juristische Endfassung der Rechtstexte (Anwalt/Datenschutzberatung).

## 3. Muss in App Store / Play Store eingetragen werden
- Datenschutz-URL / Privacy Policy
- Data Safety (Google) und Privacy Labels (Apple)
- App-Beschreibung (kurz/lang), Untertitel, Keywords
- Altersfreigabe und Inhaltsfragebogen
- Support-Kontakt und Anbieterangaben

## Datenoffenlegung (fuer Labels)

### Accountdaten
- Name
- E-Mail
- Passwort-Hash (nur Server)

### Finanz-/Vermoegensdaten
- Portfolio-Positionen
- Holdings
- Nutzer-Einstellungen mit Finanzbezug

### Nutzungsdaten
- Session-Token (technisch)
- App-Einstellungen (lokal)

### Technische Daten
- Backend-URL / Access-Code (lokal gespeichert)
- Optional API-Tokens fuer Datenquellen (lokal gespeichert)

## Hinweise fuer Apple/Google Labeling
- Daten werden vom Nutzer bereitgestellt.
- Keine Zahlungsdaten / keine Finanztransaktion.
- Datenkoerbe fuer Account und App-Funktionalitaet markieren.
- Loeschoptionen in der App vorhanden (lokal + serverseitig + Account).
