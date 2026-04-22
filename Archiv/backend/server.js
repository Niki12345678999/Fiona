import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, 'users.json');
const SESSIONS_FILE = path.join(__dirname, 'sessions.json');

const app = express();
const PORT = process.env.PORT || 8787;
const HOST = process.env.HOST || '0.0.0.0';
const ACCESS_CODE = process.env.ACCESS_CODE || 'dev123';
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o';
const EODHD_API_TOKEN = process.env.EODHD_API_TOKEN || 'demo';
const ALPHAVANTAGE_API_KEY = process.env.ALPHAVANTAGE_API_KEY || '';
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 24 * 7); // 7 days
const CORS_ORIGINS = String(process.env.CORS_ORIGINS || '').trim();
const ALLOWED_ORIGINS = CORS_ORIGINS.split(',').map((x) => x.trim()).filter(Boolean);
let sessions = loadSessions();
const fundamentalsCache = new Map();

// ═══════════════════════════════════════════════════════════════════
// USER DATABASE HELPERS
// ═══════════════════════════════════════════════════════════════════

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch {
    return {};
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function loadSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : {};
    }
    return {};
  } catch {
    return {};
  }
}

function saveSessions() {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongEnoughPassword(password) {
  const value = String(password || '');
  return value.length >= 8;
}

function getSessionEmail(req) {
  const token = req.headers['x-session-token'] || req.body?.token;
  if (!token || !sessions[token]) return null;

  const session = sessions[token];
  if (Date.now() - Number(session.createdAt || 0) > SESSION_TTL_MS) {
    delete sessions[token];
    saveSessions();
    return null;
  }

  return session.email;
}

function cleanupExpiredSessions() {
  const now = Date.now();
  let changed = false;
  Object.keys(sessions).forEach((token) => {
    const createdAt = Number(sessions[token]?.createdAt || 0);
    if (!createdAt || now - createdAt > SESSION_TTL_MS) {
      delete sessions[token];
      changed = true;
    }
  });
  if (changed) saveSessions();
}

function maskEmailForLog(email) {
  const normalized = normalizeEmail(email);
  const [name, domain] = normalized.split('@');
  if (!name || !domain) return 'unknown';
  const visible = name.slice(0, 2);
  return `${visible}***@${domain}`;
}

function logSecurityEvent(event, req, details = {}) {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  console.log(`[SECURITY] ${event}`, {
    ip,
    ua,
    ...details,
    at: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (!ALLOWED_ORIGINS.length) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  try {
    const hostname = new URL(origin).hostname;
    if (hostname.endsWith('.vercel.app')) return true;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  } catch {
    return false;
  }

  return false;
}

const corsMiddleware = cors({
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
});

app.use(corsMiddleware);
app.use(express.json());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
    },
  },
}));

const authRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

const authLoginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

app.use('/api/auth/register', authRegisterLimiter);
app.use('/api/auth/login', authLoginLimiter);

cleanupExpiredSessions();
setInterval(cleanupExpiredSessions, 60 * 1000).unref();

// Skip auth for public routes
const publicRoutes = ['/health', '/api/auth/register', '/api/auth/login'];

app.use((req, res, next) => {
  if (publicRoutes.includes(req.path)) return next();
  
  const code = req.headers['x-access-code'];
  if (code !== ACCESS_CODE) {
    return res.status(401).json({ error: 'Unauthorized: Invalid access code' });
  }
  next();
});

// ═══════════════════════════════════════════════════════════════════
// AI CLIENT SETUP
// ═══════════════════════════════════════════════════════════════════

let aiClient;
let aiClientProvider;
let aiClientInitError = null;

