/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback, useMemo, createContext, useContext, useRef } from "react";
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { TrendingUp, Plus, Settings, BarChart2, Briefcase, Newspaper, Home, X, Edit2, Trash2, RefreshCw, Eye, Search, Shield, CheckCircle, AlertCircle, ArrowUpRight, ArrowDownRight, Bitcoin, Building, Gem, Brain, PieChart as PieChartIcon, Layers, Zap, Globe, Target, TrendingDown, DollarSign, LineChart, Loader, LogOut } from "lucide-react";
import DividendenKalender from './DividendenKalender';

// ═══════════════════════════════════════════════════════════════════

function normalizeSectorLabel(input) {
  const raw = String(input || '').trim();
  const key = raw.toLowerCase();
  if (!key) return 'Sonstiges';
  if (key === 'unbekannt' || key === 'unknown' || key === 'n/a' || key === '-') return 'Sonstiges';
  if (/etf|fonds|index|msci|world/.test(key)) return 'ETF/Fonds';
  if (/ai|künstliche intelligenz|artificial intelligence|halbleiter|chip|technolog/.test(key)) return 'Technologie';
  if (/krypto|blockchain/.test(key)) return 'Krypto';
  if (/verteidigung|rüstung|defense/.test(key)) return 'Verteidigung/Rüstung';
  if (/energie|rohstoff|commodit|öl|oil|gas/.test(key)) return 'Energie';
  if (/finanz|bank|versicherung/.test(key)) return 'Finanzen';
  if (/konsum|consumer|nahr|lebensmittel|staples/.test(key)) return 'Konsumgüter';
  if (/gesund|health|pharma|biotech/.test(key)) return 'Gesundheit';
  return raw;
}

function inferAssetDisplayGroup(asset) {
  const type = String(asset?.type || '').toLowerCase();
  const category = String(asset?.category || '').toLowerCase();
  const sector = String(asset?.sector || '').trim();
  const bankName = String(asset?.bankName || '').trim();
  const assetName = String(asset?.name || '').trim();
  const bankHint = `${type} ${bankName} ${assetName}`.toLowerCase();
  const isBankLike = type === 'bank' || /bank|konto|tagesgeld|cash|trade republic|raiffeisen/.test(bankHint);
  
  if (type === 'valuables') {
    if (category === 'car') return 'Auto';
    if (category === 'watch') return 'Uhr';
    if (category === 'jewelry') return 'Schmuck';
    if (category === 'art') return 'Kunst';
    return 'Wertgegenstand';
  }

  if (isBankLike) {
    if (/geld|cash|konto|tagesgeld|verrechnung/.test(assetName.toLowerCase())) {
      return 'Bankkonto';
    }
    if (bankName && assetName && bankName.toLowerCase() !== assetName.toLowerCase()) {
      return `${bankName} (${assetName})`;
    }
    return bankName || assetName || 'Bankkonto';
  }

  if (type === 'crypto') return 'Krypto';

  if (sector) return normalizeSectorLabel(sector);

  if (/etf|fonds|index/.test(category)) return 'ETF/Fonds';
  if (type === 'stock') return 'Aktien';

  return 'Sonstiges';
}

function prettifyAssetName(input) {
  const raw = String(input || '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!raw) return '—';

  const normalized = raw.replace(/\bi[\s-]*shares\b/gi, 'iShares');
  const keepLower = new Set(['und', 'and', 'of', 'the', 'von', 'für', 'im', 'in', 'am', 'an', 'zu', 'mit']);
  const casingMap = {
    ishares: 'iShares',
    nasdaq: 'NASDAQ',
    msci: 'MSCI',
    etf: 'ETF',
    ucits: 'UCITS',
    ftse: 'FTSE',
    dax: 'DAX',
    s: 'S',
    p: 'P',
    esg: 'ESG',
    sri: 'SRI',
    usa: 'USA',
    eu: 'EU',
    ai: 'AI',
  };

  const formatChunk = (chunk, chunkIndex, totalChunks) => {
    const lower = chunk.toLowerCase();
    if (casingMap[lower]) return casingMap[lower];
    if (chunk === '&') return '&';
    if (lower === 'sp') return 'S&P';
    if (/^[A-Z0-9]{2,6}$/.test(chunk)) return chunk;
    if (/^\d+$/.test(chunk)) return chunk;
    if (chunkIndex > 0 && chunkIndex < totalChunks - 1 && keepLower.has(lower)) return lower;
    return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
  };

  const formatToken = (token) => {
    const lead = token.match(/^[^\p{L}\p{N}]*/u)?.[0] || '';
    const tail = token.match(/[^\p{L}\p{N}]*$/u)?.[0] || '';
    const core = token.slice(lead.length, token.length - tail.length);
    if (!core) return token;

    if (core.includes('-')) {
      const parts = core.split('-').filter(Boolean);
      const rebuilt = parts.map((part, idx) => formatChunk(part, idx, parts.length)).join('-');
      return `${lead}${rebuilt}${tail}`;
    }

    return `${lead}${formatChunk(core, 0, 1)}${tail}`;
  };

  return normalized.split(' ').map(formatToken).join(' ').replace(/\bS\s*&\s*P\b/g, 'S&P');
}

function buildGradientPalette(length) {
  const anchors = [
    '#3b1f74',
    '#4a2a8e',
    '#5a36a7',
    '#4b4bc2',
    '#3a63cf',
    '#2f7dd1',
    '#2697c8',
    '#22adbb',
    '#29bfa6',
    '#56d39f',
  ];

  const safeLength = Math.max(0, Number(length || 0));
  if (safeLength === 0) return [];
  if (safeLength === 1) return [anchors[0]];
  if (safeLength <= anchors.length) {
    return anchors.slice(0, safeLength);
  }

  const hexToRgb = (hex) => {
    const clean = String(hex).replace('#', '');
    const n = parseInt(clean, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  const mixHex = (a, b, t) => {
    const c1 = hexToRgb(a);
    const c2 = hexToRgb(b);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const bch = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r}, ${g}, ${bch})`;
  };

  const steps = safeLength - 1;
  const span = anchors.length - 1;
  return Array.from({ length: safeLength }, (_, idx) => {
    const progress = idx / steps;
    const raw = progress * span;
    const left = Math.floor(raw);
    const right = Math.min(span, left + 1);
    const t = raw - left;
    return mixHex(anchors[left], anchors[right], t);
  });
}

const VALUABLE_CATEGORY_META = {
  car: {
    label: 'Auto',
    emoji: '🚗',
    namePlaceholder: 'Porsche 911 Carrera',
    brandPlaceholder: 'Porsche',
    modelPlaceholder: '911 Carrera',
  },
  watch: {
    label: 'Uhr',
    emoji: '⌚',
    namePlaceholder: 'Rolex Submariner',
    brandPlaceholder: 'Rolex',
    modelPlaceholder: 'Submariner Date',
  },
  jewelry: {
    label: 'Schmuck',
    emoji: '💍',
    namePlaceholder: 'Cartier Love Armband',
    brandPlaceholder: 'Cartier',
    modelPlaceholder: 'Love Bracelet',
  },
  art: {
    label: 'Kunst',
    emoji: '🖼️',
    namePlaceholder: 'Gerhard Richter Druck',
    brandPlaceholder: 'Künstler/Galerie',
    modelPlaceholder: 'Edition / Werkname',
  },
  other: {
    label: 'Sonstiges',
    emoji: '📦',
    namePlaceholder: 'Sammlerstück',
    brandPlaceholder: 'Hersteller',
    modelPlaceholder: 'Modell',
  },
};

function getValuableCategoryMeta(category) {
  return VALUABLE_CATEGORY_META[String(category || '').toLowerCase()] || VALUABLE_CATEGORY_META.other;
}

function PortfolioAIPage() {
  const { assets, isMobile } = useApp();
  const portfolioAssets = useMemo(() => assets.filter((asset) => asset.type !== 'valuables' && asset.type !== 'bank'), [assets]);
  const [chatInput, setChatInput] = useState('');
  const [trendRange, setTrendRange] = useState('1J');
  const [whatIfReductionPct, setWhatIfReductionPct] = useState(10);
  const [showExtendedAnalysis, setShowExtendedAnalysis] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hi! Ich bin dein Portfolio-Assistant. Frag mich z. B.: „Wie hoch ist mein Gewinn?“, „Wie konzentriert ist mein Portfolio?“, „Welche Position ist mein Top-Performer?“',
      ts: Date.now(),
    }
  ]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setShowExtendedAnalysis(false);
    const rafId = requestAnimationFrame(() => setShowExtendedAnalysis(true));
    return () => cancelAnimationFrame(rafId);
  }, [portfolioAssets.length]);

  const stats = useMemo(() => {
    const calcAsset = (asset) => {
      const avgPrice = asset.avgPurchasePrice || asset.purchasePrice;
      const invested = Number(asset.amount || 0) * Number(avgPrice || 0);
      const actual = Number(asset.amount || 0) * Number(asset.currentPrice || 0);
      const profit = actual - invested;
      const profitPct = invested > 0 ? (profit / invested) * 100 : 0;
      return { ...asset, invested, actual, profit, profitPct };
    };

    const positions = portfolioAssets.map(calcAsset);
    const invested = positions.reduce((sum, p) => sum + p.invested, 0);
    const actual = positions.reduce((sum, p) => sum + p.actual, 0);
    // Only show profit/roi if portfolioAssets contains meaningful types
    const hasPerformanceAssets = portfolioAssets.some(a => a.type !== 'bank' && a.type !== 'valuables');
    const profit = hasPerformanceAssets ? actual - invested : 0;
    const roi = hasPerformanceAssets && invested > 0 ? (profit / invested) * 100 : 0;

    const bySectorMap = new Map();

    positions.forEach((p) => {
      const sectorKey = inferAssetDisplayGroup(p);
      bySectorMap.set(sectorKey, (bySectorMap.get(sectorKey) || 0) + p.actual);
    });

    const bySector = Array.from(bySectorMap.entries())
      .map(([name, value]) => ({ name, value, pct: actual > 0 ? (value / actual) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    const palette = buildGradientPalette(bySector.length);

    const bySectorChart = bySector.map((row, idx) => ({
      ...row,
      color: palette[idx],
    }));

    if (!showExtendedAnalysis) {
      return {
        invested,
        actual,
        profit,
        roi,
        bySector,
        bySectorChart,
        winners: [],
        losers: [],
        topPosition: null,
        concentrationPct: 0,
        topSector: bySector[0] || null,
        topRiskSector: null,
        top3SectorPct: bySector.slice(0, 3).reduce((sum, row) => sum + row.pct, 0),
        sectorHhi: 0,
        riskAdjustedHhi: 0,
        aiTechExposurePct: bySector
          .filter((row) => /ai|künstliche intelligenz|technolog|halbleiter|chip|krypto/.test(String(row.name || '').toLowerCase()))
          .reduce((sum, row) => sum + Number(row.pct || 0), 0),
        assetRiskRows: [],
        weightedPortfolioRisk: 0,
        portfolioRiskBand: 'Niedrig',
        whatIfRows: [],
        totalWhatIfRiskDelta: 0,
        whatIfRiskAfter: 0,
        whatIfRiskBand: 'Niedrig',
        riskSuggestions: [],
        totalEstimatedRiskDelta: 0,
        simulatedRiskAfter: 0,
        simulatedRiskBand: 'Niedrig',
        concentrationLevel: 'Wird geladen…',
        diversification: 'Wird geladen…',
        hhi: 0,
      };
    }

    const sectorRiskMultiplier = (sectorName) => {
      const key = String(sectorName || '').toLowerCase();
      if (/ai|künstliche intelligenz|artificial intelligence|halbleiter|chip|technolog/.test(key)) return 1.45;
      if (/krypto|blockchain/.test(key)) return 1.6;
      if (/biotech|bio|healthtech/.test(key)) return 1.35;
      if (/verteidigung|rüstung|defense/.test(key)) return 1.2;
      if (/energie|rohstoff|commodit/.test(key)) return 1.15;
      if (/finanz|bank|versicherung/.test(key)) return 0.9;
      if (/konsum|consumer|nahr|lebensmittel|staples/.test(key)) return 0.82;
      if (/etf|fonds|index|world|msci/.test(key)) return 0.88;
      return 1.0;
    };

    const bySectorRisk = bySector.map((row) => ({
      ...row,
      riskMultiplier: sectorRiskMultiplier(row.name),
      weightedValue: row.value * sectorRiskMultiplier(row.name),
    }));

    const totalWeightedValue = bySectorRisk.reduce((sum, row) => sum + row.weightedValue, 0);
    const bySectorRiskSorted = bySectorRisk
      .map((row) => ({
        ...row,
        weightedPct: totalWeightedValue > 0 ? (row.weightedValue / totalWeightedValue) * 100 : 0,
      }))
      .sort((a, b) => b.weightedPct - a.weightedPct);

    const riskAdjustedHhi = bySectorRiskSorted.reduce((sum, row) => {
      const w = Number(row.weightedPct || 0) / 100;
      return sum + (w * w);
    }, 0);

    const winners = [...positions].sort((a, b) => b.profitPct - a.profitPct);
    const losers = [...positions].sort((a, b) => a.profitPct - b.profitPct);

    const topPosition = [...positions].sort((a, b) => b.actual - a.actual)[0] || null;
    const concentrationPct = topPosition && actual > 0 ? (topPosition.actual / actual) * 100 : 0;

    const hhi = positions.reduce((sum, p) => {
      const w = actual > 0 ? (p.actual / actual) : 0;
      return sum + (w * w);
    }, 0);

    const topSector = bySector[0] || null;
    const topRiskSector = bySectorRiskSorted[0] || null;
    const top3SectorPct = bySector.slice(0, 3).reduce((sum, row) => sum + row.pct, 0);
    const sectorHhi = bySector.reduce((sum, row) => {
      const w = actual > 0 ? (row.value / actual) : 0;
      return sum + (w * w);
    }, 0);
    const aiTechExposurePct = bySector
      .filter((row) => /ai|künstliche intelligenz|technolog|halbleiter|chip|krypto/.test(String(row.name || '').toLowerCase()))
      .reduce((sum, row) => sum + Number(row.pct || 0), 0);

    const getRiskBand = (score) => {
      if (score >= 67) return 'Hoch';
      if (score >= 40) return 'Mittel';
      return 'Niedrig';
    };

    const assetRiskRows = positions
      .map((p) => {
        const weightPct = actual > 0 ? (p.actual / actual) * 100 : 0;
        const sectorMultiplier = sectorRiskMultiplier(inferAssetDisplayGroup(p));
        const volatilityRisk =
          p.type === 'crypto' ? 85 :
          p.type === 'stock' ? 55 :
          p.type === 'valuables' ? 45 :
          22;
        const liquidityRisk =
          p.type === 'bank' ? 15 :
          p.type === 'stock' ? 38 :
          p.type === 'crypto' ? 50 :
          62;
        const currencyRisk = (() => {
          if (p.type === 'crypto') return 70;
          const isin = String(p.isin || '').toUpperCase();
          if (!isin) return 40;
          if (isin.startsWith('DE') || isin.startsWith('IE')) return 25;
          if (isin.startsWith('US')) return 55;
          return 45;
        })();
        const concentrationRisk = Math.min(100, weightPct * 2.6);
        const sectorRisk = Math.min(100, Math.max(0, (sectorMultiplier - 0.8) / 0.8) * 100);

        const totalRiskScore =
          volatilityRisk * 0.27 +
          liquidityRisk * 0.18 +
          currencyRisk * 0.15 +
          concentrationRisk * 0.25 +
          sectorRisk * 0.15;

        return {
          id: p.id,
          name: p.name,
          symbol: p.symbol || p.xetrSymbol || '',
          weightPct,
          totalRiskScore,
          riskBand: getRiskBand(totalRiskScore),
          volatilityRisk,
          liquidityRisk,
          currencyRisk,
          concentrationRisk,
          sectorRisk,
        };
      })
      .sort((a, b) => b.totalRiskScore - a.totalRiskScore);

    const weightedPortfolioRisk = assetRiskRows.reduce((sum, row) => {
      const w = Math.max(0, Number(row.weightPct || 0)) / 100;
      return sum + row.totalRiskScore * w;
    }, 0);

    const portfolioRiskBand = getRiskBand(weightedPortfolioRisk);

    const getPrimaryDriver = (row) => {
      const entries = [
        ['Volatilität', Number(row.volatilityRisk || 0)],
        ['Liquidität', Number(row.liquidityRisk || 0)],
        ['Währung (FX)', Number(row.currencyRisk || 0)],
        ['Klumpenanteil', Number(row.concentrationRisk || 0)],
        ['Sektorrisiko', Number(row.sectorRisk || 0)],
      ].sort((a, b) => b[1] - a[1]);
      return entries[0]?.[0] || 'Unbekannt';
    };

    const getTargetWeight = (row) => {
      if (row.riskBand === 'Hoch') return 10;
      if (row.riskBand === 'Mittel') return 14;
      return 18;
    };

    const defensiveBucketRisk = 26;

    const whatIfRows = assetRiskRows
      .map((row) => {
        const appliedReductionPct = Math.min(Math.max(0, whatIfReductionPct), Math.max(0, Number(row.weightPct || 0)));
        const estimatedRiskDelta = (appliedReductionPct / 100) * Math.max(0, row.totalRiskScore - defensiveBucketRisk);
        const simulatedWeightPct = Math.max(0, Number(row.weightPct || 0) - appliedReductionPct);
        return {
          ...row,
          appliedReductionPct,
          simulatedWeightPct,
          estimatedRiskDelta,
        };
      })
      .filter((row) => row.totalRiskScore >= 40 && row.appliedReductionPct > 0.05)
      .sort((a, b) => b.estimatedRiskDelta - a.estimatedRiskDelta)
      .slice(0, 3);

    const totalWhatIfRiskDelta = whatIfRows.reduce((sum, row) => sum + Number(row.estimatedRiskDelta || 0), 0);
    const whatIfRiskAfter = Math.max(0, weightedPortfolioRisk - totalWhatIfRiskDelta);
    const whatIfRiskBand = getRiskBand(whatIfRiskAfter);

    const riskSuggestions = assetRiskRows
      .map((row) => {
        const targetWeightPct = getTargetWeight(row);
        const reduceByPct = Math.max(0, row.weightPct - targetWeightPct);
        const estimatedRiskDelta = (reduceByPct / 100) * Math.max(0, row.totalRiskScore - defensiveBucketRisk);
        return {
          ...row,
          targetWeightPct,
          reduceByPct,
          estimatedRiskDelta,
          primaryDriver: getPrimaryDriver(row),
        };
      })
      .filter((row) => row.reduceByPct > 0.1 && row.totalRiskScore >= 40)
      .sort((a, b) => b.estimatedRiskDelta - a.estimatedRiskDelta)
      .slice(0, 3);

    const totalEstimatedRiskDelta = riskSuggestions.reduce((sum, row) => sum + Number(row.estimatedRiskDelta || 0), 0);
    const simulatedRiskAfter = Math.max(0, weightedPortfolioRisk - totalEstimatedRiskDelta);
    const simulatedRiskBand = getRiskBand(simulatedRiskAfter);

    const concentrationLevel = topRiskSector
      ? (riskAdjustedHhi >= 0.22 || Number(topRiskSector.weightedPct || 0) >= 42
        ? 'Hohes Klumpenrisiko (risikoadjustiert)'
        : riskAdjustedHhi >= 0.16 || Number(topRiskSector.weightedPct || 0) >= 30
          ? 'Mittleres Klumpenrisiko (risikoadjustiert)'
          : 'Niedriges Klumpenrisiko (risikoadjustiert)')
      : 'Nicht verfügbar';
    const diversification = hhi < 0.12 ? 'Sehr gut diversifiziert' : hhi < 0.2 ? 'Mittel diversifiziert' : 'Relativ konzentriert';

    return {
      invested,
      actual,
      profit,
      roi,
      bySector,
      bySectorChart,
      winners,
      losers,
      topPosition,
      concentrationPct,
      topSector,
      topRiskSector,
      top3SectorPct,
      sectorHhi,
      riskAdjustedHhi,
      aiTechExposurePct,
      assetRiskRows,
      weightedPortfolioRisk,
      portfolioRiskBand,
      whatIfRows,
      totalWhatIfRiskDelta,
      whatIfRiskAfter,
      whatIfRiskBand,
      riskSuggestions,
      totalEstimatedRiskDelta,
      simulatedRiskAfter,
      simulatedRiskBand,
      concentrationLevel,
      diversification,
      hhi,
    };
  }, [portfolioAssets, whatIfReductionPct, showExtendedAnalysis]);

  const trendRangeLabel = {
    '1T': '1 Tag',
    '7T': '7 Tage',
    '30T': '30 Tage',
    '3M': '3 Monate',
    '6M': '6 Monate',
    '1J': '1 Jahr',
    YTD: 'YTD',
    Max: 'MAX',
  }[trendRange] || trendRange;

  const trendData = useMemo(() => {
    return generateChartData(portfolioAssets, trendRange).map((row) => ({
      date: row.date,
      investiert: Number(row.invested || 0),
      real: Number(row.actual || 0),
    }));
  }, [portfolioAssets, trendRange]);

  const answerQuestion = useCallback((question) => {
    const q = String(question || '').toLowerCase();
    if (!portfolioAssets.length) {
      return 'Dein Portfolio ist noch leer. Füge zuerst Positionen hinzu, dann kann ich dir präzise Statistiken liefern.';
    }

    if (/gewinn|profit|plus|verlust|pnl|rendite|roi/.test(q)) {
      return `Aktuell: Investiert ${fmt.currency(stats.invested)}, Reales Kapital ${fmt.currency(stats.actual)}. Gewinn/Verlust: ${fmt.currency(stats.profit)} (${fmt.percent(stats.roi)}).`;
    }

    if (/invest|kapital|eingesetzt/.test(q)) {
      return `Investiertes Kapital: ${fmt.currency(stats.invested)}. Reales Kapital: ${fmt.currency(stats.actual)}. Differenz: ${fmt.currency(stats.profit)}.`;
    }

    if (/beste|top|winner|gewinner/.test(q)) {
      const best = stats.winners[0];
      if (!best) return 'Ich finde aktuell keine Positionen mit Performance-Daten.';
      return `Top-Performer ist ${best.name} mit ${fmt.percent(best.profitPct)} und ${fmt.currency(best.profit)} Gewinn.`;
    }

    if (/schlech|loser|flop|risiko.*position/.test(q)) {
      const worst = stats.losers[0];
      if (!worst) return 'Ich finde aktuell keine Positionen mit Performance-Daten.';
      return `Schwächste Position ist ${worst.name} mit ${fmt.percent(worst.profitPct)} und ${fmt.currency(worst.profit)}.`;
    }

    if (/konzent|divers|risiko|hhi|streu/.test(q)) {
      const top = stats.topPosition;
      const topText = top ? `${top.name} macht ${fmt.number(stats.concentrationPct, 2)}% deines Portfolios aus.` : 'Keine Top-Position verfügbar.';
      return `${topText} Diversifikation: ${stats.diversification} (HHI ${fmt.number(stats.hhi, 3)}). Risikoadjustiert: ${stats.concentrationLevel} (rHHI ${fmt.number(stats.riskAdjustedHhi, 3)}).`;
    }

    if (/ai|tech|technologie|halbleiter|chip|krypto.*risiko|risiko.*ai/.test(q)) {
      return `AI/Tech/Krypto-Exposure: ${fmt.number(stats.aiTechExposurePct, 2)}% vom Portfolio. Risikoadjustiertes Klumpenrisiko: ${stats.concentrationLevel}. Dominante Risiko-Sparte: ${stats.topRiskSector?.name || '—'} (${fmt.number(stats.topRiskSector?.weightedPct || 0, 1)}% risikogewichtet).`;
    }

    if (/matrix|positionsrisiko|einzelwert|asset.*risiko|risk score/.test(q)) {
      const top = stats.assetRiskRows.slice(0, 3);
      const topTxt = top.map((row) => `${row.name}: ${fmt.number(row.totalRiskScore, 1)} (${row.riskBand})`).join(' | ');
      return `Portfolio-Risikoscore: ${fmt.number(stats.weightedPortfolioRisk, 1)} (${stats.portfolioRiskBand}). Höchste Einzelrisiken: ${topTxt}.`;
    }
    if (/senk|reduzier|optimier|verbesser|maßnahme|massnahme|was tun|konkret/.test(q)) {
      if (!stats.riskSuggestions.length) {
        return `Aktuell sehe ich keine klare Übergewichtung mit hohem Einfluss. Portfolio-Risikoscore liegt bei ${fmt.number(stats.weightedPortfolioRisk, 1)} (${stats.portfolioRiskBand}).`;
      }
      const actions = stats.riskSuggestions
        .map((row) => `${row.name}: -${fmt.number(row.reduceByPct, 1)}%-Punkte (Treiber: ${row.primaryDriver})`)
        .join(' | ');
      return `Konkreter Plan: ${actions}. Simulierter Effekt auf Portfolio-Risiko: ${fmt.number(stats.weightedPortfolioRisk, 1)} → ${fmt.number(stats.simulatedRiskAfter, 1)} (${stats.simulatedRiskBand}), Verbesserung um ${fmt.number(stats.totalEstimatedRiskDelta, 1)} Punkte.`;
    }

    if (/was wäre wenn|what if|regler|10%-punkte|5%-punkte|15%-punkte|simulation/.test(q)) {
      return `Was-wäre-wenn (${whatIfReductionPct}%-Punkte je Top-Risiko-Position): ${fmt.number(stats.weightedPortfolioRisk, 1)} → ${fmt.number(stats.whatIfRiskAfter, 1)} (${stats.whatIfRiskBand}), Delta ${fmt.number(stats.totalWhatIfRiskDelta, 1)}.`;
    }

    if (/sektor|branche/.test(q)) {
      if (!stats.bySector.length) return 'Aktuell sind keine Sektor-Daten vorhanden.';
      const top = stats.bySector[0];
      return `Größter Sektor: ${top.name} mit ${fmt.number(top.pct, 2)}% (${fmt.currency(top.value)}).`;
    }

    if (/typ|sparten|sektor|aktien|krypto|bank|etf/.test(q)) {
      if (!stats.bySector.length) return 'Aktuell sind keine Sparten-Daten vorhanden.';
      const text = stats.bySector.slice(0, 4).map((row) => `${row.name}: ${fmt.number(row.pct, 1)}%`).join(' | ');
      return `Spartenaufteilung: ${text}.`;
    }

    return `Kurzüberblick: ${portfolioAssets.length} Positionen, ${fmt.currency(stats.actual)} reales Kapital, ${fmt.currency(stats.profit)} Gewinn (${fmt.percent(stats.roi)}). Frag mich gern zu Risiko, Top/Flop, Sektor oder Kapitalaufteilung.`;
  }, [portfolioAssets.length, stats, whatIfReductionPct]);

  const sendMessage = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    const userMsg = { role: 'user', text, ts: Date.now() };
    const assistantMsg = { role: 'assistant', text: answerQuestion(text), ts: Date.now() + 1 };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setChatInput('');
  }, [chatInput, answerQuestion]);

  const quickPrompts = [
    'Wie hoch ist mein aktueller Gewinn?',
    'Wie konzentriert ist mein Portfolio?',
    'Welche Position läuft am besten?',
    'Wie ist die Spartenaufteilung?',
    'Wie senke ich mein Risiko konkret?',
    'Was wäre wenn ich Top-Risiken reduziere?',
  ];

  const trendChartWidth = isMobile ? 310 : 620;
  const sectorPieSize = isMobile ? 220 : 250;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <HeaderGlyph icon={Brain} color="#8b5cf6" />
        <div>
          <h1 style={S.h1}>Portfolio AI</h1>
          <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>Chatbot + visuelle Portfolio-Statistiken</div>
        </div>
      </div>

      <div style={{ ...S.grid4, marginBottom: 16 }}>
        {[
          { label: 'Reales Kapital', value: fmt.currency(stats.actual), color: '#fff' },
          { label: 'Investiertes Kapital', value: fmt.currency(stats.invested), color: '#9ca3af' },
          { label: 'Gewinn / Verlust', value: fmt.currency(stats.profit), color: stats.profit >= 0 ? '#10b981' : '#ef4444' },
          { label: 'Rendite (ROI)', value: fmt.percent(stats.roi), color: stats.roi >= 0 ? '#10b981' : '#ef4444' },
        ].map((kpi, i) => (
          <div key={i} style={S.card}>
            <div style={{ color: '#666', fontSize: 11, marginBottom: 6 }}>{kpi.label}</div>
            <div style={{ color: kpi.color, fontWeight: 800, fontSize: isMobile ? 16 : 18 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr', gap: 16 }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={S.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Kapitalentwicklung ({trendRangeLabel})</div>
              <TimeRangeBtn
                selected={trendRange}
                onChange={setTrendRange}
                options={['1T', '7T', '30T', '3M', '6M', '1J', 'YTD', 'Max']}
                compact={isMobile}
                justify="flex-start"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', minHeight: 240 }}>
              <AreaChart width={trendChartWidth} height={240} data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Tooltip
                  formatter={(value) => fmt.currency(Number(value || 0))}
                  contentStyle={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 11 }} />
                <Area type="monotone" dataKey="investiert" stroke="#64748b" fill="#64748b22" name="Investiert" />
                <Area type="monotone" dataKey="real" stroke="#10b981" fill="#10b98122" name="Real" />
              </AreaChart>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <div style={S.card}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Spartenaufteilung</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
                <PieChart width={sectorPieSize} height={sectorPieSize}>
                  <Pie
                    data={stats.bySectorChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={isMobile ? 76 : 86}
                    innerRadius={isMobile ? 44 : 50}
                    stroke="none"
                  >
                    {stats.bySectorChart.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => fmt.currency(Number(value || 0))}
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                    itemStyle={{ color: '#e5e7eb' }}
                    labelStyle={{ color: '#93c5fd' }}
                  />
                </PieChart>
              </div>
              <div style={{
                marginTop: 6,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '4px 10px',
              }}>
                {stats.bySectorChart.slice(0, 8).map((row, idx) => (
                  <div key={`sector-legend-row-${row.name}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: row.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ color: '#9ca3af', fontSize: 11, whiteSpace: 'nowrap' }}>{row.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={S.card}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Klumpenrisiko-Analyse</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ color: '#777', fontSize: 10 }}>Größte Sparte</div>
                  <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{stats.topSector?.name || '—'}</div>
                  <div style={{ color: '#f59e0b', fontSize: 11, fontWeight: 700 }}>{fmt.number(stats.topSector?.pct || 0, 1)}%</div>
                </div>
                <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ color: '#777', fontSize: 10 }}>Top-3 Sparten</div>
                  <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{fmt.number(stats.top3SectorPct || 0, 1)}%</div>
                  <div style={{ color: '#9ca3af', fontSize: 11 }}>Anteil am Portfolio</div>
                </div>
                <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ color: '#777', fontSize: 10 }}>rHHI (Risikogew.)</div>
                  <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{fmt.number(stats.riskAdjustedHhi || 0, 3)}</div>
                  <div style={{ color: '#9ca3af', fontSize: 11 }}>mit Risikofaktoren</div>
                </div>
                <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ color: '#777', fontSize: 10 }}>AI/Tech/Krypto</div>
                  <div style={{ color: stats.aiTechExposurePct >= 40 ? '#ef4444' : stats.aiTechExposurePct >= 25 ? '#f59e0b' : '#10b981', fontSize: 12, fontWeight: 700 }}>
                    {fmt.number(stats.aiTechExposurePct || 0, 1)}%
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: 11 }}>Exposure</div>
                </div>
                <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ color: '#777', fontSize: 10 }}>HHI (ungewichtet)</div>
                  <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{fmt.number(stats.sectorHhi || 0, 3)}</div>
                  <div style={{ color: '#9ca3af', fontSize: 11 }}>nur Sparte-Anteile</div>
                </div>
                <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ color: '#777', fontSize: 10 }}>Bewertung</div>
                  <div style={{ color: stats.concentrationLevel.includes('Hoch') ? '#ef4444' : stats.concentrationLevel.includes('Mittel') ? '#f59e0b' : '#10b981', fontSize: 12, fontWeight: 700 }}>
                    {stats.concentrationLevel}
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: 11 }}>Sparten-Sicht</div>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {stats.bySectorChart.slice(0, 6).map((row, idx) => (
                  <div key={`${row.name}-${idx}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: '#d1d5db' }}>{row.name}</span>
                      <span style={{ color: '#9ca3af' }}>{fmt.number(row.pct, 1)}%</span>
                    </div>
                    <div style={{ height: 7, background: '#1f2937', borderRadius: 999 }}>
                      <div style={{ width: `${Math.max(2, row.pct)}%`, height: '100%', borderRadius: 999, background: row.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={S.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Asset-Risikomatrix</div>
              <div style={{
                color: stats.portfolioRiskBand === 'Hoch' ? '#ef4444' : stats.portfolioRiskBand === 'Mittel' ? '#f59e0b' : '#10b981',
                fontSize: 12,
                fontWeight: 700,
              }}>
                Portfolio-Score {fmt.number(stats.weightedPortfolioRisk, 1)} · {stats.portfolioRiskBand}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {stats.assetRiskRows.slice(0, 8).map((row) => (
                <div key={row.id} style={{ background: '#121212', border: '1px solid #222', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.name}{row.symbol ? ` (${row.symbol})` : ''}
                      </div>
                      <div style={{ color: '#9ca3af', fontSize: 11 }}>
                        Anteil: {fmt.number(row.weightPct, 1)}%
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        color: row.riskBand === 'Hoch' ? '#ef4444' : row.riskBand === 'Mittel' ? '#f59e0b' : '#10b981',
                        fontSize: 12,
                        fontWeight: 800,
                      }}>
                        {fmt.number(row.totalRiskScore, 1)} · {row.riskBand}
                      </div>
                      <div style={{ color: '#6b7280', fontSize: 10 }}>
                        Vol {Math.round(row.volatilityRisk)} | Liq {Math.round(row.liquidityRisk)} | FX {Math.round(row.currencyRisk)} | Klumpen {Math.round(row.concentrationRisk)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #242424' }}>
              <div style={{ background: '#101214', border: '1px solid #1f2937', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ color: '#d1d5db', fontSize: 12, fontWeight: 700 }}>Was-wäre-wenn-Regler</div>
                  <div style={{ color: '#a3a3a3', fontSize: 11 }}>{whatIfReductionPct}%-Punkte</div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {[5, 10, 15].map((value) => (
                    <button
                      key={`whatif-${value}`}
                      onClick={() => setWhatIfReductionPct(value)}
                      style={{
                        background: whatIfReductionPct === value ? '#10b98122' : '#0f1113',
                        color: whatIfReductionPct === value ? '#10b981' : '#9ca3af',
                        border: `1px solid ${whatIfReductionPct === value ? '#10b98155' : '#2a2a2a'}`,
                        borderRadius: 7,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 9px',
                        cursor: 'pointer',
                      }}
                    >
                      {value}%
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={whatIfReductionPct}
                  onChange={(e) => setWhatIfReductionPct(Number(e.target.value || 0))}
                  style={{ width: '100%' }}
                />

                <div style={{ marginTop: 6, color: '#9ca3af', fontSize: 11 }}>
                  Live-Simulation: {fmt.number(stats.weightedPortfolioRisk, 1)} → {fmt.number(stats.whatIfRiskAfter, 1)} ({stats.whatIfRiskBand}) · Verbesserung {fmt.number(stats.totalWhatIfRiskDelta, 1)}
                </div>

                {stats.whatIfRows.length > 0 && (
                  <div style={{ marginTop: 6, color: '#6b7280', fontSize: 10 }}>
                    {stats.whatIfRows.map((row) => `${row.name}: -${fmt.number(row.appliedReductionPct, 1)}%`).join(' | ')}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ color: '#d1d5db', fontSize: 12, fontWeight: 700 }}>Empfohlene Risiko-Reduktion</div>
                <div style={{ color: '#9ca3af', fontSize: 11 }}>
                  Simuliert: {fmt.number(stats.weightedPortfolioRisk, 1)} → {fmt.number(stats.simulatedRiskAfter, 1)}
                </div>
              </div>

              {stats.riskSuggestions.length ? (
                <div style={{ display: 'grid', gap: 7 }}>
                  {stats.riskSuggestions.map((row) => (
                    <div key={`rec-${row.id}`} style={{ background: '#101214', border: '1px solid #1f2937', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 700, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {row.name}
                        </div>
                        <div style={{ color: '#10b981', fontSize: 11, fontWeight: 700 }}>
                          Potenzial +{fmt.number(row.estimatedRiskDelta, 1)}
                        </div>
                      </div>
                      <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 4 }}>
                        Zielgewicht {fmt.number(row.targetWeightPct, 1)}% · reduzieren um {fmt.number(row.reduceByPct, 1)}%-Punkte · Haupttreiber: {row.primaryDriver}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: 11 }}>
                  Keine akute Übergewichtung mit hohem Hebel erkannt.
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ ...S.card, display: 'flex', flexDirection: 'column', minHeight: 560 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Portfolio Chatbot</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  setMessages((prev) => [...prev, { role: 'user', text: prompt, ts: Date.now() }, { role: 'assistant', text: answerQuestion(prompt), ts: Date.now() + 1 }]);
                }}
                style={{ border: '1px solid #2a2a2a', background: '#121212', color: '#a7a7a7', borderRadius: 8, padding: '5px 9px', fontSize: 11, cursor: 'pointer' }}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, background: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: 10, padding: 10, overflowY: 'auto', marginBottom: 10 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '88%',
                    borderRadius: 10,
                    padding: '8px 10px',
                    fontSize: 12,
                    lineHeight: 1.45,
                    background: msg.role === 'user' ? '#1d4ed8' : '#18181b',
                    border: msg.role === 'user' ? '1px solid #2563eb' : '1px solid #2a2a2a',
                    color: msg.role === 'user' ? '#eff6ff' : '#d4d4d8',
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
              placeholder="Frag z. B.: Wie hoch ist mein Gewinn?"
              style={{ ...S.input, flex: 1 }}
            />
            <button onClick={sendMessage} style={S.btn}><Brain size={13} />Fragen</button>
          </div>

          <div style={{ marginTop: 10, color: '#666', fontSize: 11 }}>
            Datenbasis: dein aktuelles Portfolio in dieser App.
          </div>
        </div>
      </div>
    </div>
  );
}

// AUTH CONTEXT
// ═══════════════════════════════════════════════════════════════════

const AuthContext = createContext();

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

function resolveDefaultBackendUrl() {
  const envBackend = String(process.env.REACT_APP_BACKEND_URL || '').trim().replace(/\/$/, '');
  if (envBackend) return envBackend;

  try {
    const protocol = String(window?.location?.protocol || 'http:');
    const host = String(window?.location?.hostname || '').trim();
    if (host && host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
      return `${protocol}//${host}:8787`;
    }
  } catch (_) {}

  return 'http://localhost:8787';
}

function resolveDefaultAccessCode() {
  const envCode = String(process.env.REACT_APP_ACCESS_CODE || '').trim();
  return envCode || 'dev123';
}

const ENV_BACKEND_URL = String(process.env.REACT_APP_BACKEND_URL || '').trim().replace(/\/$/, '');
const ENV_ACCESS_CODE = String(process.env.REACT_APP_ACCESS_CODE || '').trim();
const DEFAULT_BACKEND_URL = resolveDefaultBackendUrl();
const DEFAULT_ACCESS_CODE = resolveDefaultAccessCode();

function getAuthRuntimeConfig() {
  const fallback = {
    backendUrl: DEFAULT_BACKEND_URL,
    accessCode: DEFAULT_ACCESS_CODE,
  };

  try {
    const raw = localStorage.getItem('ft-settings');
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    const hasFixedBackend = Boolean(ENV_BACKEND_URL);
    const hasFixedAccessCode = Boolean(ENV_ACCESS_CODE);

    let backendUrl = hasFixedBackend
      ? ENV_BACKEND_URL
      : String(parsed?.backendUrl || fallback.backendUrl).trim().replace(/\/$/, '') || fallback.backendUrl;
    const isLocalOnly = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(backendUrl);
    const hasLanDefault = !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(DEFAULT_BACKEND_URL);
    if (isLocalOnly && hasLanDefault) {
      backendUrl = DEFAULT_BACKEND_URL;
    }
    const accessCode = hasFixedAccessCode
      ? ENV_ACCESS_CODE
      : String(parsed?.accessCode || fallback.accessCode).trim() || fallback.accessCode;

    return { backendUrl, accessCode };
  } catch {
    return fallback;
  }
}

function getAuthBackendCandidates() {
  const { backendUrl } = getAuthRuntimeConfig();
  const urls = [
    String(backendUrl || '').trim().replace(/\/$/, ''),
    String(DEFAULT_BACKEND_URL || '').trim().replace(/\/$/, ''),
    'http://127.0.0.1:8787',
    'http://localhost:8787',
  ].filter(Boolean);
  return Array.from(new Set(urls));
}

function persistAuthBackendUrl(backendUrl) {
  if (ENV_BACKEND_URL) return;
  try {
    const raw = localStorage.getItem('ft-settings');
    const parsed = raw ? JSON.parse(raw) : {};
    localStorage.setItem('ft-settings', JSON.stringify({
      ...parsed,
      backendUrl,
    }));
  } catch (_) {}
}

function isNetworkError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return err?.name === 'TypeError' || msg.includes('failed to fetch') || msg.includes('network');
}

function buildAuthHeaders({ token, includeContentType = false } = {}) {
  const { accessCode } = getAuthRuntimeConfig();
  const headers = {};

  if (includeContentType) headers['Content-Type'] = 'application/json';
  if (accessCode) headers['x-access-code'] = accessCode;
  if (token) headers['x-session-token'] = token;

  return headers;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      const headers = buildAuthHeaders({ token });
      const candidates = getAuthBackendCandidates();
      let lastErr = null;

      for (const base of candidates) {
        try {
          const res = await fetch(`${base}/api/auth/user`, {
            headers,
            signal: controller.signal,
          });
          if (!res.ok) throw new Error('Session invalid');
          const data = await res.json();
          persistAuthBackendUrl(base);
          setUser(data.user);
          setLoading(false);
          return;
        } catch (err) {
          if (err?.name === 'AbortError') return;
          lastErr = err;
          if (!isNetworkError(err)) break;
        }
      }

      if (lastErr?.name === 'AbortError') return;
      localStorage.removeItem('auth_token');
      setToken(null);
      setLoading(false);
    })();

    return () => controller.abort();
  }, [token]);

  const register = async (email, password, name) => {
    const headers = buildAuthHeaders({ includeContentType: true });
    const payload = JSON.stringify({ email, password, name });
    const candidates = getAuthBackendCandidates();

    for (const base of candidates) {
      try {
        const res = await fetch(`${base}/api/auth/register`, {
          method: 'POST',
          headers,
          body: payload,
        });
        const data = await res.json().catch(() => ({ error: 'Ungültige Serverantwort' }));
        if (res.ok) {
          persistAuthBackendUrl(base);
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem('auth_token', data.token);
        }
        return data;
      } catch (err) {
        if (!isNetworkError(err)) break;
      }
    }

    return { error: 'Backend nicht erreichbar. Prüfe Backend URL in Einstellungen.' };
  };

  const login = async (email, password) => {
    const headers = buildAuthHeaders({ includeContentType: true });
    const payload = JSON.stringify({ email, password });
    const candidates = getAuthBackendCandidates();

    for (const base of candidates) {
      try {
        const res = await fetch(`${base}/api/auth/login`, {
          method: 'POST',
          headers,
          body: payload,
        });
        const data = await res.json().catch(() => ({ error: 'Ungültige Serverantwort' }));
        if (res.ok) {
          persistAuthBackendUrl(base);
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem('auth_token', data.token);
        }
        return data;
      } catch (err) {
        if (!isNetworkError(err)) break;
      }
    }

    return { error: 'Backend nicht erreichbar. Prüfe Backend URL in Einstellungen.' };
  };

  const logout = async () => {
    const { backendUrl } = getAuthRuntimeConfig();
    if (token) {
      await fetch(`${backendUrl}/api/auth/logout`, {
        method: 'POST',
        headers: buildAuthHeaders({ token, includeContentType: true }),
      });
    }
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  const deleteStoredUserData = async () => {
    const headers = buildAuthHeaders({ token, includeContentType: true });
    const candidates = getAuthBackendCandidates();
    for (const base of candidates) {
      try {
        const res = await fetch(`${base}/api/auth/data`, {
          method: 'DELETE',
          headers,
        });
        const data = await res.json().catch(() => ({ error: 'Ungültige Serverantwort' }));
        if (res.ok) {
          persistAuthBackendUrl(base);
        }
        return data;
      } catch (err) {
        if (!isNetworkError(err)) return { error: 'Anfrage fehlgeschlagen' };
      }
    }
    return { error: 'Backend nicht erreichbar' };
  };

  const deleteAccount = async (password) => {
    const headers = buildAuthHeaders({ token, includeContentType: true });
    const candidates = getAuthBackendCandidates();
    for (const base of candidates) {
      try {
        const res = await fetch(`${base}/api/auth/account`, {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ password }),
        });
        const data = await res.json().catch(() => ({ error: 'Ungültige Serverantwort' }));
        if (res.ok) {
          persistAuthBackendUrl(base);
          localStorage.removeItem('auth_token');
          setToken(null);
          setUser(null);
        }
        return data;
      } catch (err) {
        if (!isNetworkError(err)) return { error: 'Anfrage fehlgeschlagen' };
      }
    }
    return { error: 'Backend nicht erreichbar' };
  };

  const clearLocalAppData = () => {
    localStorage.removeItem('ft-assets-v2');
    localStorage.removeItem('ft-settings');
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout, deleteAccount, deleteStoredUserData, clearLocalAppData }}>
      {children}
    </AuthContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LOGIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

function LoginPage() {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name) {
          setError('Name erforderlich');
          setLoading(false);
          return;
        }
        const result = await register(email, password, name);
        if (result.error) {
          setError(result.error);
        }
      } else {
        const result = await login(email, password);
        if (result.error) {
          setError(result.error);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, #151515 0%, #0a0a0a 55%, #070707 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#111111',
        border: '1px solid #222',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.45)',
        padding: '48px 40px',
        animation: 'slideUp 0.4s ease-out'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '36px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '-18px' }}>
            <img
              src="/login-logo-current.png"
              alt="Logo"
              style={{ height: 250, width: 'auto', objectFit: 'contain', transform: 'translateY(18px)' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
            <img
              src="/wordmark-current.png"
              alt="Schriftzug"
              style={{ height: 105, width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <p style={{
            fontSize: '15px',
            margin: '0',
            fontWeight: '700',
            lineHeight: 1.35,
            letterSpacing: '0.2px',
            maxWidth: 300,
            marginInline: 'auto',
            background: 'linear-gradient(90deg, #dbeafe 0%, #93c5fd 35%, #67e8f9 70%, #86efac 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 20px rgba(59,130,246,0.15)'
          }}>
            {isRegister ? 'Starte durch: Portfolio aufbauen, Ziele erreichen.' : 'Dein Geld. Dein Überblick. Smarter jeden Tag.'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            marginBottom: '20px',
            padding: '12px 16px',
            background: '#2a1114',
            border: '1px solid #7f1d1d',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            animation: 'slideDown 0.3s ease-out'
          }}>
            <AlertCircle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{
              margin: '0',
              color: '#fca5a5',
              fontSize: '13px',
              fontWeight: '500',
              lineHeight: '1.4'
            }}>
              {error}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          {/* Name Input (Register Only) */}
          {isRegister && (
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#9ca3af',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Max Mustermann"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #2a2a2a',
                  borderRadius: '10px',
                  fontSize: '14px',
                  color: '#f3f4f6',
                  background: '#0f0f0f',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.background = '#111827';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#2a2a2a';
                  e.target.style.background = '#0f0f0f';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          )}

          {/* Email Input */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#9ca3af',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.de"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #2a2a2a',
                borderRadius: '10px',
                fontSize: '14px',
                color: '#f3f4f6',
                background: '#0f0f0f',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                outline: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.background = '#111827';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#2a2a2a';
                e.target.style.background = '#0f0f0f';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Password Input */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#9ca3af',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Passwort
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #2a2a2a',
                  borderRadius: '10px',
                  fontSize: '14px',
                  color: '#f3f4f6',
                  background: '#0f0f0f',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.background = '#111827';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#2a2a2a';
                  e.target.style.background = '#0f0f0f';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#9ca3af',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#60a5fa'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
              >
                {showPassword ? <Eye size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: loading ? '#4b5563' : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 52%, #86efac 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              marginTop: '8px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              boxShadow: loading ? 'none' : '0 10px 20px rgba(134, 239, 172, 0.28)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 15px 30px rgba(37, 99, 235, 0.34)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 10px 20px rgba(134, 239, 172, 0.28)';
              }
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Wird geladen...
              </div>
            ) : isRegister ? 'Registrieren' : 'Anmelden'}
          </button>
        </form>

        {/* Toggle Register/Login */}
        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setError('');
          }}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '8px',
            background: 'none',
            border: 'none',
            color: '#60a5fa',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => e.target.style.color = '#93c5fd'}
          onMouseLeave={(e) => e.target.style.color = '#60a5fa'}
        >
          {isRegister
            ? '← Zurück zur Anmeldung'
            : 'Neues Konto erstellen →'}
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        input::placeholder {
          color: #6b7280;
          font-weight: 400;
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// XETR DATABASE (4,404 instruments compressed)
// ═══════════════════════════════════════════════════════════════════

const XETR_B64 = "H4sIAL2apGkC/5xdx5rkOI6+z1PEcearTq28OVISZUI25MI8Cx9+AdBIYbIzu3t3iqgK/qIDQYAEwXmZWMrK08wFW2z6b14mR0DK7M71NnHLfTH/Z2J1UfB65v0pbU51v7TwR2UpUGiHnh1KUJ7Mq5jYFUDjME0nVppMSWhHIg5sJw4ES2cXsvBpXvipnIZ1PKV9Qx89DVZvvhy4tuOIxE4S3xM8HQDD+nyql8f+5cjDP0TouZ4NX37gh4duO2Tw4YdExJD6joCfIMPGp3Ttc8h0kv9R0cwgQt9GRBR5sRj4lQGkgK6ah2I5fDgOfCg5cd0E2lQwzLX29YXB1+Z1Yn2mG2cgses4tgeQOLFtsfYJQK4176E6fCr5pLN5TgRdGgeQzxfXOsUqD3xeWDvWPd+/l3hRAN+Lk8iF721shoxzOhwy+CH0InRh5CWOmNsWMjRDv0xDj42HzlYZmc2TayBH8Zbws2iWHis3tMXCYGx0Q7Cz0X6eXxC";
// ═══════════════════════════════════════════════════════════════════const XETR_B64 = "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";

// Decompress XETR database using DecompressionStream API
let _xetrDb = null;
let _xetrLoading = false;
const _xetrCallbacks = [];

async function loadXetrDb() {
  if (_xetrDb) return _xetrDb;
  if (_xetrLoading) {
    return new Promise(resolve => _xetrCallbacks.push(resolve));
  }
  _xetrLoading = true;
  // Use fallback database directly (XETR_B64 compression is broken)
  _xetrDb = [
    { name: 'Lockheed Martin Corporation', isin: 'US5398301094', wkn: '894648', symbol: 'LMT', type: 'S' },
    { name: 'Exxon Mobil Corporation', isin: 'US30231G1022', wkn: '852549', symbol: 'XOM', type: 'S' },
    { name: 'Chevron Corporation', isin: 'US1667641005', wkn: '852552', symbol: 'CVX', type: 'S' },
    { name: 'BP p.l.c.', isin: 'GB0007980591', wkn: '850517', symbol: 'BP', type: 'S' },
    { name: 'Shell plc', isin: 'GB00BP6MXD84', wkn: 'A3C99G', symbol: 'SHEL', type: 'S' },
    { name: 'ConocoPhillips', isin: 'US20825C1045', wkn: '575302', symbol: 'COP', type: 'S' },
    { name: 'Occidental Petroleum Corporation', isin: 'US6745991058', wkn: '851921', symbol: 'OXY', type: 'S' },
    { name: 'TotalEnergies SE', isin: 'FR0000120271', wkn: '850727', symbol: 'TTE', type: 'S' },

    { name: 'Alibaba Group Holding Limited', isin: 'US01609W1027', wkn: 'A117ME', symbol: 'BABA', type: 'S' },
    { name: 'Tencent Holdings Ltd. (ADR)', isin: 'KYG875721634', wkn: 'A1138D', symbol: 'TCEHY', type: 'S' },
    { name: 'JD.com Inc.', isin: 'US47215P1066', wkn: 'A112ST', symbol: 'JD', type: 'S' },
    { name: 'Baidu Inc.', isin: 'US0567521085', wkn: 'A0F5DE', symbol: 'BIDU', type: 'S' },
    { name: 'PDD Holdings Inc.', isin: 'US7223041028', wkn: 'A2JRK6', symbol: 'PDD', type: 'S' },
    { name: 'NIO Inc. ADR', isin: 'US62914V1061', wkn: 'A2N4PB', symbol: 'NIO', type: 'S' },
    { name: 'BYD Co. Ltd. ADR', isin: 'CNE100000296', wkn: 'A0M4W9', symbol: 'BYDDF', type: 'S' },
    { name: 'NetEase Inc. ADR', isin: 'US64110W1027', wkn: '501822', symbol: 'NTES', type: 'S' },

    { name: 'Apple Inc.', isin: 'US0378331005', wkn: '865985', symbol: 'AAPL', type: 'S' },
    { name: 'Microsoft Corporation', isin: 'US5949181045', wkn: '870747', symbol: 'MSFT', type: 'S' },
    { name: 'Amazon.com Inc.', isin: 'US0231351023', wkn: '906866', symbol: 'AMZN', type: 'S' },
    { name: 'Alphabet Inc. (Google)', isin: 'US02079K3059', wkn: '906436', symbol: 'GOOGL', type: 'S' },
    { name: 'Alphabet Inc. Class C', isin: 'US02079K1079', wkn: 'A14Y6F', symbol: 'GOOG', type: 'S' },
    { name: 'Tesla Inc.', isin: 'US88160R1014', wkn: '227534', symbol: 'TSLA', type: 'S' },
    { name: 'Meta Platforms Inc.', isin: 'US30303M1027', wkn: '147981', symbol: 'META', type: 'S' },
    { name: 'NVIDIA Corporation', isin: 'US67066G1040', wkn: '918422', symbol: 'NVDA', type: 'S' },
    { name: 'Broadcom Inc.', isin: 'US11135F1012', wkn: 'A2JG9Z', symbol: 'AVGO', type: 'S' },
    { name: 'Advanced Micro Devices Inc.', isin: 'US0079031078', wkn: '863186', symbol: 'AMD', type: 'S' },
    { name: 'Intel Corporation', isin: 'US4581401001', wkn: '855681', symbol: 'INTC', type: 'S' },
    { name: 'International Business Machines Corporation', isin: 'US4592001014', wkn: '851399', symbol: 'IBM', type: 'S' },
    { name: 'Oracle Corporation', isin: 'US68389X1054', wkn: '871460', symbol: 'ORCL', type: 'S' },
    { name: 'Salesforce Inc.', isin: 'US79466L3024', wkn: 'A0B87V', symbol: 'CRM', type: 'S' },
    { name: 'Adobe Inc.', isin: 'US00724F1012', wkn: '871981', symbol: 'ADBE', type: 'S' },
    { name: 'Palantir Technologies Inc.', isin: 'US69608A1088', wkn: 'A2QA4J', symbol: 'PLTR', type: 'S' },
    { name: 'MP Materials Corp.', isin: 'US5533681012', wkn: 'A2QHVL', symbol: 'MP', type: 'S' },
    { name: 'D-Wave Quantum Inc.', isin: 'US26740W1099', wkn: '', symbol: 'QBTS', type: 'S' },

    { name: 'JPMorgan Chase & Co.', isin: 'US46625H1005', wkn: '850628', symbol: 'JPM', type: 'S' },
    { name: 'Bank of America Corporation', isin: 'US0605051046', wkn: '858388', symbol: 'BAC', type: 'S' },
    { name: 'Wells Fargo & Company', isin: 'US9497461015', wkn: '857949', symbol: 'WFC', type: 'S' },
    { name: 'Goldman Sachs Group Inc.', isin: 'US38141G1040', wkn: '920332', symbol: 'GS', type: 'S' },
    { name: 'Visa Inc.', isin: 'US92826C8394', wkn: 'A0NC7B', symbol: 'V', type: 'S' },
    { name: 'Mastercard Incorporated', isin: 'US57636Q1040', wkn: 'A0F602', symbol: 'MA', type: 'S' },

    { name: 'Johnson & Johnson', isin: 'US4781601046', wkn: '853260', symbol: 'JNJ', type: 'S' },
    { name: 'Pfizer Inc.', isin: 'US7170811035', wkn: '852009', symbol: 'PFE', type: 'S' },
    { name: 'Merck & Co. Inc.', isin: 'US58933Y1055', wkn: 'A0YD8Q', symbol: 'MRK', type: 'S' },
    { name: 'AbbVie Inc.', isin: 'US00287Y1091', wkn: 'A1J84E', symbol: 'ABBV', type: 'S' },

    { name: 'Coca-Cola Company', isin: 'US1912161007', wkn: '850663', symbol: 'KO', type: 'S' },
    { name: 'PepsiCo Inc.', isin: 'US7134481081', wkn: '851995', symbol: 'PEP', type: 'S' },
    { name: 'Walmart Inc.', isin: 'US9311421039', wkn: '860853', symbol: 'WMT', type: 'S' },
    { name: 'McDonald’s Corporation', isin: 'US5801351017', wkn: '856958', symbol: 'MCD', type: 'S' },
    { name: 'Nike Inc.', isin: 'US6541061031', wkn: '866993', symbol: 'NKE', type: 'S' },
    { name: 'Procter & Gamble Co.', isin: 'US7427181091', wkn: '852062', symbol: 'PG', type: 'S' },
    { name: 'Costco Wholesale Corporation', isin: 'US22160K1051', wkn: '888351', symbol: 'COST', type: 'S' },

    { name: 'Berkshire Hathaway Inc. Class B', isin: 'US0846707026', wkn: 'A0YJQ2', symbol: 'BRK-B', type: 'S' },
    { name: 'UnitedHealth Group Incorporated', isin: 'US91324P1021', wkn: '869561', symbol: 'UNH', type: 'S' },
    { name: 'Home Depot Inc.', isin: 'US4370761029', wkn: '866953', symbol: 'HD', type: 'S' },
    { name: 'Caterpillar Inc.', isin: 'US1491231015', wkn: '850598', symbol: 'CAT', type: 'S' },
    { name: 'Boeing Company', isin: 'US0970231058', wkn: '850471', symbol: 'BA', type: 'S' },

    { name: 'Siemens AG', isin: 'DE0007236101', wkn: '723610', symbol: 'SIE', type: 'S' },
    { name: 'SAP SE', isin: 'DE0007164600', wkn: '716460', symbol: 'SAP', type: 'S' },
    { name: 'Allianz SE', isin: 'DE0008404005', wkn: '840400', symbol: 'ALV', type: 'S' },
    { name: 'BASF SE', isin: 'DE000BASF111', wkn: 'BASF11', symbol: 'BAS', type: 'S' },
    { name: 'Deutsche Telekom AG', isin: 'DE0005557508', wkn: '555750', symbol: 'DTE', type: 'S' },
    { name: 'Rheinmetall AG', isin: 'DE0007030009', wkn: '703000', symbol: 'RHM', type: 'S' },

    { name: 'iShares Core DAX UCITS ETF', isin: 'DE0005933931', wkn: '593393', symbol: 'EXS1', type: 'E' },
    { name: 'iShares Core S&P 500 UCITS ETF', isin: 'IE00B5M1VJ87', wkn: 'A0YEDH', symbol: 'IVV', type: 'E' },
    { name: 'iShares Core MSCI World UCITS ETF (Acc)', isin: 'IE00B4L5Y983', wkn: 'A0RPWH', symbol: 'EUNL', type: 'E' },
    { name: 'iShares NASDAQ-100 UCITS ETF (Acc)', isin: 'IE00B53SZB19', wkn: 'A0F5UF', symbol: 'CNDX', type: 'E' },
    { name: 'Vanguard FTSE All-World UCITS ETF', isin: 'IE00B4L5Y983', wkn: 'A1JX52', symbol: 'VWRL', type: 'E' },
    { name: 'Vanguard S&P 500 UCITS ETF', isin: 'IE00B3XXRP09', wkn: 'A1JX53', symbol: 'VUSA', type: 'E' },
    { name: 'Xtrackers MSCI World UCITS ETF', isin: 'IE00BJ0KDQ92', wkn: 'A1XB5U', symbol: 'XDWD', type: 'E' },
    { name: 'Invesco EQQQ NASDAQ-100 UCITS ETF', isin: 'IE0032077012', wkn: '801498', symbol: 'EQQQ', type: 'E' },

    { name: 'SPDR Gold Shares', isin: 'US78463V1070', wkn: 'A0Q27V', symbol: 'GLD', type: 'E' },
    { name: 'iShares Gold Trust', isin: 'US4642851053', wkn: 'A0LP78', symbol: 'IAU', type: 'E' },
    { name: 'abrdn Physical Gold Shares ETF', isin: 'US00326A1043', wkn: 'A0Q2R4', symbol: 'SGOL', type: 'E' },
    { name: 'WisdomTree Physical Gold', isin: 'JE00B1VS3770', wkn: 'A0N62F', symbol: 'PHAU', type: 'E' },
    { name: 'Xetra-Gold', isin: 'DE000A0S9GB0', wkn: 'A0S9GB', symbol: '4GLD', type: 'E' },

    { name: 'iShares Silver Trust', isin: 'US46428Q1094', wkn: 'A0N62E', symbol: 'SLV', type: 'E' },
    { name: 'abrdn Physical Silver Shares ETF', isin: 'US0032641088', wkn: 'A0M6U8', symbol: 'SIVR', type: 'E' },
    { name: 'WisdomTree Physical Silver', isin: 'JE00B1VS3333', wkn: 'A0N62G', symbol: 'PHAG', type: 'E' },
    { name: 'Invesco Physical Silver ETC', isin: 'IE00B43VDT70', wkn: 'A1KWPR', symbol: 'SSLV', type: 'E' },
  ];
  _xetrCallbacks.forEach(cb => cb(_xetrDb));
  _xetrCallbacks.length = 0;
  return _xetrDb;
}

function searchXetr(db, query) {
  if (!db || !query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  const normalize = (text) => String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const isCloseToken = (a, b, maxDistance = 2) => {
    if (!a || !b) return false;
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > maxDistance) return false;

    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      let rowMin = Infinity;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
        rowMin = Math.min(rowMin, dp[i][j]);
      }
      if (rowMin > maxDistance) return false;
    }
    return dp[a.length][b.length] <= maxDistance;
  };

  const qNorm = normalize(q)
    .replace(/\bi shares\b/g, 'ishares')
    .replace(/nasdaq\s*100/g, 'nasdaq 100');
  const qCompact = qNorm.replace(/\s+/g, '');
  const qTokens = qNorm.split(' ').filter(Boolean);
  const results = [];
  for (const inst of db) {
    const nameNorm = normalize(inst.name)
      .replace(/\bi shares\b/g, 'ishares')
      .replace(/nasdaq\s*100/g, 'nasdaq 100');
    const nameCompact = nameNorm.replace(/\s+/g, '');
    const nameTokens = nameNorm.split(' ').filter(Boolean);
    const typoTokenHits = qTokens.reduce((acc, token) => {
      const found = nameTokens.some(nameToken =>
        nameToken.startsWith(token) || token.startsWith(nameToken) || isCloseToken(token, nameToken)
      );
      return acc + (found ? 1 : 0);
    }, 0);

    const score = 
      (inst.isin?.toLowerCase() === q ? 100 : 0) +
      (inst.wkn?.toLowerCase() === q ? 90 : 0) +
      (inst.symbol?.toLowerCase() === q ? 80 : 0) +
      (inst.symbol?.toLowerCase().startsWith(q) ? 50 : 0) +
      (inst.name?.toLowerCase().startsWith(q) ? 40 : 0) +
      (inst.name?.toLowerCase().includes(q) ? 20 : 0) +
      (nameNorm.includes(qNorm) ? 18 : 0) +
      (qCompact.length > 2 && nameCompact.includes(qCompact) ? 18 : 0) +
      (qTokens.length > 1 && typoTokenHits === qTokens.length ? 35 : 0) +
      (typoTokenHits > 0 ? typoTokenHits * 8 : 0) +
      (inst.isin?.toLowerCase().includes(q) ? 15 : 0) +
      (inst.wkn?.toLowerCase().includes(q) ? 15 : 0);
    if (score > 0) results.push({ ...inst, score });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

// ═══════════════════════════════════════════════════════════════════
// LIVE PRICE FETCHING
// ═══════════════════════════════════════════════════════════════════

// Fetch crypto prices from CoinGecko (free, no API key needed)
async function fetchCryptoPrices(coinIds) {
  if (!coinIds.length) return {};
  try {
    const ids = coinIds.join(',');
    const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`);
    if (!resp.ok) return {};
    const data = await resp.json();
    const result = {};
    for (const [id, v] of Object.entries(data)) {
      result[id] = { price: v.eur, change24h: v.eur_24h_change };
    }
    return result;
  } catch { return {}; }
}

// Map XETR type to Yahoo Finance suffix
function getYahooTicker(asset) {
  if (asset.symbol) {
    // XETR symbols trade on .DE or .F
    return `${asset.symbol}.DE`;
  }
  return null;
}

// Fetch stock/ETF price via Yahoo Finance (CORS proxy needed)
// We use a public CORS proxy or the Yahoo Finance chart API
let _fxUsdEurRate = null;
let _fxUsdEurUpdatedAt = 0;

async function getUsdToEurRate() {
  const now = Date.now();
  const ttlMs = 5 * 60 * 1000;
  if (_fxUsdEurRate && (now - _fxUsdEurUpdatedAt) < ttlMs) {
    return _fxUsdEurRate;
  }

  // Primary source: live FX API
  try {
    const fxResp = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR', { signal: AbortSignal.timeout(8000) });
    if (fxResp.ok) {
      const fxData = await fxResp.json();
      const apiRate = Number(fxData?.rates?.EUR);
      if (Number.isFinite(apiRate) && apiRate > 0) {
        _fxUsdEurRate = apiRate;
        _fxUsdEurUpdatedAt = now;
        return apiRate;
      }
    }
  } catch { }

  const tryParse = (meta) => {
    const rate = Number(meta?.regularMarketPrice);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    const symbol = String(meta?.symbol || '').toUpperCase();
    if (symbol.includes('USDEUR')) return rate;
    if (symbol.includes('EURUSD')) return 1 / rate;
    return null;
  };

  const urls = [
    'https://query1.finance.yahoo.com/v8/finance/chart/USDEUR=X?interval=1d&range=1d',
    'https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1d&range=1d',
  ];

  for (const url of urls) {
    try {
      const resp = await fetchWithProxy(url);
      if (!resp.ok) continue;
      const data = await resp.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const parsed = tryParse(meta);
      if (parsed) {
        _fxUsdEurRate = parsed;
        _fxUsdEurUpdatedAt = now;
        return parsed;
      }
    } catch { }

    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) continue;
      const data = await resp.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const parsed = tryParse(meta);
      if (parsed) {
        _fxUsdEurRate = parsed;
        _fxUsdEurUpdatedAt = now;
        return parsed;
      }
    } catch { }
  }

  return _fxUsdEurRate || null;
}

async function fetchStockPrice(symbol) {
  const normalized = String(symbol || '').trim().toUpperCase();
  if (!normalized) return null;
  const raw = normalized.replace(/\s+/g, '');
  const usClass = raw.replace('-', '.');
  // Prioritize German exchanges first for EUR prices
  const candidates = raw.includes('.')
    ? [raw]
    : [raw + '.DE', raw + '.F', raw, usClass]; // Xetra, Frankfurt, then US

  try {
    for (const ticker of candidates) {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice;
      const currencyCode = meta?.currency;
      
      if (typeof price === 'number' && Number.isFinite(price)) {
        let finalPrice = price;
        // Convert USD to EUR via live FX rate
        if (currencyCode === 'USD') {
          const usdToEur = await getUsdToEurRate();
          if (usdToEur) finalPrice = price * usdToEur;
        }
        return finalPrice;
      }
    }
    return null;
  } catch { return null; }
}

const PREMARKET_MARKETS = [
  { id: 'dax', label: 'DAX', symbol: '^GDAXI', decimals: 2, valueKind: 'points' },
  { id: 'us500', label: 'US500', symbol: '^GSPC', decimals: 2, valueKind: 'points' },
  { id: 'ustech100', label: 'US Tech100', symbol: '^NDX', decimals: 2, valueKind: 'points' },
  { id: 'hangseng40', label: 'Hang Seng 40', symbol: '^HSI', decimals: 2, valueKind: 'points' },
  { id: 'btc', label: 'BTC', symbol: 'BTC-USD', decimals: 2, valueKind: 'currency' },
  { id: 'gold', label: 'Gold', symbol: 'GC=F', decimals: 2, valueKind: 'currency' },
  { id: 'silver', label: 'Silber', symbol: 'SI=F', decimals: 2, valueKind: 'currency' },
  { id: 'oil', label: 'Öl', symbol: 'CL=F', decimals: 2, valueKind: 'currency' },
];

async function fetchMarketMove(symbol) {
  const ticker = String(symbol || '').trim();
  if (!ticker) return null;
  // ...existing code...
// Quote parsing is defined at module scope below
    }

  
  const buildRowsFromQuoteData = (data) => {
    const list = data?.quoteResponse?.result || [];
    const bySymbol = new Map(
      list
        .map(q => [String(q?.symbol || '').toUpperCase(), q])
        .filter(([sym]) => !!sym)
    );

    return PREMARKET_MARKETS.map((item) => {
      const quote = bySymbol.get(String(item.symbol).toUpperCase());
      if (!quote) return { ...item, available: false };
        const parsed = parseQuote ? parseQuote(quote, item) : null;
      return parsed || { ...item, available: false };
    });
  };

// Define and export fetchPreMarketSnapshot at module scope and use local url variable
export async function fetchPreMarketSnapshot() {
  const url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + PREMARKET_MARKETS.map(m => m.symbol).join(',');
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (resp.ok) {
      const data = await resp.json();
      const rows = buildRowsFromQuoteData(data);
      if (rows.some(r => r.available)) return rows;
    }
  } catch { }
  try {
    const resp = await fetchWithProxy(url);
    if (resp.ok) {
      const data = await resp.json();
      const rows = buildRowsFromQuoteData(data);
      if (rows.some(r => r.available)) return rows;
    }
  } catch { }
  const fallbackRows = await Promise.all(PREMARKET_MARKETS.map(async (item) => {
    const move = await fetchMarketMove(item.symbol);
    return {
      ...item,
      ...move,
      available: !!move,
    };
  }));
  return fallbackRows;

}

// Module-level quote parser used by buildRowsFromQuoteData
function parseQuote(quote, item, post) {
  let price = Number(quote?.regularMarketPrice);
  if (!Number.isFinite(price)) {
    if (Number.isFinite(post)) price = post;
  }
  const previous = Number(quote?.regularMarketPreviousClose ?? quote?.previousClose);
  let points = Number(quote?.regularMarketChange);
  if (!Number.isFinite(points) && Number.isFinite(price) && Number.isFinite(previous) && previous > 0) {
    points = price - previous;
  }
  let pct = Number(quote?.regularMarketChangePercent);
  if (!Number.isFinite(pct) && Number.isFinite(points) && Number.isFinite(previous) && previous > 0) {
    pct = (points / previous) * 100;
  }
  if (!Number.isFinite(price) || !Number.isFinite(points) || !Number.isFinite(pct)) return null;
  const asOfSec = Number(quote?.regularMarketTime || quote?.preMarketTime || quote?.postMarketTime || 0);
  return {
    price,
    points,
    pct,
    currency: String(quote?.currency || '').toUpperCase(),
    symbol: String(quote?.symbol || item?.symbol || ''),
    marketState: quote?.marketState,
    updatedAt: asOfSec > 0 ? asOfSec * 1000 : Date.now(),
    available: true,
  };
}

async function searchAlphaVantage(query, apiKey) {
  const q = String(query || '').trim();
  const key = String(apiKey || '').trim();
  if (!q || q.length < 2 || !key) return [];
  try {
    const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(q)}&apikey=${encodeURIComponent(key)}`;
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = await resp.json();
    const rows = data?.bestMatches || [];
    return rows
      .map(item => {
        const symbol = item['1. symbol']?.trim();
        const name = item['2. name']?.trim();
        const region = item['4. region']?.trim();
        const type = item['3. type']?.trim();
        if (!symbol || !name) return null;
        const isEtf = /etf/i.test(type || '');
        return {
          name,
          symbol,
          isin: '',
          wkn: '',
          type: isEtf ? 'E' : 'S',
          exchange: region || ''
        };
      })
      .filter(Boolean)
      .slice(0, 10);
  } catch {
    return [];
  }
}

async function searchYahooInstruments(query) {
  const q = String(query || '').trim();
  if (!q || q.length < 2) return [];

  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=40&newsCount=0&lang=en-US&region=US`;
  const issuerEtfHint = /ishares|amundi|xtrackers|vanguard|invesco|spdr|lyxor|ucits|etf/i;

  const mapRows = (data) => {
    const quotes = Array.isArray(data?.quotes) ? data.quotes : [];
    return quotes
      .map((item) => {
        const symbol = String(item?.symbol || '').trim();
        const name = String(item?.longname || item?.shortname || item?.name || '').trim();
        if (!symbol || !name) return null;

        const quoteType = String(item?.quoteType || '').toUpperCase();
        const exchange = String(item?.exchDisp || item?.exchange || '').trim();
        const etfLike =
          quoteType === 'ETF' ||
          quoteType === 'MUTUALFUND' ||
          issuerEtfHint.test(name) ||
          issuerEtfHint.test(symbol);

        if (!['ETF', 'EQUITY', 'MUTUALFUND'].includes(quoteType) && !etfLike) return null;

        return {
          name,
          symbol,
          isin: '',
          wkn: '',
          type: etfLike ? 'E' : 'S',
          exchange,
        };
      })
      .filter(Boolean)
      .slice(0, 25);
  };

  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (resp.ok) {
      const data = await resp.json();
      const rows = mapRows(data);
      if (rows.length) return rows;
    }
  } catch { }

  try {
    const resp = await fetchWithProxy(url);
    if (!resp.ok) return [];
    const data = await resp.json();
    return mapRows(data);
  } catch {
    return [];
  }
}

const LSX_INDEX_STORAGE_KEY = 'ft-lsx-index-v1';
const LSX_QUERY_TTL_MS = 12 * 60 * 60 * 1000;
const LSX_INDEX_MAX_ROWS = 15000;

let _lsxIndexState = null;
let _lsxPersistTimer = null;

function normalizeLsXQuery(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\bi\s*shares\b/g, 'ishares')
    .replace(/nasdaq\s*100/g, 'nasdaq 100')
    .replace(/core\s+msci\s+world/g, 'msci wld')
    .replace(/\s+/g, ' ');
}

function createEmptyLsXIndex() {
  return {
    updatedAt: 0,
    queries: {},
    byInstrumentId: {},
    byIsin: {},
    byWkn: {},
    bySymbol: {},
  };
}

function getLsXIndexState() {
  if (_lsxIndexState) return _lsxIndexState;
  try {
    const raw = localStorage.getItem(LSX_INDEX_STORAGE_KEY);
    if (!raw) {
      _lsxIndexState = createEmptyLsXIndex();
      return _lsxIndexState;
    }
    const parsed = JSON.parse(raw);
    _lsxIndexState = {
      ...createEmptyLsXIndex(),
      ...parsed,
      queries: parsed?.queries || {},
      byInstrumentId: parsed?.byInstrumentId || {},
      byIsin: parsed?.byIsin || {},
      byWkn: parsed?.byWkn || {},
      bySymbol: parsed?.bySymbol || {},
    };
  } catch {
    _lsxIndexState = createEmptyLsXIndex();
  }
  return _lsxIndexState;
}

function persistLsXIndexState() {
  if (_lsxPersistTimer) clearTimeout(_lsxPersistTimer);
  _lsxPersistTimer = setTimeout(() => {
    try {
      const idx = getLsXIndexState();
      localStorage.setItem(LSX_INDEX_STORAGE_KEY, JSON.stringify(idx));
    } catch { }
  }, 150);
}

function upsertLsXRows(rows, queryKey = '') {
  const idx = getLsXIndexState();
  const now = Date.now();
  const cleanRows = (Array.isArray(rows) ? rows : [])
    .filter(Boolean)
    .slice(0, LSX_INDEX_MAX_ROWS)
    .map((row) => ({
      name: String(row.name || '').trim(),
      symbol: String(row.symbol || '').trim().toUpperCase(),
      isin: String(row.isin || '').trim().toUpperCase(),
      wkn: String(row.wkn || '').trim().toUpperCase(),
      type: row.type || 'S',
      exchange: row.exchange || 'LS-X',
      source: row.source || 'LS-X',
      lsxCategory: row.lsxCategory || '',
      lsxInstrumentId: Number(row.lsxInstrumentId),
      score: Number(row.score || 0),
    }))
    .filter((row) => row.name && Number.isFinite(row.lsxInstrumentId) && row.lsxInstrumentId > 0 && row.isin);

  for (const row of cleanRows) {
    idx.byInstrumentId[String(row.lsxInstrumentId)] = row;
    idx.byIsin[row.isin] = row;
    if (row.wkn) idx.byWkn[row.wkn] = row;
    if (row.symbol) idx.bySymbol[row.symbol] = row;
  }

  if (queryKey) {
    idx.queries[queryKey] = {
      updatedAt: now,
      instrumentIds: cleanRows.map((row) => row.lsxInstrumentId),
    };
  }

  idx.updatedAt = now;
  persistLsXIndexState();
}

function getLsXCachedRowsForQuery(query) {
  const idx = getLsXIndexState();
  const queryKey = normalizeLsXQuery(query);
  const entry = idx.queries[queryKey];
  if (!entry || !Array.isArray(entry.instrumentIds) || !entry.instrumentIds.length) return [];
  if ((Date.now() - Number(entry.updatedAt || 0)) > LSX_QUERY_TTL_MS) return [];
  return entry.instrumentIds
    .map((id) => idx.byInstrumentId[String(id)])
    .filter(Boolean);
}

function lookupLsXInstrumentId(asset) {
  const idx = getLsXIndexState();
  const explicit = Number(asset?.lsxInstrumentId);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const isin = String(asset?.isin || '').trim().toUpperCase();
  if (isin && idx.byIsin[isin]?.lsxInstrumentId) return Number(idx.byIsin[isin].lsxInstrumentId);

  const wkn = String(asset?.wkn || '').trim().toUpperCase();
  if (wkn && idx.byWkn[wkn]?.lsxInstrumentId) return Number(idx.byWkn[wkn].lsxInstrumentId);

  const symbol = String(asset?.symbol || asset?.xetrSymbol || '').trim().toUpperCase();
  if (symbol && idx.bySymbol[symbol]?.lsxInstrumentId) return Number(idx.bySymbol[symbol].lsxInstrumentId);

  return null;
}

async function warmLsXIndexFromAssets(assets) {
  const stockAssets = (Array.isArray(assets) ? assets : [])
    .filter((asset) => String(asset?.type || '').toLowerCase() === 'stock' || asset?.isin || asset?.wkn)
    .slice(0, 30);

  const queries = Array.from(new Set(
    stockAssets.flatMap((asset) => [asset?.isin, asset?.wkn, asset?.symbol, asset?.xetrSymbol])
      .map((value) => String(value || '').trim())
      .filter((value) => value.length >= 3)
  ));

  for (const q of queries.slice(0, 24)) {
    try {
      await searchLsXInstruments(q);
    } catch { }
  }
}

async function searchLsXInstruments(query) {
  const rawQuery = String(query || '').trim();
  if (!rawQuery || rawQuery.length < 2) return [];

  const queryKey = normalizeLsXQuery(rawQuery);
  const cachedRows = getLsXCachedRowsForQuery(rawQuery);
  if (cachedRows.length) {
    return cachedRows.slice(0, 25);
  }

  const normalized = normalizeLsXQuery(rawQuery);
  const compact = normalized.replace(/\s+/g, '');
  const queryVariants = Array.from(new Set([
    rawQuery,
    normalized,
    compact,
    normalized.replace(/\bishares\b/g, 'ishs'),
    normalized.replace(/\bnasdaq 100\b/g, 'nasdaq'),
  ].filter(Boolean)));

  const mapRows = (rows) => {
    const list = Array.isArray(rows) ? rows : [];
    return list
      .map((item) => {
        const isin = String(item?.isin || '').trim().toUpperCase();
        const symbol = String(item?.symbol || '').trim().toUpperCase();
        const name = String(item?.displayname || item?.name || '').trim();
        const wkn = item?.wkn != null ? String(item.wkn).trim().toUpperCase() : '';
        const categorySymbol = String(item?.categorySymbol || '').trim().toUpperCase();
        const categoryName = String(item?.categoryName || '').trim();
        const instrumentId = Number(item?.instrumentId || item?.id);

        if (!name || !isin || !Number.isFinite(instrumentId)) return null;

        const type =
          categorySymbol === 'ETF' ? 'E' :
          categorySymbol === 'FND' ? 'E' :
          categorySymbol === 'BND' ? 'E' :
          'S';

        return {
          name,
          symbol,
          isin,
          wkn,
          type,
          exchange: 'LS-X',
          source: 'LS-X',
          lsxInstrumentId: instrumentId,
          lsxCategory: categoryName || categorySymbol,
          score: 0,
        };
      })
      .filter(Boolean);
  };

  const merged = new Map();
  for (const q of queryVariants) {
    const url = `https://www.ls-x.de/_rpc/json/.lstc/instrument/search/main?q=${encodeURIComponent(q)}&maxResults=40`;
    let rows = [];
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (resp.ok) rows = mapRows(await resp.json());
    } catch { }

    if (!rows.length) {
      try {
        const resp = await fetchWithProxy(url);
        if (resp.ok) rows = mapRows(await resp.json());
      } catch { }
    }

    for (const row of rows) {
      const key = `${row.isin}|${row.wkn}|${row.symbol}|${row.name}`;
      if (!merged.has(key)) merged.set(key, row);
    }
    if (merged.size >= 20) break;
  }

  const qLc = rawQuery.toLowerCase().trim();
  const ranked = Array.from(merged.values()).map((row) => {
    const nameLc = String(row.name || '').toLowerCase();
    const symbolLc = String(row.symbol || '').toLowerCase();
    const isinLc = String(row.isin || '').toLowerCase();
    const wknLc = String(row.wkn || '').toLowerCase();
    const score =
      (isinLc === qLc ? 120 : 0) +
      (wknLc === qLc ? 110 : 0) +
      (symbolLc === qLc ? 90 : 0) +
      (symbolLc.startsWith(qLc) ? 55 : 0) +
      (nameLc.includes(qLc) ? 35 : 0) +
      (isinLc.includes(qLc) ? 20 : 0) +
      (wknLc.includes(qLc) ? 20 : 0);
    return { ...row, score };
  });

  const finalRows = ranked
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);

  if (finalRows.length) {
    upsertLsXRows(finalRows, queryKey);
  }

  return finalRows;
}

// Map stock symbols to sectors
function getSectorForStock(name, symbol) {
  if (!name && !symbol) return '';
  const text = (name + ' ' + (symbol || '')).toUpperCase();
  
  const sectors = {
    'Energie': ['EXXON', 'XOM', 'CHEVRON', 'CVX', 'BP', 'SHELL', 'SHEL', 'PETROLEUM', 'OIL', 'OCCIDENTAL', 'OXY', 'CONOCO', 'COP', 'TOTALENERGIES', 'TTE', 'EQUINOR', 'GAS', 'ENERGY'],
    'Technologie': ['MSFT', 'MICROSOFT', 'APPLE', 'AAPL', 'GOOGLE', 'GOOGL', 'GOOG', 'ALPHABET', 'NVIDIA', 'NVDA', 'TESLA', 'TSLA', 'META', 'AMAZON', 'AMZN', 'BROADCOM', 'AVGO', 'AMD', 'INTEL', 'INTC', 'ORACLE', 'ORCL', 'SALESFORCE', 'CRM', 'ADOBE', 'ADBE', 'PALANTIR', 'PLTR', 'SAP', 'SIEMENS', 'SIE', 'ALIBABA', 'BABA', 'TENCENT', 'TCEHY', 'BAIDU', 'BIDU', 'NETEASE', 'NTES', 'SOFTWARE', 'TECH', 'COMPUTER'],
    'Finanzen': ['JPM', 'JPMORGAN', 'BAC', 'BANK OF AMERICA', 'WFC', 'WELLS FARGO', 'GS', 'GOLDMAN SACHS', 'VISA', 'MASTERCARD', 'MA', 'ALLIANZ', 'ALV', 'DB', 'DEUTSCHE BANK', 'COMMERZBANK', 'ING', 'INSURANCE', 'BANK', 'FINANCE', 'MORGAN', 'GOLDMAN', 'PAYMENT'],
    'Gesundheit': ['JNJ', 'JOHNSON', 'PFIZER', 'PFE', 'MERCK', 'MRK', 'ABBVIE', 'ABBV', 'UNITEDHEALTH', 'UNH', 'PHARMA', 'BIO', 'NOVARTIS', 'ROCHE', 'MODERNA', 'BIONTECH', 'HEALTH', 'MEDICAL', 'ASTRAZENECA', 'BRISTOL'],
    'Konsumgüter': ['COCA-COLA', 'KO', 'PEPSICO', 'PEP', 'WALMART', 'WMT', 'MCDONALD', 'MCD', 'NIKE', 'NKE', 'PROCTER & GAMBLE', 'PG', 'COSTCO', 'COST', 'UNILEVER', 'NESTLÉ', 'DANONE', 'JD.COM', 'JD', 'PDD', 'PINDUODUO', 'CONSUMER', 'RETAIL', 'FOOD', 'BEVERAGE', 'LUXE', 'FASHION'],
    'Industrie': ['CATERPILLAR', 'CAT', 'BOEING', 'BA', 'HOME DEPOT', 'HD', 'VOESTALPINE', 'THYSSENKRUPP', 'ARCELORMITTAL', 'BASF', 'BAS', 'RHEINMETALL', 'RHM', 'NIO', 'BYD', 'BYDDF', 'INDUSTRIES', 'MACHINERY', 'AUTOMOTIVE', 'MACHINES'],
    'Verteidigung/Rüstung': ['LOCKHEED', 'LMT', 'BOEING', 'BA', 'RHEINMETALL', 'RHM', 'DEFENSE', 'AEROSPACE'],
    'Telekommunikation': ['DEUTSCHE TELEKOM', 'DTE', 'TELECOM', 'TELECOMMUNICATIONS'],
    'Edelmetalle': ['GOLD', 'GLD', 'IAU', 'SGOL', 'PHAU', '4GLD', 'XETRA-GOLD', 'SILVER', 'SLV', 'SIVR', 'PHAG', 'SSLV', 'PRECIOUS', 'METALS'],
    'ETF/Fonds': ['WORLD', 'VWCE', 'IVV', 'VWRL', 'VUSA', 'XDWD', 'EXS1', 'EQQQ', 'NASDAQ', 'MSCI', 'STOXX', 'FTSE', 'ISHARES', 'VANGUARD', 'INVESCO', 'XTRACKERS', 'ETF', 'UCITS', 'INDEX'],
    'Versicherung': ['BERKSHIRE', 'BRK', 'ALLIANZ', 'ALV', 'INSURANCE']
  };
  
  // Symbol-based mapping for perfect precision
  const symbolSectors = {
    'LMT': 'Verteidigung/Rüstung',
    'OXY': 'Energie',
    'XOM': 'Energie',
    'CVX': 'Energie',
    'COP': 'Energie',
    'SHEL': 'Energie',
    'TTE': 'Energie',
    'AAPL': 'Technologie',
    'MSFT': 'Technologie',
    'GOOGL': 'Technologie',
    'GOOG': 'Technologie',
    'AMZN': 'Technologie',
    'TSLA': 'Technologie',
    'NVDA': 'Technologie',
    'META': 'Technologie',
    'INTC': 'Technologie',
    'AMD': 'Technologie',
    'AVGO': 'Technologie',
    'ORCL': 'Technologie',
    'CRM': 'Technologie',
    'ADBE': 'Technologie',
    'PLTR': 'Technologie',
    'BABA': 'Technologie',
    'TCEHY': 'Technologie',
    'BIDU': 'Technologie',
    'NTES': 'Technologie',
    'JD': 'Konsumgüter',
    'PDD': 'Konsumgüter',
    'NIO': 'Industrie',
    'BYDDF': 'Industrie',
    'SAP': 'Technologie',
    'SIE': 'Technologie',
    'JPM': 'Finanzen',
    'BAC': 'Finanzen',
    'WFC': 'Finanzen',
    'GS': 'Finanzen',
    'V': 'Finanzen',
    'MA': 'Finanzen',
    'DTE': 'Telekommunikation',
    'ALV': 'Finanzen',
    'JNJ': 'Gesundheit',
    'PFE': 'Gesundheit',
    'MRK': 'Gesundheit',
    'ABBV': 'Gesundheit',
    'UNH': 'Gesundheit',
    'KO': 'Konsumgüter',
    'PEP': 'Konsumgüter',
    'WMT': 'Konsumgüter',
    'MCD': 'Konsumgüter',
    'NKE': 'Konsumgüter',
    'PG': 'Konsumgüter',
    'COST': 'Konsumgüter',
    'BRK-B': 'Versicherung',
    'CAT': 'Industrie',
    'BA': 'Verteidigung/Rüstung',
    'BAS': 'Industrie',
    'RHM': 'Verteidigung/Rüstung',
    'HD': 'Einzelhandel',
    'GLD': 'Edelmetalle',
    'IAU': 'Edelmetalle',
    'SGOL': 'Edelmetalle',
    'PHAU': 'Edelmetalle',
    '4GLD': 'Edelmetalle',
    'SLV': 'Edelmetalle',
    'SIVR': 'Edelmetalle',
    'PHAG': 'Edelmetalle',
    'SSLV': 'Edelmetalle',
    'IVV': 'ETF/Fonds',
    'VWRL': 'ETF/Fonds',
    'VUSA': 'ETF/Fonds',
    'XDWD': 'ETF/Fonds',
    'EXS1': 'ETF/Fonds',
    'EQQQ': 'ETF/Fonds'
  };
  
  // Check symbol-based mapping first
  if (symbolSectors[symbol?.toUpperCase()]) {
    return symbolSectors[symbol.toUpperCase()];
  }
  
  // Check keywords if symbol mapping not found
  for (const [sector, keywords] of Object.entries(sectors)) {
    if (keywords.some(kw => text.includes(kw))) {
      return sector;
    }
  }
  return '';
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS & UTILS
// ═══════════════════════════════════════════════════════════════════

const ASSET_COLORS = { stock: '#10b981', crypto: '#f59e0b', valuables: '#3b82f6', bank: '#8b5cf6' };
const CHART_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899'];

const DEMO_ASSETS = [
  { id: '1', type: 'stock', name: 'SAP SE', symbol: 'SAP', xetrSymbol: 'SAP', wkn: '716460', isin: 'DE0007164600', amount: 10, purchasePrice: 142.00, purchaseDate: '2022-06-01', currentPrice: 178.50, lastUpdated: new Date().toISOString(), category: 'stock', sector: 'Technologie' },
  { id: '2', type: 'stock', name: 'Vanguard FTSE All-World', symbol: 'VWCE', xetrSymbol: 'VWCE', wkn: 'A2PKXG', isin: 'IE00BK5BQT80', amount: 20, purchasePrice: 85.00, purchaseDate: '2022-01-15', currentPrice: 118.70, lastUpdated: new Date().toISOString(), category: 'etf', sector: 'Global' },
  { id: '3', type: 'crypto', name: 'Bitcoin', symbol: 'BTC', coinId: 'bitcoin', amount: 0.15, purchasePrice: 28000, purchaseDate: '2023-01-10', currentPrice: 78000, lastUpdated: new Date().toISOString() },
  { id: '4', type: 'crypto', name: 'Ethereum', symbol: 'ETH', coinId: 'ethereum', amount: 2.0, purchasePrice: 1800, purchaseDate: '2023-02-20', currentPrice: 2200, lastUpdated: new Date().toISOString() },
  { id: '5', type: 'valuables', name: 'Rolex Submariner', category: 'watch', brand: 'Rolex', model: 'Submariner Date', amount: 1, purchasePrice: 10500, purchaseDate: '2021-11-05', currentPrice: 14800, lastUpdated: new Date().toISOString() },
  { id: '6', type: 'bank', name: 'DKB Tagesgeldkonto', bankName: 'DKB Bank', accountType: 'savings', amount: 1, purchasePrice: 25000, purchaseDate: '2024-01-01', currentPrice: 25437.50, interestRate: 3.5, lastUpdated: new Date().toISOString() }
];

const fmt = {
  currency: (v, dec = 2) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v || 0),
  percent: (v, dec = 2) => `${(v || 0) >= 0 ? '+' : ''}${(v || 0).toFixed(dec)}%`,
  number: (v, dec = 2) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v || 0),
  date: (d) => new Date(d).toLocaleDateString('de-DE'),
  relTime: (d) => {
    const diff = (Date.now() - new Date(d)) / 1000;
    if (diff < 60) return 'Gerade eben';
    if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
    if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
    return `vor ${Math.floor(diff / 86400)} Tagen`;
  }
};

const calcMetrics = (asset) => {
  const totalValue = asset.amount * asset.currentPrice;
  const totalCost = asset.amount * asset.purchasePrice;
  const profit = totalValue - totalCost;
  const profitPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  return { totalValue, totalCost, profit, profitPct };
};

const generateChartData = (assets, range) => {
  if (!assets.length) return [];
  const now = new Date();
  let startDate, points;
  switch (range) {
    case '1T': startDate = new Date(now - 86400000); points = 24; break;
    case '7T': startDate = new Date(now - 7 * 86400000); points = 7; break;
    case '30T': startDate = new Date(now - 30 * 86400000); points = 30; break;
    case '3M': startDate = new Date(now - 90 * 86400000); points = 13; break;
    case '6M': startDate = new Date(now - 180 * 86400000); points = 26; break;
    case '1J': startDate = new Date(now - 365 * 86400000); points = 52; break;
    case 'YTD': startDate = new Date(now.getFullYear(), 0, 1); points = Math.ceil((now - startDate) / 86400000); break;
    default: {
      const earliest = Math.min(...assets.map(a => new Date(a.purchaseDate)));
      startDate = new Date(earliest);
      points = Math.max(12, Math.ceil((now - startDate) / 86400000 / 7));
    }
  }
  const step = (now - startDate) / Math.max(points, 1);
  return Array.from({ length: points + 1 }, (_, i) => {
    const date = new Date(startDate.getTime() + step * i);
    // invested: sum of purchasePrice * amount for assets already bought by this date
    const invested = assets.reduce((s, a) => {
      const aStart = new Date(a.purchaseDate);
      if (date < aStart) return s;
      return s + (a.purchasePrice * a.amount);
    }, 0);
    // actual: interpolate from purchasePrice -> currentPrice over time (simple linear progress)
    const actual = assets.reduce((sum, a) => {
      const aStart = new Date(a.purchaseDate);
      if (date < aStart) return sum;
      const assetProgress = Math.min((date - aStart) / (now - aStart), 1);
      const price = a.purchasePrice + (a.currentPrice - a.purchasePrice) * assetProgress;
      return sum + price * a.amount;
    }, 0);
    return {
      date: range === '1T' ? date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : fmt.date(date),
      invested: Math.round(invested * 100) / 100,
      actual: Math.round(actual * 100) / 100,
    };
  });
};

const uuid = () => Math.random().toString(36).substr(2, 9);

// ═══════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════

const AppContext = createContext(null);

// ═══════════════════════════════════════════════════════════════════
// LIVE DATA ENGINE
// ═══════════════════════════════════════════════════════════════════

const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

async function fetchWithProxy(url, proxyIdx = 0) {
  if (proxyIdx >= CORS_PROXIES.length) throw new Error('All proxies failed');
  try {
    const res = await fetch(CORS_PROXIES[proxyIdx] + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res;
  } catch(e) {
    return fetchWithProxy(url, proxyIdx + 1);
  }
}

async function fetchLivePrice(asset) {
  try {
    if (asset.type === 'crypto' && asset.coinId) {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${asset.coinId}&vs_currencies=eur&include_24hr_change=true`,
        { signal: AbortSignal.timeout(8000) }
      );
      const data = await res.json();
      const d = data[asset.coinId];
      if (!d) return null;
      return { price: d.eur, change24h: d.eur_24h_change ?? 0 };
    }
    if (asset.type === 'stock') {
      const fetchLsXPrice = async (instrumentId) => {
        const instId = Number(instrumentId);
        if (!Number.isFinite(instId) || instId <= 0) return null;
        const url = `https://www.ls-x.de/_rpc/json/instrument/chart/dataForInstrument?instrumentId=${instId}`;

        const parse = (data) => {
          const intraday = data?.series?.intraday?.data;
          if (!Array.isArray(intraday) || !intraday.length) return null;

          const lastPoint = [...intraday].reverse().find((point) => Array.isArray(point) && Number.isFinite(Number(point[1])));
          const price = Number(lastPoint?.[1]);
          if (!Number.isFinite(price) || price <= 0) return null;

          const prev = Number(
            data?.info?.plotlines?.find?.((line) => String(line?.id || '').toLowerCase() === 'previousday')?.value
          );
          const change24h = Number.isFinite(prev) && prev > 0 ? ((price - prev) / prev) * 100 : 0;
          return { price, change24h, source: 'LS-X' };
        };

        try {
          const resp = await fetch(url, { signal: AbortSignal.timeout(7000) });
          if (resp.ok) {
            const parsed = parse(await resp.json());
            if (parsed) return parsed;
          }
        } catch { }

        try {
          const resp = await fetchWithProxy(url);
          if (!resp.ok) return null;
          return parse(await resp.json());
        } catch {
          return null;
        }
      };

      const resolveLsXInstrumentId = async () => {
        const cached = lookupLsXInstrumentId(asset);
        if (cached) return cached;

        const isin = String(asset.isin || '').trim().toUpperCase();
        const wkn = String(asset.wkn || '').trim().toUpperCase();
        const symbol = String(asset.symbol || asset.xetrSymbol || '').trim().toUpperCase();
        const candidates = [isin, wkn, symbol].filter(Boolean);

        for (const q of candidates) {
          const url = `https://www.ls-x.de/_rpc/json/.lstc/instrument/search/main?q=${encodeURIComponent(q)}&maxResults=6`;
          let rows = [];
          try {
            const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
            if (resp.ok) rows = await resp.json();
          } catch { }
          if (!rows.length) {
            try {
              const resp = await fetchWithProxy(url);
              if (resp.ok) rows = await resp.json();
            } catch { }
          }

          const list = Array.isArray(rows) ? rows : [];
          const exact = list.find((item) => String(item?.isin || '').toUpperCase() === isin)
            || list.find((item) => String(item?.wkn || '').toUpperCase() === wkn)
            || list.find((item) => String(item?.symbol || '').toUpperCase() === symbol)
            || list[0];
          const instrumentId = Number(exact?.instrumentId || exact?.id);
          if (Number.isFinite(instrumentId) && instrumentId > 0) {
            upsertLsXRows([{
              name: String(exact?.displayname || asset.name || symbol || isin || wkn),
              symbol,
              isin,
              wkn,
              lsxInstrumentId: instrumentId,
              type: 'S',
              exchange: 'LS-X',
              source: 'LS-X',
            }]);
            return instrumentId;
          }
        }
        return null;
      };

      const lsxInstrumentId = await resolveLsXInstrumentId();
      if (lsxInstrumentId) {
        const lsxPrice = await fetchLsXPrice(lsxInstrumentId);
        if (lsxPrice?.price) return { ...lsxPrice, lsxInstrumentId };
      }

      const baseSymbol = String(asset.xetrSymbol || asset.symbol || '').trim().toUpperCase();
      if (!baseSymbol) return null;
      // Prioritize EUR-quoted versions first (German exchanges)
      const suffixes = ['.DE', '.F', '', '.L']; // .DE = Xetra, .F = Frankfurt, .L = London
      for (const sfx of suffixes) {
        const ticker = baseSymbol + sfx;
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d`;
          const res = await fetchWithProxy(url);
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          const currencyCode = meta?.currency;
          
          if (meta?.regularMarketPrice) {
            let price = meta.regularMarketPrice;
            // If USD, convert to EUR via live FX rate
            if (currencyCode === 'USD') {
              const usdToEur = await getUsdToEurRate();
              if (usdToEur) price = price * usdToEur;
            }
            const prev = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
            const chg = ((meta.regularMarketPrice - prev) / prev) * 100;
            return { price, change24h: chg };
          }
        } catch(e) { continue; }
      }
    }
  } catch(e) {}
  return null;
}

const NEWS_FEEDS_DE = [
  { url: 'https://www.tagesschau.de/xml/rss2_wirtschaft/', name: 'Tagesschau Wirtschaft', color: '#3b82f6' },
  { url: 'https://www.finanzen.net/nachricht/rss', name: 'finanzen.net', color: '#10b981' },
  { url: 'https://feeds.wallstreet-online.de/news', name: 'wallstreet-online', color: '#f59e0b' },
  { url: 'https://www.handelsblatt.com/contentexport/feed/finanzen', name: 'Handelsblatt', color: '#8b5cf6' },
  { url: 'https://www.boerse.de/rss/nachrichten', name: 'boerse.de', color: '#ec4899' },
];
const NEWS_FEEDS_EN = [
  { url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US', name: 'Yahoo Finance', color: '#3b82f6' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', name: 'MarketWatch', color: '#10b981' },
  { url: 'https://www.investing.com/rss/news.rss', name: 'Investing.com', color: '#f59e0b' },
];

async function fetchLiveNews(lang = 'de', symbols = []) {
  const feeds = lang === 'en' ? NEWS_FEEDS_EN : NEWS_FEEDS_DE;
  const articles = [];
  await Promise.allSettled(feeds.map(async feed => {
    try {
      const res = await fetchWithProxy(feed.url);
      const text = await res.text();
      const xml = new DOMParser().parseFromString(text, 'text/xml');
      const items = xml.querySelectorAll('item');
      items.forEach((item, i) => {
        if (i >= 5) return;
        const title = item.querySelector('title')?.textContent?.trim().replace(/<[^>]+>/g, '') || '';
        const link = item.querySelector('link')?.textContent?.trim() || '#';
        const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
        const desc = (item.querySelector('description')?.textContent || '').replace(/<[^>]+>/g, '');
        if (!title || title.length < 5) return;
        const lc = (title + desc).toLowerCase();
        const up = /steig|gewinn|wächst|plus|positiv|bull|kauf|erholung|rekord|hoch|stärk|zulegen|rally|steigt|wächst/i.test(lc);
        const dn = /fall|verlust|minus|negativ|bear|krise|rückgang|schwach|einbruch|sorgen|sinkt|bricht|warnt|risiko/i.test(lc);
        // check if relevant to portfolio
        const relevant = symbols.some(s => lc.includes(s.toLowerCase()));
        articles.push({
          id: `${feed.name}-${i}-${Date.now()}`,
          title: title.substring(0, 140),
          link,
          source: feed.name,
          sourceColor: feed.color,
          pubDate,
          ts: new Date(pubDate).getTime() || (Date.now() - i * 60000),
          sentiment: up ? 'positive' : dn ? 'negative' : 'neutral',
          relevant,
          summary: desc.substring(0, 200),
        });
      });
    } catch(e) {}
  }));
  return articles.sort((a, b) => b.ts - a.ts).slice(0, 30);
}

function AppProvider({ children }) {
  const { token } = useAuth();
  const [assets, setAssets] = useState(() => {
    try { const s = localStorage.getItem('ft-assets-v2'); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });
  const [settings, setSettings] = useState(() => {
    try {
      const s = localStorage.getItem('ft-settings');
      return s ? JSON.parse(s) : {
        autoRefresh: true,
        refreshInterval: 60,
        apiKey: '',
        eodhdApiToken: '',
        includeBankInDashboard: true,
        includeValuablesInDashboard: true,
        newsLang: 'de',
        language: 'de',       // UI language
        currency: 'EUR',      // display currency
        profileName: '',      // optional user name
        mobileView: false,    // force mobile layout
      };
    } catch {
      return {
        autoRefresh: true,
        refreshInterval: 60,
        apiKey: '',
        eodhdApiToken: '',
        includeBankInDashboard: true,
        includeValuablesInDashboard: true,
        newsLang: 'de',
        language: 'de',
        currency: 'EUR',
        profileName: '',
      };
    }
  });

  // mobile state (device width + manual toggles + settings override)
  const [isMobileDevice, setIsMobileDevice] = useState(window.innerWidth < 768);
  const [forceMobile, setForceMobile] = useState(() => {
    try { return !!JSON.parse(localStorage.getItem('ft-forceMobile')); } catch { return false; }
  });
  const [devicePreview, setDevicePreview] = useState(() => {
    try {
      const saved = localStorage.getItem('ft-devicePreview');
      return saved === 'iphone15' ? 'iphone15' : 'none';
    } catch {
      return 'none';
    }
  });

  useEffect(() => {
    const onResize = () => setIsMobileDevice(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobile = isMobileDevice || forceMobile || !!settings?.mobileView || devicePreview === 'iphone15';

  // persist manual forceMobile toggle so it survives reloads
  useEffect(() => {
    try { localStorage.setItem('ft-forceMobile', JSON.stringify(!!forceMobile)); } catch(e) {}
  }, [forceMobile]);

  useEffect(() => {
    try { localStorage.setItem('ft-devicePreview', devicePreview); } catch(e) {}
  }, [devicePreview]);

  const [toast, setToast] = useState(null);
  const [xetrDb, setXetrDb] = useState(null);
  const [xetrLoading, setXetrLoading] = useState(true);

  // Live data state
  const [livePrices, setLivePrices] = useState({}); // { assetId: { price, change24h, updatedAt } }
  const [liveNews, setLiveNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(null);
  const assetsRef = useRef(assets);
  const didInitialPortfolioSyncRef = useRef(false);
  const skipNextServerSaveRef = useRef(false);

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  const portfolioTimestamp = useCallback((list) => {
    if (!Array.isArray(list) || !list.length) return 0;
    return list.reduce((latest, item) => {
      const ts = Date.parse(item?.lastUpdated || item?.updatedAt || item?.purchaseDate || 0);
      return Number.isFinite(ts) ? Math.max(latest, ts) : latest;
    }, 0);
  }, []);

  const savePortfolioToServer = useCallback(async (portfolioToSave) => {
    if (!token) return false;
    const headers = buildAuthHeaders({ token, includeContentType: true });
    const payload = JSON.stringify({ portfolio: Array.isArray(portfolioToSave) ? portfolioToSave : [] });
    const candidates = getAuthBackendCandidates();

    for (const base of candidates) {
      try {
        const res = await fetch(`${base}/api/user/portfolio`, {
          method: 'POST',
          headers,
          body: payload,
        });
        if (res.ok) {
          persistAuthBackendUrl(base);
          return true;
        }
      } catch (err) {
        if (!isNetworkError(err)) break;
      }
    }

    return false;
  }, [token]);

  useEffect(() => {
    if (!token) {
      didInitialPortfolioSyncRef.current = false;
      return;
    }

    let cancelled = false;

    (async () => {
      const headers = buildAuthHeaders({ token });
      const candidates = getAuthBackendCandidates();

      for (const base of candidates) {
        try {
          const res = await fetch(`${base}/api/auth/user`, { headers });
          if (!res.ok) continue;

          const payload = await res.json().catch(() => null);
          const serverPortfolio = Array.isArray(payload?.data?.portfolio) ? payload.data.portfolio : [];
          const localPortfolio = Array.isArray(assetsRef.current) ? assetsRef.current : [];

          if (cancelled) return;
          persistAuthBackendUrl(base);

          const localTs = portfolioTimestamp(localPortfolio);
          const serverTs = portfolioTimestamp(serverPortfolio);
          const hasLocal = localPortfolio.length > 0;
          const hasServer = serverPortfolio.length > 0;

          if (!hasServer && hasLocal) {
            await savePortfolioToServer(localPortfolio);
          } else if (hasServer && !hasLocal) {
            skipNextServerSaveRef.current = true;
            setAssets(serverPortfolio);
          } else if (hasServer && hasLocal && serverTs > localTs) {
            skipNextServerSaveRef.current = true;
            setAssets(serverPortfolio);
          } else if (hasServer && hasLocal && localTs > serverTs) {
            await savePortfolioToServer(localPortfolio);
          }

          didInitialPortfolioSyncRef.current = true;
          return;
        } catch (err) {
          if (!isNetworkError(err)) break;
        }
      }

      didInitialPortfolioSyncRef.current = true;
    })();

    return () => { cancelled = true; };
  }, [token, portfolioTimestamp, savePortfolioToServer]);

  useEffect(() => {
    localStorage.setItem('ft-assets-v2', JSON.stringify(assets));
    window.dispatchEvent(new CustomEvent('ft-assets-updated'));
  }, [assets]);

  useEffect(() => {
    if (!token || !didInitialPortfolioSyncRef.current) return;

    if (skipNextServerSaveRef.current) {
      skipNextServerSaveRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      savePortfolioToServer(assetsRef.current);
    }, 700);

    return () => clearTimeout(timer);
  }, [assets, token, savePortfolioToServer]);

  useEffect(() => { localStorage.setItem('ft-settings', JSON.stringify(settings)); }, [settings]);

  // Load XETR DB on mount
  useEffect(() => {
    const loadDb = async () => {
      try {
        const db = await Promise.race([
          loadXetrDb(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('XETR DB loading timeout')), 5000)
          )
        ]);
        setXetrDb(db);
      } catch (err) {
        console.warn('XETR DB load failed, using fallback:', err);
        setXetrDb([]);
      } finally {
        setXetrLoading(false);
      }
    };
    loadDb();
  }, []);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const addAsset = useCallback((asset) => {
    let mergedIntoExisting = false;
    const nowIso = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    const toNum = (v, fallback = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };

    const normalizeAsset = {
      ...asset,
      amount: toNum(asset.amount),
      purchasePrice: toNum(asset.purchasePrice),
      currentPrice: toNum(asset.currentPrice, toNum(asset.purchasePrice)),
      purchaseDate: asset.purchaseDate || today,
      xetrSymbol: String(asset.type || '').toLowerCase() === 'stock'
        ? (asset.xetrSymbol || asset.symbol || '')
        : asset.xetrSymbol,
    };

    const buildPurchase = (a) => ({
      date: a.purchaseDate || today,
      amount: toNum(a.amount),
      price: toNum(a.purchasePrice),
    });

    const keyOf = (a) => {
      const typeKey = String(a.type || '').toLowerCase();
      if (a.isin) return `${typeKey}|isin|${String(a.isin).toUpperCase()}`;
      if (typeKey === 'crypto' && a.coinId) return `${typeKey}|coin|${String(a.coinId).toLowerCase()}`;
      if (a.symbol) return `${typeKey}|symbol|${String(a.symbol).toUpperCase()}`;
      return `${typeKey}|name|${String(a.name || '').trim().toUpperCase()}`;
    };

    setAssets(prev => {
      const incomingKey = keyOf(normalizeAsset);
      const existingIndex = prev.findIndex(existing => keyOf(existing) === incomingKey);

      if (existingIndex === -1) {
        return [
          ...prev,
          {
            ...normalizeAsset,
            id: uuid(),
            avgPurchasePrice: toNum(normalizeAsset.avgPurchasePrice, normalizeAsset.purchasePrice),
            purchases: Array.isArray(normalizeAsset.purchases) && normalizeAsset.purchases.length
              ? normalizeAsset.purchases
              : [buildPurchase(normalizeAsset)],
            lastUpdated: nowIso,
          }
        ];
      }

      mergedIntoExisting = true;
      const existing = prev[existingIndex];
      const existingAmount = toNum(existing.amount);
      const incomingAmount = toNum(normalizeAsset.amount);
      const existingAvg = toNum(existing.avgPurchasePrice, toNum(existing.purchasePrice));
      const incomingPrice = toNum(normalizeAsset.purchasePrice);
      const mergedAmount = existingAmount + incomingAmount;
      const mergedAvg = mergedAmount > 0
        ? ((existingAvg * existingAmount) + (incomingPrice * incomingAmount)) / mergedAmount
        : incomingPrice;

      const existingPurchases = Array.isArray(existing.purchases) && existing.purchases.length
        ? existing.purchases
        : [{ date: existing.purchaseDate || today, amount: existingAmount, price: existingAvg }];

      const mergedAsset = {
        ...existing,
        ...normalizeAsset,
        id: existing.id,
        amount: mergedAmount,
        purchasePrice: mergedAvg,
        avgPurchasePrice: mergedAvg,
        purchaseDate: existing.purchaseDate || normalizeAsset.purchaseDate,
        currentPrice: toNum(normalizeAsset.currentPrice, toNum(existing.currentPrice)),
        purchases: [...existingPurchases, buildPurchase(normalizeAsset)],
        lastUpdated: nowIso,
      };

      return prev.map((item, idx) => idx === existingIndex ? mergedAsset : item);
    });

    showToast(mergedIntoExisting ? '✓ Nachkauf zur bestehenden Position hinzugefügt!' : '✓ Asset erfolgreich hinzugefügt!');
  }, [showToast]);

  const updateAsset = useCallback((id, data) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...data, lastUpdated: new Date().toISOString() } : a));
    showToast('✓ Asset aktualisiert!');
  }, [showToast]);

  const deleteAsset = useCallback((id) => {
    setAssets(prev => prev.filter(a => a.id !== id));
    showToast('Asset gelöscht', 'error');
  }, [showToast]);

  // ── Live price refresh ──
  const refreshPrices = useCallback(async (silent = false) => {
    if (!silent) showToast('⟳ Preise werden aktualisiert…', 'info');
    setIsRefreshing(true);
    const assetsSnap = assets;
    const newPrices = {};

    await Promise.all(assetsSnap.map(async (asset) => {
      const result = await fetchLivePrice(asset);
      if (result) {
        newPrices[asset.id] = { ...result, updatedAt: new Date().toISOString() };
      }
    }));

    setLivePrices(prev => ({ ...prev, ...newPrices }));
    setLastRefresh(new Date());
    setIsRefreshing(false);
    if (!silent) showToast(`✓ ${Object.keys(newPrices).length} Preise aktualisiert!`);
  }, [assets, showToast]);

  // ── Live news refresh ──
  const refreshNews = useCallback(async () => {
    setNewsLoading(true);
    const symbols = assets.map(a => a.name?.split(' ')[0] || '').filter(Boolean);
    const articles = await fetchLiveNews(settings.newsLang || 'de', symbols);
    setLiveNews(articles);
    setNewsLoading(false);
  }, [assets, settings.newsLang]);

  // ── Auto-refresh engine ──
  const intervalSecs = Math.max(30, settings.refreshInterval || 60);
  const countdownRef = useRef(intervalSecs);
  countdownRef.current = countdown;

  useEffect(() => {
    if (!settings.autoRefresh) return;
    setCountdown(intervalSecs);
    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          refreshPrices(true);
          return intervalSecs;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [settings.autoRefresh, intervalSecs]);

  // Initial load
  useEffect(() => {
    refreshPrices(true);
    refreshNews();
  }, []);

  useEffect(() => {
    warmLsXIndexFromAssets(assets);
  }, [assets]);

  useEffect(() => {
    const id = setInterval(() => {
      warmLsXIndexFromAssets(assets);
    }, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [assets]);

  // Derive asset prices: merge stored currentPrice with live prices
  const assetsWithLive = useMemo(() => assets.map(a => {
    const live = livePrices[a.id];
    if (live) return { ...a, currentPrice: live.price, liveChange24h: live.change24h, liveUpdatedAt: live.updatedAt };
    return a;
  }), [assets, livePrices]);

  const totalValue = useMemo(() => assetsWithLive.reduce((s, a) => s + a.amount * a.currentPrice, 0), [assetsWithLive]);
  const totalCost = useMemo(() => assetsWithLive.reduce((s, a) => {
    const avgPrice = a.avgPurchasePrice || a.purchasePrice;
    return s + a.amount * avgPrice;
  }, 0), [assetsWithLive]);
  const totalProfit = totalValue - totalCost;
  const totalProfitPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return (
    <AppContext.Provider value={{
      assets: assetsWithLive, addAsset, updateAsset, deleteAsset,
      refreshPrices, refreshNews,
      settings, setSettings, showToast, toast,
      xetrDb, xetrLoading,
      totalValue, totalCost, totalProfit, totalProfitPct,
      livePrices, liveNews, newsLoading, isRefreshing, countdown, lastRefresh,
      // mobile helpers
      isMobile, setForceMobile,
      devicePreview, setDevicePreview,
    }}>
      {children}
    </AppContext.Provider>
  );
}

const useApp = () => useContext(AppContext);
const APP_NAME = 'Finova';

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════

const S = {
  app: { minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: "'DM Sans', 'Inter', sans-serif", display: 'flex' },
  sidebar: { width: 220, background: '#111', borderRight: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column', padding: '20px 10px', gap: 3, flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' },
  main: { flex: 1, overflowY: 'auto', padding: '28px 24px', minWidth: 0 },
  card: { background: '#161616', border: '1px solid #222', borderRadius: 12, padding: '20px 22px' },
  btn: { background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .15s' },
  btnGhost: { background: 'transparent', color: '#888', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  btnDanger: { background: '#ef444415', color: '#ef4444', border: '1px solid #ef444435', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  input: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box' },
  select: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box' },
  label: { fontSize: 11, color: '#555', marginBottom: 5, display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 },
  h1: { fontSize: 26, fontWeight: 700, color: '#fff', margin: 0 },
  h2: { fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 },
  h3: { fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 },
  sec: { color: '#555', fontSize: 12 },
  badge: (type) => ({ background: ASSET_COLORS[type] + '18', color: ASSET_COLORS[type], border: `1px solid ${ASSET_COLORS[type]}35`, borderRadius: 5, padding: '2px 7px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }),
  navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 7, cursor: 'pointer', color: active ? '#fff' : '#444', background: active ? '#1e1e1e' : 'transparent', fontSize: 13, fontWeight: active ? 600 : 400, border: 'none', width: '100%', textAlign: 'left' }),
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.87)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)', padding: 16 },
  modalBox: { background: '#141414', border: '1px solid #252525', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 16 },
};

// ═══════════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.type === 'error' ? '#ef444418' : toast.type === 'info' ? '#3b82f618' : '#10b98118';
  const bdr = toast.type === 'error' ? '#ef4444' : toast.type === 'info' ? '#3b82f6' : '#10b981';
  const col = toast.type === 'error' ? '#ef4444' : toast.type === 'info' ? '#3b82f6' : '#10b981';
  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, background: bg, border: `1px solid ${bdr}40`, color: col, borderRadius: 10, padding: '11px 18px', fontSize: 13, fontWeight: 500, zIndex: 9999 }}>
      {toast.msg}
    </div>
  );
}

function AssetIcon({ asset, size = 32 }) {
  const icons = { stock: <TrendingUp size={size * 0.45} />, crypto: <Bitcoin size={size * 0.45} />, valuables: <Gem size={size * 0.45} />, bank: <Building size={size * 0.45} /> };
  const symbolRaw = String(asset?.symbol || asset?.xetrSymbol || '').trim().toUpperCase();
  const logoCandidates = useMemo(() => {
    if (!symbolRaw) return [];
    const preferredLogoDomains = {
      ALV: 'allianz.com',
      RHM: 'rheinmetall.com',
      SIE: 'siemens.com',
      SAP: 'sap.com',
      DTE: 'telekom.com',
    };
    const base = symbolRaw
      .replace(/\.(DE|F|L)$/i, '')
      .replace(/\s+/g, '')
      .replace(/\//g, '-');
    const dotClass = base.replace(/-/g, '.');
    const slashClass = base.replace(/-/g, '/');
    const preferredDomain = preferredLogoDomains[base];
    const preferredList = preferredDomain ? [
      `https://logo.clearbit.com/${preferredDomain}`,
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(preferredDomain)}&sz=128`,
    ] : [];
    const fmpList = [base, dotClass, slashClass]
      .filter(Boolean)
      .map(sym => `https://financialmodelingprep.com/image-stock/${encodeURIComponent(sym)}.png`);
    const list = [...preferredList, ...fmpList];
    return Array.from(new Set(list));
  }, [symbolRaw]);
  const [logoIndex, setLogoIndex] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoIndex(0);
    setLogoFailed(false);
  }, [symbolRaw]);

  const showStockLogo = asset?.type === 'stock' && logoCandidates.length > 0 && !logoFailed;
  const valuableEmoji = asset?.type === 'valuables' ? getValuableCategoryMeta(asset?.category).emoji : null;
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.3, background: ASSET_COLORS[asset.type] + '18', color: ASSET_COLORS[asset.type], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {showStockLogo ? (
        <img
          src={logoCandidates[logoIndex]}
          alt={asset?.name || symbolRaw}
          style={{ width: size * 0.78, height: size * 0.78, objectFit: 'contain', borderRadius: size * 0.16 }}
          onError={() => {
            if (logoIndex < logoCandidates.length - 1) {
              setLogoIndex(prev => prev + 1);
            } else {
              setLogoFailed(true);
            }
          }}
        />
      ) : (valuableEmoji ? <span style={{ fontSize: Math.round(size * 0.48), lineHeight: 1 }}>{valuableEmoji}</span> : icons[asset.type])}
    </div>
  );
}

function HeaderGlyph({ icon: Icon, color = '#10b981', size = 38 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 999,
      background: `${color}14`,
      border: `1px solid ${color}38`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={Math.round(size * 0.46)} color={color} />
    </div>
  );
}

function TimeRangeBtn({ selected, onChange, options = ['1T', '7T', '30T', '3M', '6M', '1J', 'YTD', 'Max'], compact = false, singleRow = false, justify = 'flex-start' }) {
  const labels = {
    '1T': 'Heute',
    '7T': '7 Tage',
    '30T': '30 Tage',
    '3M': '3 Monate',
    '6M': '6 Monate',
    '1J': '1 Jahr',
    YTD: 'YTD',
    Max: 'MAX'
  };
  return (
    <div style={{ display: 'flex', gap: compact ? 2 : 3, flexWrap: singleRow ? 'nowrap' : 'wrap', justifyContent: justify, maxWidth: '100%' }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{ background: selected === o ? '#10b981' : '#1e1e1e', color: selected === o ? '#fff' : '#555', border: 'none', borderRadius: 5, padding: compact ? '4px 6px' : '5px 10px', fontSize: compact ? 10 : 11, fontWeight: 600, cursor: 'pointer', lineHeight: 1 }}>{labels[o] || o}</button>
      ))}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, padding: '8px 14px' }}>
      <div style={{ color: '#555', fontSize: 11, marginBottom: 3 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: '#10b981', fontSize: 13, fontWeight: 700 }}>{fmt.currency(p.value)}</div>)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ADD ASSET MODAL - with XETR search!
// ═══════════════════════════════════════════════════════════════════

function AddAssetModal({ onClose, editAsset }) {
  const { addAsset, updateAsset, xetrDb, xetrLoading, showToast, isMobile, settings, refreshPrices } = useApp();
  const [inputMode, setInputMode] = useState('manual'); // 'manual' oder 'csv'
  const [type, setType] = useState(editAsset?.type || 'stock');
  const [form, setForm] = useState(editAsset || {});
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [avResults, setAvResults] = useState([]);
  const [avLoading, setAvLoading] = useState(false);
  const [step, setStep] = useState(editAsset ? 2 : 1);
  const [errors, setErrors] = useState({});
  const [fetching, setFetching] = useState(false);
  const [csvRows, setCsvRows] = useState([]);
  const [csvStep, setCsvStep] = useState(1); // 1: upload, 2: preview
  const searchRef = useRef(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valuableMeta = useMemo(() => getValuableCategoryMeta(form.category), [form.category]);
  const valuableCategoryOptions = useMemo(() => (
    [
      { value: 'car', label: 'Auto' },
      { value: 'watch', label: 'Uhr' },
      { value: 'jewelry', label: 'Schmuck' },
      { value: 'art', label: 'Kunst' },
      { value: 'other', label: 'Sonstiges' },
    ].map((item) => ({ ...item, emoji: getValuableCategoryMeta(item.value).emoji }))
  ), []);
  const openDatePicker = (e) => {
    const picker = e?.target?.showPicker;
    if (typeof picker === 'function') {
      try { picker.call(e.target); } catch { }
    }
  };

  // CSV Parse function
  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const assets = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 4) continue;
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });
      const asset = {
        id: 'new_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: row.name || row.titel || row.asset || '',
        symbol: row.symbol || row.ticker || '',
        isin: row.isin || '',
        wkn: row.wkn || '',
        amount: parseFloat(row.amount || row.anzahl || 1),
        purchasePrice: parseFloat(row.purchaseprice || row.kaufkurs || row.price || 0),
        purchaseDate: row.purchasedate || row.kaufdatum || new Date().toISOString().split('T')[0],
        type: (row.type || row.typ || 'stock').toLowerCase(),
        sector: row.sector || row.sektor || '',
        currentPrice: parseFloat(row.currentprice || row.aktueller || row.price || 0)
      };
      if (asset.name && asset.amount > 0 && asset.purchasePrice > 0) {
        assets.push(asset);
      }
    }
    return assets;
  };

  const handleCsvFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        showToast('⚠ Keine gültigen Assets in der Datei gefunden');
        return;
      }
      setCsvRows(parsed);
      setCsvStep(2);
    } catch (err) {
      showToast('⚠ Fehler beim Lesen der Datei');
    }
  };

  const importCsvAssets = () => {
    csvRows.forEach(asset => {
      addAsset({
        name: asset.name,
        symbol: asset.symbol,
        isin: asset.isin,
        wkn: asset.wkn,
        amount: asset.amount,
        purchasePrice: asset.purchasePrice,
        purchaseDate: asset.purchaseDate,
        type: asset.type,
        sector: asset.sector,
        currentPrice: asset.currentPrice || asset.purchasePrice
      });
    });
    showToast(`✓ ${csvRows.length} Assets importiert!`);
    onClose();
  };

  // Auto-fetch price and sector when name/symbol is manually entered
  useEffect(() => {
    if (type !== 'stock' || step !== 2 || !form.name) return;
    if (editAsset) return; // Don't auto-fetch when editing
    
    // Only auto-fetch if currentPrice is not already set and we're not fetching
    if (form.currentPrice || fetching) return;
    
    const timeout = setTimeout(async () => {
      if (form.symbol && !form.currentPrice) {
        // Try to fetch price using symbol
        setFetching(true);
        const price = await fetchStockPrice(form.symbol);
        setFetching(false);
        if (price) {
          set('currentPrice', price.toFixed(4));
          const sector = getSectorForStock(form.name, form.symbol);
          if (sector && !form.sector) {
            set('sector', sector);
          }
        }
      }
    }, 800);
    
    return () => clearTimeout(timeout);
  }, [form.name, form.symbol, type, step, editAsset]);

  // XETR search
  useEffect(() => {
    if (type !== 'stock' || step !== 1) return;
    if (!search || search.length < 2) { setSearchResults([]); return; }
    if (!xetrDb) return;
    const results = searchXetr(xetrDb, search);
    setSearchResults(results);
  }, [search, xetrDb, type, step]);

  useEffect(() => {
    if (type !== 'stock' || step !== 1) return;
    if (!search || search.length < 2) {
      setAvResults([]);
      setAvLoading(false);
      return;
    }

    let cancelled = false;
    setAvLoading(true);
    const timeout = setTimeout(async () => {
      const [lsxResults, yahooResults, alphaResults] = await Promise.all([
        searchLsXInstruments(search),
        searchYahooInstruments(search),
        settings?.apiKey ? searchAlphaVantage(search, settings.apiKey) : Promise.resolve([]),
      ]);
      let results = [...lsxResults, ...yahooResults, ...alphaResults];
      if (/ishares|amundi|etf|ucits/i.test(search)) {
        results = results.sort((a, b) => (b.type === 'E' ? 1 : 0) - (a.type === 'E' ? 1 : 0));
      }
      if (cancelled) return;
      setAvResults(results);
      setAvLoading(false);
    }, 380);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search, type, step, settings?.apiKey]);

  const stockResults = useMemo(() => {
    const map = new Map();
    [...searchResults, ...avResults].forEach((item) => {
      const key = `${String(item.isin || '').toUpperCase()}|${String(item.wkn || '').toUpperCase()}|${String(item.symbol || '').toUpperCase()}|${String(item.name || '').toUpperCase()}`;
      if (!map.has(key)) map.set(key, item);
    });
    return Array.from(map.values()).slice(0, 12);
  }, [searchResults, avResults]);

  const selectXetr = async (inst) => {
    const typeLabel = { S: 'stock', E: 'etf', N: 'etn', C: 'etc' }[inst.type] || 'stock';
    const detectedSector = getSectorForStock(inst.name, inst.symbol);
    setForm(p => ({ ...p, name: inst.name, symbol: inst.symbol, xetrSymbol: inst.symbol, wkn: inst.wkn, isin: inst.isin, lsxInstrumentId: inst.lsxInstrumentId || '', category: typeLabel, sector: detectedSector }));
    setStep(2);
    // Try to fetch live price
    setFetching(true);
    const live = await fetchLivePrice({ type: 'stock', symbol: inst.symbol, xetrSymbol: inst.symbol, isin: inst.isin, wkn: inst.wkn, lsxInstrumentId: inst.lsxInstrumentId });
    setFetching(false);
    if (live?.price) {
      const livePrice = Number(live.price);
      setForm(p => ({ ...p, currentPrice: livePrice.toFixed(4), lsxInstrumentId: live.lsxInstrumentId || p.lsxInstrumentId || '' }));
      showToast(`✓ Aktueller Kurs: ${fmt.currency(livePrice)}${detectedSector ? ' | Sektor: ' + detectedSector : ''}`);
    } else {
      const price = await fetchStockPrice(inst.symbol);
      if (price) {
        setForm(p => ({ ...p, currentPrice: price.toFixed(4) }));
        showToast(`✓ Aktueller Kurs: ${fmt.currency(price)}${detectedSector ? ' | Sektor: ' + detectedSector : ''}`);
      }
    }
  };

  // Crypto search
  const CRYPTOS = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
    { id: 'solana', name: 'Solana', symbol: 'SOL' },
    { id: 'cardano', name: 'Cardano', symbol: 'ADA' },
    { id: 'polkadot', name: 'Polkadot', symbol: 'DOT' },
    { id: 'chainlink', name: 'Chainlink', symbol: 'LINK' },
    { id: 'ripple', name: 'XRP', symbol: 'XRP' },
    { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE' },
    { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX' },
    { id: 'matic-network', name: 'Polygon', symbol: 'MATIC' },
    { id: 'uniswap', name: 'Uniswap', symbol: 'UNI' },
    { id: 'litecoin', name: 'Litecoin', symbol: 'LTC' },
  ];

  const cryptoResults = !search || type !== 'crypto' || step !== 1 ? [] :
    CRYPTOS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.symbol.toLowerCase().includes(search.toLowerCase())).slice(0, 6);

  const selectCrypto = async (c) => {
    setForm(p => ({ ...p, name: c.name, symbol: c.symbol, coinId: c.id, sector: 'Kryptowährung' }));
    setStep(2);
    setFetching(true);
    const prices = await fetchCryptoPrices([c.id]);
    setFetching(false);
    if (prices[c.id]) {
      setForm(p => ({ ...p, currentPrice: prices[c.id].price.toFixed(6) }));
      showToast(`✓ Aktueller Kurs: ${fmt.currency(prices[c.id].price)} | Sektor: Kryptowährung`);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.name) e.name = true;
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = true;
    if (!form.purchasePrice || parseFloat(form.purchasePrice) <= 0) e.purchasePrice = true;
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    const today = new Date().toISOString().split('T')[0];
    const asset = {
      ...form,
      type,
      purchaseDate: form.purchaseDate || today,
      amount: parseFloat(form.amount),
      purchasePrice: parseFloat(form.purchasePrice),
      currentPrice: parseFloat(form.currentPrice || form.purchasePrice),
      xetrSymbol: type === 'stock' ? (form.xetrSymbol || form.symbol || '') : form.xetrSymbol,
      lsxInstrumentId: form.lsxInstrumentId ? Number(form.lsxInstrumentId) : undefined
    };

    if ((type === 'stock' || type === 'crypto') && !fetching) {
      setFetching(true);
      const live = await fetchLivePrice(asset);
      setFetching(false);
      if (live?.price && Number.isFinite(Number(live.price))) {
        asset.currentPrice = Number(live.price);
        if (live?.lsxInstrumentId && Number.isFinite(Number(live.lsxInstrumentId))) {
          asset.lsxInstrumentId = Number(live.lsxInstrumentId);
        }
      }
    }

    if (editAsset) updateAsset(editAsset.id, asset);
    else addAsset(asset);
    setTimeout(() => refreshPrices(true), 50);
    onClose();
  };

  const typeColors = { stock: '#10b981', crypto: '#f59e0b', valuables: '#3b82f6', bank: '#8b5cf6' };
  const typeLabels = { stock: 'Wertpapiere', crypto: 'Krypto', valuables: 'Wertgegenstand', bank: 'Bankkonto' };
  const metrics = useMemo(() => {
    const a = parseFloat(form.amount), pp = parseFloat(form.purchasePrice), cp = parseFloat(form.currentPrice);
    if (!a || !pp || !cp) return null;
    return { totalValue: a * cp, profit: a * (cp - pp), pct: ((cp - pp) / pp) * 100 };
  }, [form.amount, form.purchasePrice, form.currentPrice]);

  return (
    <div style={S.modal} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modalBox}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h2 style={S.h2}>{editAsset ? 'Asset bearbeiten' : 'Neues Asset'}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}><X size={18} /></button>
        </div>



        <div style={{ padding: 22 }}>
          {inputMode === 'csv' && !editAsset ? (
            // CSV/PDF Upload Mode
            <>
              {csvStep === 1 ? (
                <div>
                  <div style={{ 
                    border: '2px dashed #8b5cf6', 
                    borderRadius: 10, 
                    padding: '40px 20px', 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    transition: 'all .2s',
                    background: '#8b5cf610'
                  }}
                  onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleCsvFile(e.dataTransfer.files[0]); }}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.background = '#8b5cf620'; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.background = '#8b5cf610'; }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                    <div style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>CSV oder Excel-Datei hochladen</div>
                    <div style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>Ziehe die Datei hier hin oder klicke zum Durchsuchen</div>
                    <input type="file" accept=".csv" style={{ display: 'none' }} id="csvInput" onChange={(e) => handleCsvFile(e.target.files[0])} />
                    <button onClick={() => document.getElementById('csvInput').click()} style={{ ...S.btn, minWidth: 120 }}>📁 Datei wählen</button>
                  </div>

                  <div style={{ marginTop: 20, padding: '12px 14px', background: '#1a1a1a', borderRadius: 8, borderLeft: '3px solid #8b5cf6' }}>
                    <div style={{ color: '#8b5cf6', fontSize: 11, fontWeight: 600, marginBottom: 8 }}>CSV-Struktur</div>
                    <div style={{ color: '#888', fontSize: 11, lineHeight: 1.6, fontFamily: 'monospace' }}>
                      Name, Symbol, Amount, PurchasePrice, PurchaseDate, Type<br/>
                      SAP SE, SAP, 10, 142.50, 2024-01-15, stock<br/>
                      Bitcoin, BTC, 0.15, 45000, 2024-02-01, crypto
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: 12 }}>Vorschau von {csvRows.length} Assets</h3>
                    <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #222', borderRadius: 8, background: '#111' }}>
                      {csvRows.map((asset, i) => (
                        <div key={i} style={{ padding: '10px 12px', borderBottom: i < csvRows.length - 1 ? '1px solid #222' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                          <div>
                            <div style={{ color: '#fff', fontWeight: 500 }}>{asset.name}</div>
                            <div style={{ color: '#666', fontSize: 11 }}>{asset.symbol} · {asset.amount} Stk. @ €{asset.purchasePrice}</div>
                          </div>
                          <span style={{ background: '#1a1a1a', color: '#8b5cf6', padding: '2px 8px', borderRadius: 4, fontSize: 10 }}>
                            {asset.type === 'stock' ? '📈' : asset.type === 'crypto' ? '₿' : '💎'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setCsvStep(1)} style={{ ...S.btnGhost, flex: 1 }}>← Zurück</button>
                    <button onClick={importCsvAssets} style={{ ...S.btn, flex: 1 }}>✓ Importieren</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Manual Entry Mode
            <>
          {/* Type selector */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit,minmax(80px,1fr))', gap: 8, marginBottom: 22 }}>
            {['stock', 'crypto', 'valuables', 'bank'].map(t => (
              <button key={t} onClick={() => { setType(t); setStep(1); setForm({}); setSearch(''); setSearchResults([]); setAvResults([]); }} style={{ background: type === t ? typeColors[t] + '18' : '#111', border: `1px solid ${type === t ? typeColors[t] + '60' : '#222'}`, borderRadius: 8, padding: '10px 6px', color: type === t ? typeColors[t] : '#444', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, transition: 'all .15s', textAlign: 'center' }}>
                {t === 'stock' ? '📈' : t === 'crypto' ? '₿' : t === 'valuables' ? '💎' : '🏦'}<br style={{ marginBottom: 2 }} />
                {typeLabels[t].split('/')[0]}
              </button>
            ))}
          </div>

          {/* Step 1: Search */}
          {step === 1 && (type === 'stock' || type === 'crypto') && (
            <div>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                <input ref={searchRef} style={{ ...S.input, paddingLeft: 34 }}
                  placeholder={type === 'stock' ? (xetrLoading ? 'Datenbank lädt…' : 'Name, ISIN, WKN oder Symbol…') : 'Bitcoin, ETH, Solana…'}
                  value={search} onChange={e => setSearch(e.target.value)} autoFocus
                  />
                {type === 'stock' && xetrLoading && (
                  <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontSize: 11 }}>⟳ Lädt DB…</div>
                )}
              </div>

              {type === 'stock' && !xetrLoading && xetrDb && (
                <div style={{ fontSize: 11, color: '#333', marginBottom: 8 }}>
                  ✓ {xetrDb.length.toLocaleString()} Instrumente geladen (Wertpapiere)
                </div>
              )}

              {type === 'stock' && (
                <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 8 }}>
                  Online-Suche aktiv {settings?.apiKey ? '(Yahoo + Alpha Vantage)' : '(Yahoo)'} {avLoading ? '· Suche…' : ''}
                </div>
              )}

              {(type === 'stock' ? stockResults : cryptoResults).length > 0 && (
                <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                  {(type === 'stock' ? stockResults : cryptoResults).map((r, i) => (
                    <div key={i} onClick={() => type === 'stock' ? selectXetr(r) : selectCrypto(r)}
                      style={{ padding: '11px 14px', borderBottom: i < (type === 'stock' ? stockResults : cryptoResults).length - 1 ? '1px solid #1a1a1a' : 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#1a1a1a'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <div>
                        <div style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                        <div style={{ color: '#444', fontSize: 11, marginTop: 2 }}>
                          {r.symbol && <span style={{ color: '#10b981', marginRight: 8 }}>{r.symbol}</span>}
                          {r.isin && <span style={{ marginRight: 6 }}>ISIN: {r.isin}</span>}
                          {r.wkn && <span>WKN: {r.wkn}</span>}
                          {!r.isin && !r.wkn && r.exchange && <span>{r.exchange}</span>}
                        </div>
                      </div>
                      {r.type && (
                        <span style={{ background: '#222', color: '#666', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 700 }}>
                          {{ S: 'AKTIE', E: 'ETF', N: 'ETN', C: 'ETC' }[r.type] || r.type}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {search.length >= 2 && (type === 'stock' ? stockResults : cryptoResults).length === 0 && !xetrLoading && !avLoading && (
                <div style={{ color: '#333', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>Keine Ergebnisse für "{search}"</div>
              )}

              {fetching && (
                <div style={{ color: '#10b981', fontSize: 12, padding: '8px 0' }}>⟳ Live-Kurs wird abgerufen…</div>
              )}


            </div>
          )}

          {/* Step 2: Form */}
          {(step === 2 || type === 'valuables' || type === 'bank') && (
            <div>
              {type === 'stock' && (
                <>
                  {form.name && (
                    <div style={{ padding: '10px 14px', background: '#10b98110', border: '1px solid #10b98130', borderRadius: 8, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{form.name}</div>
                        <div style={{ color: '#555', fontSize: 12 }}>{form.symbol} · {form.isin} · WKN: {form.wkn}</div>
                      </div>
                      <button onClick={() => { setStep(1); setForm({}); setSearch(''); }} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 11 }}>Ändern</button>
                    </div>
                  )}
                  {!form.name && (
                    <div style={S.grid2}>
                      <div><label style={S.label}>ISIN oder WKN *</label><input style={{ ...S.input, borderColor: errors.isin ? '#ef4444' : '' }} value={form.isin || form.wkn || ''} onChange={e => { const val = e.target.value.toUpperCase(); if (val.length === 12 && !val.startsWith('DE')) set('isin', val); else set('wkn', val); }} placeholder="z.B. DE0007164600 oder 716460" /></div>
                      <div><label style={S.label}>Name (optional)</label><input style={S.input} value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="z.B. SAP SE" /></div>
                    </div>
                  )}
                  <div style={{ ...S.grid2, marginTop: 12 }}>
                    <div><label style={S.label}>Anzahl *</label><input style={{ ...S.input, borderColor: errors.amount ? '#ef4444' : '' }} type="number" step="0.001" value={form.amount || ''} onChange={e => set('amount', e.target.value)} placeholder="10" /></div>
                    <div><label style={S.label}>Kaufkurs (€) *</label><input style={{ ...S.input, borderColor: errors.purchasePrice ? '#ef4444' : '' }} type="number" step="0.01" value={form.purchasePrice || ''} onChange={e => set('purchasePrice', e.target.value)} placeholder="142.00" /></div>
                  </div>
                  <div style={{ ...S.grid2, marginTop: 12 }}>
                    <div><label style={S.label}>Kaufdatum (optional)</label><input style={S.input} type="date" value={form.purchaseDate || ''} onFocus={openDatePicker} onClick={openDatePicker} onChange={e => set('purchaseDate', e.target.value)} /></div>
                    <div><label style={S.label}>Sektor</label><input style={S.input} value={form.sector || ''} onChange={e => set('sector', e.target.value)} placeholder="Technologie" /></div>
                  </div>
                </>
              )}
              {type === 'crypto' && (
                <>
                  {form.name && (
                    <div style={{ padding: '10px 14px', background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: 8, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ color: '#fff', fontWeight: 600 }}>{form.name} ({form.symbol})</div>
                      <button onClick={() => { setStep(1); setForm({}); setSearch(''); }} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 11 }}>Ändern</button>
                    </div>
                  )}
                  {!form.name && (
                    <div style={{ marginTop: 0 }}><label style={S.label}>Name *</label><input style={{ ...S.input, borderColor: errors.name ? '#ef4444' : '' }} value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="z.B. Bitcoin" /></div>
                  )}
                  <div style={{ marginTop: 12 }}><label style={S.label}>CoinGecko ID (optional)</label><input style={S.input} value={form.coinId || ''} onChange={e => set('coinId', e.target.value)} placeholder="bitcoin" /></div>
                  <div style={{ ...S.grid2, marginTop: 12 }}>
                    <div><label style={S.label}>Anzahl *</label><input style={{ ...S.input, borderColor: errors.amount ? '#ef4444' : '' }} type="number" step="0.00000001" value={form.amount || ''} onChange={e => set('amount', e.target.value)} placeholder="0.15" /></div>
                    <div><label style={S.label}>Kaufkurs (€) *</label><input style={{ ...S.input, borderColor: errors.purchasePrice ? '#ef4444' : '' }} type="number" step="0.01" value={form.purchasePrice || ''} onChange={e => set('purchasePrice', e.target.value)} /></div>
                  </div>
                  <div style={{ marginTop: 12 }}><label style={S.label}>Kaufdatum (optional)</label><input style={S.input} type="date" value={form.purchaseDate || ''} onFocus={openDatePicker} onClick={openDatePicker} onChange={e => set('purchaseDate', e.target.value)} /></div>
                </>
              )}
              {type === 'valuables' && (
                <>
                  <div style={S.grid2}>
                    <div><label style={S.label}>Kategorie</label>
                      <select style={S.select} value={form.category || ''} onChange={e => set('category', e.target.value)}>
                        <option value="">Auswählen…</option>
                        {valuableCategoryOptions.map((item) => (
                          <option key={item.value} value={item.value}>{item.emoji} {item.label}</option>
                        ))}
                      </select>
                    </div>
                    <div><label style={S.label}>Name *</label><input style={{ ...S.input, borderColor: errors.name ? '#ef4444' : '' }} value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder={`${valuableMeta.emoji} ${valuableMeta.namePlaceholder}`} /></div>
                  </div>
                  <div style={{ ...S.grid2, marginTop: 12 }}>
                    <div><label style={S.label}>Marke</label><input style={S.input} value={form.brand || ''} onChange={e => set('brand', e.target.value)} placeholder={valuableMeta.brandPlaceholder} /></div>
                    <div><label style={S.label}>Modell</label><input style={S.input} value={form.model || ''} onChange={e => set('model', e.target.value)} placeholder={valuableMeta.modelPlaceholder} /></div>
                  </div>
                  <div style={{ marginTop: 12 }}><label style={S.label}>Kaufpreis (€) *</label><input style={{ ...S.input, borderColor: errors.purchasePrice ? '#ef4444' : '' }} type="number" value={form.purchasePrice || ''} onChange={e => { set('purchasePrice', e.target.value); set('amount', 1); }} /></div>
                  <div style={{ marginTop: 12 }}><label style={S.label}>Kaufdatum (optional)</label><input style={S.input} type="date" value={form.purchaseDate || ''} onFocus={openDatePicker} onClick={openDatePicker} onChange={e => set('purchaseDate', e.target.value)} /></div>
                </>
              )}
              {type === 'bank' && (
                <>
                  <div><label style={S.label}>Bezeichnung *</label><input style={{ ...S.input, borderColor: errors.name ? '#ef4444' : '' }} value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="DKB Tagesgeld" /></div>
                  <div style={{ ...S.grid2, marginTop: 12 }}>
                    <div><label style={S.label}>Bank *</label><input style={S.input} value={form.bankName || ''} onChange={e => set('bankName', e.target.value)} placeholder="Deutsche Kreditbank" /></div>
                    <div><label style={S.label}>Zinssatz (% p.a.)</label><input style={S.input} type="number" step="0.01" value={form.interestRate || ''} onChange={e => set('interestRate', e.target.value)} placeholder="3.50" /></div>
                  </div>
                  <div style={{ ...S.grid2, marginTop: 12 }}>
                    <div><label style={S.label}>Kontostand (€) *</label><input style={{ ...S.input, borderColor: errors.purchasePrice ? '#ef4444' : '' }} type="number" value={form.purchasePrice || ''} onChange={e => { set('purchasePrice', e.target.value); set('currentPrice', e.target.value); set('amount', 1); }} /></div>
                    <div><label style={S.label}>Eröffnungsdatum (optional)</label><input style={S.input} type="date" value={form.purchaseDate || ''} onFocus={openDatePicker} onClick={openDatePicker} onChange={e => set('purchaseDate', e.target.value)} /></div>
                  </div>
                </>
              )}

              {metrics && (() => {
                const showProfit = !(type === 'bank' || type === 'valuables') || !!form.interestRate;
                if (!showProfit) {
                  return (
                    <div style={{ marginTop: 14, padding: 12, background: metrics.profit >= 0 ? '#10b98110' : '#ef444410', border: `1px solid ${metrics.profit >= 0 ? '#10b98130' : '#ef444430'}`, borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888', fontSize: 13 }}>Gesamtwert: <strong style={{ color: '#fff' }}>{fmt.currency(metrics.totalValue)}</strong></span>
                    </div>
                  );
                }
                return (
                  <div style={{ marginTop: 14, padding: 12, background: metrics.profit >= 0 ? '#10b98110' : '#ef444410', border: `1px solid ${metrics.profit >= 0 ? '#10b98130' : '#ef444430'}`, borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888', fontSize: 13 }}>Gesamtwert: <strong style={{ color: '#fff' }}>{fmt.currency(metrics.totalValue)}</strong></span>
                    <span style={{ color: metrics.profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: 13 }}>{fmt.currency(metrics.profit)} ({fmt.percent(metrics.pct)})</span>
                  </div>
                );
              })()}

              {Object.keys(errors).length > 0 && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 10 }}>* Pflichtfelder ausfüllen</div>}
            </div>
          )}
            </>
          )}
        </div>

        {!editAsset && (type === 'stock' || type === 'crypto') && (
          <div style={{ padding: '14px 22px', borderTop: '1px solid #1e1e1e', display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setInputMode('manual'); setStep(1); setForm({}); setSearch(''); setSearchResults([]); setAvResults([]); }}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${inputMode === 'manual' ? '#8b5cf6' : '#222'}`,
                background: inputMode === 'manual' ? '#8b5cf620' : 'transparent',
                color: inputMode === 'manual' ? '#8b5cf6' : '#666',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: inputMode === 'manual' ? 600 : 400,
                transition: 'all .2s'
              }}>
              ✏️ Manuell eingeben
            </button>
            <button
              onClick={() => { setInputMode('csv'); setCsvStep(1); setCsvRows([]); }}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${inputMode === 'csv' ? '#8b5cf6' : '#222'}`,
                background: inputMode === 'csv' ? '#8b5cf620' : 'transparent',
                color: inputMode === 'csv' ? '#8b5cf6' : '#666',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: inputMode === 'csv' ? 600 : 400,
                transition: 'all .2s'
              }}>
              📊 CSV/PDF hochladen
            </button>
          </div>
        )}

        <div style={{ padding: '14px 22px', borderTop: '1px solid #1e1e1e', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={S.btnGhost}>Abbrechen</button>
          {inputMode === 'manual' && (step === 2 || type === 'valuables' || type === 'bank') && (
            <button onClick={submit} style={S.btn}><Plus size={14} />{editAsset ? 'Speichern' : 'Hinzufügen'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// SVG CHART COMPONENTS (no external library needed)
// ═══════════════════════════════════════════════════════════════════

function SvgAreaChart({ data, color = '#10b981', gradientFrom = null, gradientTo = null, solidLine = false, valueType = 'currency', height = 280, step = false, showInvested = true, emphasizeGap = false, rangeKey = '30T' }) {
  const [tooltip, setTooltip] = useState(null);
  if (!data || data.length < 2) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 12 }}>
      Keine Daten verfügbar
    </div>
  );
  const padL = 58, padR = 8, padT = 10, padB = 28;
  const innerW = 600 - padL - padR;
  const innerH = height - padT - padB;
  const actualVals = data.map(d => d.actual ?? d.value ?? 0);
  const investedVals = data.map(d => d.invested ?? 0);
  const sourceVals = showInvested ? [...actualVals, ...investedVals] : [...actualVals];
  const rawMin = Math.min(...sourceVals);
  const rawMax = Math.max(...sourceVals);
  const valueSpan = Math.max(rawMax - rawMin, 1);
  const pairMins = actualVals.map((v, i) => Math.min(v, investedVals[i] ?? v));
  const pairMaxs = actualVals.map((v, i) => Math.max(v, investedVals[i] ?? v));
  const tightMin = Math.min(...pairMins);
  const tightMax = Math.max(...pairMaxs);
  const tightSpan = Math.max(tightMax - tightMin, 1);
  const maxGap = Math.max(...actualVals.map((v, i) => Math.abs(v - (investedVals[i] ?? v))), 0);
  const basePad = valueSpan * 0.08;
  const rangePadCfg = {
    '1T': { span: 0.01, gap: 0.08, minPct: 0.0003 },
    '7T': { span: 0.015, gap: 0.10, minPct: 0.00045 },
    '30T': { span: 0.022, gap: 0.12, minPct: 0.00065 },
    '3M': { span: 0.028, gap: 0.14, minPct: 0.00075 },
    '6M': { span: 0.034, gap: 0.16, minPct: 0.00082 },
    '1J': { span: 0.04, gap: 0.18, minPct: 0.0009 },
    'YTD': { span: 0.05, gap: 0.2, minPct: 0.0012 },
    'Max': { span: 0.07, gap: 0.24, minPct: 0.0016 },
  };
  const cfg = rangePadCfg[rangeKey] || rangePadCfg['30T'];
  const magnitude = Math.max(Math.abs(tightMax), Math.abs(tightMin), 1);
  const focusPad = Math.max(tightSpan * cfg.span, maxGap * cfg.gap, magnitude * cfg.minPct, 0.5);
  const minV = showInvested && emphasizeGap ? (tightMin - focusPad) : (rawMin - basePad);
  const maxV = showInvested && emphasizeGap ? (tightMax + focusPad) : (rawMax + basePad);
  const range = maxV - minV || 1;
  const niceStep = (rawStep) => {
    const safe = Math.max(rawStep, 0.000001);
    const exp = Math.floor(Math.log10(safe));
    const base = safe / (10 ** exp);
    const niceBase = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
    return niceBase * (10 ** exp);
  };
  const targetTicks = rangeKey === '1T' || rangeKey === '7T' ? 5 : 4;
  const tickStep = niceStep(range / targetTicks);
  const axisMin = Math.floor(minV / tickStep) * tickStep;
  const axisMax = Math.ceil(maxV / tickStep) * tickStep;
  const axisRange = Math.max(axisMax - axisMin, tickStep);
  const toX = (i) => padL + (i / (data.length - 1)) * innerW;
  const toY = (v) => padT + (1 - (v - axisMin) / axisRange) * innerH;
  const buildLinePath = (vals) => {
    if (!vals.length) return '';
    if (!step) {
      return `M${toX(0)},${toY(vals[0])} ` + data.slice(1).map((d, i) => `L${toX(i+1)},${toY(vals[i+1])}`).join(' ');
    }
    let p = `M${toX(0)},${toY(vals[0])}`;
    for (let i = 1; i < vals.length; i++) {
      p += ` L${toX(i)},${toY(vals[i - 1])} L${toX(i)},${toY(vals[i])}`;
    }
    return p;
  };
  const linePath = buildLinePath(actualVals);
  const investedPath = buildLinePath(investedVals);
  const lerpHexColor = (from, to, ratio) => {
    const parseHex = (hex) => {
      const safe = String(hex || '').replace('#', '');
      if (safe.length !== 6) return [16, 185, 129];
      return [
        parseInt(safe.slice(0, 2), 16),
        parseInt(safe.slice(2, 4), 16),
        parseInt(safe.slice(4, 6), 16),
      ];
    };
    const [r1, g1, b1] = parseHex(from);
    const [r2, g2, b2] = parseHex(to);
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };
  const gradientStart = gradientFrom || color;
  const gradientEnd = gradientTo || color;
  const useDirectionalGradient = Boolean(gradientFrom && gradientTo);
  const actualSegments = Array.from({ length: Math.max(0, data.length - 1) }, (_, i) => {
    const x0 = toX(i);
    const y0 = toY(actualVals[i]);
    const x1 = toX(i + 1);
    const y1 = toY(actualVals[i + 1]);
    const inv0 = investedVals[i] ?? 0;
    const inv1 = investedVals[i + 1] ?? 0;
    const aboveInvested = ((actualVals[i] + actualVals[i + 1]) / 2) >= ((inv0 + inv1) / 2);
    const segmentRatio = (data.length - 2) > 0 ? (i / (data.length - 2)) : 1;
    const stroke = solidLine
      ? color
      : useDirectionalGradient
      ? lerpHexColor(gradientStart, gradientEnd, segmentRatio)
      : (aboveInvested ? '#10b981' : '#ef4444');
    const d = step
      ? `M${x0},${y0} L${x1},${y0} L${x1},${y1}`
      : `M${x0},${y0} L${x1},${y1}`;
    return { d, stroke };
  });
  const areaPath = `${linePath} L${toX(data.length-1)},${padT+innerH} L${toX(0)},${padT+innerH} Z`;
  const yTickVals = showInvested
    ? Array.from({ length: Math.round(axisRange / tickStep) + 1 }, (_, i) => axisMin + (tickStep * i))
    : Array.from(new Set([rawMin, (rawMin + rawMax) / 2, rawMax]));
  const xStep = Math.max(1, Math.floor(data.length / 5));
  const xLabels = data.filter((_, i) => i % xStep === 0 || i === data.length - 1);
  const gradId = `sg_${color.replace('#','')}`;
  const formatYAxis = (v) => {
    if (valueType === 'percent') return `${fmt.number(v, 2)} %`;
    const abs = Math.abs(v);
    if (range <= 2000) return `${fmt.number(v, 2)} €`;
    if (range <= 20000) return `${fmt.number(v, 0)} €`;
    if (abs >= 1000000) return `${(v / 1000000).toFixed(2)}M €`;
    if (abs >= 10000) return `${(v / 1000).toFixed(1)}k €`;
    return `${fmt.number(v, 0)} €`;
  };
  const formatTooltipValue = (v) => {
    if (valueType === 'percent') return `${fmt.number(v, 2)} %`;
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
  };
  const investedNow = investedVals[investedVals.length - 1] ?? 0;
  const investedNowY = toY(investedNow);
  return (
    <div style={{ position: 'relative', userSelect: 'none' }} onMouseLeave={() => setTooltip(null)}>
      <svg viewBox={`0 0 600 ${height}`} width="100%" height={height}
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mx = ((e.clientX - rect.left) / rect.width) * 600;
          const idx = Math.round(((mx - padL) / innerW) * (data.length - 1));
          const clamped = Math.max(0, Math.min(data.length - 1, idx));
          setTooltip({ idx: clamped, x: toX(clamped), y: toY(actualVals[clamped]), d: data[clamped], actual: actualVals[clamped], invested: investedVals[clamped] });
        }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2={useDirectionalGradient ? '1' : '0'} y2={useDirectionalGradient ? '0' : '1'}>
            <stop offset="0%" stopColor={gradientStart} stopOpacity="0.25" />
            <stop offset="100%" stopColor={gradientEnd} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line x1={padL} x2={padL} y1={padT} y2={padT + innerH} stroke="#262626" strokeWidth="1" />
        {yTickVals.map((v, i) => (
          <line key={i} x1={padL} x2={padL+innerW} y1={toY(v)} y2={toY(v)} stroke="#1f1f1f" strokeWidth="1" strokeDasharray="3 3" />
        ))}
        {/* Invested baseline */}
        {showInvested && <path d={investedPath} fill="none" stroke="#6b7280" strokeWidth="1.8" />}
        {/* Area for actual */}
        <path d={areaPath} fill={`url(#${gradId})`} />
        {/* Actual line segments (green above invested, red below) */}
        {actualSegments.map((seg, i) => (
          <path key={`seg_${i}`} d={seg.d} fill="none" stroke={seg.stroke} strokeWidth="2.2" strokeLinecap="round" />
        ))}
        {yTickVals.map((v, i) => (
          <text key={i} x={padL - 6} y={toY(v) + 4} textAnchor="end" fill="#707070" fontSize="10" fontWeight="600">{formatYAxis(v)}</text>
        ))}
        {showInvested && (
          <>
            <line x1={padL - 5} x2={padL} y1={investedNowY} y2={investedNowY} stroke="#8b949e" strokeWidth="1.4" />
            <text x={padL - 8} y={investedNowY - 6} textAnchor="end" fill="#8b949e" fontSize="9" fontWeight="700">INV</text>
          </>
        )}
        {xLabels.map((d, i) => {
          const origIdx = data.indexOf(d);
          return <text key={i} x={toX(origIdx)} y={height - 4} textAnchor="middle" fill="#444" fontSize="9">{d.date}</text>;
        })}
        {tooltip && (
          <>
            <line x1={tooltip.x} x2={tooltip.x} y1={padT} y2={padT+innerH} stroke="#333" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={tooltip.x} cy={tooltip.y} r="4" fill={useDirectionalGradient ? lerpHexColor(gradientStart, gradientEnd, (data.length - 1) > 0 ? (tooltip.idx / (data.length - 1)) : 1) : color} stroke="#0a0a0a" strokeWidth="2" />
          </>
        )}
      </svg>
      {tooltip && (
        <div style={{ position: 'absolute', top: tooltip.y - 10, left: (tooltip.x / 600 * 100) + '%', transform: 'translate(-50%, -100%)', background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#fff', pointerEvents: 'none', zIndex: 10 }}>
          <div style={{ color: '#888', marginBottom: 6 }}>{tooltip.d.date}</div>
          {showInvested && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
              <div style={{ color: '#888', fontSize: 11 }}>Investiert</div>
              <div style={{ color: '#aaa', fontWeight: 700 }}>{formatTooltipValue(tooltip.invested)}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ color: (showInvested ? tooltip.actual >= tooltip.invested : tooltip.actual >= 0) ? '#10b981' : '#ef4444', fontSize: 11 }}>Aktuell</div>
            <div style={{ color: (showInvested ? tooltip.actual >= tooltip.invested : tooltip.actual >= 0) ? '#10b981' : '#ef4444', fontWeight: 800 }}>{formatTooltipValue(tooltip.actual)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function SvgSemiDonutChart({ data, size = 180, emptyState = false }) {
  const height = Math.round(size * 0.56);
  const cx = size / 2;
  const cy = height - 2;
  const R = size * 0.46;
  const r = size * 0.31;
  const midR = (R + r) / 2;
  const strokeW = R - r;
  const safeData = Array.isArray(data) ? data : [];
  const total = safeData.reduce((s, d) => s + d.value, 0);

  const bx1 = cx + midR * Math.cos(Math.PI);
  const by1 = cy + midR * Math.sin(Math.PI);
  const bx2 = cx + midR * Math.cos(0);
  const by2 = cy + midR * Math.sin(0);

  if (emptyState || safeData.length === 0 || total <= 0) {
    return (
      <svg width="100%" style={{ display: 'block', margin: '0 auto', maxWidth: size }} viewBox={`0 0 ${size} ${height}`}>
        <path d={`M${bx1},${by1} A${midR},${midR},0,0,1,${bx2},${by2}`} fill="none" stroke="#2b3a33" strokeWidth={strokeW} opacity="0.75" />
      </svg>
    );
  }

  let angle = Math.PI;
  const slices = safeData.map(d => {
    const sweep = (d.value / total) * Math.PI;
    const a1 = angle, a2 = angle + sweep;
    angle = a2;
    const x1 = cx + midR * Math.cos(a1), y1 = cy + midR * Math.sin(a1);
    const x2 = cx + midR * Math.cos(a2), y2 = cy + midR * Math.sin(a2);
    const lg = sweep > Math.PI ? 1 : 0;
    const pct = (d.value / total) * 100;
    const m = a1 + sweep / 2;
    const lx = cx + midR * Math.cos(m);
    const ly = cy + midR * Math.sin(m);
    return {
      ...d,
      pct,
      path: `M${x1},${y1} A${midR},${midR},0,${lg},1,${x2},${y2}`,
      labelX: lx,
      labelY: ly,
    };
  });

  return (
    <svg width="100%" style={{ display: 'block', margin: '0 auto', maxWidth: size }} viewBox={`0 0 ${size} ${height}`}>
      <path d={`M${bx1},${by1} A${midR},${midR},0,0,1,${bx2},${by2}`} fill="none" stroke="#1b1b1b" strokeWidth={strokeW} />
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill="none" stroke={s.color} strokeWidth={strokeW} strokeLinecap="butt" opacity="0.95" />
      ))}
      {slices.map((s, i) => (
        s.pct >= 5 ? (
          <text key={`t_${i}`} x={s.labelX} y={s.labelY + 3} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" opacity="0.95">
            {Math.round(s.pct)}%
          </text>
        ) : null
      ))}
    </svg>
  );
}

function Dashboard() {
  const { assets, refreshPrices,
    isRefreshing, countdown, lastRefresh, settings, setSettings, isMobile } = useApp();
  const { user } = useAuth();
  const [range, setRange] = useState('30T');
  const [showDailyOverview, setShowDailyOverview] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [chartMode, setChartMode] = useState('wealth'); // wealth | performance
  const [preMarketRows, setPreMarketRows] = useState([]);
  const [preMarketLoading, setPreMarketLoading] = useState(false);
  const [preMarketUpdatedAt, setPreMarketUpdatedAt] = useState(null);
  const PREMARKET_REFRESH_MS = 60000;

  const includeBankInDashboard = settings?.includeBankInDashboard !== false;
  const includeValuablesInDashboard = settings?.includeValuablesInDashboard !== false;

  const dashboardAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (!includeBankInDashboard && asset.type === 'bank') return false;
      if (!includeValuablesInDashboard && asset.type === 'valuables') return false;
      return true;
    });
  }, [assets, includeBankInDashboard, includeValuablesInDashboard]);

  const isEmptyPortfolio = assets.length === 0;

  const updateDashboardScope = useCallback((key, checked) => {
    setSettings((prev) => ({ ...(prev || {}), [key]: checked }));
  }, [setSettings]);

  const totalValue = useMemo(() => dashboardAssets.reduce((sum, a) => sum + ((a.amount || 0) * (a.currentPrice || 0)), 0), [dashboardAssets]);
  const totalCost = useMemo(() => dashboardAssets.reduce((sum, a) => {
    const avgPrice = a.avgPurchasePrice || a.purchasePrice || 0;
    return sum + ((a.amount || 0) * avgPrice);
  }, 0), [dashboardAssets]);
  const totalProfit = totalValue - totalCost;
  const totalProfitPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  const [rangePerfReal, setRangePerfReal] = useState(null);

  const chartData = useMemo(() => generateChartData(dashboardAssets, range), [dashboardAssets, range]);
  const rangePerfFallback = useMemo(() => {
    if (!chartData.length) {
      return { delta: 0, pct: 0 };
    }
    const firstMeaningful = chartData.find((row) => Number(row?.actual || 0) > 0 || Number(row?.invested || 0) > 0) || chartData[0];
    const firstActual = Number(firstMeaningful?.actual || 0);
    const firstInvested = Number(firstMeaningful?.invested || 0);
    const baseline = firstActual > 0 ? firstActual : firstInvested;
    const lastActual = Number(chartData[chartData.length - 1]?.actual || 0);
    const delta = lastActual - baseline;
    const pct = baseline > 0 ? (delta / baseline) * 100 : 0;
    return { delta, pct };
  }, [chartData]);

  useEffect(() => {
    let cancelled = false;

    const startOfDay = (d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };

    const toValidDate = (value) => {
      if (!value) return null;
      const dt = new Date(value);
      return Number.isFinite(dt.getTime()) ? dt : null;
    };

    const getRangeStartDate = () => {
      const now = new Date();
      switch (range) {
        case '1T': return startOfDay(now);
        case '7T': return new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        case '30T': return new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        case '3M': {
          const d = new Date(now);
          d.setMonth(d.getMonth() - 3);
          return d;
        }
        case '6M': {
          const d = new Date(now);
          d.setMonth(d.getMonth() - 6);
          return d;
        }
        case '1J': {
          const d = new Date(now);
          d.setFullYear(d.getFullYear() - 1);
          return d;
        }
        case 'YTD': return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        case 'Max': {
          const earliest = dashboardAssets.reduce((minDate, asset) => {
            const candidates = [];
            if (Array.isArray(asset?.purchases)) {
              asset.purchases.forEach((p) => {
                const d = toValidDate(p?.date);
                if (d) candidates.push(d);
              });
            }
            const purchaseDate = toValidDate(asset?.purchaseDate);
            if (purchaseDate) candidates.push(purchaseDate);
            const currentMin = candidates.length ? candidates.reduce((a, b) => a < b ? a : b) : null;
            if (!currentMin) return minDate;
            if (!minDate) return currentMin;
            return currentMin < minDate ? currentMin : minDate;
          }, null);
          return earliest ? startOfDay(earliest) : new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
        }
        default:
          return new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      }
    };

    const getAmountAtDate = (asset, date) => {
      const dateMs = date.getTime();
      if (Array.isArray(asset?.purchases) && asset.purchases.length) {
        return asset.purchases.reduce((sum, p) => {
          const pDate = toValidDate(p?.date);
          const amount = Number(p?.amount || 0);
          if (!pDate || !Number.isFinite(amount) || amount <= 0) return sum;
          return pDate.getTime() <= dateMs ? sum + amount : sum;
        }, 0);
      }
      const purchaseDate = toValidDate(asset?.purchaseDate);
      const amount = Number(asset?.amount || 0);
      if (!purchaseDate || !Number.isFinite(amount) || amount <= 0) return 0;
      return purchaseDate.getTime() <= dateMs ? amount : 0;
    };

    const resolveYahooTicker = (asset) => {
      const base = String(asset?.xetrSymbol || asset?.symbol || '').trim().toUpperCase();
      if (!base) return '';
      if ((asset?.type || '').toLowerCase() === 'crypto') {
        if (base.includes('-')) return base;
        return `${base}-EUR`;
      }
      return base.replace(':', '.');
    };

    const fetchStartPrice = async (asset, rangeStart, rangeEnd) => {
      const type = String(asset?.type || '').toLowerCase();
      const currentPrice = Number(asset?.currentPrice || 0);
      if (type === 'bank' || type === 'valuables') {
        return Number.isFinite(currentPrice) && currentPrice > 0
          ? { price: currentPrice, isHistorical: false }
          : null;
      }

      const ticker = resolveYahooTicker(asset);
      if (!ticker) {
        return Number.isFinite(currentPrice) && currentPrice > 0
          ? { price: currentPrice, isHistorical: false }
          : null;
      }

      const interval = range === '1T' ? '5m' : (range === '7T' ? '1h' : '1d');
      const preloadMs = range === '1T' ? (6 * 60 * 60 * 1000) : (3 * 24 * 60 * 60 * 1000);
      const fromSec = Math.floor((rangeStart.getTime() - preloadMs) / 1000);
      const toSec = Math.floor(rangeEnd.getTime() / 1000);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&period1=${fromSec}&period2=${toSec}`;

      try {
        const res = await fetchWithProxy(url);
        if (!res?.ok) {
          return Number.isFinite(currentPrice) && currentPrice > 0
            ? { price: currentPrice, isHistorical: false }
            : null;
        }
        const payload = await res.json().catch(() => null);
        const result = payload?.chart?.result?.[0];
        const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
        const closes = Array.isArray(result?.indicators?.quote?.[0]?.close) ? result.indicators.quote[0].close : [];
        if (!timestamps.length || !closes.length) {
          return Number.isFinite(currentPrice) && currentPrice > 0
            ? { price: currentPrice, isHistorical: false }
            : null;
        }

        const startMs = rangeStart.getTime();
        const validPoints = timestamps
          .map((ts, idx) => ({ ts: ts * 1000, close: Number(closes[idx]) }))
          .filter((p) => Number.isFinite(p.close) && p.close > 0);
        if (validPoints.length) {
          const firstAfter = validPoints.find((p) => p.ts >= startMs);
          if (firstAfter) return { price: firstAfter.close, isHistorical: true };
          const lastBefore = validPoints[validPoints.length - 1];
          if (lastBefore) return { price: lastBefore.close, isHistorical: true };
        }

        const firstValid = closes.find((x) => Number.isFinite(Number(x)) && Number(x) > 0);
        const parsed = Number(firstValid);
        if (Number.isFinite(parsed) && parsed > 0) return { price: parsed, isHistorical: true };
      } catch (_) {
        // Ignore and fallback to current price below.
      }

      return Number.isFinite(currentPrice) && currentPrice > 0
        ? { price: currentPrice, isHistorical: false }
        : null;
    };

    const computeRangePerformance = async () => {
      if (!dashboardAssets.length) {
        if (!cancelled) setRangePerfReal({ delta: 0, pct: 0 });
        return;
      }

      const rangeStart = getRangeStartDate();
      const now = new Date();

      const rows = await Promise.all(dashboardAssets.map(async (asset) => {
        const amountAtStart = getAmountAtDate(asset, rangeStart);
        if (!(amountAtStart > 0)) return null;

        const startPriceMeta = await fetchStartPrice(asset, rangeStart, now);
        const endPrice = Number(asset?.currentPrice || 0);
        const startPrice = Number(startPriceMeta?.price || 0);
        if (!Number.isFinite(startPrice) || startPrice <= 0 || !Number.isFinite(endPrice) || endPrice <= 0) return null;

        return {
          startValue: amountAtStart * startPrice,
          endValue: amountAtStart * endPrice,
          isHistorical: !!startPriceMeta?.isHistorical,
        };
      }));

      const validRows = rows.filter(Boolean);
      const historicalCount = validRows.reduce((sum, row) => sum + (row?.isHistorical ? 1 : 0), 0);

      if (!validRows.length || historicalCount === 0) {
        if (!cancelled) setRangePerfReal(null);
        return;
      }

      const startTotal = validRows.reduce((sum, row) => sum + (row?.startValue || 0), 0);
      const endTotal = validRows.reduce((sum, row) => sum + (row?.endValue || 0), 0);
      const delta = endTotal - startTotal;
      const pct = startTotal > 0 ? (delta / startTotal) * 100 : 0;

      if (!cancelled) {
        setRangePerfReal({ delta, pct });
      }
    };

    computeRangePerformance();

    return () => {
      cancelled = true;
    };
  }, [dashboardAssets, range]);

  const rangePerf = rangePerfReal || rangePerfFallback;

  const performanceChartData = useMemo(() => {
    if (!chartData.length) return [];
    return chartData.map((d) => {
      const a = Number(d.actual || 0);
      const i = Number(d.invested || 0);
      const perfPct = i > 0 ? ((a - i) / i) * 100 : 0;
      return {
        ...d,
        actual: perfPct,
        invested: 0,
      };
    });
  }, [chartData]);
  const activeChartData = chartMode === 'performance' ? performanceChartData : chartData;
  const bestAsset = useMemo(() => {
    return dashboardAssets.reduce((best, a) => {
      const pct = a.purchasePrice > 0 ? ((a.currentPrice - a.purchasePrice) / a.purchasePrice) * 100 : 0;
      return pct > (best?.pct || -Infinity) ? { ...a, pct } : best;
    }, null);
  }, [dashboardAssets]);

  const totalInvested = useMemo(() => {
    return dashboardAssets.reduce((sum, a) => sum + (a.purchasePrice * a.amount), 0);
  }, [dashboardAssets]);
  const keepCurrencyTogether = useCallback((text) => String(text || '').replace(/\s€/g, '\u00A0€'), []);

  const pieData = useMemo(() => {
    const hexToRgb = (hex) => {
      const clean = String(hex).replace('#', '');
      const n = parseInt(clean, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };
    const mixHex = (a, b, t) => {
      const c1 = hexToRgb(a);
      const c2 = hexToRgb(b);
      const r = Math.round(c1.r + (c2.r - c1.r) * t);
      const g = Math.round(c1.g + (c2.g - c1.g) * t);
      const bch = Math.round(c1.b + (c2.b - c1.b) * t);
      return `rgb(${r}, ${g}, ${bch})`;
    };

    const sorted = dashboardAssets
      .map((a) => {
        const rawValue = (a.amount || 0) * (a.currentPrice || 0);
        const value = Math.round(rawValue);
        return {
          key: a.id,
          name: a.name || a.symbol || 'Unbekannt',
          value,
        };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    const from = '#8b5cf6';
    const to = '#10b981';
    const steps = Math.max(sorted.length - 1, 1);

    return sorted.map((item, idx) => ({
      ...item,
      color: mixHex(from, to, idx / steps),
    }));
  }, [dashboardAssets]);

  const sectorLegendData = useMemo(() => {
    const bySectorMap = new Map();

    dashboardAssets.forEach((a) => {
      const value = Number(a.amount || 0) * Number(a.currentPrice || 0);
      if (!(value > 0)) return;
      const sectorKey = inferAssetDisplayGroup(a);
      bySectorMap.set(sectorKey, (bySectorMap.get(sectorKey) || 0) + value);
    });

    const sorted = Array.from(bySectorMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const palette = buildGradientPalette(sorted.length);
    return sorted.map((row, idx) => ({ ...row, color: palette[idx] }));
  }, [dashboardAssets]);

  const intervalSecs = Math.max(30, settings.refreshInterval || 60);
  const progress = ((intervalSecs - countdown) / intervalSecs) * 100;

  const liveAssets = dashboardAssets.filter(a => a.liveUpdatedAt);
  const dailyOverviewData = useMemo(() => {
    const now = new Date();
    const todayValue = dashboardAssets.reduce((sum, a) => sum + ((a.amount || 0) * (a.currentPrice || 0)), 0);

    if (todayValue <= 0) return [];

    const weightedLivePct = dashboardAssets.reduce((sum, a) => {
      const value = (a.amount || 0) * (a.currentPrice || 0);
      const change = Number(a.liveChange24h);
      if (!Number.isFinite(change) || value <= 0) return sum;
      return sum + (value * change);
    }, 0) / todayValue;

    const dailyPct = Number.isFinite(weightedLivePct) ? weightedLivePct : 0;
    const yesterdayValue = todayValue / (1 + (dailyPct / 100 || 0));
    const delta = todayValue - yesterdayValue;
    const yDate = new Date(now);
    yDate.setDate(now.getDate() - 1);

    return [
      {
        date: fmt.date(yDate),
        actual: 0,
      },
      {
        date: '',
        actual: Math.round(delta * 100) / 100,
      },
      {
        date: fmt.date(now),
        actual: Math.round(delta * 100) / 100,
      }
    ];
  }, [dashboardAssets]);

  const dailyOverviewStats = useMemo(() => {
    const todayValue = dashboardAssets.reduce((sum, a) => sum + ((a.amount || 0) * (a.currentPrice || 0)), 0);
    if (todayValue <= 0) return { delta: 0, pct: 0, rose: true };
    const weightedLivePct = dashboardAssets.reduce((sum, a) => {
      const value = (a.amount || 0) * (a.currentPrice || 0);
      const change = Number(a.liveChange24h);
      if (!Number.isFinite(change) || value <= 0) return sum;
      return sum + (value * change);
    }, 0) / todayValue;
    const pct = Number.isFinite(weightedLivePct) ? weightedLivePct : 0;
    const yesterdayValue = todayValue / (1 + (pct / 100 || 0));
    const delta = todayValue - yesterdayValue;
    return { delta, pct, rose: delta >= 0 };
  }, [dashboardAssets]);

  const dailyMovers = useMemo(() => {
    const scored = dashboardAssets
      .map(a => {
        const fallback = a.purchasePrice > 0 ? ((a.currentPrice - a.purchasePrice) / a.purchasePrice) * 100 : 0;
        const change = Number.isFinite(a.liveChange24h) ? a.liveChange24h : fallback;
        return { ...a, dayChangePct: change };
      })
      .filter(a => Number.isFinite(a.dayChangePct));
    if (!scored.length) return { winner: null, loser: null };
    const winner = scored.reduce((best, a) => a.dayChangePct > best.dayChangePct ? a : best, scored[0]);
    const loser = scored.reduce((worst, a) => a.dayChangePct < worst.dayChangePct ? a : worst, scored[0]);
    return { winner, loser };
  }, [dashboardAssets]);

  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    const salutation = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
    const preferredName = String(settings?.profileName || user?.name || '').trim();
    return preferredName ? `${salutation}, ${preferredName}` : `${salutation}`;
  }, [settings?.profileName, user?.name]);

  const nextDividend = useMemo(() => {
    const annualYieldPct = {
      AAPL: 0.5, MSFT: 0.7, JNJ: 3.0, XOM: 3.2, CVX: 3.9, OXY: 1.4,
      KO: 3.0, PEP: 2.8, PG: 2.4, MCD: 2.3, PFE: 5.8,
      V: 0.8, MA: 0.6, ALV: 5.0, BAS: 6.0, DTE: 3.6, SAP: 1.6
    };

    const dividendAssets = dashboardAssets
      .filter(a => a.type === 'stock')
      .map(a => {
        const symbol = String(a.symbol || a.xetrSymbol || '').toUpperCase();
        const yieldPct = annualYieldPct[symbol];
        if (!yieldPct) return null;
        const value = (a.amount || 0) * (a.currentPrice || 0);
        const nextAmount = (value * (yieldPct / 100)) / 4;
        if (!Number.isFinite(nextAmount) || nextAmount <= 0) return null;
        return { asset: a, amount: nextAmount };
      })
      .filter(Boolean);

    if (!dividendAssets.length) return null;

    const now = new Date();
    const quarterMonths = [2, 5, 8, 11];
    const next = new Date(now);
    const nextMonth = quarterMonths.find(m => m > now.getMonth());
    if (nextMonth == null) {
      next.setFullYear(now.getFullYear() + 1, quarterMonths[0], 15);
    } else {
      next.setFullYear(now.getFullYear(), nextMonth, 15);
    }

    const picked = dividendAssets.sort((a, b) => b.amount - a.amount)[0];
    const daysUntil = Math.max(0, Math.ceil((next - now) / 86400000));
    return { asset: picked.asset, amount: picked.amount, daysUntil };
  }, [dashboardAssets]);

  const loadPreMarketSnapshot = useCallback(async () => {
    setPreMarketLoading(true);
    try {
      // reuse module‑scope helper so HMR keeps the function referenced
      const rows = await fetchPreMarketSnapshot();
      setPreMarketRows(rows);
      setPreMarketUpdatedAt(new Date());
    } finally {
      setPreMarketLoading(false);
    }
  }, []);

  const openDailyOverview = useCallback(() => {
    setShowDailyOverview(true);
    if (!preMarketRows.length && !preMarketLoading) {
      loadPreMarketSnapshot();
    }
  }, [preMarketRows.length, preMarketLoading, loadPreMarketSnapshot]);

  useEffect(() => {
    // prefetch in background so data is ready when modal opens
    loadPreMarketSnapshot();
  }, [loadPreMarketSnapshot]);

  useEffect(() => {
    // keep snapshot warm even when modal is closed
    const timer = setInterval(() => {
      loadPreMarketSnapshot();
    }, PREMARKET_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadPreMarketSnapshot]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{greetingText}</p>
          <p style={{ ...S.sec, fontSize: 12 }}>{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAdd(true)} style={S.btn}><Plus size={15} />Asset hinzufügen</button>
        </div>
      </div>

      <div style={{ marginBottom: isMobile ? 8 : 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minHeight: isMobile ? 'auto' : 430, padding: isMobile ? '8px 8px 8px' : '10px 16px 18px' }}>
          <div style={{ position: 'relative', width: isMobile ? 'min(360px, 92vw)' : 'min(640px, 96vw)', marginTop: isMobile ? 0 : -4 }}>
            <SvgSemiDonutChart data={pieData} size={isMobile ? 360 : 640} emptyState={isEmptyPortfolio} />
            <div style={{ position: 'absolute', left: '50%', top: '76%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none', width: '86%' }}>
              <div style={{ color: '#fff', fontSize: isMobile ? 24 : 30, fontWeight: 800, lineHeight: 1.02, letterSpacing: 0.2 }}>
                {fmt.currency(totalValue)}
              </div>
              {/* Only show performance/gain/percent if there are non-bank/non-valuables assets */}
              {dashboardAssets.some(a => a.type !== 'bank' && a.type !== 'valuables') && (
                <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: rangePerf.delta >= 0 ? '#10b981' : '#ef4444', fontSize: isMobile ? 13 : 16, fontWeight: 800 }}>
                    {rangePerf.delta >= 0 ? '+' : '-'}{fmt.currency(Math.abs(rangePerf.delta))}
                  </span>
                  <span style={{ color: '#3a3a3a', fontWeight: 700 }}>|</span>
                  <span style={{
                    color: rangePerf.delta >= 0 ? '#10b981' : '#ef4444',
                    border: `1px solid ${rangePerf.delta >= 0 ? '#10b98155' : '#ef444455'}`,
                    background: rangePerf.delta >= 0 ? '#10b98115' : '#ef444415',
                    borderRadius: 7,
                    padding: isMobile ? '2px 7px' : '3px 9px',
                    fontSize: isMobile ? 11 : 13,
                    fontWeight: 800
                  }}>
                    {rangePerf.delta >= 0 ? '↑' : '↓'} {fmt.number(Math.abs(rangePerf.pct))}%
                  </span>
                </div>
              )}
            </div>
          </div>
          {isEmptyPortfolio && (
            <div style={{ marginTop: 8, textAlign: 'center', color: '#7d7d7d', fontSize: isMobile ? 12 : 13, fontWeight: 600 }}>
              Füge dein erstes Asset hinzu, um deine Portfolioentwicklung zu sehen.
            </div>
          )}
          <div style={{ marginTop: isMobile ? 10 : 14 }}>
            <TimeRangeBtn selected={range} onChange={setRange} />
          </div>
          {!!sectorLegendData.length && (
            <div style={{ marginTop: isMobile ? 8 : 10, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: isMobile ? 7 : 10, maxWidth: isMobile ? '95vw' : 760 }}>
              {sectorLegendData.slice(0, 8).map((item, idx) => (
                <div key={`sector-legend-${item.name}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: item.color, display: 'inline-block' }} />
                  <span style={{ color: '#777', fontSize: isMobile ? 10 : 11 }}>{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 10 }}>
          {/* Dashboard toggles removed, now only in Settings */}
        </div>

        {/* Live Status Bar */}
        {isMobile ? (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '8px 10px', marginBottom: 10, display: 'grid', gap: 8, width: '100%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: isRefreshing ? '#f59e0b' : '#10b981', boxShadow: `0 0 6px ${isRefreshing ? '#f59e0b' : '#10b981'}`, animation: 'pulse 2s infinite' }} />
              <span style={{ color: '#777', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isRefreshing ? 'Aktualisiere…' : liveAssets.length > 0 ? `${liveAssets.length} Live-Preise` : 'Verbinde…'}
              </span>
              <button
                onClick={() => refreshPrices(false)}
                disabled={isRefreshing}
                style={{ ...S.btnGhost, marginLeft: 'auto', padding: '4px 8px', fontSize: 10, flexShrink: 0 }}
              >
                <RefreshCw size={10} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                {isRefreshing ? 'Lädt…' : 'Jetzt'}
              </button>
            </div>
            {settings.autoRefresh && !isRefreshing && (
              <>
                <div style={{ width: '100%', height: 2, background: '#1e1e1e', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: '#10b981', borderRadius: 2, transition: 'width 1s linear' }} />
                </div>
                <div style={{ color: '#555', fontSize: 10, textAlign: 'right' }}>nächste Aktualisierung in {countdown}s</div>
              </>
            )}
          </div>
        ) : (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '10px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: isRefreshing ? '#f59e0b' : '#10b981', boxShadow: `0 0 6px ${isRefreshing ? '#f59e0b' : '#10b981'}`, animation: 'pulse 2s infinite' }} />
              <span style={{ color: '#555', fontSize: 11 }}>
                {isRefreshing ? 'Aktualisiere…' : liveAssets.length > 0 ? `${liveAssets.length} Live-Preise` : 'Verbinde…'}
              </span>
            </div>
            {settings.autoRefresh && !isRefreshing && (
              <div style={{ flex: 1, height: 2, background: '#1e1e1e', borderRadius: 2, overflow: 'hidden', maxWidth: 120 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#10b981', borderRadius: 2, transition: 'width 1s linear' }} />
              </div>
            )}
            {settings.autoRefresh && !isRefreshing && (
              <span style={{ color: '#2a2a2a', fontSize: 10 }}>nächste Aktualisierung in {countdown}s</span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {lastRefresh && <span style={{ color: '#2a2a2a', fontSize: 10 }}>{lastRefresh.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
              <button onClick={() => refreshPrices(false)} disabled={isRefreshing} style={{ ...S.btnGhost, padding: '4px 10px', fontSize: 11 }}>
                <RefreshCw size={11} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                {isRefreshing ? 'Lädt…' : 'Jetzt'}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={openDailyOverview}
          style={{ ...S.btn, width: '100%', justifyContent: 'center', padding: isMobile ? '10px 12px' : '12px 14px', textAlign: 'center', whiteSpace: isMobile ? 'normal' : 'nowrap', lineHeight: 1.25 }}
        >
          <span style={{ fontSize: isMobile ? 13 : 14, display: 'block', width: '100%' }}>Hier dein täglicher Überblick deines Portfolios</span>
        </button>
      </div>

      {showDailyOverview && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowDailyOverview(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 10 : 14 }}
        >
          <div style={{ width: isMobile ? '100%' : 'min(980px, 96vw)', maxHeight: isMobile ? '92vh' : '90vh', overflowY: 'auto', overflowX: 'hidden', borderRadius: isMobile ? 10 : 14, background: '#0e0e0e', border: '1px solid #1f1f1f', boxShadow: '0 20px 60px rgba(0,0,0,.45)' }}>
            <div style={{ height: 2, background: 'linear-gradient(90deg, #3b82f6, #10b981)' }} />
            <div style={{ padding: isMobile ? '10px 12px' : '14px 16px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 800, background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Dein täglicher Überblick</div>
              <button onClick={() => setShowDailyOverview(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: isMobile ? 12 : 16 }}>
              <div style={{ color: dailyOverviewStats.rose ? '#34d399' : '#ef4444', fontSize: isMobile ? 14 : 16, fontWeight: 800, marginBottom: 12, lineHeight: 1.3 }}>
                Dein Vermögen {dailyOverviewStats.rose ? 'stieg' : 'sank'} um {fmt.currency(Math.abs(dailyOverviewStats.delta))} ({fmt.number(Math.abs(dailyOverviewStats.pct))}%)
              </div>

              <SvgAreaChart data={dailyOverviewData} color="#10b981" solidLine={true} height={isMobile ? 190 : 240} step={true} showInvested={false} />

              <div style={{ marginTop: 12, border: '1px solid #1f1f1f', borderRadius: 9, padding: isMobile ? '10px 10px' : '10px 12px', background: '#0f0f0f' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <div style={{ color: '#93c5fd', fontSize: 12, fontWeight: 700 }}>Vorbörsliche Entwicklung</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {preMarketUpdatedAt && (
                      <span style={{ color: '#5f5f5f', fontSize: 10 }}>
                        {preMarketUpdatedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    )}
                    <button
                      onClick={loadPreMarketSnapshot}
                      disabled={preMarketLoading}
                      style={{ ...S.btnGhost, padding: '4px 8px', fontSize: 10, border: '1px solid #3b82f655', color: '#93c5fd' }}
                    >
                      <RefreshCw size={10} style={{ animation: preMarketLoading ? 'spin 1s linear infinite' : 'none' }} />
                      {preMarketLoading ? 'Lädt…' : 'Aktualisieren'}
                    </button>
                  </div>
                </div>

                {preMarketRows.length === 0 && preMarketLoading ? (
                  <div style={{ color: '#7a7a7a', fontSize: 12 }}>Lade Vorbörsen-Daten…</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                    {preMarketRows.map((row) => {
                      // Logische Darstellung für Bankkonto und Wertgegenstände
                      if (row.type === 'bank') {
                        // Nur Kontostand und ggf. Zinssatz anzeigen
                        return (
                          <div key={row.id} style={{ border: '1px solid #1d1d1d', borderRadius: 8, padding: '8px 10px', background: '#101010', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ color: '#ececec', fontSize: 12, fontWeight: 700 }}>{row.bankName || row.label}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#ececec', fontSize: 12, fontWeight: 700 }}>Kontostand</div>
                              <div style={{ color: '#10b981', fontSize: 13, fontWeight: 700 }}>{fmt.currency(row.price)}</div>
                              {row.interestRate ? (
                                <div style={{ color: '#888', fontSize: 11 }}>Zinssatz: {fmt.number(row.interestRate, 2)}%</div>
                              ) : null}
                            </div>
                          </div>
                        );
                      } else if (row.type === 'valuables') {
                        return (
                          <div key={row.id} style={{ border: '1px solid #1d1d1d', borderRadius: 8, padding: '8px 10px', background: '#101010', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ color: '#ececec', fontSize: 12, fontWeight: 700 }}>{row.label}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#ececec', fontSize: 12, fontWeight: 700 }}>Wert</div>
                              <div style={{ color: '#3b82f6', fontSize: 13, fontWeight: 700 }}>{fmt.currency(row.price)}</div>
                              {row.brand || row.model ? (
                                <div style={{ color: '#888', fontSize: 11 }}>{row.brand ? row.brand : ''} {row.model ? row.model : ''}</div>
                              ) : null}
                            </div>
                          </div>
                        );
                      } else {
                        // Standard für Aktien/Krypto/ETF
                        const up = Number(row.points) >= 0;
                        const valueUnit = row.valueKind === 'points'
                          ? 'Punkte'
                          : (row.currency === 'EUR' ? 'EUR' : (row.currency === 'USD' ? 'USD' : ''));
                        return (
                          <div key={row.id} style={{ border: '1px solid #1d1d1d', borderRadius: 8, padding: '8px 10px', background: '#101010', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ color: '#ececec', fontSize: 12, fontWeight: 700 }}>{row.label}</div>
                              {row.available ? (
                                <div style={{ color: '#6b6b6b', fontSize: 10 }}>{fmt.number(row.price, row.decimals)} {valueUnit}</div>
                              ) : (
                                <div style={{ color: '#6b6b6b', fontSize: 10 }}>Keine Live-Daten</div>
                              )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: up ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: 800 }}>
                                {up ? '+' : '-'}{fmt.number(Math.abs(row.points), row.decimals)} Punkte
                              </div>
                              <div style={{ color: up ? '#10b981' : '#ef4444', fontSize: 11, fontWeight: 700 }}>
                                {fmt.percent(row.pct, 2)}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                <div style={{ border: '1px solid #1f1f1f', borderRadius: 9, padding: '10px 12px', background: '#0f0f0f' }}>
                  <div style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>Größter Gewinner</div>
                  {dailyMovers.winner ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AssetIcon asset={dailyMovers.winner} size={28} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#10b981', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dailyMovers.winner.name}</div>
                        <div style={{ color: '#10b981', fontSize: 12, fontWeight: 700 }}>{fmt.number(dailyMovers.winner.dayChangePct)}%</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#888', fontSize: 13 }}>—</div>
                  )}
                </div>

                <div style={{ border: '1px solid #1f1f1f', borderRadius: 9, padding: '10px 12px', background: '#0f0f0f' }}>
                  <div style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>Größter Verlierer</div>
                  {dailyMovers.loser ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AssetIcon asset={dailyMovers.loser} size={28} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dailyMovers.loser.name}</div>
                        <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 700 }}>{fmt.number(dailyMovers.loser.dayChangePct)}%</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#888', fontSize: 13 }}>—</div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 10, border: '1px solid #1f1f1f', borderRadius: 9, padding: '10px 12px', background: '#0f0f0f' }}>
                <div style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>Nächste erwartete Dividende</div>
                {nextDividend ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AssetIcon asset={nextDividend.asset} size={28} />
                    <div>
                      <div style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>{fmt.currency(nextDividend.amount)}</div>
                      <div style={{ color: '#888', fontSize: 12 }}>in {nextDividend.daysUntil} Tagen</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>Keine Dividenden-Daten verfügbar</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 14 }}>
        {[
          { icon: <TrendingDown size={16} />, label: 'Investiert', value: keepCurrencyTogether(fmt.currency(totalInvested)), sub: `${dashboardAssets.length} Assets` },
          { icon: totalProfitPct >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />, label: 'IZF (ROI)', value: <span style={{ color: totalProfitPct >= 0 ? '#10b981' : '#ef4444' }}>{fmt.percent(totalProfitPct)}</span>, sub: `Rendite in %` },
          { icon: totalProfit >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />, label: 'Realisierte G/V', value: <span style={{ color: totalProfit >= 0 ? '#10b981' : '#ef4444' }}>{keepCurrencyTogether(fmt.currency(totalProfit))}</span>, sub: keepCurrencyTogether(fmt.currency(totalValue)) },
        ].map((card, i) => (
          <div key={i} style={{ ...S.card, padding: isMobile ? '11px 10px' : '12px 12px', borderRadius: 10, minHeight: isMobile ? 78 : 86, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 6, minWidth: 0 }}>
              <span style={{ ...S.sec, fontSize: isMobile ? 9 : 11, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{card.label}</span>
              <div style={{ color: '#2a2a2a', transform: 'scale(0.9)' }}>{card.icon}</div>
            </div>
            <div style={{ fontSize: isMobile ? 'clamp(11px, 3.2vw, 16px)' : 20, fontWeight: 700, marginBottom: 2, lineHeight: 1.15, whiteSpace: 'nowrap' }}>{card.value}</div>
            <div style={{ ...S.sec, fontSize: isMobile ? 9 : 11, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...S.card, padding: isMobile ? '12px' : '14px' }}>
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <h3 style={S.h3}>{chartMode === 'wealth' ? 'Vermögensentwicklung' : 'Performance'}</h3>
            <div style={{ display: 'inline-flex', background: '#111', border: '1px solid #232323', borderRadius: 8, padding: 2 }}>
              <button
                onClick={() => setChartMode('wealth')}
                style={{
                  border: 'none',
                  background: chartMode === 'wealth' ? '#10b981' : 'transparent',
                  color: chartMode === 'wealth' ? '#fff' : '#666',
                  borderRadius: 6,
                  padding: '5px 9px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Vermögen
              </button>
              <button
                onClick={() => setChartMode('performance')}
                style={{
                  border: 'none',
                  background: chartMode === 'performance' ? '#10b981' : 'transparent',
                  color: chartMode === 'performance' ? '#fff' : '#666',
                  borderRadius: 6,
                  padding: '5px 9px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Performance
              </button>
            </div>
          </div>
          <SvgAreaChart
            data={activeChartData}
            color="#10b981"
            solidLine={true}
            valueType={chartMode === 'performance' ? 'percent' : 'currency'}
            height={280}
            step={true}
            showInvested={chartMode === 'wealth'}
            emphasizeGap={chartMode === 'wealth'}
            rangeKey={range}
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
            <TimeRangeBtn selected={range} onChange={setRange} compact={isMobile} singleRow={isMobile} justify="center" />
          </div>
        </div>
      </div>

      {/* Beste Position mit Logo */}
      {bestAsset && (
        <div style={{ ...S.card, marginBottom: 20, display: 'flex', alignItems: 'center', flexDirection: 'row', gap: isMobile ? 10 : 20, padding: isMobile ? 14 : 24 }}>
          <AssetIcon asset={bestAsset} size={isMobile ? 56 : 80} />
          <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>🏆 Beste Position</div>
            <h3 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bestAsset.name}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: isMobile ? 10 : 16, marginTop: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#888', fontSize: 11, marginBottom: 2 }}>Kursgewinn</div>
                <div style={{ color: '#f59e0b', fontSize: isMobile ? 14 : 16, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmt.percent(bestAsset.pct)}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#888', fontSize: 11, marginBottom: 2 }}>Aktueller Kurs</div>
                <div style={{ color: '#eee', fontSize: isMobile ? 13 : 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>€{bestAsset.currentPrice.toFixed(2)}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#888', fontSize: 11, marginBottom: 2 }}>Kaufkurs</div>
                <div style={{ color: '#999', fontSize: isMobile ? 13 : 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>€{bestAsset.purchasePrice.toFixed(2)}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#888', fontSize: 11, marginBottom: 2 }}>Anzahl</div>
                <div style={{ color: '#999', fontSize: isMobile ? 13 : 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bestAsset.amount}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdd && <AddAssetModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AI ANALYSIS PAGE — 10 Module
// ═══════════════════════════════════════════════════════════════════

const ANALYSIS_MODULES = [
  { id: 'fundamental', icon: Briefcase, label: 'Fundamentalanalyse', sub: 'Goldman Sachs Stil', color: '#10b981', desc: 'Vollständige Unternehmensanalyse: Geschäftsmodell, Profitabilität, Bilanz, Moat, Bewertung' },
  { id: 'technical', icon: LineChart, label: 'Technische Analyse', sub: 'Morgan Stanley Stil', color: '#3b82f6', desc: 'Chart-Analyse: Trends, Support/Resistance, MAs, RSI, MACD, Bollinger, Fibonacci' },
  { id: 'risk', icon: Shield, label: 'Risikoanalyse', sub: 'Bridgewater Stil', color: '#f59e0b', desc: 'Volatilität, Beta, Max Drawdown, Korrelation, Hedging-Strategien' },
  { id: 'earnings', icon: BarChart2, label: 'Earnings Analyse', sub: 'JPMorgan Stil', color: '#8b5cf6', desc: 'Quartalszahlen, Konsensschätzungen, Guidance, Options-Bewegungen' },
  { id: 'dividend', icon: DollarSign, label: 'Dividendenanalyse', sub: 'BlackRock Stil', color: '#ec4899', desc: 'Dividendenrendite, Wachstum, Ausschüttungsquote, DRIP, Steueroptimierung' },
  { id: 'sector', icon: PieChartIcon, label: 'Sektor-Rotation', sub: 'Citadel Stil', color: '#14b8a6', desc: 'Wirtschaftszyklus, Sektorperformance, Kapitalflüsse, optimale Gewichtung' },
  { id: 'quant', icon: Brain, label: 'Quant. Screener', sub: 'Renaissance Technologies Stil', color: '#f97316', desc: 'Faktorbasiertes Screening: Value, Quality, Momentum, Growth, Sentiment' },
  { id: 'etf', icon: Layers, label: 'ETF Portfolio Builder', sub: 'Vanguard Stil', color: '#06b6d4', desc: 'Asset Allocation, Kern-ETFs, Satelliten, Rebalancing, Sparplan-Strategie' },
  { id: 'options', icon: Zap, label: 'Optionsstrategie', sub: 'D.E. Shaw Stil', color: '#a855f7', desc: 'Covered Calls, CSPs, Spreads, Straddles, Iron Condors — Greeks & Exit' },
  { id: 'macro', icon: Globe, label: 'Makro-Marktausblick', sub: 'Two Sigma Stil', color: '#ef4444', desc: 'BIP, Inflation, Fed-Politik, Kreditmärkte, Marktbreite, Sentiment, Positioning' },
];

// ═══════════════════════════════════════════════════════════════════
// AI ANALYSIS PAGE — 10 Module
// ═══════════════════════════════════════════════════════════════════



// (removed duplicate ANALYSIS_MODULES)


// ── Shared prompt structure per module ───────────────────────────────
// Each module asks Claude to return structured JSON for dashboard display
// plus a natural-language summary per tab. Response MUST be valid JSON.

const MODULE_TABS = {
  fundamental: ['Business', 'Finanzen', 'Bilanz', 'Moat', 'Bewertung', 'Risiken', 'Fazit'],
  technical:   ['Trend', 'Levels', 'Indikatoren', 'Muster', 'Setup', 'Fazit'],
  risk:        ['Volatilität', 'Drawdown', 'Korrelation', 'Stress-Test', 'Hedging', 'Fazit'],
  earnings:    ['Historie', 'Schätzungen', 'KPIs', 'Guidance', 'Reaktion', 'Strategie'],
  dividend:    ['Rendite', 'Wachstum', 'Sicherheit', 'Projektion', 'Steuer', 'Fazit'],
  sector:      ['Zyklus', 'Performance', 'Kapitalfluss', 'Bewertung', 'ETFs', 'Positionierung'],
  quant:       ['Value', 'Quality', 'Momentum', 'Growth', 'Sentiment', 'Score'],
  etf:         ['Allocation', 'Core-ETFs', 'Satelliten', 'Rebalancing', 'Steuer', 'Fazit'],
  options:     ['Ausblick', 'Strategien', 'Setups', 'Greeks', 'Risk/Reward', 'Exit'],
  macro:       ['Makrodaten', 'Geldpolitik', 'Märkte', 'Risiken', 'Positioning', 'Ausblick'],
};

// ── Helpers ──────────────────────────────────────────────────────────

function parseNum(str) {
  if (!str) return null;
  const s = String(str).replace(/[€$%,]/g,'').replace(',','.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function KpiCard({ label, value, sub, color = '#10b981', trend, wide }) {
  const trendPos = trend === 'up';
  const trendNeg = trend === 'down';
  return (
    <div style={{
      background: '#111', border: `1px solid #1e1e1e`, borderRadius: 10,
      padding: '12px 14px', flex: wide ? '1 1 160px' : '1 1 110px',
      minWidth: wide ? 160 : 100, position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div style={{ color: '#444', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: wide ? 17 : 15 }}>{value ?? '—'}</span>
        {(trendPos || trendNeg) && (
          <span style={{ color: trendPos ? '#10b981' : '#ef4444', fontSize: 10 }}>
            {trendPos ? '↑' : '↓'}
          </span>
        )}
      </div>
      {sub && <div style={{ color: '#444', fontSize: 10, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function ScoreBar({ label, score, color }) {
  const pct = Math.min(Math.max(score * 10, 0), 100);
  const c = score >= 7 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#777', fontSize: 12 }}>{label}</span>
        <span style={{ color: c, fontWeight: 700, fontSize: 13 }}>{score}<span style={{ color: '#333', fontWeight: 400 }}>/10</span></span>
      </div>
      <div style={{ height: 5, background: '#1e1e1e', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${c}88, ${c})`, borderRadius: 3, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

function Chip({ text, color }) {
  return (
    <span style={{ display: 'inline-block', background: (color || '#10b981') + '18', color: color || '#10b981', border: `1px solid ${(color||'#10b981')}30`, borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 600, margin: '2px' }}>
      {text}
    </span>
  );
}

function MiniBarChart({ data, color }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => Math.abs(parseNum(d.value) || 0)), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 52, marginTop: 8 }}>
      {data.map((d, i) => {
        const v = parseNum(d.value) || 0;
        const h = Math.max((Math.abs(v) / max) * 44, 3);
        const c = v >= 0 ? (color || '#10b981') : '#ef4444';
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ color: c, fontSize: 8, fontWeight: 700 }}>{d.value}</span>
            <div style={{ width: '100%', height: h, background: c + '99', borderRadius: '2px 2px 0 0' }} />
            <span style={{ color: '#333', fontSize: 8, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 30, textOverflow: 'ellipsis' }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function BulletList({ items, color }) {
  if (!items || items.length === 0) return <div style={{ color: '#333', fontSize: 12 }}>—</div>;
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
          <span style={{ color: color || '#10b981', fontSize: 11, marginTop: 2, flexShrink: 0 }}>▸</span>
          <span style={{ color: '#888', fontSize: 12, lineHeight: 1.55 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function KvTable({ rows, color }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div style={{ border: '1px solid #1e1e1e', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', background: i % 2 === 0 ? '#0d0d0d' : '#111', alignItems: 'center' }}>
          <span style={{ color: '#555', fontSize: 11 }}>{r.label}</span>
          <span style={{ color: r.highlight ? (color || '#10b981') : '#ccc', fontWeight: r.highlight ? 700 : 500, fontSize: 12 }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function TwoCol({ left, right }) {
  const { isMobile } = useApp();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

// ── Module-specific dashboard renderers ────────────────────────────

function FundamentalDashboard({ data, color, activeTab }) {
  const t = activeTab;
  const kpis = data.kpis || {};
  const scores = data.scores || {};
  const tabs = data.tabs || {};

  if (t === 'Business') return (
    <TwoCol
      left={<>
        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Geschäftsmodell</div>
        <BulletList items={tabs.Business?.points} color={color} />
        {tabs.Business?.segments?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ color: '#333', fontSize: 10, marginBottom: 6 }}>Segmente</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {tabs.Business.segments.map((s, i) => <Chip key={i} text={s} color={color} />)}
            </div>
          </div>
        )}
      </>}
      right={<>
        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Umsatz-Mix</div>
        <MiniBarChart data={tabs.Business?.revenueBreakdown} color={color} />
        {kpis.revenue && <KpiCard label="Umsatz (TTM)" value={kpis.revenue} color={color} wide />}
      </>}
    />
  );

  if (t === 'Finanzen') return (
    <TwoCol
      left={<>
        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Margen & Profitabilität</div>
        <BulletList items={tabs.Finanzen?.points} color={color} />
      </>}
      right={<>
        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Margen-Überblick</div>
        <KvTable color={color} rows={[
          { label: 'Bruttomarge', value: kpis.grossMargin || '—', highlight: true },
          { label: 'Operative Marge', value: kpis.opMargin || '—' },
          { label: 'Nettomarge', value: kpis.netMargin || '—' },
          { label: 'FCF-Marge', value: kpis.fcfMargin || '—' },
        ]} />
        <MiniBarChart data={tabs.Finanzen?.marginTrend} color={color} />
      </>}
    />
  );

  if (t === 'Bilanz') return (
    <TwoCol
      left={<>
        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Bilanz-Analyse</div>
        <BulletList items={tabs.Bilanz?.points} color={color} />
      </>}
      right={<>
        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Kennzahlen</div>
        <KvTable color={color} rows={[
          { label: 'Cash & Investments', value: kpis.cash || '—', highlight: true },
          { label: 'Gesamtverschuldung', value: kpis.debt || '—' },
          { label: 'Net Debt', value: kpis.netDebt || '—' },
          { label: 'Current Ratio', value: kpis.currentRatio || '—' },
          { label: 'Eigenkapital', value: kpis.equity || '—' },
        ]} />
      </>}
    />
  );

  if (t === 'Moat') return (
    <TwoCol
      left={<>
        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Wettbewerbsvorteile</div>
        <BulletList items={tabs.Moat?.points} color={color} />
      </>}
      right={<>
        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Moat-Faktoren</div>
        {(tabs.Moat?.factors || []).map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ color: '#777', fontSize: 12 }}>{f}</span>
          </div>
        ))}
      </>}
    />
  );

  if (t === 'Bewertung') return (
    <TwoCol
      left={<>
        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Bewertung</div>
        <BulletList items={tabs.Bewertung?.points} color={color} />
      </>}
      right={<>
        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Multiples</div>
        <KvTable color={color} rows={[
          { label: 'KGV (P/E)', value: kpis.pe || '—', highlight: true },
          { label: 'Fwd. KGV', value: kpis.fwdPe || '—' },
          { label: 'EV/EBITDA', value: kpis.evEbitda || '—' },
          { label: 'KBV (P/B)', value: kpis.pb || '—' },
          { label: 'PEG', value: kpis.peg || '—' },
        ]} />
      </>}
    />
  );

  if (t === 'Risiken') return (
    <TwoCol
      left={<>
        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Bull-Szenario</div>
        <BulletList items={tabs.Risiken?.bull} color="#10b981" />
      </>}
      right={<>
        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Bear-Szenario</div>
        <BulletList items={tabs.Risiken?.bear} color="#ef4444" />
      </>}
    />
  );

  if (t === 'Fazit') return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {Object.entries(scores).map(([k, v]) => <ScoreBar key={k} label={k} score={v} color={color} />)}
      </div>
      <div style={{ padding: '14px 18px', background: '#111', borderRadius: 10, border: `1px solid ${color}30` }}>
        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Zusammenfassung</div>
        <BulletList items={data.summary} color={color} />
      </div>
    </div>
  );
  return null;
}

function TechnicalDashboard({ data, color, activeTab }) {
  const { isMobile } = useApp();
  const t = activeTab;
  const kpis = data.kpis || {};
  const tabs = data.tabs || {};

  if (t === 'Trend') return (
    <TwoCol
      left={<>
        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Trendanalyse</div>
        <BulletList items={tabs.Trend?.points} color={color} />
      </>}
      right={<>
        <KvTable color={color} rows={[
          { label: 'Kurzfrist (Daily)', value: kpis.trendDaily || '—', highlight: true },
          { label: 'Mittelfrist (Weekly)', value: kpis.trendWeekly || '—' },
          { label: 'Langfrist (Monthly)', value: kpis.trendMonthly || '—' },
          { label: 'Volumen-Trend', value: kpis.volTrend || '—' },
        ]} />
      </>}
    />
  );

  if (t === 'Levels') return (
    <TwoCol
      left={<>
        <div style={{ color: '#10b981', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Support-Zonen</div>
        <BulletList items={tabs.Levels?.support} color="#10b981" />
      </>}
      right={<>
        <div style={{ color: '#ef4444', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Resistance-Zonen</div>
        <BulletList items={tabs.Levels?.resistance} color="#ef4444" />
      </>}
    />
  );

  if (t === 'Indikatoren') return (
    <TwoCol
      left={<>
        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Analyse</div>
        <BulletList items={tabs.Indikatoren?.points} color={color} />
      </>}
      right={<>
        <KvTable color={color} rows={[
          { label: 'RSI (14)', value: kpis.rsi || '—', highlight: true },
          { label: 'MACD-Signal', value: kpis.macd || '—' },
          { label: '20-MA', value: kpis.ma20 || '—' },
          { label: '50-MA', value: kpis.ma50 || '—' },
          { label: '200-MA', value: kpis.ma200 || '—' },
          { label: 'Bollinger', value: kpis.bollinger || '—' },
        ]} />
      </>}
    />
  );

  if (t === 'Muster') return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#1a1a1a', border: `1px solid ${color}30`, borderRadius: 10, padding: 14 }}>
          <div style={{ color: color, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 20 }}>📈</span>Erkanntes Muster
          </div>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{tabs.Muster?.pattern || 'Ascending Triangle'}</div>
          <div style={{ color: '#888', fontSize: 11, marginTop: 6 }}>{tabs.Muster?.description || 'Höhere Tiefs mit Widerstandsniveau, könnte auf erhöhtes Momentum hindeuten.'}</div>
        </div>

        <div style={{ background: '#1a1a1a', border: `1px solid ${color}30`, borderRadius: 10, padding: 14 }}>
          <div style={{ color: color, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 20 }}>⏰</span>Formationsdauer
          </div>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{tabs.Muster?.duration || '23 Tage'}</div>
          <div style={{ color: '#888', fontSize: 11, marginTop: 6 }}>Zeitrahmen des erkannten Musters</div>
        </div>

        <div style={{ background: '#1a1a1a', border: `1px solid ${color}30`, borderRadius: 10, padding: 14 }}>
          <div style={{ color: color, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 20 }}>🎯</span>Mögliches Referenzniveau
          </div>
          <div style={{ color: '#10b981', fontSize: 14, fontWeight: 600 }}>{tabs.Muster?.target || '€185,50'}</div>
          <div style={{ color: '#888', fontSize: 11, marginTop: 6 }}>Beschreibendes Projektionniveau, dient nur zur Orientierung</div>
        </div>
      </div>

      <div style={{ background: '#111', border: `1px solid ${color}20`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <div style={{ color: color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Fibonacci Retracement Levels</div>
        {(tabs.Muster?.fibonacci || [
          { level: '23.6%', price: '€170.45' },
          { level: '38.2%', price: '€165.80' },
          { level: '50.0%', price: '€161.15' },
          { level: '61.8%', price: '€156.50' }
        ]).map((fib, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? `1px solid #222` : 'none', fontSize: 12 }}>
            <span style={{ color: '#888' }}>{fib.level}</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{fib.price}</span>
          </div>
        ))}
      </div>

      <BulletList items={tabs.Muster?.points || [
        'Formation zeigt ein moegliches Ausbruchsmuster',
        'Volumen am Widerstand zeigt eine moegliche Verdichtung',
        'Mehrere Indikatoren zeigen eine moegliche Aufwaertstendenz',
        'Zeitfenster und Richtung bleiben unsicher und dienen nur zur Orientierung'
      ]} color={color} />
    </div>
  );

  if (t === 'Setup') return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Referenzniveau A', value: kpis.entry || '€165,00', color: '#3b82f6' },
          { label: 'Referenzniveau B', value: kpis.stopLoss || '€158,50', color: '#ef4444' },
          { label: 'Referenzniveau C', value: kpis.target1 || '€175,50', color: '#10b981' },
          { label: 'Referenzniveau D', value: kpis.target2 || '€185,00', color: '#f59e0b' },
        ].map((item, i) => (
          <div key={i} style={{ background: '#1a1a1a', border: `1px solid ${item.color}30`, borderRadius: 10, padding: '14px', textAlign: 'center' }}>
            <div style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, fontWeight: 600 }}>{item.label}</div>
            <div style={{ color: item.color, fontWeight: 700, fontSize: 16 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#111', border: `1px solid ${color}20`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ color: color, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18 }}>💡</span>Einordnung
        </div>
        <div style={{ color: '#ddd', fontSize: 13, lineHeight: 1.6 }}>
          {tabs.Setup?.rationale || [
            'Ein Ausbruch am Widerstand koennte auf verstaerktes Momentum hindeuten',
            'Niveaus unterhalb von Support koennten auf erhoehte Ruecksetzungsrisiken hindeuten',
            'Das Verhaeltnis potenzieller Schwankungen zeigt nur eine beschreibende Einordnung'
          ]}
        </div>
      </div>

      <BulletList items={tabs.Setup?.points || [
        'R/R-Verhaeltnis beschreibt nur das moegliche Verhaeltnis von Chance und Risiko',
        'Volumenvergleich zum Durchschnitt zeigt eine moegliche Aktivitaetsveraenderung',
        'Zeitfenster sind modellhafte Szenarien und dienen nur zur Orientierung',
        'Ableitungen sind nicht als konkrete Handlungsanweisung zu verstehen'
      ]} color={color} />
    </div>
  );

  if (t === 'Fazit') return (
    <div>
      <div style={{ padding: '14px 18px', background: '#111', borderRadius: 10, border: `1px solid ${color}30`, marginBottom: 14 }}>
        <BulletList items={data.summary} color={color} />
      </div>
    </div>
  );
  return null;
}

function RiskDashboard({ data, color, activeTab }) {
  const t = activeTab;
  const kpis = data.kpis || {};
  const tabs = data.tabs || {};

  if (t === 'Volatilität') return (
    <TwoCol
      left={<BulletList items={tabs.Volatilität?.points} color={color} />}
      right={<KvTable color={color} rows={[
        { label: 'Volatilität (1J)', value: kpis.vol1y || '—', highlight: true },
        { label: 'Volatilität (3M)', value: kpis.vol3m || '—' },
        { label: 'Beta', value: kpis.beta || '—' },
        { label: 'Implied Vol.', value: kpis.ivol || '—' },
      ]} />}
    />
  );

  if (t === 'Drawdown') return (
    <TwoCol
      left={<BulletList items={tabs.Drawdown?.points} color={color} />}
      right={<KvTable color={color} rows={[
        { label: 'Max Drawdown', value: kpis.maxDrawdown || '—', highlight: true },
        { label: 'Recovery Zeit', value: kpis.recovery || '—' },
        { label: 'Drawdown 2022', value: kpis.dd2022 || '—' },
        { label: 'VaR (95%, 1T)', value: kpis.var95 || '—' },
      ]} />}
    />
  );

  if (t === 'Korrelation') return (
    <TwoCol
      left={<BulletList items={tabs.Korrelation?.points} color={color} />}
      right={<KvTable color={color} rows={(tabs.Korrelation?.table || [])} />}
    />
  );

  if (t === 'Stress-Test') return (
    <div>
      <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Szenarien</div>
      <KvTable color={color} rows={(tabs['Stress-Test']?.scenarios || []).map(s => ({ label: s.label, value: s.impact, highlight: (parseNum(s.impact) || 0) < -20 }))} />
      <div style={{ marginTop: 14 }}><BulletList items={tabs['Stress-Test']?.points} color={color} /></div>
    </div>
  );

  if (t === 'Hedging') return (
    <div><BulletList items={tabs.Hedging?.points} color={color} /></div>
  );

  if (t === 'Fazit') return (
    <div>
      {data.scores && Object.entries(data.scores).map(([k, v]) => <ScoreBar key={k} label={k} score={v} color={color} />)}
      <div style={{ marginTop: 12 }}><BulletList items={data.summary} color={color} /></div>
    </div>
  );
  return null;
}

function GenericDashboard({ data, color, activeTab, tabs }) {
  const tabData = (data.tabs || {})[activeTab] || {};
  const points = tabData.points || tabData.items || tabData.bullets || [];
  const table = tabData.table || tabData.rows || [];
  const chartData = tabData.chart || tabData.bars || [];

  return (
    <div>
      {table.length > 0 && (
        <TwoCol
          left={<BulletList items={points} color={color} />}
          right={<KvTable rows={table} color={color} />}
        />
      )}
      {table.length === 0 && chartData.length > 0 && (
        <TwoCol
          left={<BulletList items={points} color={color} />}
          right={<MiniBarChart data={chartData} color={color} />}
        />
      )}
      {table.length === 0 && chartData.length === 0 && (
        <BulletList items={points.length > 0 ? points : (data.summary || [])} color={color} />
      )}
      {activeTab === tabs[tabs.length - 1] && data.scores && (
        <div style={{ marginTop: 16 }}>
          {Object.entries(data.scores).map(([k, v]) => <ScoreBar key={k} label={k} score={v} color={color} />)}
        </div>
      )}
    </div>
  );
}

// ── Investor Snapshot (top KPI row) ─────────────────────────────────

function InvestorSnapshot({ data, color, moduleId }) {
  const { isMobile } = useApp();
  const kpis = data.kpis || {};
  const verdict = data.verdict;
  const verdictUpper = String(verdict || '').toUpperCase();
  const verdictColor = /HOCH|VORSICHT|RISIKO|BEAR|NEGATIV|WARNUNG|UNATTRAKTIV|SCHWACH/.test(verdictUpper)
    ? '#ef4444'
    : /NEUTRAL|SEITWAERTS|SEITWÄRTS|MITTEL|AUSGEWOGEN/.test(verdictUpper)
      ? '#f59e0b'
      : /NIEDRIG|POSITIV|AUFWAERTS|AUFWÄRTS|STARK|ATTRAKTIV|KONSERVATIV/.test(verdictUpper)
        ? '#10b981'
        : '#3b82f6';
  const verdictEmoji = /HOCH|VORSICHT|RISIKO|BEAR|NEGATIV|WARNUNG|UNATTRAKTIV|SCHWACH/.test(verdictUpper)
    ? '🔴'
    : /NEUTRAL|SEITWAERTS|SEITWÄRTS|MITTEL|AUSGEWOGEN/.test(verdictUpper)
      ? '🟡'
      : /NIEDRIG|POSITIV|AUFWAERTS|AUFWÄRTS|STARK|ATTRAKTIV|KONSERVATIV/.test(verdictUpper)
        ? '🟢'
        : '🔵';

  // Build KPI cards from module-specific keys
  const kpiCards = Object.entries(kpis).filter(([k]) => !['trendDaily','trendWeekly','trendMonthly','volTrend','entry','stopLoss','target1','target2'].includes(k)).slice(0, 7);

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Snapshot header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          {data.stand && <span style={{ background: '#10b98112', color: '#10b981', fontSize: 10, borderRadius: 5, padding: '2px 8px', fontWeight: 600, border: '1px solid #10b98125' }}>📅 Daten: {data.stand}</span>}
          {data.dataNote && <span style={{ background: '#1e1e1e', color: '#555', fontSize: 10, borderRadius: 5, padding: '2px 8px', fontWeight: 600, marginLeft: 6 }}>{data.dataNote}</span>}
        </div>
        {verdict && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: verdictColor + '18', border: `1px solid ${verdictColor}40`, borderRadius: 9, padding: '7px 16px' }}>
            <span style={{ fontSize: 18 }}>{verdictEmoji}</span>
            <div>
              <div style={{ color: verdictColor, fontWeight: 800, fontSize: 15, letterSpacing: 0.5 }}>{verdict}</div>
              <div style={{ color: '#444', fontSize: 9 }}>KI-Einordnung (nur Orientierung)</div>
            </div>
          </div>
        )}
      </div>

      {/* KPI tiles */}
      {kpiCards.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {kpiCards.map(([k, v]) => (
            <KpiCard key={k} label={KPI_LABELS[k] || k} value={v} color={color} />
          ))}
        </div>
      )}

      {/* Scores if present */}
      {data.scores && Object.keys(data.scores).length > 0 && (
        <div style={{ background: '#111', borderRadius: 10, padding: '14px 16px', border: '1px solid #1a1a1a' }}>
          <div style={{ color: '#333', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Score-Übersicht</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '4px 20px' }}>
            {Object.entries(data.scores).map(([k, v]) => <ScoreBar key={k} label={k} score={v} color={color} />)}
          </div>
        </div>
      )}
    </div>
  );
}

const KPI_LABELS = {
  revenue: 'Umsatz TTM', grossMargin: 'Bruttomarge', opMargin: 'Op. Marge', netMargin: 'Nettomarge',
  fcf: 'FCF TTM', fcfMargin: 'FCF-Marge', cash: 'Cash', debt: 'Verschuldung', netDebt: 'Net Debt',
  currentRatio: 'Current Ratio', equity: 'Eigenkapital', pe: 'KGV', fwdPe: 'Fwd. KGV',
  evEbitda: 'EV/EBITDA', pb: 'KBV', peg: 'PEG', rsi: 'RSI', macd: 'MACD',
  ma20: 'MA 20', ma50: 'MA 50', ma200: 'MA 200', bollinger: 'Bollinger',
  beta: 'Beta', vol1y: 'Vola. 1J', maxDrawdown: 'Max DD',
  divYield: 'Dividende', payoutRatio: 'Payout', divGrowth3y: 'Div.-CAGR 3J',
  quantScore: 'Quant-Score', valueFactor: 'Value', qualityFactor: 'Quality', momentumFactor: 'Momentum',
};

// ── JSON prompt builder ──────────────────────────────────────────────

function buildStructuredPrompt(moduleId, base, portfolioSummary) {
  const moduleInstructions = {
    fundamental: `Fundamentalanalyse (Goldman Sachs Stil). Tabs: Business, Finanzen, Bilanz, Moat, Bewertung, Risiken, Fazit.
kpis: revenue, grossMargin, opMargin, netMargin, fcf, fcfMargin, cash, debt, netDebt, currentRatio, equity, pe, fwdPe, evEbitda, pb, peg
scores: Qualität (1-10), Wachstum (1-10), Bewertung (1-10), Risiko (1-10)
  verdict: "POSITIV" | "NEUTRAL" | "VORSICHTIG"
tabs.Business: { points: [5 Punkte], segments: ["iPhone","Services",...], revenueBreakdown: [{label,value}] }
tabs.Finanzen: { points: [5 Punkte], marginTrend: [{label:"Q1",value:"43%"},…] }
tabs.Bilanz: { points: [5 Punkte] }
tabs.Moat: { points: [5 Punkte], factors: ["Network Effect","Brand",...] }
tabs.Bewertung: { points: [5 Punkte] }
tabs.Risiken: { bull: [4 Punkte], bear: [4 Punkte] }
summary: [3 Sätze Fazit]`,

    technical: `Technische Analyse (Morgan Stanley Stil). Tabs: Trend, Levels, Indikatoren, Muster, Setup, Fazit.
kpis: trendDaily, trendWeekly, trendMonthly, rsi, macd, ma20, ma50, ma200, bollinger, volTrend, entry, stopLoss, target1, target2
tabs.Trend: { points: [5 Punkte] }
tabs.Levels: { support: [3-4 Levels mit Kurs], resistance: [3-4 Levels mit Kurs] }
tabs.Indikatoren: { points: [5 Punkte] }
tabs.Muster: { points: [4 Punkte], fibonacci: [{label:"23.6%",value:"€180"},...] }
tabs.Setup: { rationale: [3-4 Punkte] }
summary: [3 Sätze]`,

    risk: `Risikoanalyse (Bridgewater Stil). Tabs: Volatilität, Drawdown, Korrelation, Stress-Test, Hedging, Fazit.
kpis: vol1y, vol3m, beta, ivol, maxDrawdown, recovery, dd2022, var95
scores: Gesamtrisiko (1-10), Volatilitätsrisiko (1-10), Drawdown-Risiko (1-10), Liquiditätsrisiko (1-10)
verdict: "NIEDRIG" | "MITTEL" | "HOCH"
tabs.Volatilität: { points: [5 Punkte] }
tabs.Drawdown: { points: [4 Punkte] }
tabs.Korrelation: { points: [4 Punkte], table: [{label:"S&P500",value:"0.85"},{label:"Anleihen",value:"-0.2"},...] }
tabs["Stress-Test"]: { points: [3 Punkte], scenarios: [{label:"Rezession",impact:"-35%"},{label:"Zinsschock",impact:"-20%"},...] }
tabs.Hedging: { points: [5 Hedging-Strategien] }
summary: [3 Sätze]`,

    earnings: `Earnings-Analyse (JPMorgan Stil). Tabs: Historie, Schätzungen, KPIs, Guidance, Reaktion, Strategie.
kpis: epsQ1, epsQ2, epsQ3, epsQ4, nextEps, nextRevenue, expectedMove
  verdict: "AUFWAERTS" | "NEUTRAL" | "ABWAEGEND"
tabs.Historie: { points: [4 Punkte], table: [{label:"Q4/24",value:"+5.2%",highlight:true},...] }
tabs.Schätzungen: { points: [4 Punkte], table: [{label:"EPS Konsens",value:"X.XX"},{label:"Revenue Konsens",value:"XX Mrd"},...] }
tabs.KPIs: { points: [4 Punkte] }
tabs.Guidance: { points: [4 Punkte] }
tabs.Reaktion: { points: [4 Punkte], table: [{label:"Avg Post-Earnings Move",value:"±X%"},...] }
tabs.Strategie: { points: [5 Strategie-Punkte] }
summary: [3 Sätze]`,

    dividend: `Dividendenanalyse (BlackRock Stil). Tabs: Rendite, Wachstum, Sicherheit, Projektion, Steuer, Fazit.
kpis: divYield, payoutRatio, divGrowth3y, divGrowth5y, divGrowth10y, nextExDate, fcfCoverage
scores: Rendite (1-10), Wachstum (1-10), Sicherheit (1-10), Steuereffizienz (1-10)
  verdict: "STABIL" | "NEUTRAL" | "VORSICHTIG"
tabs.Rendite: { points: [4 Punkte], table: [{label:"Akt. Rendite",value:"X%",highlight:true},...] }
tabs.Wachstum: { points: [4 Punkte], bars: [{label:"3J",value:"X%"},{label:"5J",value:"X%"},{label:"10J",value:"X%"}] }
tabs.Sicherheit: { points: [5 Punkte] }
tabs.Projektion: { points: [3 Punkte], table: [{label:"€10k in 10J",value:"€XXX"},{label:"€10k in 20J (DRIP)",value:"€XXXX"},...] }
tabs.Steuer: { points: [5 Punkte für Deutschland] }
summary: [3 Sätze]`,

    sector: `Sektor-Rotations-Analyse (Citadel Stil). Tabs: Zyklus, Performance, Kapitalfluss, Bewertung, ETFs, Positionierung.
kpis: cyclePhase, topSector, bottomSector, bestETF
verdict: "RISK-ON" | "RISK-OFF" | "NEUTRAL"
tabs.Zyklus: { points: [4 Punkte] }
tabs.Performance: { points: [3 Punkte], bars: [{label:"Tech",value:"X%"},{label:"Energie",value:"X%"},...] }
tabs.Kapitalfluss: { points: [4 Punkte] }
tabs.Bewertung: { points: [3 Punkte], table: [{label:"Tech KGV",value:"XX"},{label:"Health KGV",value:"XX"},...] }
tabs.ETFs: { points: [4 Punkte mit konkreten ETF ISINs] }
tabs.Positionierung: { points: [5 mögliche Positionierungsansätze] }
summary: [3 Sätze]`,

    quant: `Quantitativer Screener (Renaissance Technologies Stil). Tabs: Value, Quality, Momentum, Growth, Sentiment, Score.
kpis: quantScore, valueFactor, qualityFactor, momentumFactor, growthFactor, sentimentFactor
scores: Value (1-10), Quality (1-10), Momentum (1-10), Growth (1-10), Sentiment (1-10)
verdict: "STARK" | "MODERAT" | "SCHWACH"
tabs.Value: { points: [4 Punkte], table: [{label:"KGV",value:"XX"},{label:"KBV",value:"X.X"},...] }
tabs.Quality: { points: [4 Punkte], table: [{label:"ROE",value:"XX%"},{label:"Verschuldung",value:"X.Xx"},...] }
tabs.Momentum: { points: [4 Punkte] }
tabs.Growth: { points: [4 Punkte] }
tabs.Sentiment: { points: [4 Punkte] }
tabs.Score: { points: [4 Punkte Begründung] }
summary: [3 Sätze]`,

    etf: `ETF Portfolio Builder (Vanguard Stil). Tabs: Allocation, Core-ETFs, Satelliten, Rebalancing, Steuer, Fazit.
kpis: expectedReturn, expectedRisk, sharpe, totalTER
verdict: "KONSERVATIV" | "AUSGEWOGEN" | "WACHSTUM"
tabs.Allocation: { points: [4 Punkte], bars: [{label:"Aktien",value:"70%"},{label:"Anleihen",value:"20%"},{label:"Rohstoffe",value:"10%"}] }
tabs["Core-ETFs"]: { points: [3 Punkte], table: [{label:"MSCI World ETF",value:"IE00B4L5Y983 | TER 0.2%",highlight:true},...] }
tabs.Satelliten: { points: [3 Punkte], table: [{label:"EM ETF",value:"ISIN | TER"},...] }
tabs.Rebalancing: { points: [5 Punkte] }
tabs.Steuer: { points: [5 Punkte für Deutschland] }
summary: [3 Sätze]`,

    options: `Optionsstrategie (D.E. Shaw Stil). Tabs: Ausblick, Strategien, Setups, Greeks, Risk/Reward, Exit.
kpis: outlook, ivRank, expectedMove, bestStrategy
verdict: "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATIL"
tabs.Ausblick: { points: [4 Punkte] }
  tabs.Strategien: { points: [5 mögliche Strategien] }
tabs.Setups: { points: [4 Punkte], table: [{label:"Covered Call Strike",value:"XXX"},{label:"Put Strike",value:"XXX"},...] }
tabs.Greeks: { points: [4 Punkte], table: [{label:"Delta",value:"0.5"},{label:"Theta",value:"-0.2"},...] }
tabs["Risk/Reward"]: { points: [4 Punkte], table: [{label:"Max Gewinn",value:"€XXX"},{label:"Max Verlust",value:"€XXX"},{label:"Break-Even",value:"€XXX"},...] }
tabs.Exit: { points: [5 Punkte] }
summary: [3 Sätze]`,

    macro: `Makro-Marktausblick (Two Sigma Stil). Tabs: Makrodaten, Geldpolitik, Märkte, Risiken, Positioning, Ausblick.
kpis: gdpGrowth, inflation, fedRate, vix, fearGreed
  verdict: "AUFWAERTS" | "ABWAEGEND" | "NEUTRAL"
tabs.Makrodaten: { points: [4 Punkte], table: [{label:"US-BIP Wachstum",value:"X%"},{label:"Inflation",value:"X%"},...] }
tabs.Geldpolitik: { points: [4 Punkte] }
tabs.Märkte: { points: [4 Punkte] }
tabs.Risiken: { points: [5 Top-Risiken] }
tabs.Positioning: { points: [5 mögliche Positionierungsansätze] }
tabs.Ausblick: { points: [5 Punkte], table: [{label:"S&P 500 Ziel",value:"XXXX"},{label:"10Y Treasury",value:"X.X%"},...] }
summary: [3 Sätze]`,
  };

  return `${base}
Analysiere und antworte AUSSCHLIESSLICH als valides JSON-Objekt (kein Text davor oder danach, keine Backticks).

Modul: ${moduleId}
${moduleInstructions[moduleId] || 'Erstelle eine professionelle Analyse mit kpis, tabs, scores, verdict, summary Feldern.'}

stand: Neuester verfügbarer Datenstand - IMMER 2025 oder aktuellste verfügbare Daten (z.B. "Q3 2025", "TTM 2025", "FY2025 E")
dataNote: kurze Anmerkung zur Datenbasis

JSON-Struktur:
{
  "stand": "...",
  "dataNote": "...",
  "verdict": "...",
  "kpis": { ... },
  "scores": { "Qualität": 7, "Wachstum": 6, ... },
  "tabs": { "TabName": { "points": [...], "table": [...], ... }, ... },
  "summary": ["Satz 1", "Satz 2", "Satz 3"]
}

Auf Deutsch. Alle Zahlen als Strings mit Einheit (z.B. "43.3%", "394 Mrd $", "28.5x"). Verwende IMMER die neuesten verfügbaren Daten (Stand: 2025). Sei präzise und konkret. Nutze IMMER die neuesten verfügbaren Daten aus 2025 für den 'stand' Wert.
WICHTIG: Keine Finanzberatung, keine Kauf-/Verkaufsempfehlungen, keine konkreten Handlungsanweisungen. Formuliere neutral und beschreibend mit Formulierungen wie "koennte darauf hindeuten", "zeigt moegliche Entwicklung" und "dient nur zur Orientierung".`;
}

// ── Main dashboard renderer ──────────────────────────────────────────

function AnalysisDashboard({ rawJson, moduleId, color, ticker, asset, timeframe }) {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = MODULE_TABS[moduleId] || [];
  const tabLabel = tabs[activeTab] || tabs[0];

  const data = useMemo(() => {
    if (!rawJson) return null;
    try {
      // Strip code fences if present
      const clean = rawJson.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return null;
    }
  }, [rawJson]);

  if (!data) {
    // Fallback: render raw text nicely
    return (
      <div style={{ background: '#111', borderRadius: 10, padding: 20, border: '1px solid #1e1e1e' }}>
        <div style={{ color: '#555', fontSize: 11, marginBottom: 12 }}>Analyse-Ergebnis</div>
        <div style={{ color: '#888', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{rawJson}</div>
      </div>
    );
  }

  const renderTabContent = () => {
    if (moduleId === 'fundamental') return <FundamentalDashboard data={data} color={color} activeTab={tabLabel} />;
    if (moduleId === 'technical') return <TechnicalDashboard data={data} color={color} activeTab={tabLabel} />;
    if (moduleId === 'risk') return <RiskDashboard data={data} color={color} activeTab={tabLabel} />;
    return <GenericDashboard data={data} color={color} activeTab={tabLabel} tabs={tabs} />;
  };

  // compute data quality indicator: green if stand present and some kpis, yellow otherwise
  const dataQuality = () => {
    if (!data) return 'red';
    if (data.stand && data.kpis && Object.keys(data.kpis).length > 0) return 'green';
    if (data.stand) return 'yellow';
    return 'red';
  };

  const assetDisplayLabel = asset ? inferAssetDisplayGroup(asset) : 'Asset';

  return (
    <div>
      {/* header bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #222', paddingBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{asset ? asset.name : ticker} <span style={{ fontSize: 14, color: '#888' }}>({ticker})</span></div>
        <div style={{ fontSize: 10, color: '#bdbdbd', fontWeight: 400 }}>{assetDisplayLabel}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
          <span>Zeitraum:</span>
          <span style={{ fontWeight: 600 }}>{timeframe}</span>
        </div>
        <div style={{ fontSize: 12, color: '#aaa' }}>Stand: {data.stand || '–'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: dataQuality() }}></div>
          <div style={{ fontSize: 12, color: '#aaa' }}>Datenqualität</div>
        </div>
      </div>

      <div style={{ background: '#1b140a', border: '1px solid #6b4f1d', color: '#f4ddb0', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>Diese Analyse stellt keine Finanzberatung dar.</div>
        <div style={{ fontSize: 11, lineHeight: 1.45, color: '#e7cf9f' }}>Die Angaben dienen nur zur Orientierung, es gibt keine Gewaehr fuer Richtigkeit oder Vollstaendigkeit. Entscheidungen liegen beim Nutzer.</div>
      </div>

      {/* KI-Kurzfazit */}
      {data.summary && data.summary.length > 0 && (
        <div style={{ background: '#111', padding: '12px 14px', borderRadius: 10, marginBottom: 16 }}>
          <BulletList items={data.summary.slice(0,5)} color={color} />
        </div>
      )}

      {/* Scorecards */}
      {data.scores && Object.keys(data.scores).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          {Object.entries(data.scores).slice(0,5).map(([k,v]) => (
            <ScoreBar key={k} label={k} score={v} color={color} />
          ))}
        </div>
      )}

      <InvestorSnapshot data={data} color={color} moduleId={moduleId} />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, padding: '4px', background: '#0d0d0d', borderRadius: 10, flexWrap: 'wrap' }}>
        {tabs.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)} style={{
            padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, flex: '1 0 auto',
            background: activeTab === i ? color + '20' : 'transparent',
            color: activeTab === i ? color : '#444',
            outline: activeTab === i ? `1px solid ${color}40` : 'none',
            transition: 'all .15s'
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ background: '#111', borderRadius: 12, padding: '18px 20px', border: '1px solid #1a1a1a', minHeight: 180 }}>
        {renderTabContent()}
      </div>

      {/* Summary */}
      {data.summary && data.summary.length > 0 && (
        <div style={{ background: '#0d0d0d', borderRadius: 10, padding: '14px 18px', marginTop: 12, border: `1px solid ${color}20` }}>
          <div style={{ color: '#333', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>KI-Zusammenfassung</div>
          <BulletList items={data.summary} color={color} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ANALYSIS PAGE MODULES
// ═══════════════════════════════════════════════════════════════════

const MODULES = {
  fundamental: { name: 'Fundamentalanalyse', emoji: '📊' },
  technical: { name: 'Technische Analyse', emoji: '📈' },
  risk: { name: 'Risikoanalyse', emoji: '⚠️' },
  earnings: { name: 'Earnings-Überblick', emoji: '💰' },
  dividend: { name: 'Dividenden-Strategie', emoji: '🎁' },
  quant: { name: 'Quantitative Analyse', emoji: '🔢' },
  options: { name: 'Optionsstrategien', emoji: '📉' },
  macro: { name: 'Makro-Ausblick', emoji: '🌍' },
  sector: { name: 'Sektor-Analyse', emoji: '🏢' },
  etf: { name: 'ETF-Portfolio', emoji: '🎯' }
};

function AnalysisPage() {
  const { assets, settings, xetrDb, isMobile } = useApp();
  const [activeModule, setActiveModule] = useState(null);
  const [ticker, setTicker] = useState('');
  const [inputTicker, setInputTicker] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('1Y'); // 1M/3M/1Y/5Y
  const [suggestions, setSuggestions] = useState([]);

  // helper: find matching asset in portfolio by ticker or name
  const activeAsset = useMemo(() => {
    if (!ticker) return null;
    const lower = ticker.toLowerCase();
    return assets.find(a =>
      (a.symbol && a.symbol.toLowerCase() === lower) ||
      (a.id && a.id.toLowerCase() === lower) ||
      (a.name && a.name.toLowerCase().includes(lower))
    ) || null;
  }, [ticker, assets]);

  // update suggestions when inputTicker changes
  useEffect(() => {
    const q = inputTicker.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const matches = [];
    // first portfolio assets
    assets.forEach(a => {
      if (
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.symbol && a.symbol.toLowerCase().includes(q))
      ) {
        matches.push({ label: `${a.name} (${a.symbol||a.type||''})`, value: a.symbol || a.name });
      }
    });
    // then xetr database if available
    if (xetrDb && Array.isArray(xetrDb)) {
      for (const item of xetrDb) {
        if (matches.length >= 10) break;
        if (
          (item.name && item.name.toLowerCase().includes(q)) ||
          (item.symbol && item.symbol.toLowerCase().includes(q)) ||
          (item.isin && item.isin.toLowerCase().includes(q))
        ) {
          matches.push({ label: `${item.name} (${item.symbol})`, value: item.symbol });
        }
      }
    }
    setSuggestions(matches.slice(0, 10));
  }, [inputTicker, assets, xetrDb]);

  const runAnalysis = async () => {
    if (!activeModule) return;

    setSuggestions([]); // Close suggestions dropdown

    const needsTicker = ['fundamental','technical','risk','earnings','dividend','quant','options','macro','sector','etf'].includes(activeModule);
    const tickerVal = needsTicker ? inputTicker.trim() : '';
    const effectiveQuery = tickerVal || (assets[0]?.symbol || '') || '';
    if (needsTicker && !effectiveQuery) {
      setError('Bitte Aktie/ETF/Crypto Symbol eingeben.');
      return;
    }

    setLoading(true);
    setResult('');
    setError('');

    const backendUrl = (settings?.backendUrl || DEFAULT_BACKEND_URL).replace(/\/$/, '');
    const accessCode = settings?.accessCode || DEFAULT_ACCESS_CODE;

    try {
      const res = await fetch(`${backendUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': accessCode,
        },
        body: JSON.stringify({
          query: effectiveQuery,
          module: activeModule,
          portfolio: assets || [],
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      // Backend liefert strukturiertes JSON. Wir speichern es als String,
      // damit die bestehende UI (AnalysisDashboard) es sauber parsen kann.
      const payload = data.analysis || data;
      setTicker(effectiveQuery);
      setResult(JSON.stringify(payload, null, 2));
    } catch (e) {
      setError(e?.message || 'Analyse fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <HeaderGlyph icon={Brain} color="#10b981" size={40} />
        <div>
          <h1 style={S.h1}>KI-Analyse</h1>
          <div style={{ color: '#444', fontSize: 12, marginTop: 2 }}>Wähle ein Analysemodul und erhalte neutrale, beschreibende Einblicke</div>
        </div>
      </div>

      {!activeModule && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {Object.entries(MODULES).map(([key, module]) => (
              <button key={key} onClick={() => { setActiveModule(key); setInputTicker(''); setResult(''); setError(''); }}
                style={{
                  background: '#111',
                  border: '1px solid #222',
                  borderRadius: 12,
                  padding: '20px 16px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all .2s',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#ddd',
                  minHeight: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.borderColor = '#333'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.borderColor = '#222'; }}>
                <div style={{ fontSize: 32 }}>{module.emoji}</div>
                <div style={{ fontWeight: 600, color: '#fff' }}>{module.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeModule && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <button onClick={() => { setActiveModule(null); setInputTicker(''); setResult(''); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, padding: '5px 10px' }}>
              ← Zurück
            </button>
            <div style={{ fontSize: 28 }}>{MODULES[activeModule].emoji}</div>
            <h2 style={{ ...S.h2, marginBottom: 0 }}>{MODULES[activeModule].name}</h2>
          </div>

          <div style={{ ...S.card, marginBottom: 16 }}>
            <div style={{ color: '#555', fontSize: 11, fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Analysieren</div>
            <div style={{ background: '#1b140a', border: '1px solid #6b4f1d', color: '#f4ddb0', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>Diese Analyse stellt keine Finanzberatung dar.</div>
              <div style={{ fontSize: 10, color: '#e7cf9f' }}>Keine Gewaehr fuer Richtigkeit; Entscheidungen liegen beim Nutzer.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    value={inputTicker}
                    onChange={e => setInputTicker(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') runAnalysis();
                    }}
                    placeholder="z.B. MSCI, AAPL, BTC..."
                    style={{ ...S.input, width: '100%' }}
                    autoFocus
                  />
                  {suggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', border: '1px solid #222', borderRadius: 6, zIndex: 1000, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                      {suggestions.map((s,i) => (
                        <div key={i} onClick={() => { setInputTicker(s.value); setSuggestions([]); }}
                          style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#ddd' , borderBottom: i < suggestions.length-1 ? '1px solid #222' : 'none' }}>
                          {s.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={runAnalysis} disabled={loading} style={{ ...S.btn, minWidth: 140 }}>
                  {loading ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : '🔍 Analysieren'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                <span style={{ color: '#666' }}>Zeitraum:</span>
                {['1M','3M','1Y','5Y'].map(tf => (
                  <button key={tf} onClick={() => setTimeframe(tf)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: `1px solid ${timeframe === tf ? '#8b5cf6' : '#333'}`,
                      background: timeframe === tf ? '#8b5cf620' : 'transparent',
                      color: timeframe === tf ? '#8b5cf6' : '#666',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: timeframe === tf ? 600 : 400,
                      transition: 'all .2s'
                    }}>
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            {error && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 10, padding: '8px 12px', background: '#ef444415', borderRadius: 6 }}>⚠ {error}</div>}
          </div>

          {result && (
            <AnalysisDashboard 
              rawJson={result} 
              moduleId={activeModule} 
              color="#8b5cf6" 
              ticker={ticker} 
              asset={activeAsset}
              timeframe={timeframe}
            />
          )}

          {!result && !loading && (
            <div style={{ ...S.card, color: '#555', textAlign: 'center', padding: '48px 24px', borderStyle: 'dashed' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{MODULES[activeModule].emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Geben Sie ein Symbol ein</div>
              <div style={{ color: '#444', fontSize: 12, marginTop: 6 }}>Nutze Ticker (MSFT), Kryptos (BTC) oder ETF-Namen</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// IMPORT ASSET MODAL
// ═══════════════════════════════════════════════════════════════════

function ImportAssetModal({ onClose, onImport }) {
  const [preview, setPreview] = useState([]);
  const [step, setStep] = useState(1); // 1=upload, 2=preview
  const [error, setError] = useState('');

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const assets = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 4) continue;
      
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });
      
      const asset = {
        id: 'new_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: row.name || row.titel || row.asset || '',
        symbol: row.symbol || row.ticker || '',
        isin: row.isin || '',
        wkn: row.wkn || '',
        amount: parseFloat(row.amount || row.anzahl || 1),
        purchasePrice: parseFloat(row.purchaseprice || row.kaufkurs || row.price || 0),
        purchaseDate: row.purchasedate || row.kauidatum || new Date().toISOString().split('T')[0],
        type: (row.type || row.typ || 'stock').toLowerCase(),
        sector: row.sector || row.sektor || '',
        currentPrice: parseFloat(row.currentprice || row.aktueller || row.price || 0)
      };
      
      if (asset.name && asset.amount > 0 && asset.purchasePrice > 0) {
        assets.push(asset);
      }
    }
    
    return assets;
  };

  const handleFile = async (file) => {
    if (!file) return;
    
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      
      if (parsed.length === 0) {
        setError('Keine gültigen Assets gefunden. Überprüfe die CSV-Struktur.');
        return;
      }
      
      setPreview(parsed);
      setStep(2);
      setError('');
    } catch (e) {
      setError('Fehler beim Lesen der Datei: ' + e.message);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      handleFile(file);
    } else {
      setError('Bitte lade eine CSV-Datei hoch');
    }
  };

  return (
    <div style={S.modal} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modalBox}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={S.h2}>Assets importieren</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding: 22 }}>
          {step === 1 && (
            <div>
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                style={{
                  border: '2px dashed #3b82f6',
                  borderRadius: 12,
                  padding: 40,
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: '#3b82f615',
                  transition: 'all .2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#3b82f630'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#3b82f615'; }}>
                <input type="file" accept=".csv" style={{ display: 'none' }} id="csv-upload" onChange={e => handleFile(e.target.files[0])} />
                <label htmlFor="csv-upload" style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 4 }}>CSV-Datei hochladen</div>
                  <div style={{ fontSize: 13, color: '#666' }}>Ziehe die Datei hierher oder klicke zum Auswählen</div>
                </label>
              </div>

              <div style={{ marginTop: 20, padding: 14, background: '#111', borderRadius: 8, border: '1px solid #222' }}>
                <div style={{ color: '#555', fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>CSV-Format</div>
                <div style={{ fontSize: 12, color: '#666', fontFamily: 'monospace', lineHeight: 1.6 }}>
                  Name,Symbol,ISIN,Amount,PurchasePrice,PurchaseDate,Type<br/>
                  SAP,SAP,DE0007164600,10,142.00,2022-06-01,stock<br/>
                  Bitcoin,BTC,,0.15,28000,2023-01-10,crypto
                </div>
              </div>

              {error && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 12, padding: '8px 12px', background: '#ef444415', borderRadius: 6 }}>⚠ {error}</div>}
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#555', fontSize: 11, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>
                  {preview.length} Assets erkannt
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {preview.map((asset, i) => (
                    <div key={i} style={{ padding: 10, background: '#111', borderRadius: 6, marginBottom: 8, border: '1px solid #222' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{asset.name}</div>
                          <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
                            {asset.symbol && <span style={{ marginRight: 8 }}>{asset.symbol}</span>}
                            {asset.isin && <span style={{ marginRight: 8 }}>ISIN: {asset.isin}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>{asset.amount} × {fmt.currency(asset.purchasePrice)}</div>
                          <div style={{ color: '#666', fontSize: 11 }}>{asset.type}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12, padding: '8px 12px', background: '#ef444415', borderRadius: 6 }}>⚠ {error}</div>}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #1e1e1e', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {step === 2 && (
            <button onClick={() => setStep(1)} style={S.btnGhost}>Zurück</button>
          )}
          {step === 1 && (
            <button onClick={onClose} style={S.btnGhost}>Abbrechen</button>
          )}
          {step === 2 && (
            <button onClick={() => { onImport(preview); }} style={S.btn}>
              <Plus size={14} />Importieren
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PORTFOLIO PAGE
// ═══════════════════════════════════════════════════════════════════

function PortfolioPage() {
  const { assets, deleteAsset, refreshPrices, isMobile } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [addPurchaseFor, setAddPurchaseFor] = useState(null);
  const [showPurchasesFor, setShowPurchasesFor] = useState(null);
  const [showDetailsFor, setShowDetailsFor] = useState(null);

  const calcAssetMetrics = (asset) => {
    const avgPrice = asset.avgPurchasePrice || asset.purchasePrice;
    const totalVal = asset.amount * asset.currentPrice;
    const totalCost = asset.amount * avgPrice;
    const profit = totalVal - totalCost;
    const profitPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    return { totalVal, totalCost, profit, profitPct, avgPrice };
  };

  const byType = useMemo(() => {
    const groups = {};
    assets.forEach(a => {
      if (!groups[a.type]) groups[a.type] = [];
      groups[a.type].push(a);
    });
    return groups;
  }, [assets]);

  const typeLabels = { stock: 'Aktien & ETFs', crypto: 'Krypto', valuables: 'Wertgegenstände', bank: 'Bankkonten' };
  const typeIcons = { stock: TrendingUp, crypto: Bitcoin, valuables: Gem, bank: Building };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <HeaderGlyph icon={Briefcase} color="#10b981" />
          <div>
            <h1 style={S.h1}>Portfolio</h1>
            <div style={{ color: '#444', fontSize: 12, marginTop: 2 }}>{assets.length} Positionen · Detailansicht</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <button onClick={refreshPrices} style={S.btnGhost}><RefreshCw size={13} />Kurse aktualisieren</button>
          <button onClick={() => setShowAdd(true)} style={S.btn}><Plus size={14} />Position hinzufügen</button>
        </div>
      </div>

      {assets.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 500 }}>
          <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 48, textAlign: 'center', width: '100%', maxWidth: 420 }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>📭</div>
            <h2 style={{ color: '#e0e0e0', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Kein Asset vorhanden</h2>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 32, lineHeight: 1.5 }}>Starten Sie mit der Erstellung Ihres Portfolios und fügen Sie Ihre erste Position hinzu</p>
            <button onClick={() => setShowAdd(true)} style={S.btn}>
              <Plus size={14} />Asset hinzufügen
            </button>
          </div>
        </div>
      ) : (
        Object.entries(byType).map(([type, typeAssets]) => {
          const Icon = typeIcons[type] || TrendingUp;
          const typeTotal = typeAssets.reduce((s, a) => s + a.amount * a.currentPrice, 0);
          return (
            <div key={type} style={{ ...S.card, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #1e1e1e' }}>
                <Icon size={15} color={ASSET_COLORS[type]} />
                <h3 style={{ ...S.h3, color: ASSET_COLORS[type] }}>{typeLabels[type] || type}</h3>
                <span style={{ marginLeft: 'auto', color: '#888', fontSize: 13, fontWeight: 600 }}>{fmt.currency(typeTotal)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {typeAssets.map((asset, idx) => {
                  const m = calcAssetMetrics(asset);
                  const hasPurchases = asset.purchases && asset.purchases.length > 1;
                  const showDetails = showDetailsFor === asset.id;
                  return (
                    <div key={asset.id}>
                      <div
                        onClick={() => setShowDetailsFor(showDetails ? null : asset.id)}
                        style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: 14, padding: '13px 0', borderBottom: idx < typeAssets.length - 1 ? '1px solid #1a1a1a' : 'none', cursor: 'pointer' }}>
                        <AssetIcon asset={asset} size={36} />
                        <div style={{ flex: 1, minWidth: 0, width: isMobile ? 'calc(100% - 50px)' : 'auto' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#e0e0e0', fontWeight: 600, fontSize: 14 }}>{prettifyAssetName(asset.name)}</span>
                            {asset.symbol && <span style={{ color: ASSET_COLORS[asset.type], fontSize: 11, fontWeight: 700 }}>{asset.symbol}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: isMobile ? 'calc(50% - 8px)' : 140, marginLeft: isMobile ? 50 : 0 }}>
                          {/* Top value: switch for valuables without Zinssatz to Kaufpreis (Gesamtkaufpreis) */}
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                            {asset.type === 'valuables' && !asset.interestRate
                              ? fmt.currency(m.totalCost)
                              : fmt.currency(m.totalVal)}
                          </div>
                          {/* Second line logic */}
                          {(() => {
                            // Bankkonten und Wertgegenstände: kein Performance-String, außer Zinssatz ist explizit vorhanden
                            if (asset.type === 'bank' || asset.type === 'valuables') {
                              if (asset.interestRate !== undefined && asset.interestRate !== null) {
                                return (
                                  <div style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>
                                    Zinssatz: {fmt.number(asset.interestRate, 2)}%
                                  </div>
                                );
                              }
                              // Ohne Zinssatz: Labelzeile
                              const label = asset.type === 'bank' ? 'Kontostand' : 'Kaufpreis';
                              return (
                                <div style={{ color: '#666', fontSize: 12, fontWeight: 600 }}>{label}</div>
                              );
                            }
                            // Standard Assets: Performance anzeigen
                            return (
                              <div style={{ color: m.profitPct >= 0 ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: 600 }}>
                                {fmt.percent(m.profitPct)} ({fmt.currency(m.profit)})
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      {showDetails && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '12px 16px', marginBottom: 8, marginLeft: isMobile ? 0 : 50, border: '1px solid #1f1f1f' }}>
                          <div style={{ color: '#444', fontSize: 11, marginBottom: 8 }}>
                            {asset.isin && <span style={{ marginRight: 10 }}>ISIN: {asset.isin}</span>}
                            {asset.wkn && <span style={{ marginRight: 10 }}>WKN: {asset.wkn}</span>}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 10 }}>
                            <div>
                              <div style={{ color: '#666', fontSize: 11 }}>Stück</div>
                              <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{fmt.number(asset.amount)}</div>
                            </div>
                            <div>
                              <div style={{ color: '#666', fontSize: 11 }}>
                                {asset.type === 'bank' ? 'Kontostand' : (asset.type === 'valuables' ? 'Kaufpreis' : 'Ø Kaufpreis')}
                              </div>
                              <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>
                                {asset.type === 'bank' ? fmt.currency(asset.purchasePrice) : (asset.type === 'valuables' ? fmt.currency(asset.purchasePrice) : fmt.currency(m.avgPrice))}
                              </div>
                            </div>
                            {(asset.type === 'stock' || asset.type === 'crypto') && (
                              <div>
                                <div style={{ color: '#666', fontSize: 11 }}>Aktueller Kurs</div>
                                <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{fmt.currency(asset.currentPrice)}</div>
                              </div>
                            )}
                            <div>
                              <div style={{ color: '#666', fontSize: 11 }}>Update</div>
                              <div style={{ color: '#aaa', fontSize: 12 }}>{fmt.relTime(asset.lastUpdated)}</div>
                            </div>
                          </div>

                          {hasPurchases && (
                            <div style={{ marginBottom: 10 }}>
                              <span
                                style={{ background: '#3b82f615', color: '#3b82f6', borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                                onClick={(e) => { e.stopPropagation(); setShowPurchasesFor(showPurchasesFor === asset.id ? null : asset.id); }}>
                                {asset.purchases.length}× KÄUFE
                              </span>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            {asset.type !== 'valuables' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setAddPurchaseFor(asset); }}
                                style={{ ...S.btnGhost, padding: '6px 10px', fontSize: 12 }}>
                                <Plus size={12} />{asset.type === 'bank' ? 'Einlage / Ausgabe' : 'Weiteren Kauf'}
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditAsset(asset); }}
                              style={{ ...S.btnGhost, padding: '6px 10px', fontSize: 12 }}>
                              <Edit2 size={12} />Ändern / Speichern
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteAsset(asset.id); }}
                              style={{ ...S.btnDanger, padding: '6px 10px', fontSize: 12 }}>
                              <Trash2 size={12} />Löschen
                            </button>
                          </div>
                        </div>
                      )}
                      {showPurchasesFor === asset.id && hasPurchases && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '12px 16px', marginBottom: 8, marginLeft: isMobile ? 0 : 50 }}>
                          <div style={{ color: '#555', fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Kaufhistorie</div>
                          {asset.purchases.map((p, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < asset.purchases.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                              <span style={{ color: '#888', fontSize: 12 }}>{fmt.date(p.date)}</span>
                              <span style={{ color: '#666', fontSize: 12 }}>{fmt.number(p.amount)} × {fmt.currency(p.price)}</span>
                              <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{fmt.currency(p.amount * p.price)}</span>
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #222' }}>
                            <span style={{ color: '#10b981', fontSize: 11, fontWeight: 700 }}>Ø Kaufkurs</span>
                            <span style={{ color: '#10b981', fontSize: 12, fontWeight: 700 }}>{fmt.currency(m.avgPrice)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {showAdd && <AddAssetModal onClose={() => setShowAdd(false)} />}
      {editAsset && <AddAssetModal editAsset={editAsset} onClose={() => setEditAsset(null)} />}
      {addPurchaseFor && <AddPurchaseModal asset={addPurchaseFor} onClose={() => setAddPurchaseFor(null)} />}
    </div>
  );
}

function AddPurchaseModal({ asset, onClose }) {
  const { addAsset, updateAsset, isMobile } = useApp();
  const [form, setForm] = useState(() => ({
    amount: '',
    purchasePrice: asset?.currentPrice || asset?.avgPurchasePrice || asset?.purchasePrice || '',
    purchaseDate: new Date().toISOString().split('T')[0],
  }));
  const [errors, setErrors] = useState({});
  const [txType, setTxType] = useState('einlage'); // 'einlage' | 'ausgabe' (nur Bank)

  if (!asset) return null;
  const isBank = String(asset?.type).toLowerCase() === 'bank';
  const displayedBankAmount = isBank ? (() => {
    const s = String(form.purchasePrice ?? '');
    if (!s) return '';
    const unsigned = s.replace(/^-/,'');
    return txType === 'ausgabe' ? ('-' + unsigned) : unsigned;
  })() : '';

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const openDatePicker = (e) => {
    const picker = e?.target?.showPicker;
    if (typeof picker === 'function') {
      try { picker.call(e.target); } catch { }
    }
  };

  const submit = () => {
    const nextErrors = {};
    if (!isBank) {
      if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = true;
    }
    if (!form.purchasePrice || Number(form.purchasePrice) <= 0) nextErrors.purchasePrice = true;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    if (isBank) {
      const base = Number(asset.purchasePrice || 0);
      const val = Math.abs(Number(form.purchasePrice || 0));
      const delta = txType === 'ausgabe' ? -val : val;
      const newBalance = base + delta;
      updateAsset(asset.id, { purchasePrice: newBalance, currentPrice: newBalance });
      onClose();
      return;
    }

    addAsset({
      ...asset,
      amount: Number(form.amount),
      purchasePrice: Number(form.purchasePrice),
      purchaseDate: form.purchaseDate || new Date().toISOString().split('T')[0],
      currentPrice: Number(asset.currentPrice || form.purchasePrice),
    });
    onClose();
  };

  return (
    <div style={S.modal} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modalBox}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={S.h2}>{isBank ? 'Geld hinzufügen / ausgeben' : 'Weiteren Kauf hinzufügen'}</h2>
            <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>{prettifyAssetName(asset.name)}{asset.symbol ? ` (${asset.symbol})` : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding: 22 }}>
          {isBank ? (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {['einlage', 'ausgabe'].map(t => (
                  <button key={t} onClick={() => setTxType(t)}
                    style={{
                      ...S.btnGhost,
                      padding: '6px 10px', fontSize: 12,
                      background: txType === t ? '#3b82f615' : 'transparent',
                      color: txType === t ? '#3b82f6' : '#888',
                      borderColor: txType === t ? '#3b82f660' : '#2a2a2a'
                    }}>
                    {t === 'einlage' ? 'Einlage' : 'Ausgabe'}
                  </button>
                ))}
              </div>
              <div>
                <label style={S.label}>Einlage / Ausgabe (€) *</label>
                <input
                  style={{ ...S.input, borderColor: errors.purchasePrice ? '#ef4444' : '' }}
                  type="number"
                  step="0.01"
                  value={displayedBankAmount}
                  onChange={e => set('purchasePrice', e.target.value)}
                  placeholder="500.00"
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0,1fr))', gap: 12 }}>
              <div>
                <label style={S.label}>Stück / Menge *</label>
                <input
                  style={{ ...S.input, borderColor: errors.amount ? '#ef4444' : '' }}
                  type="number"
                  step="0.0001"
                  value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  placeholder="10"
                />
              </div>
              <div>
                <label style={S.label}>Kaufkurs (€) *</label>
                <input
                  style={{ ...S.input, borderColor: errors.purchasePrice ? '#ef4444' : '' }}
                  type="number"
                  step="0.01"
                  value={form.purchasePrice}
                  onChange={e => set('purchasePrice', e.target.value)}
                  placeholder="150.00"
                />
              </div>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <label style={S.label}>{isBank ? 'Datum' : 'Kaufdatum'}</label>
            <input
              style={S.input}
              type="date"
              value={form.purchaseDate}
              onFocus={openDatePicker}
              onClick={openDatePicker}
              onChange={e => set('purchaseDate', e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
            <button onClick={onClose} style={{ ...S.btnGhost, padding: '8px 12px' }}>Abbrechen</button>
            <button onClick={submit} style={{ ...S.btn, padding: '8px 12px' }}>
              <Plus size={13} />{isBank ? 'Einlage / Ausgabe speichern' : 'Nachkauf speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NEWS PAGE
// ═══════════════════════════════════════════════════════════════════

function NewsPage() {
  const { liveNews, newsLoading, refreshNews, assets, settings, setSettings } = useApp();
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => { refreshNews(); }, []);

  const sentimentColor = { positive: '#10b981', neutral: '#f59e0b', negative: '#ef4444' };
  const sentimentLabel = { positive: '↑ Positiv', neutral: '→ Neutral', negative: '↓ Negativ' };

  const fmt_time = (ts) => {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60) return 'gerade eben';
    if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
    if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
    return `vor ${Math.floor(diff / 86400)} Tagen`;
  };

  const isNewsRelevantToAssets = (news) => {
    if (assets.length === 0) return false;
    const newsText = (news.title + ' ' + (news.summary || '')).toUpperCase();
    return assets.some(asset => {
      const name = asset.name.toUpperCase();
      const symbol = (asset.symbol || '').toUpperCase();
      return newsText.includes(name) || (symbol && newsText.includes(symbol));
    });
  };

  const assetRelevantNews = liveNews.filter(n => isNewsRelevantToAssets(n));
  const topNews = liveNews.filter(n => !isNewsRelevantToAssets(n));
  const displayNews = activeTab === 'assets' ? assetRelevantNews : topNews;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <HeaderGlyph icon={Newspaper} color="#10b981" />
          <div>
            <h1 style={S.h1}>Nachrichten</h1>
            <div style={{ color: '#444', fontSize: 12, marginTop: 2 }}>
              {liveNews.length > 0 ? `${liveNews.length} Live-Meldungen von RSS-Feeds` : 'Lade Nachrichten…'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={settings.newsLang || 'de'} onChange={e => { setSettings(s => ({ ...s, newsLang: e.target.value })); setTimeout(refreshNews, 100); }}
            style={{ background: '#161616', border: '1px solid #222', color: '#888', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>
            <option value="de">🇩🇪 Deutsch</option>
            <option value="en">🇺🇸 English</option>
          </select>
          <button onClick={refreshNews} disabled={newsLoading} style={S.btn}>
            {newsLoading ? <Loader size={13} /> : <RefreshCw size={13} />}
            {newsLoading ? 'Lädt…' : 'Aktualisieren'}
          </button>
        </div>
      </div>

      {newsLoading && liveNews.length === 0 && (
        <div style={{ ...S.card, textAlign: 'center', padding: 48 }}>
          <Loader size={28} color="#10b981" style={{ display: 'block', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <div style={{ color: '#444', fontSize: 14 }}>RSS-Feeds werden geladen…</div>
          <div style={{ color: '#333', fontSize: 12, marginTop: 6 }}>Verbinde mit Nachrichtenquellen via CORS-Proxy</div>
        </div>
      )}

      {liveNews.length > 0 && (
        <div style={{ marginBottom: 20, display: 'flex', gap: 8, borderBottom: '1px solid #1a1a1a', paddingBottom: 16 }}>
          <button onClick={() => setActiveTab('all')} 
            style={{
              background: activeTab === 'all' ? '#3b82f6' : 'transparent',
              color: activeTab === 'all' ? '#fff' : '#888',
              border: activeTab === 'all' ? 'none' : '1px solid #2a2a2a',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all .2s'
            }}
            onMouseEnter={e => { if (activeTab !== 'all') e.target.style.borderColor = '#3b82f6'; }}
            onMouseLeave={e => { if (activeTab !== 'all') e.target.style.borderColor = '#2a2a2a'; }}>
            <span style={{ marginRight: 6 }}>📰</span>Top News
            {topNews.length > 0 && <span style={{ marginLeft: 6, opacity: 0.7 }}>({topNews.length})</span>}
          </button>
          <button onClick={() => setActiveTab('assets')}
            style={{
              background: activeTab === 'assets' ? '#10b981' : 'transparent',
              color: activeTab === 'assets' ? '#fff' : '#888',
              border: activeTab === 'assets' ? 'none' : '1px solid #2a2a2a',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: assets.length === 0 ? 'not-allowed' : 'pointer',
              opacity: assets.length === 0 ? 0.5 : 1,
              transition: 'all .2s'
            }}
            disabled={assets.length === 0}
            onMouseEnter={e => { if (assets.length > 0 && activeTab !== 'assets') e.target.style.borderColor = '#10b981'; }}
            onMouseLeave={e => { if (assets.length > 0 && activeTab !== 'assets') e.target.style.borderColor = '#2a2a2a'; }}>
            <span style={{ marginRight: 6 }}>📊</span>Für meine Assets
            {assetRelevantNews.length > 0 && <span style={{ marginLeft: 6, opacity: 0.7 }}>({assetRelevantNews.length})</span>}
          </button>
        </div>
      )}

      {displayNews.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayNews.map(item => (
            <NewsCard key={item.id} item={item} sentimentColor={sentimentColor} sentimentLabel={sentimentLabel} fmt_time={fmt_time} />
          ))}
        </div>
      )}

      {!newsLoading && liveNews.length === 0 && (
        <div style={{ ...S.card, textAlign: 'center', padding: 48 }}>
          <AlertCircle size={32} color="#ef4444" style={{ display: 'block', margin: '0 auto 12px' }} />
          <div style={{ color: '#888', fontSize: 15 }}>Keine Nachrichten geladen</div>
          <div style={{ color: '#444', fontSize: 13, marginTop: 6, marginBottom: 16 }}>Möglicherweise blockiert der Browser den CORS-Proxy. Bitte erneut versuchen.</div>
          <button onClick={refreshNews} style={S.btn}><RefreshCw size={13} />Erneut versuchen</button>
        </div>
      )}

      {!newsLoading && liveNews.length > 0 && displayNews.length === 0 && (
        <div style={{ ...S.card, textAlign: 'center', padding: 48 }}>
          <Newspaper size={32} color="#f59e0b" style={{ display: 'block', margin: '0 auto 12px' }} />
          <div style={{ color: '#888', fontSize: 15 }}>
            {activeTab === 'assets' ? 'Keine Nachrichten für Ihre Assets' : 'Keine Top News verfügbar'}
          </div>
          <div style={{ color: '#444', fontSize: 13, marginTop: 6 }}>
            {activeTab === 'assets' ? 'Weitere Nachrichten unter „Top News" verfügbar.' : 'Nachrichten zu Ihren Assets unter „Für meine Assets" verfügbar.'}
          </div>
        </div>
      )}
    </div>
  );
}

function NewsCard({ item, sentimentColor, sentimentLabel, fmt_time, highlight }) {
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      <div style={{ ...S.card, cursor: 'pointer', transition: 'border-color .15s', borderColor: highlight ? '#f59e0b30' : '#222', padding: '14px 18px' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = highlight ? '#f59e0b60' : '#333'}
        onMouseLeave={e => e.currentTarget.style.borderColor = highlight ? '#f59e0b30' : '#222'}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
              <span style={{ background: item.sourceColor + '20', color: item.sourceColor, borderRadius: 4, padding: '1px 7px', fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>{item.source}</span>
              <span style={{ background: sentimentColor[item.sentiment] + '15', color: sentimentColor[item.sentiment], borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 700 }}>
                {sentimentLabel[item.sentiment]}
              </span>
              <span style={{ color: '#333', fontSize: 10, marginLeft: 'auto' }}>{fmt_time(item.ts)}</span>
            </div>
            <div style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 600, marginBottom: 4, lineHeight: 1.4 }}>{item.title}</div>
            {item.summary && <div style={{ color: '#444', fontSize: 11, lineHeight: 1.5 }}>{item.summary.substring(0, 150)}{item.summary.length > 150 ? '…' : ''}</div>}
          </div>
        </div>
      </div>
    </a>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CHART ANALYSIS PAGE (Traditional Analysis)
// ═══════════════════════════════════════════════════════════════════

function ChartAnalysisPage() {
  const { assets, isMobile } = useApp();
  const [selectedAsset, setSelectedAsset] = useState(assets[0] || null);
  const [range, setRange] = useState('30T');

  const calcMetricsForAsset = (asset) => {
    if (!asset) return null;
    const avgPrice = asset.avgPurchasePrice || asset.purchasePrice;
    const totalVal = asset.amount * asset.currentPrice;
    const totalCost = asset.amount * avgPrice;
    const profit = totalVal - totalCost;
    const profitPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    return { totalVal, totalCost, profit, profitPct, avgPrice };
  };

  const chartData = useMemo(() => {
    if (!selectedAsset) return [];
    return generateChartData([selectedAsset], range);
  }, [selectedAsset, range]);

  const m = calcMetricsForAsset(selectedAsset);
  
  // Simple momentum calculation
  const momentum = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0].actual ?? chartData[0].value ?? 0;
    const last = chartData[chartData.length - 1].actual ?? chartData[chartData.length - 1].value ?? 0;
    return first > 0 ? ((last - first) / first) * 100 : 0;
  }, [chartData]);

  // RSI-like signal
  const signal = momentum > 5 ? 'Kaufen' : momentum < -5 ? 'Verkaufen' : 'Halten';
  const signalColor = momentum > 5 ? '#10b981' : momentum < -5 ? '#ef4444' : '#f59e0b';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <HeaderGlyph icon={BarChart2} color="#10b981" />
        <div>
          <h1 style={S.h1}>Analyse</h1>
          <div style={{ color: '#444', fontSize: 12, marginTop: 2 }}>Technische & fundamentale Analyse Ihrer Positionen</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '240px 1fr', gap: 16 }}>
        {/* Asset selector */}
        <div style={{ ...S.card, alignSelf: 'start' }}>
          <div style={{ color: '#555', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Positionen</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {assets.map(asset => {
              const am = calcMetricsForAsset(asset);
              const isActive = selectedAsset?.id === asset.id;
              return (
                <button key={asset.id} onClick={() => setSelectedAsset(asset)}
                  style={{ background: isActive ? ASSET_COLORS[asset.type] + '15' : 'transparent', border: `1px solid ${isActive ? ASSET_COLORS[asset.type] + '40' : 'transparent'}`, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  <div style={{ color: isActive ? '#fff' : '#888', fontSize: 13, fontWeight: 600 }}>{asset.name}</div>
                  {am && (
                    <div style={{ color: am.profitPct >= 0 ? '#10b981' : '#ef4444', fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                      {fmt.percent(am.profitPct)} · {fmt.currency(am.totalVal)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Analysis panel */}
        <div>
          {selectedAsset ? (
            <>
              {/* Header */}
              <div style={{ ...S.card, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AssetIcon asset={selectedAsset} size={44} />
                    <div>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{selectedAsset.name}</div>
                      <div style={{ color: '#555', fontSize: 12 }}>
                        {selectedAsset.symbol && <span style={{ color: '#10b981', marginRight: 8 }}>{selectedAsset.symbol}</span>}
                        {selectedAsset.isin && <span style={{ marginRight: 8 }}>{selectedAsset.isin}</span>}
                        {selectedAsset.sector && <span>· {selectedAsset.sector}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{fmt.currency(selectedAsset.currentPrice)}</div>
                    {m && (
                      <div style={{ color: m.profitPct >= 0 ? '#10b981' : '#ef4444', fontSize: 14, fontWeight: 700 }}>
                        {fmt.percent(m.profitPct)} ({fmt.currency(m.profit)})
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              {m && (
                <div style={{ ...S.grid4, marginBottom: 16 }}>
                  {[
                    { label: 'Gesamtwert', value: fmt.currency(m.totalVal), color: '#fff' },
                    { label: 'Ø Kaufkurs', value: fmt.currency(m.avgPrice), color: '#888' },
                    { label: 'Investiert', value: fmt.currency(m.totalCost), color: '#888' },
                    // only show profit row for non-bank/valuables or when explicit interest rate exists
                    ...((selectedAsset.type === 'bank' || selectedAsset.type === 'valuables')
                      ? (selectedAsset.interestRate ? [{ label: 'Zinssatz', value: fmt.number(selectedAsset.interestRate, 2) + '%', color: '#888' }] : [])
                      : [{ label: 'Gewinn/Verlust', value: fmt.currency(m.profit), color: m.profit >= 0 ? '#10b981' : '#ef4444' }]),
                  ].map((item, i) => (
                    <div key={i} style={S.card}>
                      <div style={{ color: '#444', fontSize: 11, marginBottom: 5 }}>{item.label}</div>
                      <div style={{ color: item.color, fontWeight: 700, fontSize: 15 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Chart */}
              <div style={{ ...S.card, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={S.h3}>Wertentwicklung</h3>
                  <TimeRangeBtn selected={range} onChange={setRange} />
                </div>
                {chartData.length > 1 && (
                  <SvgAreaChart data={chartData} color={ASSET_COLORS[selectedAsset.type]} height={220} />
                )}
              </div>

              {/* Signal */}
              <div style={{ ...S.card }}>
                <h3 style={{ ...S.h3, marginBottom: 16 }}>Technische Indikatoren</h3>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14 }}>
                  <div style={{ background: signalColor + '10', border: `1px solid ${signalColor}30`, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ color: '#555', fontSize: 11, marginBottom: 6 }}>Signal</div>
                    <div style={{ color: signalColor, fontWeight: 800, fontSize: 18 }}>{signal}</div>
                    <div style={{ color: '#444', fontSize: 10, marginTop: 4 }}>Trend {range}</div>
                  </div>
                  <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ color: '#555', fontSize: 11, marginBottom: 6 }}>Performance</div>
                    <div style={{ color: momentum >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: 18 }}>{fmt.percent(momentum)}</div>
                    <div style={{ color: '#444', fontSize: 10, marginTop: 4 }}>Zeitraum {range}</div>
                  </div>
                  <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ color: '#555', fontSize: 11, marginBottom: 6 }}>Position</div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{fmt.number(selectedAsset.amount)}</div>
                    <div style={{ color: '#444', fontSize: 10, marginTop: 4 }}>Stück im Depot</div>
                  </div>
                </div>

                {selectedAsset.purchases && selectedAsset.purchases.length > 1 && (
                  <div style={{ marginTop: 16, padding: 14, background: '#111', borderRadius: 8 }}>
                    <div style={{ color: '#555', fontSize: 11, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Kaufhistorie ({selectedAsset.purchases.length} Transaktionen)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selectedAsset.purchases.map((p, i) => {
                        const pPct = selectedAsset.currentPrice > 0 ? ((selectedAsset.currentPrice - p.price) / p.price) * 100 : 0;
                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#666', fontSize: 12 }}>{fmt.date(p.date)}</span>
                            <span style={{ color: '#888', fontSize: 12 }}>{fmt.number(p.amount)} × {fmt.currency(p.price)}</span>
                            <span style={{ color: pPct >= 0 ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: 600 }}>{fmt.percent(pPct)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ ...S.card, textAlign: 'center', padding: 60 }}>
              <BarChart2 size={40} color="#2a2a2a" style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
              <div style={{ color: '#444' }}>Wählen Sie eine Position zur Analyse</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



const PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, hint: 'Übersicht' },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase, hint: 'Positionen & Käufe' },
  { id: 'portfolio-ai', label: 'Portfolio AI', icon: Brain, hint: 'Chat & Statistiken' },
  { id: 'dividends', label: 'Dividendenkalender', icon: DollarSign, hint: 'Ausschüttungen' },
  { id: 'fundamental', label: 'Fundamental', icon: BarChart2, hint: 'Kennzahlen' },
  { id: 'technical', label: 'Technisch', icon: TrendingUp, hint: 'Charts & Signale' },
  { id: 'risk', label: 'Risiko', icon: Shield, hint: 'Volatilität' },
  { id: 'news', label: 'Nachrichten', icon: Newspaper, hint: 'Markt-Updates' },
  { id: 'analysis', label: 'KI-Analyse', icon: Brain, hint: 'Intelligente Auswertung' },
  { id: 'settings', label: 'Einstellungen', icon: Settings, hint: 'App & Konto' },
];

function Sidebar({ page, setPage, isMobile, onClose }) {
  const { totalValue, totalProfit, totalProfitPct, xetrDb } = useApp();
  const mobileStyle = isMobile
    ? {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 10px 10px',
        background: 'linear-gradient(180deg, #121212 0%, #0e0e0e 100%)',
      }
    : S.sidebar;
  const navItemStyle = (active) => isMobile
    ? {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        minHeight: 54,
        padding: '10px 12px',
        borderRadius: 12,
        border: `1px solid ${active ? '#2b4f90' : '#1c1c1c'}`,
        background: active ? '#162235' : '#111',
        color: active ? '#fff' : '#c8c8c8',
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        textAlign: 'left'
      }
    : S.navItem(active);

  const header = (
    <div style={{ padding: isMobile ? '2px 6px 14px' : '6px 12px 20px', borderBottom: '1px solid #1a1a1a', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', position: 'relative', gap: 10, marginBottom: isMobile ? 14 : 0 }}>
        {isMobile && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              right: 0,
              width: 30,
              height: 30,
              borderRadius: 8,
              border: '1px solid #2a2a2a',
              background: '#141414',
              color: '#ddd',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Menü schließen"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
        <img
          src="/wordmark-current.png"
          alt="Wordmark"
          style={{ height: isMobile ? 34 : 40, width: 'auto', objectFit: 'contain' }}
        />
      </div>
      <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 10, padding: '10px 12px' }}>
        <div style={S.sec}>Gesamtvermögen</div>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginTop: 2 }}>{fmt.currency(totalValue)}</div>
        <div style={{ color: totalProfit >= 0 ? '#10b981' : '#ef4444', fontSize: 11, marginTop: 1 }}>
          {totalProfit >= 0 ? '+' : '-'}{fmt.currency(Math.abs(totalProfit))} | {fmt.percent(totalProfitPct)} Gewinn
        </div>
      </div>
    </div>
  );

  return (
    <div style={mobileStyle}>
      {header}

      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 3 }}>
      {PAGES.map(({ id, label, hint, icon: Icon }) => (
        <button key={id} onClick={() => setPage(id)} style={navItemStyle(page === id)}>
          {isMobile ? (
            <>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: page === id ? '#20314a' : '#1b1b1b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={page === id ? '#8ec5ff' : '#8a8a8a'} />
              </div>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, lineHeight: 1.1 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: page === id ? '#fff' : '#d3d3d3', fontWeight: page === id ? 700 : 600 }}>
                  {label}
                  {id === 'analysis' && <span style={{ background: '#10b98120', color: '#10b981', fontSize: 8, fontWeight: 800, padding: '1px 4px', borderRadius: 4, letterSpacing: 0.5 }}>KI</span>}
                </span>
                <span style={{ color: page === id ? '#9cb3cf' : '#6d6d6d', fontSize: 10 }}>{hint}</span>
              </span>
            </>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon size={15} />
              {label}
              {id === 'analysis' && <span style={{ background: '#10b98120', color: '#10b981', fontSize: 7, fontWeight: 800, padding: '1px 3px', borderRadius: 3, letterSpacing: 0.5 }}>KI</span>}
            </span>
          )}
        </button>
      ))}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #161616', paddingLeft: isMobile ? 8 : 0, paddingRight: isMobile ? 8 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: isMobile ? '8px 10px' : '6px 12px', background: isMobile ? '#101010' : 'transparent', borderRadius: isMobile ? 10 : 0 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: xetrDb ? '#10b981' : '#f59e0b', animation: 'pulse 2s infinite' }} />
          <span style={{ color: isMobile ? '#7e7e7e' : '#2a2a2a', fontSize: 10 }}>{xetrDb ? `${xetrDb.length.toLocaleString()} Instr. geladen` : 'DB lädt…'}</span>
        </div>
      </div>
    </div>
  );
}

export default function Root() {
  return (
    <AuthProvider>
      <AppWrapper />
    </AuthProvider>
  );
}

function AppWrapper() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0a0a',
        color: '#fff'
      }}>
        <Loader className="animate-spin" size={40} />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <App />;
}

function App() {
  const [page, setPage] = useState('dashboard');
  const [mobileMenu, setMobileMenu] = useState(false);

  // top‑level component only manages page and menu state; mobile detection
  // lives in AppInner where we also have access to settings.
  return (
    <AppProvider>
      <AppInner page={page} setPage={setPage} mobileMenu={mobileMenu} setMobileMenu={setMobileMenu} />
    </AppProvider>
  );
}

const INFO_GLOSSARY = {
  Umsatz: 'Gesamterlöse des Unternehmens im betrachteten Zeitraum (z. B. TTM).',
  Gewinnmarge: 'Anteil des Gewinns am Umsatz. Höher bedeutet meist effizienteres Geschäft.',
  KGV: 'Kurs-Gewinn-Verhältnis: Aktienkurs geteilt durch Gewinn je Aktie.',
  KBV: 'Kurs-Buchwert-Verhältnis: Aktienkurs im Verhältnis zum Buchwert je Aktie.',
  RSI: 'Relative-Stärke-Index (0-100). Über 70 oft überkauft, unter 30 oft überverkauft.',
  MACD: 'Trendfolge-Indikator aus gleitenden Durchschnitten. Zeigt Momentum und Trendwechsel.',
  MA20: 'Gleitender Durchschnitt der letzten 20 Kerzen. Zeigt kurzfristigen Trend.',
  MA50: 'Gleitender Durchschnitt der letzten 50 Kerzen. Zeigt mittelfristigen Trend.',
  MA200: 'Gleitender Durchschnitt der letzten 200 Kerzen. Zeigt langfristigen Trend.',
  Bollinger: 'Bänder um den MA20. Oberes/unteres Band markieren häufige Überkauft-/Überverkauft-Zonen.',
  '52W High': 'Höchster Kurs der letzten 52 Wochen.',
  '52W Low': 'Tiefster Kurs der letzten 52 Wochen.',
  Volatilität: 'Schwankungsintensität der Renditen. Höher = stärkeres Risiko.',
  'Max Drawdown': 'Größter historischer Verlust vom Hoch zum folgenden Tief.',
  'Sharpe Ratio': 'Rendite im Verhältnis zum Risiko. Höher ist in der Regel besser.',
  'VaR (95%)': 'Value at Risk: erwarteter Verlust, der mit 95% Wahrscheinlichkeit nicht überschritten wird.',
  'Beta vs S&P 500': 'Sensitivität zum Gesamtmarkt. 1 = marktähnlich, >1 = schwankungsstärker.',
};

function InfoHint({ term, text }) {
  const buttonRef = useRef(null);
  const bubbleRef = useRef(null);
  const openedAtRef = useRef(0);
  const closeTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [bubblePos, setBubblePos] = useState({ top: 24, left: 8, width: 240 });
  const message = text || INFO_GLOSSARY[term] || 'Kurzinfo zu dieser Kennzahl.';

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openHint = useCallback(() => {
    openedAtRef.current = Date.now();
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const closeHintWithDelay = useCallback((minVisibleMs = 900) => {
    const elapsed = Date.now() - openedAtRef.current;
    const remaining = Math.max(0, minVisibleMs - elapsed);
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), remaining);
  }, [cancelClose]);

  useEffect(() => {
    if (!open) return undefined;
    const hide = () => closeHintWithDelay(900);
    document.addEventListener('pointerup', hide);
    document.addEventListener('pointercancel', hide);
    document.addEventListener('mouseup', hide);
    document.addEventListener('touchend', hide);
    return () => {
      document.removeEventListener('pointerup', hide);
      document.removeEventListener('pointercancel', hide);
      document.removeEventListener('mouseup', hide);
      document.removeEventListener('touchend', hide);
      cancelClose();
    };
  }, [open, closeHintWithDelay, cancelClose]);

  useEffect(() => {
    if (!open) return undefined;

    const recalc = () => {
      const rect = buttonRef.current?.getBoundingClientRect?.();
      if (!rect) return;

      const margin = 8;
      const viewportW = window.innerWidth || 360;
      const viewportH = window.innerHeight || 640;
      const maxWidth = Math.min(260, Math.max(170, viewportW - margin * 2));
      const measuredWidth = bubbleRef.current?.offsetWidth || maxWidth;
      const measuredHeight = bubbleRef.current?.offsetHeight || 100;
      const width = Math.min(measuredWidth, maxWidth);
      const gap = 8;

      let left = rect.right + gap;
      if (left + width > viewportW - margin) {
        left = rect.left - width - gap;
      }
      left = Math.max(margin, Math.min(left, viewportW - width - margin));

      let top = rect.top + (rect.height / 2) - (measuredHeight / 2);
      top = Math.max(margin, Math.min(top, viewportH - measuredHeight - margin));

      setBubblePos({ top, left, width });
    };

    const raf = requestAnimationFrame(recalc);
    const t = setTimeout(recalc, 0);
    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', recalc, true);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc, true);
    };
  }, [open]);

  return (
    <span data-infohint-root style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 6 }}>
      <button
        ref={buttonRef}
        type="button"
        onPointerDown={(e) => {
          e.stopPropagation();
          openHint();
        }}
        onPointerUp={() => closeHintWithDelay(900)}
        onPointerCancel={() => closeHintWithDelay(900)}
        onMouseDown={openHint}
        onMouseUp={() => closeHintWithDelay(900)}
        onTouchStart={openHint}
        onTouchEnd={() => closeHintWithDelay(900)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) {
            setOpen(false);
          } else {
            openHint();
            closeHintWithDelay(2200);
          }
        }}
        aria-label={`Info zu ${term}`}
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: '1px solid #444',
          background: '#151515',
          color: '#a3a3a3',
          fontSize: 10,
          fontWeight: 700,
          lineHeight: '14px',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        i
      </button>
      {open && (
        <div
          ref={bubbleRef}
          style={{
            position: 'fixed',
            top: bubblePos.top,
            left: bubblePos.left,
            width: bubblePos.width,
            maxWidth: 'calc(100vw - 16px)',
            background: '#111',
            color: '#ddd',
            border: '1px solid #333',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 11,
            lineHeight: 1.45,
            zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ color: '#fff', fontWeight: 700, marginBottom: 4 }}>{term}</div>
          <div>{message}</div>
        </div>
      )}
    </span>
  );
}


function FundamentalAnalysis() {
  const { assets, settings } = useApp();
  const analyzableAssets = useMemo(
    () => assets.filter(a => !a.coinId && (a.type === 'stock' || a.xetrSymbol || a.symbol)),
    [assets]
  );
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    setSelectedAssetId('');
    setKpis(null);
    setError('');
  }, []);

  useEffect(() => {
    if (!analyzableAssets.length) {
      setSelectedAssetId('');
      return;
    }
    if (!analyzableAssets.some(a => a.id === selectedAssetId)) {
      setSelectedAssetId('');
    }
  }, [analyzableAssets, selectedAssetId]);

  const selectedAsset = useMemo(
    () => analyzableAssets.find(a => a.id === selectedAssetId) || null,
    [analyzableAssets, selectedAssetId]
  );

  const hasEvaluation = Boolean(
    kpis?.verdict &&
    kpis?.verdictText &&
    kpis?.sourceLabel &&
    kpis.sourceLabel !== 'Lokaler Fallback'
  );

  useEffect(() => {
    setChatMessages([]);
    setChatInput('');
  }, [selectedAssetId]);

  const askFundamentalChat = async () => {
    const question = String(chatInput || '').trim();
    if (!question || !selectedAsset) return;

    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: question }]);
    setChatLoading(true);

    try {
      const backendUrl = (settings?.backendUrl || DEFAULT_BACKEND_URL).replace(/\/$/, '');
      const accessCode = settings?.accessCode || DEFAULT_ACCESS_CODE;
      const symbol = String(selectedAsset.xetrSymbol || selectedAsset.symbol || selectedAsset.name || '').trim();

      const res = await fetch(`${backendUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': accessCode,
        },
        body: JSON.stringify({
          query: `${symbol}: ${question}`,
          module: 'fundamental',
          portfolio: assets || [],
        }),
      });

      const data = res.ok ? await res.json().catch(() => null) : null;
      const analysis = data?.analysis || data;
      const summary = Array.isArray(analysis?.summary) ? analysis.summary.filter(Boolean).join(' ') : '';
      const verdict = String(analysis?.verdict || '').trim();
      const points = Array.isArray(analysis?.tabs?.Business?.points) ? analysis.tabs.Business.points.slice(0, 2) : [];

      const answer = [
        summary,
        verdict ? `Einschätzung: ${verdict}.` : '',
        points.length ? `Wichtig: ${points.join(' ')}` : '',
      ].filter(Boolean).join(' ');

      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: answer || `Zur Aktie ${symbol} sind derzeit keine erweiterten Details verfügbar.`,
        },
      ]);
    } catch {
      const fallback = kpis?.verdictText
        ? `Aktueller Stand: ${kpis.verdictText}`
        : 'Ich kann die KI-Antwort gerade nicht laden. Bitte versuche es gleich erneut.';
      setChatMessages((prev) => [...prev, { role: 'assistant', text: fallback }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const withTimeout = (promise, ms = 5000) => Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);
    const timeoutSignal = (ms) => {
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        return AbortSignal.timeout(ms);
      }
      return undefined;
    };
    const readNumber = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };
    const formatLarge = (value, currencyCode = 'USD') => {
      if (!Number.isFinite(value)) return '—';
      const abs = Math.abs(value);
      const sign = value < 0 ? '-' : '';
      const unit = currencyCode === 'EUR' ? '€' : currencyCode === 'USD' ? '$' : currencyCode;
      if (abs >= 1_000_000_000_000) return `${sign}${fmt.number(abs / 1_000_000_000_000, 2)} Bio ${unit}`;
      if (abs >= 1_000_000_000) return `${sign}${fmt.number(abs / 1_000_000_000, 2)} Mrd ${unit}`;
      if (abs >= 1_000_000) return `${sign}${fmt.number(abs / 1_000_000, 2)} Mio ${unit}`;
      return `${sign}${fmt.number(abs, 0)} ${unit}`;
    };
    const formatRatioPercent = (value) => {
      const num = readNumber(value);
      if (!Number.isFinite(num)) return '—';
      const pct = Math.abs(num) <= 1 ? num * 100 : num;
      return `${fmt.number(pct, 2)}%`;
    };
    const hasClassicLiveKpi = (row) => {
      if (!row) return false;
      return [row.revenue, row.margin, row.pe, row.pb].some((value) => readNumber(value) !== null);
    };
    const hasFundLiveKpi = (row) => {
      if (!row) return false;
      return [row.totalAssets, row.expenseRatio, row.ytdReturn, row.yield].some((value) => readNumber(value) !== null);
    };
    const hasAnyLiveKpi = (row) => hasClassicLiveKpi(row) || hasFundLiveKpi(row);
    const buildMetricCards = (row, currencyCode = 'USD') => {
      if (hasClassicLiveKpi(row)) {
        return [
          { label: 'Umsatz', value: formatLarge(readNumber(row.revenue), currencyCode), color: '#10b981', hint: 'Umsatz' },
          { label: 'Gewinnmarge', value: Number.isFinite(readNumber(row.margin)) ? `${fmt.number(readNumber(row.margin) * 100, 2)}%` : '—', color: '#3b82f6', hint: 'Gewinnmarge' },
          { label: 'KGV', value: Number.isFinite(readNumber(row.pe)) ? `${fmt.number(readNumber(row.pe), 1)}x` : '—', color: '#f59e0b', hint: 'KGV' },
          { label: 'KBV', value: Number.isFinite(readNumber(row.pb)) ? `${fmt.number(readNumber(row.pb), 1)}x` : '—', color: '#8b5cf6', hint: 'KBV' },
        ];
      }

      return [
        { label: 'Fondsvolumen', value: formatLarge(readNumber(row.totalAssets), currencyCode), color: '#10b981' },
        { label: 'Kostenquote (TER)', value: formatRatioPercent(row.expenseRatio), color: '#3b82f6' },
        { label: 'YTD Rendite', value: formatRatioPercent(row.ytdReturn), color: '#f59e0b' },
        { label: 'Ausschüttungsrendite', value: formatRatioPercent(row.yield), color: '#8b5cf6' },
      ];
    };
    const mapVerdict = (recommendationKey, pe, margin) => {
      const rec = String(recommendationKey || '').toLowerCase();
      if (['strong_buy', 'buy', 'overweight', 'outperform'].includes(rec)) return 'POSITIV';
      if (['hold', 'neutral', 'market_perform'].includes(rec)) return 'NEUTRAL';
      if (['underweight', 'underperform', 'sell', 'strong_sell'].includes(rec)) return 'VORSICHTIG';
      let score = 0;
      if (Number.isFinite(margin) && margin > 0.12) score += 1;
      if (Number.isFinite(pe) && pe > 0 && pe < 26) score += 1;
      if (score >= 2) return 'POSITIV';
      if (score === 1) return 'NEUTRAL';
      return 'VORSICHTIG';
    };
    const buildTickerCandidates = (rawSymbol, asset) => {
      const clean = String(rawSymbol || '').trim().toUpperCase().replace(/\s+/g, '');
      if (!clean) return [];

      const primary = clean.replace(':', '.');
      const baseFromDot = primary.split('.')[0];
      const baseFromDash = primary.split('-')[0];
      const base = (baseFromDot || baseFromDash || primary).replace(/[^A-Z0-9]/g, '');
      const usClass = base.replace('-', '.');
      const isinPrefix = String(asset?.isin || '').toUpperCase().slice(0, 2);

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
      add(usClass);
      add(primary.replace('-', '.'));

      (byCountrySuffix[isinPrefix] || []).forEach((suffix) => {
        add(suffix ? `${base}${suffix}` : base);
      });

      commonSuffixes.forEach((suffix) => add(`${base}${suffix}`));

      return Array.from(set).slice(0, 8);
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
    const buildLocalFallback = (asset, symbolHint) => {
      const purchase = readNumber(asset?.purchasePrice);
      const current = readNumber(asset?.currentPrice);
      const change = Number.isFinite(purchase) && purchase > 0 && Number.isFinite(current)
        ? (current - purchase) / purchase
        : null;
      const fallbackVerdict = Number.isFinite(change)
        ? (change > 0.12 ? 'POSITIV' : change < -0.1 ? 'VORSICHTIG' : 'NEUTRAL')
        : 'NEUTRAL';

      return {
        symbol: symbolHint,
        revenueLabel: '—',
        marginLabel: '—',
        peLabel: '—',
        pbLabel: '—',
        sourceLabel: 'Lokaler Fallback',
        dataTimestamp: null,
        verdict: fallbackVerdict,
        verdictText: Number.isFinite(change)
          ? `Keine Live-Fundamentaldaten verfügbar. Portfolio-Performance seit Kauf: ${fmt.number(change * 100, 2)}%.`
          : 'Keine Live-Fundamentaldaten verfügbar. Es werden lokale Portfolio-Daten angezeigt.',
      };
    };
    const fetchJsonWithFallback = async (url) => {
      try {
        const direct = await withTimeout(fetch(url, { signal: timeoutSignal(5000) }), 5500);
        if (direct?.ok) return await direct.json();
      } catch { }
      try {
        const proxied = await fetchWithProxy(url);
        if (proxied?.ok) return await proxied.json();
      } catch { }
      return null;
    };
    const fetchBackendLiveFundamental = async (symbolValue, asset) => {
      try {
        const backendUrl = (settings?.backendUrl || DEFAULT_BACKEND_URL).replace(/\/$/, '');
        const accessCode = settings?.accessCode || DEFAULT_ACCESS_CODE;
        const res = await withTimeout(fetch(`${backendUrl}/api/fundamentals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-access-code': accessCode,
          },
          body: JSON.stringify({
            symbol: symbolValue,
            isin: asset?.isin || null,
            alphaVantageApiKey: settings?.apiKey || '',
            eodhdApiToken: settings?.eodhdApiToken || '',
          }),
        }), 7000);

        if (!res?.ok) {
          const payload = await res.json().catch(() => null);
          if (res.status === 401) {
            return { _error: 'Backend-Zugriff abgelehnt. Bitte Access-Code in den Einstellungen prüfen.' };
          }
          if (res.status === 404) {
            const backendMsg = String(payload?.hint || payload?.error || '').trim();
            return { _error: backendMsg || 'Keine Live-KPI verfügbar.' };
          }
          return null;
        }
        const payload = await res.json().catch(() => null);
        const data = payload?.data;
        if (!data || typeof data !== 'object' || !hasAnyLiveKpi(data)) return null;

        const verdict = mapVerdict(data.recommendation, data.pe, data.margin);
        const verdictText = verdict === 'POSITIV'
          ? 'Live-Fundamentaldaten könnten auf ein solides Qualitätsprofil hindeuten.'
          : verdict === 'NEUTRAL'
            ? 'Live-Fundamentaldaten zeigen eine gemischte Lage und dienen nur zur Orientierung.'
            : 'Live-Fundamentaldaten könnten auf erhöhtes Bewertungs- oder Qualitätsrisiko hindeuten.';
        const metricCards = buildMetricCards(data, data.currency || 'USD');
        const fetchedAt = Number.isFinite(Number(data?.fetchedAt))
          ? new Date(Number(data.fetchedAt)).toLocaleString('de-DE')
          : new Date().toLocaleString('de-DE');
        const fromCache = Boolean(data?._cache);
        const providerName = data?.provider === 'alphavantage'
          ? 'Alpha Vantage'
          : data?.provider === 'eodhd'
            ? 'EODHD'
            : 'Yahoo';

        return {
          symbol: data.ticker || symbolValue,
          revenueLabel: metricCards[0]?.value || '—',
          marginLabel: metricCards[1]?.value || '—',
          peLabel: metricCards[2]?.value || '—',
          pbLabel: metricCards[3]?.value || '—',
          metricCards,
          sourceLabel: fromCache ? `Backend Cache (${providerName})` : `Backend Live (${providerName})`,
          dataTimestamp: fetchedAt,
          verdict,
          verdictText: fromCache ? `Zwischengespeicherte Live-Kennzahlen (letzter erfolgreicher Abruf am ${fetchedAt}).` : verdictText,
        };
      } catch {
        return null;
      }
    };

    const loadFundamentals = async () => {
      if (active) {
        setLoading(true);
        setError('');
      }

      if (!selectedAsset) {
        if (active) {
          setKpis(null);
          setError('');
          setLoading(false);
        }
        return;
      }
      const rawSymbol = String(selectedAsset.xetrSymbol || selectedAsset.symbol || '').trim().toUpperCase();
      if (!rawSymbol) {
        if (active) {
          setKpis(null);
          setError('Für dieses Asset ist kein Symbol hinterlegt.');
          setLoading(false);
        }
        return;
      }

      const normalized = rawSymbol.replace(/\s+/g, '');
      const tickers = buildTickerCandidates(normalized, selectedAsset).slice(0, 6);

      if (active) {
        setKpis(buildLocalFallback(selectedAsset, normalized));
      }

      try {
        let resolved = null;
        const backendLive = await fetchBackendLiveFundamental(normalized, selectedAsset);
        if (backendLive?._error) {
          if (!active) return;
          setKpis(buildLocalFallback(selectedAsset, normalized));
          setError(backendLive._error);
          return;
        }
        if (backendLive) {
          if (!active) return;
          setKpis(backendLive);
          setError('');
          return;
        }

        resolved = await firstNonNull(
          tickers.map((ticker) => async () => {
            const summaryUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=financialData,defaultKeyStatistics,summaryDetail,fundProfile,fundPerformance`;
            const summary = await fetchJsonWithFallback(summaryUrl);
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
              recommendation: fin.recommendationKey,
              currency: String(fin.financialCurrency || detail.currency || 'USD').toUpperCase(),
            };
            return hasAnyLiveKpi(candidate) ? candidate : null;
          })
        );

        if (!resolved) {
          resolved = await firstNonNull(
            tickers.map((ticker) => async () => {
              const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`;
              const quoteData = await fetchJsonWithFallback(quoteUrl);
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
                recommendation: quote.recommendationKey,
                currency: String(quote.financialCurrency || quote.currency || 'USD').toUpperCase(),
              };
              return hasAnyLiveKpi(candidate) ? candidate : null;
            })
          );
        }

        if (!resolved) {
          for (const ticker of tickers.slice(0, 2)) {
            const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
            const chartData = await fetchJsonWithFallback(chartUrl);
            const result = chartData?.chart?.result?.[0];
            const meta = result?.meta;
            const closes = (result?.indicators?.quote?.[0]?.close || []).filter((v) => Number.isFinite(v));
            const firstClose = closes.length ? closes[0] : null;
            const lastClose = closes.length ? closes[closes.length - 1] : readNumber(meta?.regularMarketPrice);
            let recommendation = null;
            if (Number.isFinite(firstClose) && Number.isFinite(lastClose) && firstClose > 0) {
              const change = (lastClose - firstClose) / firstClose;
              recommendation = change > 0.03 ? 'buy' : change < -0.03 ? 'sell' : 'hold';
            }
            if (meta?.symbol) {
              resolved = {
                ticker: String(meta.symbol),
                revenue: null,
                margin: null,
                pe: null,
                pb: null,
                recommendation,
                currency: String(meta.currency || 'USD').toUpperCase(),
              };
              break;
            }
          }
        }

        if (!active) return;

        if (!resolved || !hasAnyLiveKpi(resolved)) {
          setKpis(buildLocalFallback(selectedAsset, String(selectedAsset.xetrSymbol || selectedAsset.symbol || rawSymbol)));
          setError('Keine verlässlichen Live-Kennzahlen verfügbar. KPI bleiben daher auf „—“.');
          return;
        }

        const verdict = mapVerdict(resolved.recommendation, resolved.pe, resolved.margin);
        const fetchedAt = new Date().toLocaleString('de-DE');
        const verdictText = verdict === 'POSITIV'
          ? 'Die Kennzahlen könnten auf ein solides Qualitätsprofil hindeuten.'
          : verdict === 'NEUTRAL'
            ? 'Die Kennzahlen zeigen eine gemischte Lage und dienen nur zur Orientierung.'
            : 'Die Kennzahlen könnten auf erhöhtes Bewertungs- oder Qualitätsrisiko hindeuten.';
        const metricCards = buildMetricCards(resolved, resolved.currency);

        setKpis({
          symbol: resolved.ticker,
          revenueLabel: metricCards[0]?.value || '—',
          marginLabel: metricCards[1]?.value || '—',
          peLabel: metricCards[2]?.value || '—',
          pbLabel: metricCards[3]?.value || '—',
          metricCards,
          sourceLabel: 'Yahoo Live',
          dataTimestamp: fetchedAt,
          verdict,
          verdictText,
        });
      } catch {
        if (!active) return;
        setKpis((prev) => prev || buildLocalFallback(selectedAsset, normalized));
        setError('Live-Fundamentaldaten derzeit nicht erreichbar. Lokale Portfolio-Analyse wird angezeigt.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadFundamentals();
    return () => {
      active = false;
    };
  }, [selectedAsset?.id, selectedAsset?.symbol, selectedAsset?.xetrSymbol, assets, settings?.backendUrl, settings?.accessCode]);

  const verdictColor = kpis?.verdict === 'POSITIV' ? '#10b981' : kpis?.verdict === 'NEUTRAL' ? '#f59e0b' : '#ef4444';
  const displayedKpiCards = kpis?.metricCards || [
    { label: 'Umsatz', value: kpis?.revenueLabel || '—', color: '#10b981', hint: 'Umsatz' },
    { label: 'Gewinnmarge', value: kpis?.marginLabel || '—', color: '#3b82f6', hint: 'Gewinnmarge' },
    { label: 'KGV', value: kpis?.peLabel || '—', color: '#f59e0b', hint: 'KGV' },
    { label: 'KBV', value: kpis?.pbLabel || '—', color: '#8b5cf6', hint: 'KBV' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <HeaderGlyph icon={BarChart2} color="#10b981" />
        <div>
          <h1 style={S.h1}>Fundamentalanalyse</h1>
          <div style={{ color: '#444', fontSize: 12, marginTop: 2 }}>Echte Kennzahlen für ein Portfolio-Asset</div>
        </div>
      </div>

      <div style={{ ...S.card, marginBottom: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ color: '#888', fontSize: 12, fontWeight: 700 }}>Asset</span>
        <select
          value={selectedAssetId}
          onChange={(e) => setSelectedAssetId(e.target.value)}
          style={{ ...S.select, width: 'min(460px, 100%)', padding: '8px 10px', fontSize: 12 }}
          disabled={!analyzableAssets.length}
        >
          {!analyzableAssets.length && <option value="">Keine geeigneten Assets</option>}
          {!!analyzableAssets.length && <option value="">Bitte Asset auswählen</option>}
          {analyzableAssets.map((a) => (
            <option key={a.id} value={a.id}>{a.name} ({a.xetrSymbol || a.symbol})</option>
          ))}
        </select>
        {kpis?.symbol && <span style={{ color: '#666', fontSize: 11 }}>Quelle: {kpis?.sourceLabel || 'Unbekannt'} · {kpis.symbol}</span>}
      </div>

      {!!kpis && (
        <div style={{ ...S.card, marginBottom: 14, padding: '10px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
            <div>
              <div style={{ color: '#666', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Datenquelle</div>
              <div style={{ color: '#ddd', fontSize: 12 }}>{kpis?.sourceLabel || '—'}</div>
            </div>
            <div>
              <div style={{ color: '#666', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Datenstand</div>
              <div style={{ color: '#ddd', fontSize: 12 }}>{kpis?.dataTimestamp || '—'}</div>
            </div>
            <div>
              <div style={{ color: '#666', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Zuverlässigkeit</div>
              <div style={{ color: kpis?.sourceLabel?.includes('Cache') ? '#f59e0b' : (kpis?.dataTimestamp ? '#10b981' : '#f59e0b'), fontSize: 12, fontWeight: 600 }}>
                {kpis?.sourceLabel?.includes('Cache') ? 'Live-Cache' : (kpis?.dataTimestamp ? 'Live verifiziert' : 'Kein Live-KPI')}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ ...S.card, marginBottom: 14, color: '#888', fontSize: 13 }}>Lade Fundamentaldaten…</div>
      )}
      {error && !loading && (
        <div
          style={{
            ...S.card,
            marginBottom: 14,
            color: error.includes('KI-Analyse') ? '#f59e0b' : '#ef4444',
            border: error.includes('KI-Analyse') ? '1px solid #3a2a12' : S.card.border,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div style={{ ...S.card }}>
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>KPI Übersicht</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {displayedKpiCards.map((card, idx) => (
              <div key={`${card.label}-${idx}`} style={{ background: '#1a1a1a', borderRadius: 8, padding: 12 }}>
                <div style={{ color: '#888', fontSize: 12, display: 'inline-flex', alignItems: 'center' }}>
                  {card.label}
                  {card.hint ? <InfoHint term={card.hint} /> : null}
                </div>
                <div style={{ color: card.color || '#ddd', fontSize: 18, fontWeight: 600 }}>{card.value || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...S.card }}>
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Bewertung</h3>
          {hasEvaluation && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: verdictColor }}></div>
                <span style={{ color: verdictColor, fontWeight: 600 }}>{kpis?.verdict || '—'}</span>
              </div>
              <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.5 }}>{kpis?.verdictText}</div>
            </>
          )}
        </div>
      </div>

      <div style={{ ...S.card, marginTop: 20 }}>
        <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>KI Chatbot zur Aktie</h3>
        <div style={{ display: 'grid', gap: 8, marginBottom: 12, maxHeight: 220, overflowY: 'auto' }}>
          {!chatMessages.length && (
            <div style={{ color: '#777', fontSize: 13 }}>
              {selectedAsset ? 'Frag mich alles zur ausgewählten Aktie (z. B. Chancen, Risiken, Bewertung).' : 'Bitte zuerst ein Asset auswählen.'}
            </div>
          )}
          {chatMessages.map((msg, idx) => (
            <div
              key={`${msg.role}-${idx}`}
              style={{
                justifySelf: msg.role === 'user' ? 'end' : 'start',
                maxWidth: '92%',
                background: msg.role === 'user' ? '#10b98120' : '#1a1a1a',
                border: `1px solid ${msg.role === 'user' ? '#10b98135' : '#2a2a2a'}`,
                borderRadius: 10,
                padding: '8px 10px',
                color: msg.role === 'user' ? '#d1fae5' : '#ddd',
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              {msg.text}
            </div>
          ))}
          {chatLoading && <div style={{ color: '#888', fontSize: 12 }}>KI antwortet…</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                askFundamentalChat();
              }
            }}
            placeholder={selectedAsset ? 'Frage zur Aktie eingeben…' : 'Bitte zuerst ein Asset auswählen'}
            disabled={!selectedAsset || chatLoading}
            style={{ ...S.input, padding: '10px 12px', fontSize: 13 }}
          />
          <button
            onClick={askFundamentalChat}
            disabled={!selectedAsset || chatLoading || !chatInput.trim()}
            style={{ ...S.btn, opacity: (!selectedAsset || chatLoading || !chatInput.trim()) ? 0.5 : 1 }}
          >
            Fragen
          </button>
        </div>
      </div>
    </div>
  );
}

// Candlestick Chart Component
function CandlestickChart({ data, height = 350, overlays = {} }) {
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [viewOffset, setViewOffset] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef(null);
  const [chartPixelWidth, setChartPixelWidth] = useState(800);
  const panStateRef = useRef({ active: false, startX: 0, startY: 0, startOffset: 0, horizontalLocked: false });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const updateWidth = () => {
      const next = Math.max(320, Math.floor(el.clientWidth || 320));
      setChartPixelWidth(next);
    };

    updateWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const isMobile = chartPixelWidth < 640;
  const maxVisibleCandles = isMobile ? 40 : chartPixelWidth < 980 ? 70 : 110;

  useEffect(() => {
    const length = data?.length || 0;
    setViewOffset((prev) => Math.max(0, Math.min(prev, Math.max(0, length - maxVisibleCandles))));
  }, [data?.length, maxVisibleCandles]);

  if (!data || data.length < 2) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
      Keine Chart-Daten verfügbar
    </div>
  );

  const maxOffset = Math.max(0, data.length - maxVisibleCandles);
  const clampedOffset = Math.max(0, Math.min(viewOffset, maxOffset));
  const endIndex = Math.max(1, data.length - clampedOffset);
  const startIndex = Math.max(0, endIndex - maxVisibleCandles);
  const visibleData = data.slice(startIndex, endIndex);

  const padding = { top: isMobile ? 14 : 18, right: isMobile ? 64 : 78, bottom: isMobile ? 24 : 28, left: isMobile ? 42 : 54 };
  const chartWidth = chartPixelWidth - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const priceColorUp = '#0ECB81';
  const priceColorDown = '#F6465D';
  const gridColor = '#232323';

  const highs = visibleData.map(d => d.high);
  const lows = visibleData.map(d => d.low);
  const minPrice = Math.min(...lows) * 0.98;
  const maxPrice = Math.max(...highs) * 1.02;
  const priceRange = maxPrice - minPrice;

  const toVisible = (arr) => (Array.isArray(arr) ? arr.slice(startIndex, startIndex + visibleData.length) : []);

  const volumeEnabled = overlays.showVolume !== false && Array.isArray(overlays.volumeSeries);
  const volumeSeriesVisible = volumeEnabled ? toVisible(overlays.volumeSeries) : [];
  const maxVolume = volumeSeriesVisible.length ? Math.max(...volumeSeriesVisible, 1) : 1;
  const volumeSectionHeight = volumeEnabled ? Math.max(32, Math.min(52, chartHeight * 0.16)) : 0;
  const volumeGap = volumeEnabled ? 6 : 0;
  const priceChartHeight = chartHeight - volumeSectionHeight - volumeGap;

  const candleWidth = Math.max(isMobile ? 5 : 4, chartWidth / (visibleData.length * 1.5));
  const candleSpacing = candleWidth * 1.5;
  const pxPerCandle = Math.max(6, chartWidth / Math.max(1, visibleData.length));

  const getY = (price) => padding.top + (1 - (price - minPrice) / priceRange) * priceChartHeight;
  const getX = (i) => padding.left + i * candleSpacing + candleSpacing / 2;
  const volumeTop = padding.top + priceChartHeight + volumeGap;
  const getVolY = (vol) => volumeTop + (1 - (vol / Math.max(1, maxVolume))) * volumeSectionHeight;
  const yClamped = (y) => Math.max(padding.top, Math.min(y, padding.top + priceChartHeight));

  const ma20Visible = toVisible(overlays.ma20);
  const ma50Visible = toVisible(overlays.ma50);
  const ma200Visible = toVisible(overlays.ma200);
  const bbUpperVisible = toVisible(overlays.bbUpper);
  const bbMiddleVisible = toVisible(overlays.bbMiddle);
  const bbLowerVisible = toVisible(overlays.bbLower);

  const toLinePoints = (series) => series
    .map((value, index) => (Number.isFinite(value) ? `${getX(index)},${getY(value)}` : null))
    .filter(Boolean)
    .join(' ');

  const clampOffset = (next) => Math.max(0, Math.min(next, maxOffset));
  const applyPanByX = (clientX) => {
    const pan = panStateRef.current;
    const deltaX = clientX - pan.startX;
    const deltaCandles = Math.round((-deltaX) / pxPerCandle);
    setViewOffset(clampOffset(pan.startOffset + deltaCandles));
  };

  const startPan = (x, y) => {
    panStateRef.current = {
      active: true,
      startX: x,
      startY: y,
      startOffset: clampedOffset,
      horizontalLocked: false,
    };
    setIsPanning(true);
  };

  const endPan = () => {
    panStateRef.current.active = false;
    panStateRef.current.horizontalLocked = false;
    setIsPanning(false);
  };

  const hoveredCandle = hoverIndex >= 0 ? visibleData[hoverIndex] : visibleData[visibleData.length - 1];
  const infoBoxWidth = Math.min(340, Math.max(200, chartPixelWidth - padding.left - padding.right - 16));
  const currentClose = visibleData[visibleData.length - 1]?.close;
  const prevClose = visibleData[visibleData.length - 2]?.close;
  const liveChange = Number.isFinite(currentClose) && Number.isFinite(prevClose) && prevClose !== 0
    ? ((currentClose - prevClose) / prevClose) * 100
    : 0;
  const priceDecimals = (() => {
    if (!Number.isFinite(currentClose) || !Number.isFinite(priceRange)) return 2;
    const rel = Math.abs(priceRange / Math.max(Math.abs(currentClose), 0.000001));
    if (rel < 0.003) return 4;
    if (rel < 0.02) return 3;
    if (Math.abs(currentClose) < 1) return 4;
    if (Math.abs(currentClose) < 20) return 3;
    return 2;
  })();
  const formatPrice = (value) => Number(value).toLocaleString('de-DE', {
    minimumFractionDigits: priceDecimals,
    maximumFractionDigits: priceDecimals,
  });
  const formatCompact = (value, digits = 2) => Number(value).toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  // Calculate Support & Resistance
  const lows_sorted = [...lows].sort((a, b) => a - b);
  const highs_sorted = [...highs].sort((a, b) => a - b);
  const support1 = lows_sorted[Math.floor(lows_sorted.length * 0.2)];
  const support2 = lows_sorted[Math.floor(lows_sorted.length * 0.05)];
  const resistance1 = highs_sorted[Math.floor(highs_sorted.length * 0.8)];
  const resistance2 = highs_sorted[Math.floor(highs_sorted.length * 0.95)];

  // Y-Achsen Labels
  const ySteps = 4;
  const yLabels = Array.from({length: ySteps + 1}, (_, i) => {
    const price = minPrice + (priceRange * i / ySteps);
    return { price, y: getY(price) };
  });

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ color: '#6b7280', fontSize: 11 }}>
          {clampedOffset > 0 ? `${clampedOffset} Kerzen zurück · wische nach rechts für neuere Daten` : 'Live-Bereich · wische nach links für Historie'}
        </div>
        {clampedOffset > 0 && (
          <button
            onClick={() => setViewOffset(0)}
            style={{ border: '1px solid #2f2f2f', background: '#121212', color: '#9ca3af', borderRadius: 6, fontSize: 11, padding: '4px 8px', cursor: 'pointer' }}
          >
            Live
          </button>
        )}
      </div>
      <svg
        width="100%"
        height={height}
        style={{ background: '#080808', borderRadius: 12, touchAction: 'pan-y', cursor: isPanning ? 'grabbing' : 'crosshair' }}
        onMouseDown={(e) => startPan(e.clientX, e.clientY)}
        onMouseMove={(e) => {
          if (!panStateRef.current.active || e.buttons !== 1) return;
          applyPanByX(e.clientX);
        }}
        onMouseUp={endPan}
        onMouseLeave={endPan}
        onTouchStart={(e) => {
          const t = e.touches?.[0];
          if (!t) return;
          startPan(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          if (!panStateRef.current.active) return;
          const t = e.touches?.[0];
          if (!t) return;
          const pan = panStateRef.current;
          const dx = Math.abs(t.clientX - pan.startX);
          const dy = Math.abs(t.clientY - pan.startY);
          if (!pan.horizontalLocked && dx > 8 && dx > dy) {
            pan.horizontalLocked = true;
          }
          if (pan.horizontalLocked) {
            e.preventDefault();
            applyPanByX(t.clientX);
          }
        }}
        onTouchEnd={endPan}
        onTouchCancel={endPan}
      >
      <defs>
        <linearGradient id="chartBgGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#101010" />
          <stop offset="100%" stopColor="#090909" />
        </linearGradient>
        <clipPath id="plotAreaClip">
          <rect x={padding.left} y={padding.top} width={chartWidth} height={priceChartHeight} rx="6" />
        </clipPath>
      </defs>

      <rect x="0" y="0" width="100%" height={height} fill="url(#chartBgGradient)" />
      <rect x={padding.left} y={padding.top} width={chartWidth} height={priceChartHeight} fill="#0d0d0d" rx="6" />
      <rect x={padding.left + chartWidth} y={padding.top} width={padding.right} height={priceChartHeight} fill="#0b0b0b" />
      {volumeEnabled && <rect x={padding.left} y={volumeTop} width={chartWidth} height={volumeSectionHeight} fill="#0c0c0c" rx="4" />}

      {hoveredCandle && !isPanning && (
        <g>
          <rect x={padding.left + 6} y={padding.top + 4} width={infoBoxWidth} height="24" rx="6" fill="#0f0f0f" fillOpacity="0.9" stroke="#2c2c2c" />
          <text x={padding.left + 12} y={padding.top + 20} fontSize="10" fill="#9ca3af">{hoveredCandle.date}</text>
          <text x={padding.left + 92} y={padding.top + 20} fontSize="10" fill="#cfd4dc">
            O {formatPrice(hoveredCandle.open)} H {formatPrice(hoveredCandle.high)} L {formatPrice(hoveredCandle.low)} C {formatPrice(hoveredCandle.close)}
          </text>
          <text x={padding.left + infoBoxWidth - 10} y={padding.top + 20} textAnchor="end" fontSize="10" fill={liveChange >= 0 ? priceColorUp : priceColorDown}>
            {liveChange >= 0 ? '+' : ''}{formatCompact(liveChange, 2)}%
          </text>
        </g>
      )}

      {/* Grid */}
      {yLabels.map((label, i) => (
        <line key={i} x1={padding.left} y1={label.y} x2={padding.left + chartWidth} y2={label.y} stroke={gridColor} strokeWidth="1" strokeDasharray="3,4" strokeOpacity="0.75" />
      ))}

      {/* Y-Achsen */}
      <line x1={padding.left + chartWidth} y1={padding.top} x2={padding.left + chartWidth} y2={padding.top + priceChartHeight} stroke="#3a3a3a" strokeWidth="1" />
      <line x1={padding.left} y1={padding.top + priceChartHeight} x2={padding.left + chartWidth} y2={padding.top + priceChartHeight} stroke="#3a3a3a" strokeWidth="1" />

      {/* Y-Labels */}
      {yLabels.map((label, i) => (
        <text key={i} x={padding.left + chartWidth + 6} y={label.y + 4} textAnchor="start" fontSize="11" fill="#7b7b7b">
          {formatPrice(label.price)}
        </text>
      ))}

      {overlays.showSR !== false && (
        <>
          <rect
            x={padding.left}
            y={Math.min(getY(resistance2), getY(resistance1))}
            width={chartWidth}
            height={Math.abs(getY(resistance1) - getY(resistance2))}
            fill="#ef4444"
            fillOpacity="0.08"
          />
          <rect
            x={padding.left}
            y={Math.min(getY(support1), getY(support2))}
            width={chartWidth}
            height={Math.abs(getY(support2) - getY(support1))}
            fill="#10b981"
            fillOpacity="0.08"
          />
        </>
      )}

      {/* Support & Resistance Lines */}
      {overlays.showSR !== false && (
        <>
          <line x1={padding.left} y1={getY(resistance2)} x2={padding.left + chartWidth} y2={getY(resistance2)} stroke="#ef4444" strokeWidth="2" strokeDasharray="6,3" strokeOpacity="0.4" />
          <line x1={padding.left} y1={getY(resistance1)} x2={padding.left + chartWidth} y2={getY(resistance1)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4,2" strokeOpacity="0.3" />
          <line x1={padding.left} y1={getY(support1)} x2={padding.left + chartWidth} y2={getY(support1)} stroke="#10b981" strokeWidth="1" strokeDasharray="4,2" strokeOpacity="0.3" />
          <line x1={padding.left} y1={getY(support2)} x2={padding.left + chartWidth} y2={getY(support2)} stroke="#10b981" strokeWidth="2" strokeDasharray="6,3" strokeOpacity="0.4" />

          <text x={padding.left + chartWidth - 30} y={getY(resistance2) + 4} fontSize="10" fill="#ef4444" fontWeight="600">R2</text>
          <text x={padding.left + chartWidth - 30} y={getY(resistance1) + 4} fontSize="10" fill="#ef4444" fontWeight="600">R1</text>
          <text x={padding.left + chartWidth - 30} y={getY(support1) + 4} fontSize="10" fill="#10b981" fontWeight="600">S1</text>
          <text x={padding.left + chartWidth - 30} y={getY(support2) + 4} fontSize="10" fill="#10b981" fontWeight="600">S2</text>
        </>
      )}

      {overlays.showFib && Array.isArray(overlays.fibLevels) && overlays.fibLevels.map((fib) => (
        <g key={fib.label}>
          <line
            x1={padding.left}
            y1={getY(fib.price)}
            x2={padding.left + chartWidth}
            y2={getY(fib.price)}
            stroke="#6366f1"
            strokeWidth="1"
            strokeDasharray="2,3"
            strokeOpacity="0.45"
          />
          <text x={padding.left + 4} y={getY(fib.price) - 3} fontSize="10" fill="#818cf8" fontWeight="600">
            {fib.label}
          </text>
        </g>
      ))}

      {overlays.showBollinger && toLinePoints(bbUpperVisible) && (
        <polyline points={toLinePoints(bbUpperVisible)} fill="none" stroke="#60a5fa" strokeWidth="0.85" strokeOpacity="0.62" />
      )}
      {overlays.showBollinger && toLinePoints(bbMiddleVisible) && (
        <polyline points={toLinePoints(bbMiddleVisible)} fill="none" stroke="#93c5fd" strokeWidth="0.75" strokeOpacity="0.52" strokeDasharray="3,3" />
      )}
      {overlays.showBollinger && toLinePoints(bbLowerVisible) && (
        <polyline points={toLinePoints(bbLowerVisible)} fill="none" stroke="#60a5fa" strokeWidth="0.85" strokeOpacity="0.62" />
      )}

      {overlays.showMA20 && toLinePoints(ma20Visible) && (
        <polyline points={toLinePoints(ma20Visible)} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.95" />
      )}
      {overlays.showMA50 && toLinePoints(ma50Visible) && (
        <polyline points={toLinePoints(ma50Visible)} fill="none" stroke="#3b82f6" strokeWidth="1.6" strokeOpacity="0.95" />
      )}
      {overlays.showMA200 && toLinePoints(ma200Visible) && (
        <polyline points={toLinePoints(ma200Visible)} fill="none" stroke="#f3f4f6" strokeWidth="1.8" strokeOpacity="0.9" />
      )}

      {Number.isFinite(currentClose) && (
        <g>
          <line
            x1={padding.left}
            y1={getY(currentClose)}
            x2={padding.left + chartWidth}
            y2={getY(currentClose)}
            stroke={liveChange >= 0 ? priceColorUp : priceColorDown}
            strokeWidth="1"
            strokeDasharray="3,3"
            strokeOpacity="0.65"
          />
          <rect x={padding.left + chartWidth + 2} y={getY(currentClose) - 8} width={padding.right - 6} height={16} rx="4" fill={liveChange >= 0 ? '#063b2c' : '#3d1118'} stroke={liveChange >= 0 ? '#0ECB81' : '#F6465D'} />
          <text x={padding.left + chartWidth + 5} y={getY(currentClose) + 3.5} fontSize="10" fill="#f3f4f6" fontWeight="700">{formatPrice(currentClose)}</text>
        </g>
      )}

      <g clipPath="url(#plotAreaClip)">
      {/* Candles */}
      {visibleData.map((candle, i) => {
        const x = getX(i);
        const yOpen = getY(candle.open);
        const yClose = getY(candle.close);
        const yHigh = getY(candle.high);
        const yLow = getY(candle.low);
        const isGreen = candle.close >= candle.open;
        const color = isGreen ? priceColorUp : priceColorDown;
        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.abs(yClose - yOpen) || 1;

        return (
          <g key={i}>
            {/* Docht (High-Low Linie) */}
            <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.2" strokeOpacity="0.8" />
            {/* Körper (Open-Close Box) */}
            <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} rx="1.4" fill={color} stroke={isGreen ? '#86efac' : '#fca5a5'} strokeWidth="0.7" />
            <rect
              x={x - candleSpacing / 2}
              y={padding.top}
              width={candleSpacing}
              height={priceChartHeight}
              fill="transparent"
              onMouseEnter={() => !isPanning && setHoverIndex(i)}
              onMouseMove={() => !isPanning && setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(-1)}
            />
          </g>
        );
      })}

      {volumeEnabled && volumeSeriesVisible.map((vol, i) => {
        const candle = visibleData[i];
        const up = candle && candle.close >= candle.open;
        const x = getX(i);
        const barWidth = Math.max(2, candleWidth * 0.9);
        const y = getVolY(vol || 0);
        const h = Math.max(1, volumeTop + volumeSectionHeight - y);
        return (
          <rect
            key={`vol-${i}`}
            x={x - barWidth / 2}
            y={y}
            width={barWidth}
            height={h}
            fill={up ? '#16a34a66' : '#dc262666'}
            stroke={up ? '#22c55e66' : '#f8717166'}
            strokeWidth="0.4"
          />
        );
      })}
      </g>

      {volumeEnabled && (
        <>
          <line x1={padding.left} y1={volumeTop} x2={padding.left + chartWidth} y2={volumeTop} stroke="#2d2d2d" strokeWidth="1" />
          <text x={padding.left + chartWidth + 6} y={volumeTop + 10} textAnchor="start" fontSize="10" fill="#666">VOL</text>
        </>
      )}

      {hoverIndex >= 0 && !isPanning && (
        <g>
          <line
            x1={getX(hoverIndex)}
            y1={padding.top}
            x2={getX(hoverIndex)}
            y2={padding.top + priceChartHeight}
            stroke="#8b949e"
            strokeWidth="1"
            strokeDasharray="3,3"
            strokeOpacity="0.7"
          />
          <line
            x1={padding.left}
            y1={getY(hoveredCandle?.close ?? currentClose ?? minPrice)}
            x2={padding.left + chartWidth}
            y2={getY(hoveredCandle?.close ?? currentClose ?? minPrice)}
            stroke="#8b949e"
            strokeWidth="1"
            strokeDasharray="3,3"
            strokeOpacity="0.7"
          />
          <rect
            x={padding.left + chartWidth + 2}
            y={yClamped(getY(hoveredCandle?.close ?? currentClose ?? minPrice)) - 8}
            width={padding.right - 6}
            height={16}
            rx="4"
            fill="#111827"
            stroke="#334155"
          />
          <text
            x={padding.left + chartWidth + 5}
            y={yClamped(getY(hoveredCandle?.close ?? currentClose ?? minPrice)) + 3.5}
            fontSize="10"
            fill="#e5e7eb"
            fontWeight="700"
          >
            {formatPrice(hoveredCandle?.close ?? currentClose ?? minPrice)}
          </text>
          <rect
            x={Math.max(padding.left, Math.min(getX(hoverIndex) - 42, padding.left + chartWidth - 84))}
            y={padding.top + priceChartHeight + 4}
            width="84"
            height="16"
            rx="4"
            fill="#111827"
            stroke="#334155"
          />
          <text
            x={Math.max(padding.left, Math.min(getX(hoverIndex), padding.left + chartWidth - 42))}
            y={padding.top + priceChartHeight + 15}
            textAnchor="middle"
            fontSize="10"
            fill="#e5e7eb"
            fontWeight="700"
          >
            {hoveredCandle?.date || ''}
          </text>
        </g>
      )}

      {/* X-Labels (Daten) */}
      {visibleData.map((d, i) => {
        if (i % Math.max(1, Math.floor(visibleData.length / (isMobile ? 2 : 4))) === 0) {
          const x = getX(i);
          return (
            <text key={i} x={x} y={padding.top + priceChartHeight + volumeSectionHeight + 16} textAnchor="middle" fontSize="10" fill="#666">
              {d.date}
            </text>
          );
        }
        return null;
      })}
      </svg>
    </div>
  );
}

function TechnicalAnalysis() {
  const { assets } = useApp();
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [timeframe, setTimeframe] = useState('15m');
  const [liveNow, setLiveNow] = useState(Date.now());
  const [liveQuote, setLiveQuote] = useState(null);
  const [overlays, setOverlays] = useState({
    ma20: true,
    ma50: true,
    ma200: false,
    bollinger: false,
    supportResistance: true,
    fibonacci: false,
    volume: true,
  });

  useEffect(() => {
    if (!assets?.length) {
      setSelectedAssetId('');
      return;
    }
    if (!assets.some(a => a.id === selectedAssetId)) {
      setSelectedAssetId(assets[0].id);
    }
  }, [assets, selectedAssetId]);

  const asset = useMemo(
    () => assets.find(a => a.id === selectedAssetId) || assets[0] || null,
    [assets, selectedAssetId]
  );

  useEffect(() => {
    let active = true;

    const loadQuote = async () => {
      if (!asset) return;
      try {
        const q = await fetchLivePrice(asset);
        if (!active) return;
        if (q && Number.isFinite(Number(q.price))) {
          setLiveQuote({ price: Number(q.price), change24h: Number(q.change24h || 0) });
          return;
        }
      } catch { }
      if (!active) return;
      const fallback = Number(asset.currentPrice);
      if (Number.isFinite(fallback)) {
        setLiveQuote({ price: fallback, change24h: null });
      }
    };

    loadQuote();
    const refresh = setInterval(loadQuote, 5000);
    return () => {
      active = false;
      clearInterval(refresh);
    };
  }, [asset?.id, asset?.symbol, asset?.xetrSymbol, asset?.coinId, asset?.currentPrice]);

  const seededRandom = (seed) => {
    const s = Math.sin(seed) * 10000;
    return s - Math.floor(s);
  };

  const formatLabel = (timestamp, mode) => {
    const date = new Date(timestamp);
    if (mode === 'time') return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    if (mode === 'datetime') return date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    if (mode === 'monthYear') return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
    return date.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' });
  };

  const generateChartData = (basePrice, config, seedBase = 1, nowMs = Date.now(), livePrice = null) => {
    const { points, stepMs, labelMode, live } = config;
    const data = [];
    let price = basePrice;
    const bucketStart = Math.floor(nowMs / stepMs) * stepMs;
    for (let i = 0; i < points; i++) {
      const randA = seededRandom(seedBase + i * 1.137);
      const randB = seededRandom(seedBase + i * 2.271);
      const volatility = (randA - 0.5) * basePrice * 0.02;
      const dayChange = (randB - 0.5) * basePrice * 0.012;
      const open = price;
      const close = price + dayChange;
      const high = Math.max(open, close) + Math.abs(volatility);
      const low = Math.min(open, close) - Math.abs(volatility) * 0.5;
      const ts = bucketStart - (points - 1 - i) * stepMs;
      data.push({
        ts,
        date: formatLabel(ts, labelMode),
        open: open,
        close: close,
        high: Math.max(high, low),
        low: Math.min(low, high)
      });
      price = close;
    }

    if (data.length >= 2) {
      const lastIdx = data.length - 1;
      const prevClose = data[lastIdx - 1].close;
      const open = prevClose;
      const progress = (nowMs - bucketStart) / stepMs;
      const swing = (seededRandom(seedBase + nowMs / 60000) - 0.5) * basePrice * 0.0018;
      const drift = Math.sin(nowMs / 5000 + seedBase) * basePrice * 0.0009;
      const simulatedClose = open + (swing + drift) * (0.15 + Math.max(0, Math.min(1, progress)));
      const liveNoise = Math.sin(nowMs / 1200 + seedBase) * basePrice * 0.00055;
      const liveTarget = Number.isFinite(livePrice) ? (Number(livePrice) + (live ? liveNoise : 0)) : null;
      const targetClose = Number.isFinite(liveTarget) ? liveTarget : (live ? simulatedClose : data[lastIdx].close);
      const liveClose = targetClose;
      const liveHigh = Math.max(open, liveClose) + Math.abs(swing) * 0.6;
      const liveLow = Math.min(open, liveClose) - Math.abs(swing) * 0.6;
      data[lastIdx] = {
        ...data[lastIdx],
        ts: bucketStart,
        date: formatLabel(bucketStart, labelMode),
        open,
        close: liveClose,
        high: Math.max(liveHigh, liveLow),
        low: Math.min(liveHigh, liveLow),
      };
    }

    return data;
  };

  const timeframeConfig = timeframe === '1m'
    ? { points: 120, stepMs: 60 * 1000, labelMode: 'time', live: true }
    : timeframe === '5m'
      ? { points: 120, stepMs: 5 * 60 * 1000, labelMode: 'time', live: true }
      : timeframe === '15m'
        ? { points: 120, stepMs: 15 * 60 * 1000, labelMode: 'datetime', live: true }
        : timeframe === '1h'
          ? { points: 120, stepMs: 60 * 60 * 1000, labelMode: 'datetime', live: true }
          : timeframe === '4h'
            ? { points: 120, stepMs: 4 * 60 * 60 * 1000, labelMode: 'datetime', live: true }
            : timeframe === '1D'
              ? { points: 90, stepMs: 24 * 60 * 60 * 1000, labelMode: 'date', live: false }
              : timeframe === '1W'
                ? { points: 78, stepMs: 7 * 24 * 60 * 60 * 1000, labelMode: 'date', live: false }
                : timeframe === '1M'
                  ? { points: 120, stepMs: 6 * 60 * 60 * 1000, labelMode: 'date', live: true }
                  : timeframe === '3M'
                    ? { points: 90, stepMs: 24 * 60 * 60 * 1000, labelMode: 'date', live: false }
                    : timeframe === '1Y'
                      ? { points: 120, stepMs: 3 * 24 * 60 * 60 * 1000, labelMode: 'date', live: false }
                      : { points: 300, stepMs: Math.round((365 * 5 * 24 * 60 * 60 * 1000) / 299), labelMode: 'monthYear', live: false };

  useEffect(() => {
    if (!timeframeConfig.live) return;
    const tick = setInterval(() => setLiveNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [timeframeConfig.live, timeframe]);

  const chartData = useMemo(() => {
    if (!asset) return [];
    const basePrice = Number.isFinite(Number(liveQuote?.price)) ? Number(liveQuote.price) : Number(asset.currentPrice || 0);
    const seedSource = `${asset.id || ''}-${asset.symbol || ''}-${timeframe}`;
    const seed = Array.from(seedSource).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + basePrice;
    return generateChartData(basePrice, timeframeConfig, seed, liveNow, basePrice);
  }, [asset, timeframe, timeframeConfig, liveNow, liveQuote?.price]);

  if (!assets || assets.length === 0) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <HeaderGlyph icon={TrendingUp} color="#10b981" size={40} />
          <div>
            <h1 style={S.h1}>Technische Analyse</h1>
            <div style={{ color: '#444', fontSize: 12, marginTop: 2 }}>Chartmuster & Indikatoren mit Candlestick-Analyse</div>
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #1a1a1a, #111)', border: '1px solid #222', borderRadius: 12, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ color: '#ddd', fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Keine Assets im Portfolio</div>
          <div style={{ color: '#666', fontSize: 13 }}>Füge Assets hinzu, um technische Analysen mit Live-Charts zu sehen</div>
        </div>
      </div>
    );
  }

  const currentPrice = Number.isFinite(Number(liveQuote?.price))
    ? Number(liveQuote.price)
    : (chartData[chartData.length - 1]?.close ?? asset.currentPrice);
  const highestPrice = Math.max(...chartData.map(d => d.high));
  const lowestPrice = Math.min(...chartData.map(d => d.low));
  const closes = chartData.map(d => Number(d.close)).filter(Number.isFinite);
  const highs = chartData.map(d => Number(d.high)).filter(Number.isFinite);
  const lows = chartData.map(d => Number(d.low)).filter(Number.isFinite);

  const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const stdev = (values) => {
    if (values.length < 2) return 0;
    const m = mean(values);
    const variance = values.reduce((sum, value) => sum + ((value - m) ** 2), 0) / (values.length - 1);
    return Math.sqrt(Math.max(0, variance));
  };

  const smaSeries = (values, period) => values.map((_, index) => {
    if (index + 1 < period) return null;
    const window = values.slice(index + 1 - period, index + 1);
    return mean(window);
  });

  const calcRsi = (values, period = 14) => {
    if (values.length < period + 1) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = values.length - period; i < values.length; i++) {
      const diff = values[i] - values[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };
  const emaSeries = (values, period) => {
    if (!values.length) return [];
    const multiplier = 2 / (period + 1);
    const out = [values[0]];
    for (let i = 1; i < values.length; i++) {
      out.push((values[i] - out[i - 1]) * multiplier + out[i - 1]);
    }
    return out;
  };
  const calcMacd = (values) => {
    if (values.length < 26) return 0;
    const ema12 = emaSeries(values, 12);
    const ema26 = emaSeries(values, 26);
    return ema12[ema12.length - 1] - ema26[ema26.length - 1];
  };
  const rsi = calcRsi(closes);
  const macd = calcMacd(closes);

  const ma20Series = smaSeries(closes, 20);
  const ma50Series = smaSeries(closes, 50);
  const ma200Series = smaSeries(closes, 200);
  const ma20 = ma20Series[ma20Series.length - 1];
  const ma50 = ma50Series[ma50Series.length - 1];
  const ma200 = ma200Series[ma200Series.length - 1];

  const bbMiddleSeries = ma20Series;
  const bbUpperSeries = closes.map((_, index) => {
    if (index + 1 < 20) return null;
    const window = closes.slice(index + 1 - 20, index + 1);
    return mean(window) + 2 * stdev(window);
  });
  const bbLowerSeries = closes.map((_, index) => {
    if (index + 1 < 20) return null;
    const window = closes.slice(index + 1 - 20, index + 1);
    return mean(window) - 2 * stdev(window);
  });
  const bbUpper = bbUpperSeries[bbUpperSeries.length - 1];
  const bbLower = bbLowerSeries[bbLowerSeries.length - 1];

  const volumeSeries = chartData.map((candle, index) => {
    const body = Math.abs(candle.close - candle.open);
    const wick = Math.abs(candle.high - candle.low);
    const seed = Math.sin(index * 1.734 + (asset?.id?.length || 1)) * 0.5 + 0.5;
    return Math.max(200, Math.round((body * 1600 + wick * 900 + 700) * (0.8 + seed * 0.6)));
  });
  const volumeMa20Series = smaSeries(volumeSeries, 20);
  const lastVolume = volumeSeries[volumeSeries.length - 1] || 0;
  const lastVolumeMa20 = volumeMa20Series[volumeMa20Series.length - 1] || 0;
  const volumeTrend = lastVolumeMa20 > 0
    ? (lastVolume > lastVolumeMa20 * 1.2 ? 'Hoch' : lastVolume < lastVolumeMa20 * 0.85 ? 'Niedrig' : 'Normal')
    : 'Normal';

  const returns = closes.slice(1).map((price, index) => (price - closes[index]) / closes[index]).filter(Number.isFinite);
  const volatility = stdev(returns) * Math.sqrt(252) * 100;

  const swingHigh = Math.max(...highs);
  const swingLow = Math.min(...lows);
  const fibRatios = [0.236, 0.382, 0.5, 0.618, 0.786];
  const fibLevels = fibRatios.map((ratio) => ({
    ratio,
    label: `${(ratio * 100).toFixed(1)}%`,
    price: swingHigh - (swingHigh - swingLow) * ratio,
  }));

  const recentSegment = chartData.slice(-Math.min(24, chartData.length));
  const segmentFirst = recentSegment[0] || chartData[0];
  const segmentLast = recentSegment[recentSegment.length - 1] || chartData[chartData.length - 1];
  const isHigherHigh = Number(segmentLast?.high) > Number(segmentFirst?.high);
  const isHigherLow = Number(segmentLast?.low) > Number(segmentFirst?.low);
  const isLowerHigh = Number(segmentLast?.high) < Number(segmentFirst?.high);
  const isLowerLow = Number(segmentLast?.low) < Number(segmentFirst?.low);
  const marketStructure = isHigherHigh && isHigherLow
    ? 'Aufwärtstrend (HH/HL)'
    : isLowerHigh && isLowerLow
      ? 'Abwärtstrend (LH/LL)'
      : 'Seitwärtsmarkt';

  const goldenCross = Number.isFinite(ma50) && Number.isFinite(ma200) && ma50 > ma200;
  const deathCross = Number.isFinite(ma50) && Number.isFinite(ma200) && ma50 < ma200;

  const rsiState = rsi > 70 ? 'Überkauft' : rsi < 30 ? 'Überverkauft' : 'Neutral';
  const macdState = macd > 0 ? 'Bullish' : 'Bearish';
  const priceVsMa20 = Number.isFinite(ma20) ? (currentPrice >= ma20 ? 'Über MA20' : 'Unter MA20') : 'n/a';

  const aiScoreUp = [
    macd > 0 ? 1 : 0,
    rsi >= 45 && rsi <= 70 ? 1 : 0,
    Number.isFinite(ma20) && currentPrice > ma20 ? 1 : 0,
    Number.isFinite(ma50) && Number.isFinite(ma200) && ma50 > ma200 ? 1 : 0,
    marketStructure.startsWith('Aufwärtstrend') ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);
  const uptrendProbability = Math.round((aiScoreUp / 5) * 100);
  const downtrendProbability = 100 - uptrendProbability;
  const aiSignal = uptrendProbability >= 65 ? 'Bullish' : uptrendProbability <= 35 ? 'Bearish' : 'Neutral';
  const riskLevel = volatility > 45 ? 'Hoch' : volatility > 25 ? 'Mittel' : 'Niedrig';
  const technicalScore = Math.max(0, Math.min(10, Math.round((
    (Number.isFinite(ma20) && currentPrice > ma20 ? 2 : 0) +
    (Number.isFinite(ma50) && currentPrice > ma50 ? 1 : 0) +
    (goldenCross ? 2 : deathCross ? 0 : 1) +
    (rsi >= 45 && rsi <= 70 ? 2 : rsi < 30 ? 1 : 0) +
    (macd > 0 ? 2 : 0) +
    (marketStructure.startsWith('Aufwärtstrend') ? 1 : 0)
  ))));
  const compactSignal = technicalScore >= 7 ? 'Bullish' : technicalScore <= 3 ? 'Bearish' : 'Neutral';

  // Calculate Support & Resistance Levels
  const lows_sorted = [...chartData.map(d => d.low)].sort((a, b) => a - b);
  const highs_sorted = [...chartData.map(d => d.high)].sort((a, b) => a - b);
  const support1 = lows_sorted[Math.floor(lows_sorted.length * 0.2)];
  const support2 = lows_sorted[Math.floor(lows_sorted.length * 0.05)];
  const resistance1 = highs_sorted[Math.floor(highs_sorted.length * 0.8)];
  const resistance2 = highs_sorted[Math.floor(highs_sorted.length * 0.95)];

  // Detect Chart Patterns
  const detectPatterns = () => {
    const patterns = [];
    if (!chartData || chartData.length < 2) return patterns;
    const lastPrice = chartData[chartData.length - 1].close;
    const priceChange = ((lastPrice - chartData[0].open) / chartData[0].open) * 100;
    
    if (priceChange > 3) {
      patterns.push({ name: 'Ascending Triangle', emoji: '📈', strength: 'Stark', description: 'Höhere Tiefs mit Widerstand' });
    } else if (priceChange < -3) {
      patterns.push({ name: 'Descending Triangle', emoji: '📉', strength: 'Stark', description: 'Niedrigere Hochs mit Unterstützung' });
    } else {
      patterns.push({ name: 'Konsolidierung', emoji: '➡️', strength: 'Moderat', description: 'Range-gebundener Markt' });
    }

    // Head & Shoulders check
    const mid = Math.floor(chartData.length / 2);
    const leftIdx = mid - 10;
    const rightIdx = mid + 10;
    if (leftIdx >= 0 && rightIdx < chartData.length) {
      const midHigh = Number(chartData[mid]?.high);
      const leftHigh = Number(chartData[leftIdx]?.high);
      const rightHigh = Number(chartData[rightIdx]?.high);
      if (Number.isFinite(midHigh) && Number.isFinite(leftHigh) && Number.isFinite(rightHigh) && midHigh > leftHigh && midHigh > rightHigh) {
        patterns.push({ name: 'Head & Shoulders', emoji: '👤', strength: 'Reversal', description: 'Potentieller Trendwechsel' });
      }
    }

    // Double Bottom/Top
    const recentLows = chartData.slice(-10).map(d => d.low);
    if (Math.max(...recentLows) - Math.min(...recentLows) < Math.max(...recentLows) * 0.02) {
      patterns.push({ name: 'Double Bottom', emoji: '🔝', strength: 'Support', description: 'Kaufdruck bei Unterstützung' });
    }

    const last = chartData[chartData.length - 1];
    const prev = chartData[chartData.length - 2];
    const prev2 = chartData[chartData.length - 3];
    if (last && prev) {
      const body = Math.abs(last.close - last.open);
      const range = Math.max(0.0001, last.high - last.low);
      const lowerWick = Math.min(last.open, last.close) - last.low;
      const upperWick = last.high - Math.max(last.open, last.close);

      if (body / range < 0.12) {
        patterns.push({ name: 'Doji', emoji: '➕', strength: 'Reversal', description: 'Unentschlossenheit im Markt, möglicher Richtungswechsel.' });
      }
      if (lowerWick > body * 2.2 && upperWick < body * 0.8) {
        patterns.push({ name: 'Hammer', emoji: '🔨', strength: 'Bullish', description: 'Bullisches Umkehrmuster nach Abverkauf.' });
      }
      if (upperWick > body * 2.2 && lowerWick < body * 0.8) {
        patterns.push({ name: 'Shooting Star', emoji: '🌠', strength: 'Bearish', description: 'Bearisches Umkehrmuster nach Aufwärtsbewegung.' });
      }

      const bullishEngulfing = prev.close < prev.open && last.close > last.open && last.close >= prev.open && last.open <= prev.close;
      const bearishEngulfing = prev.close > prev.open && last.close < last.open && last.open >= prev.close && last.close <= prev.open;
      if (bullishEngulfing) {
        patterns.push({ name: 'Bullish Engulfing', emoji: '🟩', strength: 'Bullish', description: 'Käufer übernehmen Momentum.' });
      }
      if (bearishEngulfing) {
        patterns.push({ name: 'Bearish Engulfing', emoji: '🟥', strength: 'Bearish', description: 'Verkäufer übernehmen Momentum.' });
      }

      if (prev2) {
        const morningStar = prev2.close < prev2.open && Math.abs(prev.close - prev.open) / Math.max(0.0001, (prev.high - prev.low)) < 0.2 && last.close > last.open && last.close > ((prev2.open + prev2.close) / 2);
        const eveningStar = prev2.close > prev2.open && Math.abs(prev.close - prev.open) / Math.max(0.0001, (prev.high - prev.low)) < 0.2 && last.close < last.open && last.close < ((prev2.open + prev2.close) / 2);
        if (morningStar) {
          patterns.push({ name: 'Morning Star', emoji: '🌅', strength: 'Bullish', description: 'Dreikerzen-Umkehrmuster auf der Oberseite.' });
        }
        if (eveningStar) {
          patterns.push({ name: 'Evening Star', emoji: '🌇', strength: 'Bearish', description: 'Dreikerzen-Umkehrmuster auf der Unterseite.' });
        }
      }
    }

    return patterns.slice(0, 6);
  };
  
  const patterns = detectPatterns();

  const fundamentals = {
    'PE Ratio': '18.5',
    'Gewinn je Aktie': '€12.45',
    'Buch./Kurs': '2.3',
    'Verschuldung': 'Moderat',
    'Dividend. Rendite': '2.1%',
    'ROE': '15.2%'
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <HeaderGlyph icon={TrendingUp} color="#10b981" size={40} />
        <div>
          <h1 style={S.h1}>Technische Analyse</h1>
          <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>Candlestick-Charts mit fundamentaler Analyse</div>
        </div>
      </div>

      {/* Asset Selector & Timeframe */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ color: '#666', fontSize: 11, display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Asset</label>
          <select 
            value={asset?.id || ''} 
            onChange={(e) => setSelectedAssetId(e.target.value)}
            style={{ background: '#111', border: '1px solid #333', color: '#fff', padding: '10px 12px', borderRadius: 8, width: '100%', fontSize: 13, fontWeight: 500 }}
          >
            {assets.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.symbol}) · €{a.currentPrice.toFixed(2)}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['1m', '5m', '15m', '1h', '4h', '1D', '1W', '1M', '3M', '1Y', '5Y'].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: `1px solid ${timeframe === tf ? '#f59e0b' : '#333'}`,
                background: timeframe === tf ? '#f59e0b20' : 'transparent',
                color: timeframe === tf ? '#f59e0b' : '#666',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: timeframe === tf ? 600 : 400,
                transition: 'all .2s'
              }}>
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...S.card, marginBottom: 16, padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ color: '#888', fontSize: 12, fontWeight: 700 }}>Indikatoren</span>
        {[
          { key: 'ma20', label: 'MA20' },
          { key: 'ma50', label: 'MA50' },
          { key: 'ma200', label: 'MA200' },
          { key: 'bollinger', label: 'Bollinger' },
          { key: 'volume', label: 'Volumen' },
          { key: 'supportResistance', label: 'S/R' },
          { key: 'fibonacci', label: 'Fibo' },
        ].map((item) => {
          const isOn = !!overlays[item.key];
          return (
            <button
              key={item.key}
              onClick={() => setOverlays((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
              style={{
                padding: '6px 10px',
                borderRadius: 7,
                border: `1px solid ${isOn ? '#10b98155' : '#333'}`,
                background: isOn ? '#10b9811a' : '#121212',
                color: isOn ? '#10b981' : '#777',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Main Chart */}
      <div style={{ ...S.card, marginBottom: 24, padding: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{asset.name}</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>€{currentPrice.toFixed(2)}</div>
            <div style={{ color: currentPrice >= asset.purchasePrice ? '#10b981' : '#ef4444', fontSize: 14, fontWeight: 600 }}>
              {((currentPrice - asset.purchasePrice) / asset.purchasePrice * 100 >= 0 ? '+' : '')}{((currentPrice - asset.purchasePrice) / asset.purchasePrice * 100).toFixed(1)}%
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '7px 9px' }}>
              <div style={{ color: '#666', fontSize: 10 }}>Trend</div>
              <div style={{ color: marketStructure.startsWith('Aufwärtstrend') ? '#10b981' : marketStructure.startsWith('Abwärtstrend') ? '#ef4444' : '#f59e0b', fontSize: 12, fontWeight: 700 }}>{marketStructure.split(' ')[0]}</div>
            </div>
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '7px 9px' }}>
              <div style={{ color: '#666', fontSize: 10 }}>Signal</div>
              <div style={{ color: compactSignal === 'Bullish' ? '#10b981' : compactSignal === 'Bearish' ? '#ef4444' : '#f59e0b', fontSize: 12, fontWeight: 700 }}>{compactSignal}</div>
            </div>
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '7px 9px' }}>
              <div style={{ color: '#666', fontSize: 10 }}>RSI</div>
              <div style={{ color: rsi > 70 ? '#ef4444' : rsi < 30 ? '#10b981' : '#f59e0b', fontSize: 12, fontWeight: 700 }}>{rsi.toFixed(0)} ({rsiState})</div>
            </div>
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '7px 9px' }}>
              <div style={{ color: '#666', fontSize: 10 }}>S / R</div>
              <div style={{ color: '#ddd', fontSize: 12, fontWeight: 700 }}>€{support1.toFixed(2)} / €{resistance1.toFixed(2)}</div>
            </div>
          </div>
        </div>
        <CandlestickChart
          data={chartData}
          height={360}
          overlays={{
            showMA20: overlays.ma20,
            showMA50: overlays.ma50,
            showMA200: overlays.ma200,
            showBollinger: overlays.bollinger,
            showVolume: overlays.volume,
            showSR: overlays.supportResistance,
            showFib: overlays.fibonacci,
            ma20: ma20Series,
            ma50: ma50Series,
            ma200: ma200Series,
            bbUpper: bbUpperSeries,
            bbMiddle: bbMiddleSeries,
            bbLower: bbLowerSeries,
            volumeSeries,
            fibLevels,
          }}
        />

        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          <div style={{ background: '#101010', border: '1px solid #242424', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#888', fontSize: 11 }}>RSI (14)</span>
              <span style={{ color: rsi > 70 ? '#ef4444' : rsi < 30 ? '#10b981' : '#f59e0b', fontSize: 11, fontWeight: 700 }}>{rsi.toFixed(1)} · {rsiState}</span>
            </div>
            <div style={{ height: 6, background: '#1d1d1d', borderRadius: 999 }}>
              <div style={{ width: `${Math.max(0, Math.min(100, rsi))}%`, height: '100%', borderRadius: 999, background: rsi > 70 ? '#ef4444' : rsi < 30 ? '#10b981' : '#f59e0b' }} />
            </div>
          </div>

          <div style={{ background: '#101010', border: '1px solid #242424', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#888', fontSize: 11 }}>MACD</span>
              <span style={{ color: macd > 0 ? '#10b981' : '#ef4444', fontSize: 11, fontWeight: 700 }}>{macd.toFixed(2)} · {macdState}</span>
            </div>
            <div style={{ height: 6, background: '#1d1d1d', borderRadius: 999, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#2d2d2d' }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: macd >= 0 ? '50%' : `${Math.max(0, 50 - Math.min(50, Math.abs(macd) * 8))}%`, width: macd >= 0 ? `${Math.min(50, Math.abs(macd) * 8)}%` : `${Math.min(50, Math.abs(macd) * 8)}%`, background: macd >= 0 ? '#10b981' : '#ef4444' }} />
            </div>
          </div>

          <div style={{ background: '#101010', border: '1px solid #242424', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#888', fontSize: 11 }}>Volumen</span>
              <span style={{ color: volumeTrend === 'Hoch' ? '#10b981' : volumeTrend === 'Niedrig' ? '#ef4444' : '#f59e0b', fontSize: 11, fontWeight: 700 }}>{volumeTrend}</span>
            </div>
            <div style={{ height: 6, background: '#1d1d1d', borderRadius: 999 }}>
              <div style={{ width: `${Math.max(4, Math.min(100, (lastVolumeMa20 > 0 ? (lastVolume / lastVolumeMa20) : 1) * 50))}%`, height: '100%', borderRadius: 999, background: volumeTrend === 'Hoch' ? '#10b981' : volumeTrend === 'Niedrig' ? '#ef4444' : '#3b82f6' }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...S.card, marginBottom: 24, padding: 20 }}>
        <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Trader Dashboard</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 8, padding: 10 }}>
            <div style={{ color: '#777', fontSize: 11 }}>Trend</div>
            <div style={{ color: marketStructure.startsWith('Aufwärtstrend') ? '#10b981' : marketStructure.startsWith('Abwärtstrend') ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>{marketStructure}</div>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 8, padding: 10 }}>
            <div style={{ color: '#777', fontSize: 11 }}>RSI</div>
            <div style={{ color: rsi > 70 ? '#ef4444' : rsi < 30 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>{rsi.toFixed(1)} · {rsiState}</div>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 8, padding: 10 }}>
            <div style={{ color: '#777', fontSize: 11 }}>MACD</div>
            <div style={{ color: macd > 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>{macd.toFixed(2)} · {macdState}</div>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 8, padding: 10 }}>
            <div style={{ color: '#777', fontSize: 11 }}>Support / Resistance</div>
            <div style={{ color: '#ddd', fontWeight: 700 }}>S1 €{support1.toFixed(2)} · R1 €{resistance1.toFixed(2)}</div>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 8, padding: 10 }}>
            <div style={{ color: '#777', fontSize: 11 }}>Volumen</div>
            <div style={{ color: volumeTrend === 'Hoch' ? '#10b981' : volumeTrend === 'Niedrig' ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>{volumeTrend} ({fmt.number(lastVolume, 0)})</div>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 8, padding: 10 }}>
            <div style={{ color: '#777', fontSize: 11 }}>KI Signal</div>
            <div style={{ color: aiSignal === 'Bullish' ? '#10b981' : aiSignal === 'Bearish' ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>{aiSignal} · {uptrendProbability}% Up / {downtrendProbability}% Down</div>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 8, padding: 10 }}>
            <div style={{ color: '#777', fontSize: 11 }}>Technical Score</div>
            <div style={{ color: technicalScore >= 7 ? '#10b981' : technicalScore <= 3 ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>{technicalScore}/10 · {compactSignal}</div>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 8, padding: 10 }}>
            <div style={{ color: '#777', fontSize: 11 }}>Risk Level</div>
            <div style={{ color: riskLevel === 'Niedrig' ? '#10b981' : riskLevel === 'Mittel' ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>{riskLevel} · Vol. {volatility.toFixed(1)}%</div>
          </div>
        </div>
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#101010', color: '#cfcfcf', fontSize: 12, lineHeight: 1.45 }}>
          <strong>Was bedeutet das?</strong>{' '}
          RSI {rsi.toFixed(0)} ({rsiState}) und MACD {macdState.toLowerCase()} deuten aktuell auf{' '}
          <strong>{aiSignal === 'Bullish' ? 'bullisches' : aiSignal === 'Bearish' ? 'bearishes' : 'neutrales'}</strong>{' '}Momentum hin.
          Preis ist {priceVsMa20}, Golden/Death Cross ist{' '}
          <strong>{goldenCross ? 'aktiv (bullish)' : deathCross ? 'aktiv (bearish)' : 'nicht bestätigt'}</strong>.
        </div>
      </div>

      {/* Technische Indikatoren & Fundamentale Analyse */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, marginBottom: 24 }}>
        {/* Technical Indicators */}
        <div style={{ ...S.card, padding: 20 }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={17} color="#9ca3af" />Technische Indikatoren
          </h3>
          
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: '#888', fontSize: 13, display: 'inline-flex', alignItems: 'center' }}>RSI (14)<InfoHint term="RSI" /></span>
              <span style={{ color: rsi > 70 ? '#ef4444' : rsi < 30 ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{rsi.toFixed(1)}</span>
            </div>
            <div style={{ width: '100%', height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: rsi + '%', height: '100%', background: rsi > 70 ? '#ef4444' : rsi < 30 ? '#10b981' : '#f59e0b' }}></div>
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>
              {rsi > 70 ? '📛 Überkauft' : rsi < 30 ? '🟢 Überverkauft' : '⚪ Neutral'}
            </div>
          </div>

          <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid #222' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#888', fontSize: 13, display: 'inline-flex', alignItems: 'center' }}>MACD<InfoHint term="MACD" /></span>
              <span style={{ color: macd > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                {macd > 0 ? '+' : ''}{macd.toFixed(2)}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#666' }}>
              {macd > 0 ? '🟢 Bullish Signal' : '🔴 Bearish Signal'}
            </div>
          </div>

          <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid #222' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 10 }}>
                <div style={{ color: '#666', fontSize: 11, marginBottom: 4, display: 'inline-flex', alignItems: 'center' }}>MA20<InfoHint term="MA20" /></div>
                <div style={{ color: '#f59e0b', fontWeight: 700 }}>{Number.isFinite(ma20) ? `€${ma20.toFixed(2)}` : 'n/a'}</div>
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 10 }}>
                <div style={{ color: '#666', fontSize: 11, marginBottom: 4, display: 'inline-flex', alignItems: 'center' }}>MA50<InfoHint term="MA50" /></div>
                <div style={{ color: '#3b82f6', fontWeight: 700 }}>{Number.isFinite(ma50) ? `€${ma50.toFixed(2)}` : 'n/a'}</div>
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 10 }}>
                <div style={{ color: '#666', fontSize: 11, marginBottom: 4, display: 'inline-flex', alignItems: 'center' }}>MA200<InfoHint term="MA200" /></div>
                <div style={{ color: '#f3f4f6', fontWeight: 700 }}>{Number.isFinite(ma200) ? `€${ma200.toFixed(2)}` : 'n/a'}</div>
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 10 }}>
                <div style={{ color: '#666', fontSize: 11, marginBottom: 4, display: 'inline-flex', alignItems: 'center' }}>Cross</div>
                <div style={{ color: goldenCross ? '#10b981' : deathCross ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>
                  {goldenCross ? 'Golden Cross' : deathCross ? 'Death Cross' : 'Neutral'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid #222' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#888', fontSize: 13, display: 'inline-flex', alignItems: 'center' }}>Bollinger<InfoHint term="Bollinger" /></span>
              <span style={{ color: '#93c5fd', fontWeight: 600 }}>
                {Number.isFinite(bbLower) && Number.isFinite(bbUpper) ? `€${bbLower.toFixed(2)} - €${bbUpper.toFixed(2)}` : 'n/a'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#666' }}>
              {Number.isFinite(bbUpper) && currentPrice >= bbUpper ? 'Preis am oberen Band → überkauft möglich' : Number.isFinite(bbLower) && currentPrice <= bbLower ? 'Preis am unteren Band → überverkauft möglich' : 'Preis innerhalb der Bänder'}
            </div>
          </div>

          <div style={{ paddingTop: 12, borderTop: '1px solid #222' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 10 }}>
                <div style={{ color: '#666', fontSize: 11, marginBottom: 4, display: 'inline-flex', alignItems: 'center' }}>52W High<InfoHint term="52W High" /></div>
                <div style={{ color: '#fff', fontWeight: 600 }}>€{highestPrice.toFixed(2)}</div>
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 10 }}>
                <div style={{ color: '#666', fontSize: 11, marginBottom: 4, display: 'inline-flex', alignItems: 'center' }}>52W Low<InfoHint term="52W Low" /></div>
                <div style={{ color: '#fff', fontWeight: 600 }}>€{lowestPrice.toFixed(2)}</div>
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 10 }}>
                <div style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>Volumen MA20</div>
                <div style={{ color: '#fff', fontWeight: 600 }}>{fmt.number(lastVolumeMa20, 0)}</div>
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 10 }}>
                <div style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>Fibo 61.8%</div>
                <div style={{ color: '#fff', fontWeight: 600 }}>€{fibLevels[3].price.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Fundamentale Analyse */}
        <div style={{ ...S.card, padding: 20 }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Briefcase size={17} color="#9ca3af" />Fundamentale Daten
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {Object.entries(fundamentals).map(([key, value]) => (
              <div key={key} style={{ background: '#1a1a1a', borderRadius: 8, padding: 10 }}>
                <div style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>{key}</div>
                <div style={{ 
                  color: key === 'PE Ratio' && parseFloat(value) < 20 ? '#10b981' : 
                         key === 'Dividend. Rendite' && parseFloat(value) > 1 ? '#10b981' : '#fff',
                  fontWeight: 600,
                  fontSize: 13
                }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #222' }}>
            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
              <strong>Analyse:</strong> Das Unternehmen zeigt solide Fundamentaldaten mit einem moderaten KGV von 18,5 und angemessener Dividendenrendite.
            </div>
          </div>
        </div>
      </div>

      {/* Trend & Pattern Analysis */}
      <div style={{ ...S.card, padding: 20, marginBottom: 24 }}>
        <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={17} color="#9ca3af" />Support & Resistance Zonen
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 12, border: '1px solid #ef444420' }}>
            <div style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>WIDERSTAND 2 (R2)</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>€{resistance2.toFixed(2)}</div>
            <div style={{ color: '#666', fontSize: 10, marginTop: 4 }}>Starkes Widerstandsniveau</div>
          </div>

          <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 12, border: '1px solid #ef444410' }}>
            <div style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>WIDERSTAND 1 (R1)</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>€{resistance1.toFixed(2)}</div>
            <div style={{ color: '#666', fontSize: 10, marginTop: 4 }}>Schwaches Widerstandsniveau</div>
          </div>

          <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 12, border: '1px solid #10b98110' }}>
            <div style={{ color: '#10b981', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>UNTERSTÜTZUNG 1 (S1)</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>€{support1.toFixed(2)}</div>
            <div style={{ color: '#666', fontSize: 10, marginTop: 4 }}>Schwaches Supportniveau</div>
          </div>

          <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 12, border: '1px solid #10b98120' }}>
            <div style={{ color: '#10b981', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>UNTERSTÜTZUNG 2 (S2)</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>€{support2.toFixed(2)}</div>
            <div style={{ color: '#666', fontSize: 10, marginTop: 4 }}>Starkes Supportniveau</div>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: '#0a0a0a', borderRadius: 6, borderLeft: '3px solid #f59e0b' }}>
          <div style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={14} />Zone-Erklärung</div>
          <div style={{ color: '#888', fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
            Widerstände sind Preisniveaus, wo Verkäufer überwiegen. Unterstützungen sind Niveaus, wo Käufer intervenieren. Diese automatisch erkannten Zonen aus dem historischen Preisverlauf helfen dir, Ein- und Ausstiegspunkte zu identifizieren.
          </div>
        </div>
      </div>

      {/* Chart Patterns */}
      <div style={{ ...S.card, padding: 20 }}>
        <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <LineChart size={17} color="#9ca3af" />Erkannte Chartmuster
        </h3>

        {patterns.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
            {patterns.map((pattern, i) => (
              <div key={i} style={{ background: '#1a1a1a', borderRadius: 8, padding: 14, border: '1px solid #222' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: pattern.strength === 'Stark' ? '#10b981' : pattern.strength === 'Reversal' ? '#f59e0b' : '#3b82f6' }}></div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{pattern.name}</div>
                    <div style={{ 
                      color: pattern.strength === 'Stark' ? '#10b981' : pattern.strength === 'Reversal' ? '#f59e0b' : '#3b82f6',
                      fontSize: 11,
                      fontWeight: 500,
                      marginTop: 2
                    }}>
                      {pattern.strength}
                    </div>
                  </div>
                </div>
                <div style={{ color: '#888', fontSize: 11, lineHeight: 1.4 }}>
                  {pattern.description}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#666', fontSize: 13, textAlign: 'center', padding: '20px 10px' }}>
            Keine spezifischen Muster detektiert. Markt zeigt neutrale Charakteristiken.
          </div>
        )}

        <div style={{ marginTop: 16, padding: 12, background: '#0a0a0a', borderRadius: 6, borderLeft: '3px solid #3b82f6' }}>
          <div style={{ color: '#3b82f6', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><InfoHint term="Chartmuster" text="Chartmuster sind wiederkehrende Preisformationen, die Hinweise auf Trendfortsetzung oder Trendwechsel geben." />Was sind Chartmuster?</div>
          <div style={{ color: '#888', fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
            Chartmuster sind wiederkehrende geometrische Formen im Preis-Chart, die zukünftige Kursbewegungen andeuten. Sie helfen Tradern, Einstiegs-/Ausstiegspunkte sowie Zielkurse zu identifizieren. Zu den häufigen Mustern gehören Dreiecke, Kopf-Schulter, Double Tops/Bottoms und Keile.
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskAnalysis() {
  const { assets } = useApp();
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!assets?.length) {
      setSelectedAssetId('');
      return;
    }
    if (!assets.some(a => a.id === selectedAssetId)) {
      setSelectedAssetId(assets[0].id);
    }
  }, [assets, selectedAssetId]);

  const asset = useMemo(
    () => assets.find(a => a.id === selectedAssetId) || assets[0] || null,
    [assets, selectedAssetId]
  );

  useEffect(() => {
    let active = true;

    const withTimeout = (promise, ms = 5000) => Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);

    const timeoutSignal = (ms) => {
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        return AbortSignal.timeout(ms);
      }
      return undefined;
    };

    const fetchJsonWithFallback = async (url) => {
      try {
        const direct = await withTimeout(fetch(url, { signal: timeoutSignal(5000) }), 5500);
        if (direct?.ok) return await direct.json();
      } catch { }
      try {
        const proxied = await fetchWithProxy(url);
        if (proxied?.ok) return await proxied.json();
      } catch { }
      return null;
    };

    const number = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const returnsFrom = (closes) => closes
      .slice(1)
      .map((p, i) => (p - closes[i]) / closes[i])
      .filter(Number.isFinite);

    const mean = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const stdev = (arr) => {
      if (arr.length < 2) return 0;
      const m = mean(arr);
      const variance = arr.reduce((s, v) => s + ((v - m) ** 2), 0) / (arr.length - 1);
      return Math.sqrt(Math.max(0, variance));
    };
    const quantile = (arr, q) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const pos = (sorted.length - 1) * q;
      const base = Math.floor(pos);
      const rest = pos - base;
      return sorted[base + 1] !== undefined
        ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
        : sorted[base];
    };
    const maxDrawdownPct = (closes) => {
      if (!closes.length) return 0;
      let peak = closes[0];
      let dd = 0;
      for (const px of closes) {
        peak = Math.max(peak, px);
        const cur = (px - peak) / peak;
        dd = Math.min(dd, cur);
      }
      return Math.abs(dd) * 100;
    };

    const buildFallback = () => {
      const current = number(asset?.currentPrice);
      const purchase = number(asset?.purchasePrice);
      const change = Number.isFinite(current) && Number.isFinite(purchase) && purchase > 0
        ? (current - purchase) / purchase
        : 0;
      const vol = Math.min(70, Math.max(10, 14 + Math.abs(change) * 180));
      const drawdown = Math.min(45, Math.max(4, 8 + Math.abs(change) * 90));
      const sharpe = Math.max(-1.5, Math.min(3.5, 0.8 + change * 4));
      const var95 = Math.max(1.2, Math.min(9.5, vol / 7.8));
      const beta = Math.max(0.5, Math.min(2.2, 1 + change * 0.9));
      const score = (vol > 38 ? 2 : vol > 25 ? 1 : 0) + (drawdown > 30 ? 2 : drawdown > 18 ? 1 : 0) + (beta > 1.35 ? 1 : 0);
      const level = score >= 4 ? 'HOCH' : score >= 2 ? 'MITTEL' : 'NIEDRIG';
      return {
        vol,
        drawdown,
        sharpe,
        var95,
        beta,
        level,
        note: 'Live-Historie aktuell nicht erreichbar. Asset-spezifische Schätzung aus Portfolio-Daten aktiv.',
      };
    };

    const loadRisk = async () => {
      if (!asset) return;
      setLoading(true);
      setError('');

      try {
        let closes = [];
        let symbolUsed = String(asset.symbol || asset.xetrSymbol || asset.name || 'Asset');

        if (asset.type === 'crypto' && asset.coinId) {
          const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(asset.coinId)}/market_chart?vs_currency=eur&days=365&interval=daily`;
          const data = await withTimeout(fetch(url, { signal: timeoutSignal(7000) }).then(r => r.ok ? r.json() : null), 8000);
          closes = (data?.prices || []).map((p) => number(Array.isArray(p) ? p[1] : null)).filter(v => Number.isFinite(v) && v > 0);
          symbolUsed = String(asset.symbol || asset.coinId).toUpperCase();
        } else {
          const rawSymbol = String(asset.xetrSymbol || asset.symbol || '').trim().toUpperCase();
          const normalized = rawSymbol.replace(/\s+/g, '');
          const usClass = normalized.replace('-', '.');
          const tickers = normalized.includes('.') ? [normalized] : [normalized + '.DE', normalized + '.F', normalized, usClass];

          for (const ticker of tickers) {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`;
            const data = await fetchJsonWithFallback(url);
            const candidate = (data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [])
              .map(number)
              .filter(v => Number.isFinite(v) && v > 0);
            if (candidate.length >= 40) {
              closes = candidate;
              symbolUsed = ticker;
              break;
            }
          }
        }

        let metrics;
        if (closes.length < 40) {
          metrics = buildFallback();
        } else {
          const dailyReturns = returnsFrom(closes);
          const mu = mean(dailyReturns);
          const sigma = stdev(dailyReturns);
          const vol = sigma * Math.sqrt(252) * 100;
          const drawdown = maxDrawdownPct(closes);
          const var95 = Math.abs(quantile(dailyReturns, 0.05)) * 100;
          const sharpe = sigma > 0 ? (((mu * 252) - 0.02) / (sigma * Math.sqrt(252))) : 0;

          let beta = null;
          const benchData = await fetchJsonWithFallback('https://query1.finance.yahoo.com/v8/finance/chart/^GSPC?interval=1d&range=1y');
          const benchCloses = (benchData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [])
            .map(number)
            .filter(v => Number.isFinite(v) && v > 0);
          if (benchCloses.length >= 40) {
            const n = Math.min(closes.length, benchCloses.length);
            const assetR = returnsFrom(closes.slice(-n));
            const benchR = returnsFrom(benchCloses.slice(-n));
            const m = Math.min(assetR.length, benchR.length);
            if (m >= 20) {
              const ar = assetR.slice(-m);
              const br = benchR.slice(-m);
              const ma = mean(ar);
              const mb = mean(br);
              const cov = ar.reduce((s, v, i) => s + ((v - ma) * (br[i] - mb)), 0) / Math.max(1, (m - 1));
              const vb = br.reduce((s, v) => s + ((v - mb) ** 2), 0) / Math.max(1, (m - 1));
              beta = vb > 0 ? cov / vb : null;
            }
          }

          const score =
            (vol > 40 ? 2 : vol > 25 ? 1 : 0) +
            (drawdown > 35 ? 2 : drawdown > 20 ? 1 : 0) +
            (var95 > 4 ? 1 : 0) +
            (Number.isFinite(beta) && beta > 1.4 ? 1 : 0);
          const level = score >= 4 ? 'HOCH' : score >= 2 ? 'MITTEL' : 'NIEDRIG';

          metrics = {
            vol,
            drawdown,
            sharpe,
            var95,
            beta: Number.isFinite(beta) ? beta : 1,
            level,
            note: `Basiert auf 1J-Historie (${symbolUsed}).`,
          };
        }

        if (!active) return;
        setRisk({
          symbol: symbolUsed,
          volLabel: `${fmt.number(metrics.vol, 1)}%`,
          drawdownLabel: `-${fmt.number(metrics.drawdown, 1)}%`,
          sharpeLabel: fmt.number(metrics.sharpe, 2),
          varLabel: `${fmt.number(metrics.var95, 1)}%`,
          betaLabel: fmt.number(metrics.beta, 2),
          level: metrics.level,
          levelColor: metrics.level === 'HOCH' ? '#ef4444' : metrics.level === 'MITTEL' ? '#f59e0b' : '#10b981',
          note: metrics.note,
        });
      } catch {
        if (!active) return;
        const fallback = buildFallback();
        setRisk({
          symbol: String(asset.symbol || asset.xetrSymbol || asset.name || 'Asset'),
          volLabel: `${fmt.number(fallback.vol, 1)}%`,
          drawdownLabel: `-${fmt.number(fallback.drawdown, 1)}%`,
          sharpeLabel: fmt.number(fallback.sharpe, 2),
          varLabel: `${fmt.number(fallback.var95, 1)}%`,
          betaLabel: fmt.number(fallback.beta, 2),
          level: fallback.level,
          levelColor: fallback.level === 'HOCH' ? '#ef4444' : fallback.level === 'MITTEL' ? '#f59e0b' : '#10b981',
          note: fallback.note,
        });
        setError('Live-Risikodaten konnten nicht vollständig geladen werden.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadRisk();
    return () => {
      active = false;
    };
  }, [asset?.id, asset?.symbol, asset?.xetrSymbol, asset?.coinId, asset?.currentPrice, asset?.purchasePrice]);

  if (!assets || assets.length === 0) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <HeaderGlyph icon={Shield} color="#10b981" />
          <div>
            <h1 style={S.h1}>Risikoanalyse</h1>
            <div style={{ color: '#444', fontSize: 12, marginTop: 2 }}>Volatilität & Risikobewertung</div>
          </div>
        </div>
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ color: '#666', fontSize: 14 }}>⚠️ Keine Assets im Portfolio</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>Füge Assets in deinem Portfolio hinzu, um Risikoanalysen zu sehen.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <HeaderGlyph icon={Shield} color="#10b981" />
        <div>
          <h1 style={S.h1}>Risikoanalyse</h1>
          <div style={{ color: '#444', fontSize: 12, marginTop: 2 }}>Volatilität & Risikobewertung</div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>Asset auswählen:</label>
        <select 
          value={asset?.id || ''}
          onChange={(e) => setSelectedAssetId(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 6, width: '100%', maxWidth: 300, fontSize: 13 }}
        >
          {assets.map((a) => (
            <option key={a.id} value={a.id}>{a.name} ({a.symbol || a.xetrSymbol})</option>
          ))}
        </select>
        {risk?.symbol && <div style={{ color: '#666', fontSize: 11, marginTop: 8 }}>Quelle: Markt-Historie · {risk.symbol}</div>}
        {loading && <div style={{ color: '#888', fontSize: 12, marginTop: 8 }}>Lade Risikometriken…</div>}
        {error && !loading && <div style={{ color: '#f59e0b', fontSize: 12, marginTop: 8 }}>{error}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 20 }}>
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Risiko-Metriken</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#888', fontSize: 12, display: 'inline-flex', alignItems: 'center' }}>Volatilität<InfoHint term="Volatilität" /></div>
              <div style={{ color: '#f59e0b', fontSize: 18, fontWeight: 600 }}>{risk?.volLabel || '—'}</div>
            </div>
            <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#888', fontSize: 12, display: 'inline-flex', alignItems: 'center' }}>Max Drawdown<InfoHint term="Max Drawdown" /></div>
              <div style={{ color: '#ef4444', fontSize: 18, fontWeight: 600 }}>{risk?.drawdownLabel || '—'}</div>
            </div>
            <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#888', fontSize: 12, display: 'inline-flex', alignItems: 'center' }}>Sharpe Ratio<InfoHint term="Sharpe Ratio" /></div>
              <div style={{ color: '#10b981', fontSize: 18, fontWeight: 600 }}>{risk?.sharpeLabel || '—'}</div>
            </div>
            <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#888', fontSize: 12, display: 'inline-flex', alignItems: 'center' }}>VaR (95%)<InfoHint term="VaR (95%)" /></div>
              <div style={{ color: '#3b82f6', fontSize: 18, fontWeight: 600 }}>{risk?.varLabel || '—'}</div>
            </div>
            <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#888', fontSize: 12, display: 'inline-flex', alignItems: 'center' }}>Beta vs S&P 500<InfoHint term="Beta vs S&P 500" /></div>
              <div style={{ color: '#a78bfa', fontSize: 18, fontWeight: 600 }}>{risk?.betaLabel || '—'}</div>
            </div>
          </div>
        </div>

        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 20 }}>
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Risikobewertung</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: risk?.levelColor || '#888' }}></div>
            <span style={{ color: risk?.levelColor || '#888', fontWeight: 600 }}>{risk?.level || '—'}</span>
          </div>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.5 }}>
            {risk?.note || `${asset.name} wird analysiert…`}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  const { settings, setSettings, toast, isMobile } = useApp();
  const { logout, user, deleteAccount, deleteStoredUserData, clearLocalAppData } = useAuth();
  const [backendUrl, setBackendUrl] = useState(settings?.backendUrl || DEFAULT_BACKEND_URL);
  const [accessCode, setAccessCode] = useState(settings?.accessCode || DEFAULT_ACCESS_CODE);
  const [alphaVantageKey, setAlphaVantageKey] = useState(settings?.apiKey || '');
  const [eodhdApiToken, setEodhdApiToken] = useState(settings?.eodhdApiToken || '');
  const [includeBankInDashboard, setIncludeBankInDashboard] = useState(settings?.includeBankInDashboard !== false);
  const [includeValuablesInDashboard, setIncludeValuablesInDashboard] = useState(settings?.includeValuablesInDashboard !== false);

  const [profileName, setProfileName] = useState(settings?.profileName || '');
  const [language, setLanguage] = useState(settings?.language || 'de');
  const [currency, setCurrency] = useState(settings?.currency || 'EUR');

  const [mobileViewOverride, setMobileViewOverride] = useState(settings?.mobileView || false);
  const [deletePassword, setDeletePassword] = useState('');

  const save = () => {
    setSettings({
      ...(settings || {}),
      backendUrl: backendUrl.trim(),
      accessCode: accessCode.trim(),
      apiKey: alphaVantageKey.trim(),
      eodhdApiToken: eodhdApiToken.trim(),
      includeBankInDashboard,
      includeValuablesInDashboard,
      profileName: profileName.trim(),
      language,
      currency,
      mobileView: mobileViewOverride,
    });
    if (toast) toast('✅ Einstellungen gespeichert');
  };

  const handleLogout = async () => {
    if (window.confirm('Möchtest du dich wirklich abmelden?')) {
      await logout();
    }
  };

  const handleDeleteServerData = async () => {
    if (!window.confirm('Serverseitige gespeicherte Nutzerdaten wirklich löschen?')) return;
    const result = await deleteStoredUserData();
    if (result?.error) {
      if (toast) toast(`❌ ${result.error}`);
      return;
    }
    if (toast) toast('✅ Serverseitige Nutzerdaten gelöscht');
  };

  const handleClearLocalData = () => {
    if (!window.confirm('Lokale Daten auf diesem Gerät wirklich löschen?')) return;
    clearLocalAppData();
    if (toast) toast('✅ Lokale App-Daten gelöscht');
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      if (toast) toast('❌ Passwort für Konto-Löschung erforderlich');
      return;
    }
    if (!window.confirm('Konto wirklich dauerhaft löschen? Dieser Schritt kann nicht rückgängig gemacht werden.')) return;
    const result = await deleteAccount(deletePassword);
    if (result?.error) {
      if (toast) toast(`❌ ${result.error}`);
      return;
    }
    if (toast) toast('✅ Konto gelöscht');
  };

  return (
    <div style={{ padding: 18, maxWidth: 900 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Einstellungen</div>
        <div style={{ color: '#a9a9a9', fontSize: 13 }}>
          Angemeldet als: <strong style={{ color: '#fff' }}>{user?.name} ({user?.email})</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 16 }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Profil</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#bdbdbd' }}>Name (Profil)</span>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Max Mustermann"
                style={S.input}
              />
            </label>

            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#bdbdbd' }}>Sprache</span>
                <select value={language} onChange={e => setLanguage(e.target.value)} style={S.select}>
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#bdbdbd' }}>Währung</span>
                <select value={currency} onChange={e => setCurrency(e.target.value)} style={S.select}>
                  <option value="EUR">€ Euro</option>
                  <option value="USD">$ US-Dollar</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 16 }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>App & Verbindung</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#bdbdbd' }}>Backend URL</span>
              <input
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder={DEFAULT_BACKEND_URL}
                style={S.input}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#bdbdbd' }}>Access Code</span>
              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder={DEFAULT_ACCESS_CODE}
                style={S.input}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#bdbdbd' }}>Alpha Vantage API Key</span>
              <input
                value={alphaVantageKey}
                onChange={(e) => setAlphaVantageKey(e.target.value)}
                placeholder="z.B. ABCDEFG123456"
                style={S.input}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#bdbdbd' }}>EODHD API Token</span>
              <input
                value={eodhdApiToken}
                onChange={(e) => setEodhdApiToken(e.target.value)}
                placeholder="z.B. dein_eodhd_token"
                style={S.input}
              />
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 12px',
              background: '#1a1a1a',
              border: '1px solid #222',
              borderRadius: 10,
              cursor: 'pointer'
            }}>
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Wertgegenstände</div>
                <div style={{ color: '#888', fontSize: 11 }}>Wenn aktiviert, werden Wertgegenstände beim Gesamtvermögen, der Performance und den Charts berücksichtigt.</div>
              </div>
              <input
                type="checkbox"
                checked={includeValuablesInDashboard}
                onChange={e => setIncludeValuablesInDashboard(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#10b981', cursor: 'pointer' }}
              />
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 12px',
              background: '#1a1a1a',
              border: '1px solid #222',
              borderRadius: 10,
              cursor: 'pointer'
            }}>
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Bankkonto</div>
                <div style={{ color: '#888', fontSize: 11 }}>Wenn aktiviert, werden Bankkonten beim Gesamtvermögen, der Performance und den Charts berücksichtigt.</div>
              </div>
              <input
                type="checkbox"
                checked={includeBankInDashboard}
                onChange={e => setIncludeBankInDashboard(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#10b981', cursor: 'pointer' }}
              />
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 12px',
              background: '#1a1a1a',
              border: '1px solid #222',
              borderRadius: 10,
              cursor: 'pointer'
            }}>
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Smartphone-Ansicht erzwingen</div>
                <div style={{ color: '#888', fontSize: 11 }}>Aktiviert die mobile Ansicht dauerhaft</div>
              </div>
              <input
                type="checkbox"
                checked={mobileViewOverride}
                onChange={e => setMobileViewOverride(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#8b5cf6', cursor: 'pointer' }}
              />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
          <button
            onClick={save}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 16px',
              borderRadius: 10,
              border: '1px solid #10b98150',
              background: '#10b98120',
              color: '#10b981',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 0.2,
              cursor: 'pointer',
              transition: 'all .2s'
            }}>
            <CheckCircle size={15} />
            Speichern
          </button>

          <button
            onClick={handleLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 16px',
              borderRadius: 10,
              border: '1px solid #dc262650',
              background: '#dc262620',
              color: '#f87171',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 0.2,
              cursor: 'pointer',
              transition: 'all .2s'
            }}>
            <LogOut size={15} />
            Abmelden
          </button>
        </div>

        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 16 }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Recht & Haftung</div>
          <div style={{ color: '#bdbdbd', fontSize: 12, lineHeight: 1.6 }}>
            Diese App bietet keine Finanzberatung, Anlageberatung oder Steuerberatung. Alle Auswertungen,
            Kennzahlen und KI-Analysen dienen nur der Information und können fehlerhaft, unvollständig oder
            veraltet sein. Alle Angaben werden vom Nutzer selbst gepflegt. Die App verwaltet kein echtes Geld,
            führt keine Überweisungen aus und tätigt keine Finanztransaktionen.
          </div>
        </div>

        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 16 }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Datenschutz & Daten</div>
          <div style={{ color: '#d4d4d4', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>Lokal auf diesem Gerät</div>
          <ul style={{ color: '#bdbdbd', fontSize: 12, margin: '0 0 10px 18px', lineHeight: 1.6 }}>
            <li>Portfolio-Daten (ft-assets-v2)</li>
            <li>App-Einstellungen inkl. optionaler API-Tokens (ft-settings)</li>
            <li>Session-Token (auth_token)</li>
          </ul>
          <div style={{ color: '#d4d4d4', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>Serverseitig</div>
          <ul style={{ color: '#bdbdbd', fontSize: 12, margin: '0 0 12px 18px', lineHeight: 1.6 }}>
            <li>Accountdaten: Name, E-Mail, Passwort-Hash, Erstellungsdatum</li>
            <li>Nutzerdaten: Portfolio, Holdings, Einstellungen</li>
            <li>Temporäre Sessiondaten zur Anmeldung</li>
          </ul>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={handleDeleteServerData} style={{ ...S.btn, background: '#7c3aed20', border: '1px solid #7c3aed55', color: '#c4b5fd' }}>
              Serverseitige Daten löschen
            </button>
            <button onClick={handleClearLocalData} style={{ ...S.btn, background: '#1d4ed820', border: '1px solid #3b82f655', color: '#93c5fd' }}>
              Lokale Daten löschen
            </button>
          </div>
        </div>

        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 16 }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Nutzungsbedingungen</div>
          <div style={{ color: '#bdbdbd', fontSize: 12, lineHeight: 1.6 }}>
            Durch die Nutzung bestätigst du, dass du eigene Entscheidungen triffst und die App ausschließlich
            als Informationswerkzeug verwendest. Du bist selbst verantwortlich für die Richtigkeit deiner Eingaben,
            die Einhaltung steuerlicher und regulatorischer Pflichten sowie alle Anlageentscheidungen.
          </div>
          <div style={{ color: '#bdbdbd', fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>
            Die bereitgestellten Datenquellen und KI-Ausgaben erfolgen ohne Gewähr auf Vollständigkeit,
            Verfügbarkeit, Aktualität oder Eignung für einen bestimmten Zweck.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <a href="/privacy-policy.html" target="_blank" rel="noreferrer" style={{ ...S.btn, textDecoration: 'none' }}>Privacy URL</a>
            <a href="/terms.html" target="_blank" rel="noreferrer" style={{ ...S.btn, textDecoration: 'none' }}>Terms URL</a>
            <a href="/support.html" target="_blank" rel="noreferrer" style={{ ...S.btn, textDecoration: 'none' }}>Support URL</a>
          </div>
        </div>

        <div style={{ background: '#111', border: '1px solid #7f1d1d', borderRadius: 12, padding: 16 }}>
          <div style={{ color: '#fecaca', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Konto löschen</div>
          <div style={{ color: '#fca5a5', fontSize: 12, marginBottom: 10 }}>
            Dauerhafte Löschung von Account und serverseitigen Daten.
          </div>
          <div style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Passwort bestätigen"
              style={S.input}
            />
            <button onClick={handleDeleteAccount} style={{ ...S.btn, background: '#dc262620', border: '1px solid #dc262655', color: '#fca5a5' }}>
              Account endgültig löschen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppInner({ page, setPage, mobileMenu, setMobileMenu }) {
  const { toast, isMobile, devicePreview } = useApp();


void [
  XETR_B64,
  getYahooTicker,
  CHART_COLORS,
  DEMO_ASSETS,
  calcMetrics,
  APP_NAME,
  ANALYSIS_MODULES,
  buildStructuredPrompt,
  CustomTooltip,
  ImportAssetModal,
  ChartAnalysisPage,
];
  // effective mobile mode comes from context (device width, manual toggle, settings)
  const previewIPhone15 = devicePreview === 'iphone15';
  const effectiveMobile = isMobile || previewIPhone15;
  const mobileHeaderHeight = effectiveMobile ? 56 : 0;
  const sidebarWidth = 220;
  const [sidebarOpen, setSidebarOpen] = useState(!effectiveMobile);
  useEffect(() => {
    setSidebarOpen(!effectiveMobile);
  }, [effectiveMobile]);
  const fixedPos = previewIPhone15 ? 'absolute' : 'fixed';
  const shellStyle = previewIPhone15
    ? {
        minHeight: '100vh',
        background: '#070707',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }
    : null;
  const frameStyle = previewIPhone15
    ? {
        width: 393,
        height: 852,
        borderRadius: 28,
        overflow: 'hidden',
        border: '1px solid #2a2a2a',
        boxShadow: '0 24px 70px rgba(0,0,0,.55)',
        position: 'relative',
        transform: 'translateZ(0)',
        background: '#0a0a0a',
      }
    : null;

  const pages = { dashboard: Dashboard, fundamental: FundamentalAnalysis, technical: TechnicalAnalysis, risk: RiskAnalysis, portfolio: PortfolioPage, 'portfolio-ai': PortfolioAIPage, dividends: DividendenKalender, news: NewsPage, analysis: AnalysisPage, settings: SettingsPage };
  const Page = pages[page] || Dashboard;
  const content = (
    <div style={{ ...S.app, position: 'relative', height: previewIPhone15 ? '100%' : (effectiveMobile ? '100dvh' : '100vh') }}>
      {/* sidebar toggle */}
      {!effectiveMobile && <div style={{ position: fixedPos, top: 8, left: 8, zIndex: 3000 }}>
        <button onClick={() => setSidebarOpen(v => !v)} style={{ background:'none', border:'none', color:'#fff', padding:8, fontSize:20, cursor:'pointer' }} title="Menü">
          ☰
        </button>
      </div>}

      {!effectiveMobile && (
        <div style={{ position: fixedPos, top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 2999, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src="/wordmark-current.png"
            alt="Wordmark"
            style={{ height: 42, width: 'auto', objectFit: 'contain' }}
          />
        </div>
      )}

      {/* mobile header bar */}
      {effectiveMobile && (
        <div style={{ position: fixedPos, top: 0, left: 0, right: 0, background: 'rgba(17,17,17,0.95)', backdropFilter: 'blur(8px)', zIndex: 1001, display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #252525' }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #2a2a2a', background: '#151515', color: '#fff', fontSize: 17, cursor: 'pointer', padding: 0 }}>
            ☰
          </button>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <img
              src="/wordmark-current.png"
              alt="Wordmark"
              style={{ height: 36, width: 'auto', objectFit: 'contain' }}
            />
          </div>
        </div>
      )}

      {/* sidebar (desktop or visible mobile menu) */}
      {/* Overlay für Hintergrund */}
      {effectiveMobile && sidebarOpen && (
        <div style={{
          position: fixedPos,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          zIndex: 2000
        }} onClick={() => setSidebarOpen(false)} />
      )}

      {/* slide‑in/out sidebar wrapper */}
      <div style={{
        position: fixedPos,
        top: effectiveMobile ? 0 : 0,
        left: 0,
        bottom: 0,
        width: effectiveMobile ? 'min(86vw, 360px)' : sidebarWidth,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .24s ease-in-out',
        zIndex: effectiveMobile ? 2001 : 1200,
        overflowY: 'auto',
        pointerEvents: sidebarOpen ? 'auto' : 'none'
      }}>
        <div style={{
          background: '#101010',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: effectiveMobile ? '12px 0 35px rgba(0,0,0,.45)' : 'none',
          height: '100%'
        }}>
          <Sidebar page={page} setPage={(p)=>{ setPage(p); setSidebarOpen(false); }} isMobile={effectiveMobile} onClose={() => setSidebarOpen(false)} />
        </div>
      </div>

      <div
        style={effectiveMobile ? {
          position: 'absolute',
          top: mobileHeaderHeight,
          left: 0,
          right: 0,
          bottom: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
          minHeight: 0,
        } : {
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          marginLeft: sidebarOpen ? sidebarWidth : 0,
          transition: 'margin-left .24s ease-in-out',
        }}
      >
        <div style={{ ...S.main, overflowY: 'visible', minHeight: '100%', padding: effectiveMobile ? '16px 12px 120px' : S.main.padding, paddingBottom: effectiveMobile ? (previewIPhone15 ? 140 : 120) : undefined }}>
          <Page />
          {effectiveMobile && <div style={{ height: previewIPhone15 ? 90 : 72, pointerEvents: 'none' }} />}
        </div>
      </div>
      <Toast toast={toast} />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.4); }
        select option { background: #1a1a1a; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
      `}</style>
    </div>
  );

  if (!previewIPhone15) return content;

  return (
    <div style={shellStyle}>
      <div style={frameStyle}>{content}</div>
    </div>
  );
}
