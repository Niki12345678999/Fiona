# Finance Tracker AI Backend

Backend-Server für KI-gestützte Finanzanalyse mit 10 verschiedenen Analyse-Modulen.

## Features

✅ **10 Analyse-Module**:
- Fundamentalanalyse (Goldman Sachs Stil)
- Technische Analyse (Morgan Stanley Stil)
- Risikoanalyse (Bridgewater Stil)
- Earnings-Analyse
- Dividenden-Strategie
- Quantitative Analyse
- Optionsstrategien
- Makro-Ausblick
- Sektor-Analyse
- ETF-Portfolio-Builder

✅ **AI-Integration**: OpenAI GPT-4 / Claude 3 Opus

✅ **Access Control**: Token-basierte Authentifizierung

✅ **Strukturierte Ausgabe**: JSON mit KPIs, Tabs und Zusammenfassungen

## Setup

### 1. Environment-Variablen

```bash
cp .env.example .env
```

Editiere `.env` mit deinen API-Keys:

**Option A: OpenAI (GPT)**
```env
OPENAI_API_KEY=sk-proj-...
AI_PROVIDER=openai
AI_MODEL=gpt-4o
PORT=8787
ACCESS_CODE=dev123
```

Hole deinen Key unter: https://platform.openai.com/api-keys

**Option B: Anthropic (Claude)**
```env
ANTHROPIC_API_KEY=sk-ant-...
AI_PROVIDER=anthropic
AI_MODEL=claude-3-opus-20250219
PORT=8787
ACCESS_CODE=dev123
```

Hole deinen Key unter: https://console.anthropic.com

### 2. Dependencies installieren

```bash
npm install
```

### 3. Server starten

```bash
npm start
```

Oder im Development-Modus (mit Auto-Reload):
```bash
npm run dev
```

Output sollte so aussehen:
```
🚀 Finance Tracker Backend running on http://localhost:8787
📊 AI Provider: openai
🤖 AI Model: gpt-4o

✅ POST http://localhost:8787/api/analyze
   Headers: { "x-access-code": "dev123" }
```

## API-Dokumentation

### POST `/api/analyze`

Analysiert ein Finanz-Symbol mit einem bestimmten Analyse-Modul.

**Request:**
```json
{
  "query": "MSCI",
  "module": "fundamental",
  "portfolio": [
    {
      "id": "asset-1",
      "name": "Apple",
      "symbol": "AAPL",
      "type": "stock",
      "amount": 10,
      "currentPrice": 180.50
    }
  ]
}
```

**Headers:**
```
x-access-code: dev123
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "query": "MSCI",
  "module": "fundamental",
  "analysis": {
    "stand": "Q3 2025",
    "dataNote": "Latest available data",
    "verdict": "KAUFEN",
    "kpis": {
      "revenue": "€250 Mrd",
      "grossMargin": "45.2%",
      "pe": "28.5x"
    },
    "scores": {
      "Qualität": 8,
      "Wachstum": 7,
      "Bewertung": 6
    },
    "tabs": {
      "Business": {
        "points": ["Punkt 1", "Punkt 2"]
      }
    },
    "summary": ["Zusammenfassung 1", "Zusammenfassung 2"]
  }
}
```

### GET `/health`

Zeigt Status des Servers.

**Response:**
```json
{
  "status": "ok",
  "ai": "openai",
  "model": "gpt-4o"
}
```

## Module (10 Stück)

| Modul | Funktion |
|-------|----------|
| `fundamental` | Unternehmensanalyse: Geschäftsmodell, Profitabilität, Bilanz |
| `technical` | Chart-Analyse: Trends, Support/Resistance, MAs, RSI, MACD |
| `risk` | Volatilität, Beta, Max Drawdown, Korrelation, Hedging |
| `earnings` | EPS, Schätzungen, Guidance, Reaktion |
| `dividend` | Rendite, Wachstum, Sicherheit, Projektion |
| `quant` | Value, Quality, Momentum, Growth, Sentiment Scores |
| `options` | Optionsstrategien, Greeks, Risk/Reward |
| `macro` | BIP, Inflation, Fed-Politik, Kreditmärkte |
| `sector` | Sektor-Performance, Zyklus, Bewertung |
| `etf` | ETF-Allocation, Core-ETFs, Rebalancing |

## Beispiele

### Fundamental-Analyse mit curl

```bash
curl -X POST http://localhost:8787/api/analyze \
  -H "Content-Type: application/json" \
  -H "x-access-code: dev123" \
  -d '{
    "query": "AAPL",
    "module": "fundamental",
    "portfolio": []
  }'
```

### Tech-Analyse mit JavaScript

```javascript
const response = await fetch('http://localhost:8787/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-access-code': 'dev123',
  },
  body: JSON.stringify({
    query: 'MSCI',
    module: 'technical',
    portfolio: [],
  }),
});

const data = await response.json();
console.log(data.analysis);
```

## Sicherheit

⚠️ **Wichtig für Production:**

1. **ACCESS_CODE ändern** in `.env` (nicht `dev123`)
2. **API-Keys schützen** - nie ins Git committen
3. **HTTPS verwenden** (mit Reverse Proxy wie Nginx)
4. **Rate Limiting** einbauen (optional)
5. **CORS** beschränken auf deine Frontend-Domain

## Kosten

- **OpenAI GPT-4o**: ~$0.05 pro Analyse (2000 tokens)
- **Claude 3 Opus**: ~$0.03 pro Analyse

Für 100 Analysen pro Tag: ~$1.50-2.50/Tag

## Troubleshooting

### "Unauthorized: Invalid access code"
→ Check dein `ACCESS_CODE` in `.env` und in der Frontend-App

### "API key not found"
→ `.env` Datei erstellen und API Key eintragen

### "CORS error"
→ Frontend läuft auf anderem Port? Backend hat CORS aktiviert (sollte funktionieren)

### "Invalid JSON response"
→ AI gibt manchmal Markdown zurück. Server versucht zu parsen - sollte funktionieren

## Production Deployment

### Docker (optional)

```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
EXPOSE 8787
CMD ["node", "server.js"]
```

### Railway / Render / Heroku

1. Setze Umgebungsvariablen auf plattform
2. Deploy `backend/` folder
3. Set `PORT=8787` (oder was deine Plattform vorsieht)

## Support

Für Fragen: https://github.com/...