async function getAiClient() {
  if (aiClient && aiClientProvider === AI_PROVIDER) return aiClient;
  if (aiClientInitError && aiClientProvider === AI_PROVIDER) {
    throw new Error(aiClientInitError);
  }

  try {
    if (AI_PROVIDER === 'anthropic') {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY fehlt');
      }

      let Anthropic;
      try {
        Anthropic = (await import('@anthropic-ai/sdk')).default;
      } catch {
        throw new Error('Paket @anthropic-ai/sdk fehlt');
      }

      aiClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    } else {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY fehlt');
      }

      aiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    aiClientProvider = AI_PROVIDER;
    aiClientInitError = null;
    return aiClient;
  } catch (error) {
    aiClient = null;
    aiClientProvider = AI_PROVIDER;
    aiClientInitError = String(error?.message || error || 'AI client initialization failed');
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// PROMPT BUILDERS (for each analysis module)
// ═══════════════════════════════════════════════════════════════════

const MODULE_PROMPTS = {
  fundamental: (ticker, portfolio) => `
You are a professional equity research analyst. Analyze the company for ticker symbol: ${ticker}

Portfolio context: ${portfolio}

Provide a COMPREHENSIVE fundamental analysis in German. Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "stand": "Q3 2025",
  "dataNote": "Latest available data as of 2025",
  "verdict": "POSITIV" | "NEUTRAL" | "VORSICHTIG",
  "kpis": {
    "revenue": "€250 Mrd",
    "grossMargin": "45.2%",
    "pe": "28.5x",
    "pb": "12.3x"
  },
  "scores": {
    "Qualität": 8,
    "Wachstum": 7,
    "Bewertung": 6,
    "Risiko": 7
  },
  "tabs": {
    "Business": {
      "points": ["Point 1", "Point 2"],
      "segments": ["Segment 1", "Segment 2"]
    },
    "Finanzen": {
      "points": ["Point 1", "Point 2"]
    }
  },
  "summary": ["Summary 1", "Summary 2", "Summary 3"]
}
`.trim(),

  technical: (ticker, portfolio) => `
You are a professional technical analyst. Analyze the price action and technicals for: ${ticker}

Portfolio context: ${portfolio}

Provide a TECHNICAL ANALYSIS in German using neutral, non-advisory wording. Return ONLY valid JSON with:
{
  "stand": "Today",
  "dataNote": "Latest price data",
  "verdict": "AUFWAERTS" | "NEUTRAL" | "ABWAEGEND",
  "kpis": {
    "trendDaily": "Aufwärtstrend",
    "rsi": "55",
    "macd": "Positiv",
    "ma50": "€125.50"
  },
  "tabs": {
    "Trend": { "points": ["Trend point 1", "Trend point 2"] },
    "Levels": { "support": ["€120", "€115"], "resistance": ["€135", "€145"] }
  },
  "summary": ["Summary 1", "Summary 2", "Summary 3"]
}
`.trim(),

  risk: (ticker, portfolio) => `
You are a professional risk analyst. Analyze the risks for: ${ticker}

Portfolio context: ${portfolio}

Return ONLY valid JSON with risk analysis in neutral wording:
{
  "stand": "2025",
  "dataNote": "Current risk metrics",
  "verdict": "NIEDRIG" | "MITTEL" | "HOCH",
  "kpis": {
    "volatility1y": "22.5%",
    "beta": "1.2",
    "maxDrawdown": "-35%"
  },
  "tabs": {
    "Volatilität": { "points": ["Risk 1", "Risk 2"] },
    "Drawdown": { "points": ["Drawdown analysis"] }
  },
  "summary": ["Risk summary 1", "Risk summary 2", "Risk summary 3"]
}
`.trim(),

  earnings: (ticker, portfolio) => `
You are an earnings analyst. Analyze earnings for: ${ticker}

Use neutral, descriptive language (no investment advice). Return ONLY valid JSON:
{
  "stand": "Q3 2025",
  "dataNote": "Latest earnings",
  "verdict": "AUFWAERTS" | "NEUTRAL" | "ABWAEGEND",
  "kpis": {
    "epsQ3": "€4.50",
    "nextEps": "€5.20",
    "expectedMove": "+8%"
  },
  "tabs": {
    "Historie": { "points": ["Earnings history 1", "Earnings history 2"] },
    "Schätzungen": { "points": ["Estimate 1"] }
  },
  "summary": ["Earnings summary 1", "Earnings summary 2", "Earnings summary 3"]
}
`.trim(),

  dividend: (ticker, portfolio) => `
You are a dividend analyst. Analyze dividends for: ${ticker}

Use neutral, descriptive language (no investment advice). Return ONLY valid JSON:
{
  "stand": "2025",
  "dataNote": "Dividend data",
  "verdict": "STABIL" | "NEUTRAL" | "VORSICHTIG",
  "kpis": {
    "yield": "3.5%",
    "growth": "+5.2%",
    "payoutRatio": "65%"
  },
  "tabs": {
    "Rendite": { "points": ["Dividend yield analysis"] },
    "Wachstum": { "points": ["Growth analysis"] }
  },
  "summary": ["Dividend summary 1", "Dividend summary 2", "Dividend summary 3"]
}
`.trim(),

  macro: (ticker, portfolio) => `
You are a macroeconomic analyst. Provide macro outlook context for: ${ticker}

Use neutral, descriptive language (no investment advice). Return ONLY valid JSON:
{
  "stand": "März 2025",
  "dataNote": "Current macro environment",
  "verdict": "AUFWAERTS" | "NEUTRAL" | "ABWAEGEND",
  "kpis": {
    "gdpGrowth": "2.1%",
    "inflation": "3.2%",
    "fedRate": "4.25%"
  },
  "tabs": {
    "Makrodaten": { "points": ["Macro point 1", "Macro point 2"] },
    "Geldpolitik": { "points": ["Policy analysis"] }
  },
  "summary": ["Macro summary 1", "Macro summary 2", "Macro summary 3"]
}
`.trim(),

  sector: (ticker, portfolio) => `
You are a sector analyst. Analyze sector dynamics for: ${ticker}

Use neutral, descriptive language (no investment advice). Return ONLY valid JSON:
{
  "stand": "2025",
  "dataNote": "Sector data",
  "verdict": "ATTRAKTIV" | "NEUTRAL" | "UNATTRAKTIV",
  "kpis": {
    "sectorPe": "18.5x",
    "sectorGrowth": "12%",
    "relativePerf": "+8%"
  },
  "tabs": {
    "Performance": { "points": ["Sector performance"] }
  },
  "summary": ["Sector summary 1", "Sector summary 2", "Sector summary 3"]
}
`.trim(),

  quant: (ticker, portfolio) => `
You are a quantitative analyst. Provide quant analysis for: ${ticker}

Use neutral, descriptive language (no investment advice). Return ONLY valid JSON:
{
  "stand": "2025",
  "dataNote": "Quantitative metrics",
  "verdict": "STARK" | "NEUTRAL" | "SCHWACH",
  "kpis": {
    "zScore": "1.5",
    "percentile": "75%",
    "factorScore": "8.2"
  },
  "scores": {
    "Value": 7,
    "Quality": 8,
    "Momentum": 6,
    "Growth": 7,
    "Sentiment": 6
  },
  "summary": ["Quant summary 1", "Quant summary 2", "Quant summary 3"]
}
`.trim(),

  etf: (ticker, portfolio) => `
You are an ETF strategist. Analyze ETF portfolio allocation for: ${ticker}

Use neutral, descriptive language (no investment advice). Return ONLY valid JSON:
{
  "stand": "2025",
  "dataNote": "ETF portfolio context",
  "verdict": "KONSERVATIV" | "AUSGEWOGEN" | "WACHSTUM",
  "kpis": {
    "expectedReturn": "7.5%",
    "expectedRisk": "8.2%",
    "sharpe": "0.91"
  },
  "tabs": {
    "Allocation": { "points": ["Allocation strategy"] }
  },
  "summary": ["ETF summary 1", "ETF summary 2", "ETF summary 3"]
}
`.trim(),

  options: (ticker, portfolio) => `
You are an options strategist. Provide options strategies for: ${ticker}

Use neutral, descriptive language (no investment advice). Return ONLY valid JSON:
{
  "stand": "2025",
  "dataNote": "Options data",
  "verdict": "AUFWAERTS" | "NEUTRAL" | "ABWAEGEND",
  "kpis": {
    "ivRank": "65%",
    "expectedMove": "+3.5%",
    "bestStrategy": "Covered Call"
  },
  "tabs": {
    "Strategien": { "points": ["Strategy 1", "Strategy 2"] }
  },
  "summary": ["Options summary 1", "Options summary 2", "Options summary 3"]
}
`.trim(),
};

// ═══════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  const aiReady = AI_PROVIDER === 'anthropic'
    ? Boolean(process.env.ANTHROPIC_API_KEY)
    : Boolean(process.env.OPENAI_API_KEY);
  res.json({ status: 'ok', ai: AI_PROVIDER, model: AI_MODEL, aiReady });
});

