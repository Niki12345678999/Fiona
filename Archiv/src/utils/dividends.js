// Lightweight dividends helpers for the main app (JS version)

export function parseISO(d) { return new Date(d + 'T00:00:00'); }
export function toMonthKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
export function isFutureOrToday(date, today = new Date()) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return d.getTime() >= t.getTime();
}
export function inEUR(amount, currency, fx) { const rate = fx[currency] ?? 1; return amount * rate; }

function readNum(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const raw = value
    .trim()
    .replace(/%/g, '')
    .replace(/\s/g, '')
    .replace(/'/g, '');
  if (!raw) return null;

  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  let cleaned = raw;
  if (hasComma && hasDot) {
    // If both exist, use the last occurring symbol as decimal separator.
    cleaned = raw.lastIndexOf(',') > raw.lastIndexOf('.')
      ? raw.replace(/\./g, '').replace(/,/g, '.')
      : raw.replace(/,/g, '');
  } else if (hasComma) {
    cleaned = raw.replace(/,/g, '.');
  }

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function readLocalAssets() {
  try {
    const raw = window.localStorage.getItem('ft-assets-v2');
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

const YIELD_MAP = {
  AAPL: 0.5, MSFT: 0.7, JNJ: 3.0, XOM: 3.2, CVX: 3.9, OXY: 1.4, KO: 3.0, PEP: 2.8,
  PG: 2.4, MCD: 2.3, PFE: 5.8, V: 0.8, MA: 0.6, ALV: 5.0, BAS: 6.0, DTE: 3.6, SAP: 1.6,
  O: 5.5,
  NVO: 1.2, NOVO: 1.2, 'NOVO-B': 1.2, NOVOB: 1.2
};
const FREQ_MAP = { O: 'monthly', BAS: 'annual', ALV: 'annual', DTE: 'annual', SAP: 'annual' };
function normalizeTicker(raw) {
  const base = String(raw || '').toUpperCase().trim();
  if (!base) return '';
  const withoutSuffix = base.split(':')[0].split('.')[0].trim();
  const normalized = withoutSuffix.replace(/\s+/g, '-').replace(/_/g, '-');
  const aliases = {
    NOVOB: 'NOVO-B',
    'NOVO B': 'NOVO-B',
    'NOVO-B': 'NOVO-B',
  };
  return aliases[normalized] || normalized;
}
function inferCountryExchange(ticker) {
  if (['BAS','ALV','DTE','SAP','SIE'].includes(ticker)) return { country: 'Deutschland', exchange: 'XETRA' };
  if (['NVO', 'NOVO', 'NOVO-B', 'NOVOB'].includes(ticker)) return { country: 'Dänemark', exchange: 'CPH' };
  return { country: 'USA', exchange: 'NASDAQ' };
}

function nextQuarterMonths(now) {
  const qm = [2,5,8,11];
  const months = [];
  const startIdx = qm.findIndex(m => m >= now.getMonth());
  if (startIdx >= 0) for (let i = startIdx; i < qm.length; i++) months.push(qm[i]);
  while (months.length < 4) months.push(qm[months.length % qm.length]);
  return months.slice(0,4).map((m,i)=>({ year: now.getFullYear() + (now.getMonth() > m && i===0 ? 1 : 0), month: m }));
}

function buildEventsForHolding(h, priceEUR, today = new Date(), yieldOverride) {
  const t = h.ticker.toUpperCase();
  const annualYield = Number.isFinite(yieldOverride) && yieldOverride > 0 ? yieldOverride : YIELD_MAP[t];
  if (!annualYield || !Number.isFinite(priceEUR) || priceEUR <= 0) return [];
  const freq = FREQ_MAP[t] || h.payoutFrequency || 'quarterly';
  const n = freq === 'monthly' ? 12 : freq === 'quarterly' ? 4 : freq === 'semiannual' ? 2 : 1;
  const perShareEUR = (priceEUR * (annualYield / 100)) / n;
  const events = [];
  if (freq === 'monthly') {
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i + 1, 15);
      const ex = new Date(d.getFullYear(), d.getMonth(), 1);
      events.push({ ticker: h.ticker, exDate: ex.toISOString().slice(0,10), payDate: d.toISOString().slice(0,10), amountPerShare: perShareEUR, yieldPercent: annualYield, status: i===0 ? 'ex-dividend' : 'announced' });
    }
  } else if (freq === 'annual') {
    const d = new Date(today.getFullYear(), 3, 29);
    const ex = new Date(today.getFullYear(), 3, 26);
    events.push({ ticker: h.ticker, exDate: ex.toISOString().slice(0,10), payDate: d.toISOString().slice(0,10), amountPerShare: perShareEUR, yieldPercent: annualYield, status: isFutureOrToday(d,today) ? 'announced' : 'paid' });
  } else if (freq === 'semiannual') {
    const months = [4,10];
    for (const m of months) {
      const d = new Date(today.getFullYear(), m, 15);
      const ex = new Date(today.getFullYear(), m, 10);
      events.push({ ticker: h.ticker, exDate: ex.toISOString().slice(0,10), payDate: d.toISOString().slice(0,10), amountPerShare: perShareEUR, yieldPercent: annualYield, status: isFutureOrToday(d,today) ? 'announced' : 'paid' });
    }
  } else {
    nextQuarterMonths(today).forEach(({year,month},idx)=>{
      const d = new Date(year, month, 16);
      const ex = new Date(year, month, 10);
      events.push({ ticker: h.ticker, exDate: ex.toISOString().slice(0,10), payDate: d.toISOString().slice(0,10), amountPerShare: perShareEUR, yieldPercent: annualYield, status: idx===0 ? 'ex-dividend' : 'announced' });
    });
  }
  return events;
}

export function getPortfolioDividendsData(today = new Date()) {
  const assets = readLocalAssets();
  const holdings = [];
  const events = [];
  for (const a of assets) {
    const type = String(a.type || '').toLowerCase();
    if (type !== 'stock' && type !== 'etf') continue;
    const ticker = normalizeTicker(a.symbol || a.xetrSymbol || '');
    const name = a.name || ticker || '—';
    const shares = readNum(a.amount) ?? readNum(a.shares) ?? 0;
    if (!ticker || shares <= 0) continue;

    const price = readNum(a.currentPrice) ?? readNum(a.purchasePrice) ?? readNum(a.avgPurchasePrice) ?? 0;
    const annualDividendPerShare = readNum(a.dividendRate) ?? readNum(a.annualDividend) ?? readNum(a.dividendPerShare) ?? null;
    const derivedYield = annualDividendPerShare && price > 0 ? (annualDividendPerShare / price) * 100 : null;
    const assetYield = [a.dividendYield, a.yield, a.divYield, a.yieldPercent, a.dividend_yield, derivedYield]
      .map((v) => readNum(v))
      .find((v) => Number.isFinite(v) && v > 0);

    const { country, exchange } = inferCountryExchange(ticker);
    const h = {
      ticker, name, shares,
      currency: 'EUR', country, exchange,
      sector: a.sector,
      costBasisPerShare: a.avgPurchasePrice,
      withholdingTaxRate: country === 'USA' ? 0.15 : 0.26375,
      payoutFrequency: FREQ_MAP[ticker] || 'quarterly',
    };
    holdings.push(h);
    events.push(...buildEventsForHolding(h, price, today, assetYield));
  }
  if (!holdings.length) return null;
  return { holdings, events, fxRates: { EUR: 1 } };
}

export function buildCalendar(data) {
  const map = new Map(data.holdings.map((h) => [h.ticker, h]));
  return data.events
    .filter((e) => map.has(e.ticker))
    .map((e) => {
      const h = map.get(e.ticker);
      const gross = (h.shares || 0) * e.amountPerShare;
      const grossEUR = inEUR(gross, h.currency, data.fxRates);
      const netEUR = grossEUR * (1 - (h.withholdingTaxRate || 0));
      return { ...h, amountPerShare: e.amountPerShare, grossTotal: gross, grossTotalEUR: grossEUR, netTotalEUR: netEUR, exDate: parseISO(e.exDate), payDate: parseISO(e.payDate), yieldPercent: e.yieldPercent, status: e.status };
    })
    .sort((a, b) => a.payDate - b.payDate);
}

export function monthlyAggregation(entries) {
  const m = new Map();
  for (const e of entries) {
    const k = toMonthKey(e.payDate);
    const obj = m.get(k) || { grossEUR: 0, netEUR: 0, items: [] };
    obj.grossEUR += e.grossTotalEUR; obj.netEUR += e.netTotalEUR; obj.items.push(e);
    m.set(k, obj);
  }
  return Array.from(m.entries()).map(([month,v])=>({ month, ...v })).sort((a,b)=> a.month < b.month ? -1 : 1);
}

export function yearlyAggregation(entries) {
  const y = new Map();
  for (const e of entries) {
    const k = e.payDate.getFullYear();
    const obj = y.get(k) || { grossEUR: 0, netEUR: 0 };
    obj.grossEUR += e.grossTotalEUR; obj.netEUR += e.netTotalEUR;
    y.set(k, obj);
  }
  return Array.from(y.entries()).map(([year,v])=>({ year, ...v })).sort((a,b)=> a.year-b.year);
}

export function nextPayouts(entries, count = 5, today = new Date()) { return entries.filter(e => isFutureOrToday(e.payDate, today)).slice(0, count); }
export function topContributors(entries, topN = 5) {
  const by = new Map();
  for (const e of entries) by.set(e.ticker, (by.get(e.ticker) || 0) + e.grossTotalEUR);
  return Array.from(by.entries()).sort((a,b)=>b[1]-a[1]).slice(0, topN);
}
export function distributionBy(entries, key) {
  const m = new Map();
  for (const e of entries) {
    const k = e[key] || 'Unbekannt';
    m.set(k, (m.get(k) || 0) + e.grossTotalEUR);
  }
  return Array.from(m.entries()).map(([name,value])=>({ name, value }));
}
export function filterEntries(entries, opts = {}) {
  return entries.filter((e) => {
    if (opts.year && e.payDate.getFullYear() !== opts.year) return false;
    if (opts.month && toMonthKey(e.payDate) !== opts.month) return false;
    if (opts.ticker && e.ticker !== opts.ticker) return false;
    if (opts.country && e.country !== opts.country) return false;
    if (opts.sector && e.sector !== opts.sector) return false;
    if (opts.currency && e.currency !== opts.currency) return false;
    if (opts.query) { const q = opts.query.toLowerCase(); if (!e.name.toLowerCase().includes(q) && !e.ticker.toLowerCase().includes(q)) return false; }
    return true;
  });
}

function normalizeDayStart(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }
  return null;
}

function readDividendAmountEUR(entry) {
  const amount = Number(entry?.netTotalEUR);
  if (Number.isFinite(amount)) return amount;
  const gross = Number(entry?.grossTotalEUR);
  if (Number.isFinite(gross)) return gross;
  const raw = Number(entry?.grossTotal);
  return Number.isFinite(raw) ? raw : 0;
}

function uniqueDividendEntries(entries) {
  const source = Array.isArray(entries) ? entries : [];
  const seen = new Set();
  const out = [];

  for (const entry of source) {
    const payDate = normalizeDayStart(entry?.payDate);
    if (!payDate) continue;
    const amount = readDividendAmountEUR(entry);
    const signature = [
      String(entry?.ticker || ''),
      payDate.toISOString().slice(0, 10),
      Number(amount).toFixed(8),
      Number(entry?.amountPerShare || 0).toFixed(8),
    ].join('|');
    if (seen.has(signature)) continue;
    seen.add(signature);
    out.push({ ...entry, payDate });
  }

  return out;
}

export function calculateMonthlyDividends(entries, opts = {}) {
  const year = Number(opts?.year) || new Date().getFullYear();
  const monthly = Array.from({ length: 12 }, (_, i) => ({
    year,
    monthIndex: i,
    monthKey: `${year}-${String(i + 1).padStart(2, '0')}`,
    monthLabel: new Date(year, i, 1).toLocaleDateString('de-DE', { month: 'short' }),
    totalEUR: 0,
    payoutCount: 0,
  }));

  uniqueDividendEntries(entries).forEach((entry) => {
    const payDate = entry.payDate;
    if (payDate.getFullYear() !== year) return;
    const idx = payDate.getMonth();
    const amount = readDividendAmountEUR(entry);
    monthly[idx].totalEUR += amount;
    monthly[idx].payoutCount += 1;
  });

  return monthly.map((row) => ({
    ...row,
    totalEUR: Number.isFinite(row.totalEUR) ? Math.max(0, row.totalEUR) : 0,
  }));
}

export function getNextDividend(entries, opts = {}) {
  const today = normalizeDayStart(opts?.today || new Date()) || new Date();
  const upcoming = uniqueDividendEntries(entries)
    .filter((entry) => entry.payDate.getTime() >= today.getTime())
    .sort((a, b) => a.payDate - b.payDate);

  if (!upcoming.length) return null;

  const first = upcoming[0];
  return {
    ...first,
    amountEUR: readDividendAmountEUR(first),
  };
}

export function calculateYearlyDividends(entries, opts = {}) {
  const year = Number(opts?.year) || new Date().getFullYear();
  const today = normalizeDayStart(opts?.today || new Date()) || new Date();
  const months = calculateMonthlyDividends(entries, { year });
  const totalEUR = months.reduce((sum, m) => sum + m.totalEUR, 0);
  const averageEUR = totalEUR / 12;
  const upcomingInYear = uniqueDividendEntries(entries)
    .filter((entry) => entry.payDate.getFullYear() === year)
    .filter((entry) => entry.payDate.getTime() >= today.getTime());

  return {
    year,
    months,
    totalEUR,
    averageEUR,
    upcomingCount: upcomingInYear.length,
    nextDividend: getNextDividend(upcomingInYear, { today }),
  };
}