// ═══════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

app.post('/api/auth/register', (req, res) => {
  try {
    const { password, name } = req.body;
    const email = normalizeEmail(req.body?.email);

    if (!email || !password || !name) {
      logSecurityEvent('register_missing_fields', req);
      return res.status(400).json({ error: 'Missing email, password, or name' });
    }

    if (!isValidEmail(email)) {
      logSecurityEvent('register_invalid_email', req, { email: maskEmailForLog(email) });
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!isStrongEnoughPassword(password)) {
      logSecurityEvent('register_weak_password', req, { email: maskEmailForLog(email) });
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const users = loadUsers();
    if (users[email]) {
      logSecurityEvent('register_duplicate', req, { email: maskEmailForLog(email) });
      return res.status(409).json({ error: 'User already exists' });
    }

    const token = generateSessionToken();
    users[email] = {
      name,
      email,
      password: hashPassword(password),
      createdAt: new Date().toISOString(),
      portfolio: [],
      holdings: {},
      settings: {},
    };
    saveUsers(users);
    sessions[token] = { email, createdAt: Date.now() };
    saveSessions();
    logSecurityEvent('register_success', req, { email: maskEmailForLog(email) });

    res.json({
      success: true,
      message: 'Registration successful',
      token,
      user: { name, email },
    });
  } catch (error) {
    console.error('Register error:', error);
    logSecurityEvent('register_error', req, { message: String(error?.message || error) });
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body?.email);

    if (!email || !password) {
      logSecurityEvent('login_missing_fields', req);
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const users = loadUsers();
    const user = users[email];

    if (!user || user.password !== hashPassword(password)) {
      logSecurityEvent('login_invalid_credentials', req, { email: maskEmailForLog(email) });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateSessionToken();
    sessions[token] = { email, createdAt: Date.now() };
    saveSessions();
    logSecurityEvent('login_success', req, { email: maskEmailForLog(email) });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    logSecurityEvent('login_error', req, { message: String(error?.message || error) });
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers['x-session-token'] || req.body.token;
  if (token) {
    delete sessions[token];
    saveSessions();
    logSecurityEvent('logout', req);
  }
  res.json({ success: true, message: 'Logged out' });
});

app.get('/api/auth/user', (req, res) => {
  const email = getSessionEmail(req);
  if (!email) {
    return res.status(401).json({ error: 'No active session' });
  }

  const users = loadUsers();
  const user = users[email];

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    success: true,
    user: { name: user.name, email: user.email },
    data: {
      portfolio: user.portfolio,
      holdings: user.holdings,
      settings: user.settings,
    },
  });
});

// User data endpoints
app.post('/api/user/portfolio', (req, res) => {
  const email = getSessionEmail(req);
  if (!email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { portfolio } = req.body;
  const users = loadUsers();

  users[email].portfolio = portfolio;
  saveUsers(users);

  res.json({ success: true, message: 'Portfolio saved' });
});

app.post('/api/user/holdings', (req, res) => {
  const email = getSessionEmail(req);
  if (!email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { holdings } = req.body;
  const users = loadUsers();

  users[email].holdings = holdings;
  saveUsers(users);

  res.json({ success: true, message: 'Holdings saved' });
});

app.post('/api/user/settings', (req, res) => {
  const email = getSessionEmail(req);
  if (!email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { settings } = req.body;
  const users = loadUsers();

  users[email].settings = settings;
  saveUsers(users);

  res.json({ success: true, message: 'Settings saved' });
});

app.delete('/api/auth/data', (req, res) => {
  const email = getSessionEmail(req);
  if (!email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const users = loadUsers();
  const user = users[email];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.portfolio = [];
  user.holdings = {};
  user.settings = {};
  saveUsers(users);

  res.json({ success: true, message: 'Stored user data deleted' });
});

app.delete('/api/auth/account', (req, res) => {
  const email = getSessionEmail(req);
  if (!email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  const users = loadUsers();
  const user = users[email];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.password !== hashPassword(password)) {
    return res.status(403).json({ error: 'Invalid password' });
  }

  delete users[email];
  saveUsers(users);

  Object.keys(sessions).forEach((token) => {
    if (sessions[token]?.email === email) delete sessions[token];
  });
  saveSessions();

  res.json({ success: true, message: 'Account deleted' });
});

app.get('/api/privacy/summary', (req, res) => {
  res.json({
    success: true,
    account: {
      serverStored: ['name', 'email', 'password_hash', 'createdAt'],
      localStored: ['auth_token', 'ft-settings', 'ft-assets-v2'],
    },
    finance: {
      serverStored: ['portfolio', 'holdings', 'settings'],
      localStored: ['ft-assets-v2', 'ft-settings'],
    },
    notes: [
      'This API does not execute bank transactions.',
      'Financial calculations are informational only.',
      'User-entered data is not independently verified by the server.'
    ]
  });
});

app.post('/api/fundamentals', async (req, res) => {
  const readNumber = (value) => {
    if (value == null) return null;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[%,$\s]/g, '').replace(/,/g, '');
      const number = Number(cleaned);
      return Number.isFinite(number) ? number : null;
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const hasAnyLiveKpi = (row) => {
    if (!row) return false;
    return [row.revenue, row.margin, row.pe, row.pb, row.totalAssets, row.expenseRatio, row.ytdReturn, row.yield]
      .some((value) => readNumber(value) !== null);
  };

  const buildTickerCandidates = (rawSymbol, isin) => {
    const clean = String(rawSymbol || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!clean) return [];

    const primary = clean.replace(':', '.');
    const baseFromDot = primary.split('.')[0];
    const baseFromDash = primary.split('-')[0];
    const base = (baseFromDot || baseFromDash || primary).replace(/[^A-Z0-9]/g, '');
    const isinPrefix = String(isin || '').toUpperCase().slice(0, 2);

    const byCountrySuffix = {
      DE: ['.DE', '.F', '.DU', '.HM', '.BE'],
      US: ['', '.US'],
      GB: ['.L'],
      FR: ['.PA'],
      NL: ['.AS'],
      IT: ['.MI'],
      ES: ['.MC'],
      CH: ['.SW'],
      AT: ['.VI'],
      SE: ['.ST'],
      NO: ['.OL'],
      FI: ['.HE'],
      DK: ['.CO'],
      BE: ['.BR'],
      PT: ['.LS'],
      CA: ['.TO', '.V'],
      JP: ['.T'],
      HK: ['.HK'],
      AU: ['.AX'],
      IN: ['.NS', '.BO'],
    };
    const commonSuffixes = ['.DE', '.F', '.L', '.PA', '.AS', '.MI', '.SW', '.TO'];

    const set = new Set();
    const add = (value) => {
      const v = String(value || '').trim().toUpperCase();
      if (v) set.add(v);
    };

    add(primary);
    add(base);
    add(primary.replace('-', '.'));
    (byCountrySuffix[isinPrefix] || []).forEach((suffix) => add(suffix ? `${base}${suffix}` : base));
    commonSuffixes.forEach((suffix) => add(`${base}${suffix}`));

    return Array.from(set).slice(0, 8);
  };

  const fetchYahooJson = async (url) => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(4200 + (attempt * 1000)),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'application/json,text/plain,*/*',
            Referer: 'https://finance.yahoo.com/',
            Origin: 'https://finance.yahoo.com',
          },
        });
        if (response.ok) {
          return await response.json();
        }
        if (response.status === 429 && attempt < 2) {
          await wait(350 * (attempt + 1));
          continue;
        }
      } catch {
        if (attempt < 2) {
          await wait(250 * (attempt + 1));
          continue;
        }
      }
    }
    return null;
  };

  const fetchEodhdJson = async (symbolCode, token) => {
    const code = String(symbolCode || '').trim().toUpperCase();
    const apiToken = String(token || '').trim();
    if (!code) return null;
    if (!apiToken) return null;
    const url = `https://eodhistoricaldata.com/api/fundamentals/${encodeURIComponent(code)}?api_token=${encodeURIComponent(apiToken)}`;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5500),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  };

  const toEodSymbolCandidates = (ticker) => {
    const clean = String(ticker || '').trim().toUpperCase();
    if (!clean) return [];

    const base = clean.split('.')[0].split('-')[0].replace(/[^A-Z0-9]/g, '');
    const suffix = clean.includes('.') ? clean.split('.').slice(1).join('.') : '';
    const set = new Set();

    if (clean.includes('.')) set.add(clean);
    if (base && !suffix) set.add(`${base}.US`);
    if (base && suffix) set.add(`${base}.${suffix}`);
    if (base) set.add(base);

    return Array.from(set).filter(Boolean).slice(0, 3);
  };

  const fetchAlphaOverview = async (symbolCode, apiKey) => {
    const code = String(symbolCode || '').trim().toUpperCase();
    const key = String(apiKey || '').trim();
    if (!code || !key) return null;
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(code)}&apikey=${encodeURIComponent(key)}`;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5500),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data || data.Note || data.Information || data['Error Message']) return null;
      return data;
    } catch {
      return null;
    }
  };

  const toAlphaSymbolCandidates = (ticker) => {
    const clean = String(ticker || '').trim().toUpperCase();
    if (!clean) return [];
    const base = clean.split('.')[0].split('-')[0].replace(/[^A-Z0-9]/g, '');
    const set = new Set([clean, base, `${base}.US`, `${base}.DE`, `${base}.L`, `${base}.PA`]);
    return Array.from(set).filter(Boolean).slice(0, 6);
  };

  const firstNonNull = async (factories) => {
    const tasks = Array.isArray(factories) ? factories : [];
    if (!tasks.length) return null;
    return new Promise((resolve) => {
      let pending = tasks.length;
      let settled = false;

      tasks.forEach(async (factory) => {
        try {
          const value = await factory();
          if (!settled && value) {
            settled = true;
            resolve(value);
            return;
          }
        } catch { }
        pending -= 1;
        if (!settled && pending === 0) {
          resolve(null);
        }
      });
    });
  };

  try {
    const { symbol, isin, alphaVantageApiKey, eodhdApiToken } = req.body || {};
    const alphaKey = String(alphaVantageApiKey || ALPHAVANTAGE_API_KEY || '').trim();
    const eodhdToken = String(eodhdApiToken || EODHD_API_TOKEN || '').trim();
    if (!symbol) {
      return res.status(400).json({ error: 'Missing symbol' });
    }

    const tickers = buildTickerCandidates(symbol, isin).slice(0, 6);
    const cacheKeys = Array.from(new Set([
      String(symbol || '').trim().toUpperCase(),
      ...tickers,
    ])).filter(Boolean);
    if (!tickers.length) {
      return res.status(400).json({ error: 'No ticker candidates generated' });
    }

    let resolved = await firstNonNull(
      tickers.map((ticker) => async () => {
        const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=financialData,defaultKeyStatistics,summaryDetail,fundProfile,fundPerformance`;
        const summary = await fetchYahooJson(url);
        const q = summary?.quoteSummary?.result?.[0];
        if (!q) return null;
        const fin = q.financialData || {};
        const key = q.defaultKeyStatistics || {};
        const detail = q.summaryDetail || {};
        const fundProfile = q.fundProfile || {};
        const fundPerformance = q.fundPerformance || {};
        const candidate = {
          ticker,
          revenue: readNumber(fin.totalRevenue?.raw),
          margin: readNumber(fin.profitMargins?.raw ?? detail.profitMargins?.raw ?? key.profitMargins?.raw),
          pe: readNumber(detail.trailingPE?.raw ?? key.trailingPE?.raw),
          pb: readNumber(key.priceToBook?.raw ?? fin.priceToBook?.raw),
          totalAssets: readNumber(detail.totalAssets?.raw ?? key.totalAssets?.raw),
          expenseRatio: readNumber(fundProfile.annualReportExpenseRatio?.raw ?? key.annualReportExpenseRatio?.raw),
          ytdReturn: readNumber(fundPerformance.ytdReturn?.raw ?? key.ytdReturn?.raw),
          yield: readNumber(detail.yield?.raw ?? detail.dividendYield?.raw),
          recommendation: String(fin.recommendationKey || '').toLowerCase(),
          currency: String(fin.financialCurrency || detail.currency || 'USD').toUpperCase(),
          provider: 'yahoo',
        };
        return hasAnyLiveKpi(candidate) ? candidate : null;
      })
    );

    if (!resolved) {
      resolved = await firstNonNull(
        tickers.map((ticker) => async () => {
          const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`;
          const quoteData = await fetchYahooJson(url);
          const quote = quoteData?.quoteResponse?.result?.[0];
          if (!quote) return null;
          const candidate = {
            ticker,
            revenue: null,
            margin: readNumber(quote.profitMargins),
            pe: readNumber(quote.trailingPE),
            pb: readNumber(quote.priceToBook),
            totalAssets: readNumber(quote.totalAssets),
            expenseRatio: readNumber(quote.annualReportExpenseRatio),
            ytdReturn: readNumber(quote.ytdReturn),
            yield: readNumber(quote.trailingAnnualDividendYield),
            recommendation: String(quote.recommendationKey || '').toLowerCase(),
            currency: String(quote.financialCurrency || quote.currency || 'USD').toUpperCase(),
            provider: 'yahoo',
          };
          return hasAnyLiveKpi(candidate) ? candidate : null;
        })
      );
    }

    if (!resolved) {
      resolved = await firstNonNull(
        tickers.map((ticker) => async () => {
          const eodSymbols = toEodSymbolCandidates(ticker);
          for (const eodSymbol of eodSymbols) {
            const payload = await fetchEodhdJson(eodSymbol, eodhdToken);
            const g = payload?.General || {};
            const h = payload?.Highlights || {};
            const v = payload?.Valuation || {};
            const etf = payload?.ETF_Data || {};
            const candidate = {
              ticker: eodSymbol,
              revenue: readNumber(h.RevenueTTM),
              margin: readNumber(h.ProfitMargin),
              pe: readNumber(h.PERatio ?? v.TrailingPE),
              pb: readNumber(h.PriceBookMRQ ?? v.PriceBookMRQ),
              totalAssets: readNumber(etf.TotalAssets ?? etf.TotalAssetsInMillions ?? etf.TotalAssetsInBillions),
              expenseRatio: readNumber(etf.NetExpenseRatio ?? etf.ExpenseRatio),
              ytdReturn: readNumber(etf.YTD_Return ?? etf.YtdReturn),
              yield: readNumber(h.DividendYield),
              recommendation: null,
              currency: String(g.CurrencyCode || 'USD').toUpperCase(),
              provider: 'eodhd',
            };
            if (hasAnyLiveKpi(candidate)) return candidate;
          }
          return null;
        })
      );
    }

    if (!resolved && alphaKey) {
      resolved = await firstNonNull(
        tickers.map((ticker) => async () => {
          const alphaSymbols = toAlphaSymbolCandidates(ticker);
          for (const alphaSymbol of alphaSymbols) {
            const payload = await fetchAlphaOverview(alphaSymbol, alphaKey);
            if (!payload) continue;
            const candidate = {
              ticker: String(payload.Symbol || alphaSymbol).toUpperCase(),
              revenue: readNumber(payload.RevenueTTM),
              margin: readNumber(payload.ProfitMargin),
              pe: readNumber(payload.PERatio),
              pb: readNumber(payload.PriceToBookRatio),
              totalAssets: null,
              expenseRatio: null,
              ytdReturn: null,
              yield: readNumber(payload.DividendYield),
              recommendation: null,
              currency: String(payload.Currency || 'USD').toUpperCase(),
              provider: 'alphavantage',
            };
            if (hasAnyLiveKpi(candidate)) return candidate;
          }
          return null;
        })
      );
    }

    if (!resolved) {
      const cachedEntry = cacheKeys
        .map((key) => fundamentalsCache.get(key))
        .find((entry) => entry && entry.data);

      if (cachedEntry?.data) {
        return res.json({
          success: true,
          tickers,
          data: {
            ...cachedEntry.data,
            _cache: true,
            fetchedAt: cachedEntry.fetchedAt,
          },
        });
      }

      return res.status(404).json({
        success: false,
        error: 'No live fundamentals available',
        hint: 'Upstream-Datenanbieter limitiert oder für diesen Ticker nicht verfügbar. Für breitere Abdeckung ALPHAVANTAGE_API_KEY und/oder EODHD_API_TOKEN setzen.',
        tickers,
      });
    }

    const fetchedAt = Date.now();
    cacheKeys.forEach((key) => {
      fundamentalsCache.set(key, { data: resolved, fetchedAt });
    });

    res.json({ success: true, tickers, data: { ...resolved, _cache: false, fetchedAt } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Fundamentals fetch failed' });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    let client;
    try {
      client = await getAiClient();
    } catch (configError) {
      return res.status(503).json({
        error: `AI-Konfiguration fehlt oder ungültig: ${String(configError?.message || configError)}`,
      });
    }

    const { query, module, portfolio = [] } = req.body;

    if (!query || !module) {
      return res.status(400).json({ error: 'Missing query or module' });
    }

    if (!MODULE_PROMPTS[module]) {
      return res.status(400).json({ error: `Unknown module: ${module}` });
    }

    // Build Portfolio Summary
    const portfolioSummary = portfolio.length > 0
      ? portfolio.map(a => `${a.name} (${a.symbol || a.type}): ${a.amount} units @ €${a.currentPrice}`).join('\n')
      : 'Empty portfolio';

    const prompt = MODULE_PROMPTS[module](query, portfolioSummary);

    let analysis;

    if (AI_PROVIDER === 'anthropic') {
      // Anthropic Claude
      const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20250219',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      analysis = response.content[0]?.text || '';
    } else {
      // OpenAI
      const response = await client.chat.completions.create({
        model: AI_MODEL,
        temperature: 0.7,
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: 'You are a professional financial analysis assistant. Always respond with valid JSON only. Never provide financial advice, buy/sell recommendations, or concrete action instructions. Use neutral descriptive language such as "koennte darauf hindeuten", "zeigt moegliche Entwicklung", and "dient nur zur Orientierung". Include uncertainty where appropriate.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      analysis = response.choices[0]?.message?.content || '';
    }

    // Try to parse as JSON
    let parsed;
    try {
      // Clean markdown code blocks if present
      const cleaned = analysis
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/g, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      // If parsing fails, wrap raw response
      parsed = {
        stand: new Date().getFullYear().toString(),
        dataNote: 'Raw AI response',
        verdict: 'ANALYSE',
        analysis: analysis,
        summary: [analysis.substring(0, 200)],
      };
    }

    res.json({
      success: true,
      query,
      module,
      analysis: parsed,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: error.message || 'Analysis failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// SERVER STARTUP
// ═══════════════════════════════════════════════════════════════════

app.listen(PORT, HOST, () => {
  const aiReady = AI_PROVIDER === 'anthropic'
    ? Boolean(process.env.ANTHROPIC_API_KEY)
    : Boolean(process.env.OPENAI_API_KEY);

  console.log(`\n🚀 Finance Tracker Backend running on http://localhost:${PORT}`);
  console.log(`🌐 Also reachable on http://127.0.0.1:${PORT}`);
  console.log(`📊 AI Provider: ${AI_PROVIDER}`);
  console.log(`🤖 AI Model: ${AI_MODEL}`);
  console.log(`🔐 AI Key configured: ${aiReady ? 'yes' : 'no'}`);
  if (!aiReady) {
    console.warn('⚠️  AI key fehlt: /api/analyze liefert 503 bis OPENAI_API_KEY bzw. ANTHROPIC_API_KEY gesetzt ist.');
  }
  console.log(`\n✅ POST http://localhost:${PORT}/api/analyze`);
  console.log(`   Headers: { "x-access-code": "${ACCESS_CODE}" }\n`);
});
