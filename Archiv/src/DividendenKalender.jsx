import { Fragment, useEffect, useMemo, useState } from 'react';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  getPortfolioDividendsData,
  buildCalendar,
  yearlyAggregation,
  nextPayouts,
  topContributors,
  distributionBy,
  filterEntries,
  toMonthKey,
  calculateMonthlyDividends,
  getNextDividend,
  calculateYearlyDividends,
} from './utils/dividends';

const COLORS = ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#22d3ee', '#8b5cf6'];
const EMPTY_DIVIDEND_DATA = { holdings: [], events: [], fxRates: { EUR: 1 } };

export default function DividendenKalender() {
  const [assetsSyncTick, setAssetsSyncTick] = useState(0);
  const [data, setData] = useState(() => getPortfolioDividendsData() || EMPTY_DIVIDEND_DATA);
  const allEntries = useMemo(() => buildCalendar(data), [data]);

  useEffect(() => {
    const onAssetsUpdated = () => setAssetsSyncTick((v) => v + 1);
    const onStorage = (e) => {
      if (e.key === 'ft-assets-v2') onAssetsUpdated();
    };

    window.addEventListener('ft-assets-updated', onAssetsUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('ft-assets-updated', onAssetsUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    setData(getPortfolioDividendsData() || EMPTY_DIVIDEND_DATA);
  }, [assetsSyncTick]);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const formatEUR = (value) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const [range, setRange] = useState('30T');
  const [year, setYear] = useState();
  const [month, setMonth] = useState();
  const [ticker, setTicker] = useState();
  const [country, setCountry] = useState();
  const [sector, setSector] = useState();
  const [currency, setCurrency] = useState();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('calendar'); // 'calendar' | 'yearly' | 'insights'
  const [filtersOpen, setFiltersOpen] = useState(true);

  const filtered = useMemo(() => filterEntries(allEntries, { year, month, ticker, country, sector, currency, query: query || undefined }), [allEntries, year, month, ticker, country, sector, currency, query]);
  const yearsAgg = useMemo(() => yearlyAggregation(filtered), [filtered]);
  const next = useMemo(() => nextPayouts(filtered, 5), [filtered]);
  const byAsset = useMemo(() => distributionBy(filtered, 'ticker'), [filtered]);
  const byCountry = useMemo(() => distributionBy(filtered, 'country'), [filtered]);
  const byCurrency = useMemo(() => distributionBy(filtered, 'currency'), [filtered]);
  const top = useMemo(() => topContributors(filtered, 1)[0], [filtered]);

  const sortedEntries = useMemo(() => {
    return [...filtered].sort((a, b) => a.payDate - b.payDate);
  }, [filtered]);

  const overviewYear = Number(year) || todayStart.getFullYear();

  const monthlyOverview = useMemo(() => {
    return calculateMonthlyDividends(filtered, { year: overviewYear });
  }, [filtered, overviewYear]);

  const yearlyOverview = useMemo(() => {
    return calculateYearlyDividends(filtered, { year: overviewYear, today: todayStart });
  }, [filtered, overviewYear, todayStart]);

  const monthlyMax = useMemo(() => {
    return monthlyOverview.reduce((max, m) => Math.max(max, m.totalEUR), 0);
  }, [monthlyOverview]);

  const strongestMonth = useMemo(() => {
    if (!monthlyOverview.length) return null;
    return monthlyOverview.reduce((best, row) => {
      if (!best || row.totalEUR > best.totalEUR) return row;
      return best;
    }, null);
  }, [monthlyOverview]);

  const nextDividend = useMemo(() => {
    return getNextDividend(filtered, { today: todayStart });
  }, [filtered, todayStart]);

  const unique = useMemo(() => {
    const years = Array.from(new Set(allEntries.map((e) => e.payDate.getFullYear()))).sort();
    const months = Array.from(new Set(allEntries.map((e) => toMonthKey(e.payDate)))).sort();
    const tickers = Array.from(new Set(allEntries.map((e) => e.ticker))).sort();
    const countries = Array.from(new Set(allEntries.map((e) => e.country))).sort();
    const sectors = Array.from(new Set(allEntries.map((e) => e.sector).filter(Boolean))).sort();
    const currencies = Array.from(new Set(allEntries.map((e) => e.currency))).sort();
    return { years, months, tickers, countries, sectors, currencies };
  }, [allEntries]);

  const totalYearGross = yearlyOverview.totalEUR;
  const avgMonthly = yearlyOverview.averageEUR;
  const card = { background: '#161616', border: '1px solid #222', borderRadius: 12, padding: 20 };
  const h2 = { color: '#e5e7eb', fontSize: 16, fontWeight: 800, marginBottom: 10 };
  const label = { color: '#8b8b8b', fontSize: 11, marginBottom: 6, display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 };
  const select = { background: '#111', color: '#fff', border: '1px solid #2a2a2a', borderRadius: 10, padding: '10px 12px' };
  const kpi = (accent) => ({ ...card, padding: 16, border: `1px solid ${accent}35`, background: '#141414', boxShadow: `0 0 0 1px #111` });
  const tabBtn = (active) => ({
    padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
    background: active ? '#111' : 'transparent', color: active ? '#fff' : '#9aa0a6', border: active ? '1px solid #2a2a2a' : '1px solid transparent'
  });
  const chip = (active) => ({ padding: '6px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: `1px solid ${active ? '#3b82f6' : '#2a2a2a'}`, color: active ? '#93c5fd' : '#c7c7c7', background: active ? '#0b1a30' : '#111' });
  const monthColor = (value, max) => {
    if (!(max > 0) || !(value > 0)) return '#374151';
    const t = Math.min(1, Math.max(0, value / max));
    const c1 = { r: 139, g: 92, b: 246 }; // #8b5cf6
    const c2 = { r: 16, g: 185, b: 129 }; // #10b981
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div>
      <div style={{ color: '#fff', fontSize: 24, fontWeight: 900, marginBottom: 10 }}>Dividendenkalender</div>
      <div style={{ color: '#7e7e7e', marginBottom: 14 }}>Persönliche Übersicht deiner Ausschüttungen – kompakt im App‑Look.</div>

      <div style={{ ...card, padding: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        {['1T', '7T', '30T', '1J', 'YTD', 'Max'].map((opt) => (
          <button key={opt} onClick={() => setRange(opt)} style={chip(range === opt)}>
            {opt === '1T' ? 'Heute' : opt}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 14 }}>
        <div style={kpi('#3b82f6')}>
          <div style={{ color: '#8b8b8b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Gesamtdividende ({overviewYear})</div>
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 900, marginTop: 6 }}>{formatEUR(totalYearGross)}</div>
        </div>
        <div style={kpi('#10b981')}>
          <div style={{ color: '#8b8b8b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Durchschnitt pro Monat</div>
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 900, marginTop: 6 }}>{formatEUR(avgMonthly)}</div>
        </div>
        <div style={kpi('#f59e0b')}>
          <div style={{ color: '#8b8b8b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Nächste Auszahlung</div>
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 900, marginTop: 6 }}>
            {nextDividend ? `${nextDividend.payDate.toLocaleDateString('de-DE')} · ${formatEUR(nextDividend.amountEUR)}` : 'Keine anstehende Auszahlung'}
          </div>
        </div>
        <div style={kpi('#8b5cf6')}>
          <div style={{ color: '#8b8b8b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Anstehende Zahlungen</div>
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 900, marginTop: 6 }}>{yearlyOverview.upcomingCount}</div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 14 }}>
        <div style={h2}>Monatsübersicht ({overviewYear})</div>
        <div style={{ color: '#8b8b8b', fontSize: 12, marginBottom: 12 }}>Zuordnung auf Basis des Zahltags. Mehrere Dividenden im selben Monat werden aggregiert.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          {monthlyOverview.map((m) => {
            const isStrongest = strongestMonth && m.monthKey === strongestMonth.monthKey && m.totalEUR > 0;
            const ratio = monthlyMax > 0 ? m.totalEUR / monthlyMax : 0;
            const fillHeight = Math.max(8, Math.round(ratio * 62));
            const fillColor = monthColor(m.totalEUR, monthlyMax);

            return (
              <div key={m.monthKey} style={{ background: '#111', border: isStrongest ? '1px solid #10b98155' : '1px solid #232323', borderRadius: 10, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ color: '#d5d7dc', fontSize: 12, fontWeight: 800 }}>{m.monthLabel}</div>
                  {isStrongest && <div style={{ color: '#10b981', fontSize: 10, fontWeight: 800 }}>Top</div>}
                </div>

                <div style={{ height: 64, background: '#0d0d0d', borderRadius: 8, border: '1px solid #1c1c1c', display: 'flex', alignItems: 'flex-end', padding: 6, marginBottom: 8 }}>
                  <div style={{ width: '100%', height: `${fillHeight}px`, borderRadius: 6, background: fillColor, opacity: m.totalEUR > 0 ? 0.95 : 0.45 }} />
                </div>

                <div style={{ color: '#fff', fontSize: 14, fontWeight: 900 }}>{formatEUR(m.totalEUR)}</div>
                <div style={{ color: '#6f737b', fontSize: 11, marginTop: 3 }}>
                  {m.totalEUR > 0 ? `${m.payoutCount} Zahlung${m.payoutCount === 1 ? '' : 'en'}` : 'keine Ausschüttung'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ ...card, padding: 10, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => setTab('calendar')} style={tabBtn(tab === 'calendar')}>Kalender</button>
        <button onClick={() => setTab('yearly')} style={tabBtn(tab === 'yearly')}>Jahre</button>
        <button onClick={() => setTab('insights')} style={tabBtn(tab === 'insights')}>Insights</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {/* quick chips for months */}
          {['Aktuell', '+1', '+2'].map((label, idx) => {
            const base = new Date();
            const d = new Date(base.getFullYear(), base.getMonth() + idx, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const active = month === key;
            return <button key={label} onClick={()=>{ setMonth(key); setYear(d.getFullYear()); setTab('calendar'); }} style={chip(active)}>{label}</button>;
          })}
          <button onClick={()=>{ setYear(new Date().getFullYear()); setMonth(undefined); setTicker(undefined); setCountry(undefined); setSector(undefined); setCurrency(undefined); setQuery(''); }} style={{ ...chip(false), background:'#0b0b0b' }}>Reset</button>
        </div>
      </div>

      {/* Filter Panel */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: filtersOpen ? 12 : 0 }}>
          <div style={{ color:'#8b8b8b', fontSize:12, fontWeight:800, letterSpacing:.6 }}>Filter</div>
          <button onClick={()=>setFiltersOpen(v=>!v)} style={{ marginLeft: 'auto', ...tabBtn(true), padding:'6px 10px' }}>{filtersOpen ? 'Schließen' : 'Öffnen'}</button>
        </div>
        {filtersOpen && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, alignItems: 'end' }}>
            <div>
              <label style={label}>Jahr</label>
              <select style={select} value={year ?? ''} onChange={(e)=>setYear(e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">Alle</option>
                {unique.years.map((y)=> <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Monat</label>
              <select style={select} value={month ?? ''} onChange={(e)=>setMonth(e.target.value || undefined)}>
                <option value="">Alle</option>
                {unique.months.map((m)=> <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Aktie</label>
              <select style={select} value={ticker ?? ''} onChange={(e)=>setTicker(e.target.value || undefined)}>
                <option value="">Alle</option>
                {unique.tickers.map((t)=> <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Land</label>
              <select style={select} value={country ?? ''} onChange={(e)=>setCountry(e.target.value || undefined)}>
                <option value="">Alle</option>
                {unique.countries.map((c)=> <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Branche</label>
              <select style={select} value={sector ?? ''} onChange={(e)=>setSector(e.target.value || undefined)}>
                <option value="">Alle</option>
                {unique.sectors.map((s)=> <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Währung</label>
              <select style={select} value={currency ?? ''} onChange={(e)=>setCurrency(e.target.value || undefined)}>
                <option value="">Alle</option>
                {unique.currencies.map((c)=> <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ minWidth: 200 }}>
              <label style={label}>Suche</label>
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Firma oder Ticker" style={{ ...select, width: '100%' }} />
            </div>
          </div>
        )}
      </div>

      {/* Content by tab */}
      {tab === 'calendar' && (
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={h2}>Persönlicher Dividendenkalender</div>
        {sortedEntries.length === 0 ? (
          <div style={{ border: '1px dashed #2a2a2a', borderRadius: 10, padding: 20, textAlign: 'center', background: '#101010' }}>
            <div style={{ color: '#e5e7eb', fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Noch keine Dividenden vorhanden</div>
            <div style={{ color: '#8b8b8b', fontSize: 12, marginBottom: 12 }}>Sobald du ausschüttende Assets im Portfolio hinterlegst, erscheint hier deine Monats- und Kalenderübersicht.</div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('ft-open-add-asset'))}
              style={{ background: '#111827', border: '1px solid #374151', color: '#dbeafe', borderRadius: 9, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Dividende hinzufügen
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ borderBottom: '1px solid #1f2937', background: '#0f172a', color: '#cbd5e1' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>Firma</th>
                  <th style={{ textAlign: 'right', padding: 8 }}>Dividende/Aktie</th>
                  <th style={{ textAlign: 'right', padding: 8 }}>Gesamt (brutto)</th>
                  <th style={{ textAlign: 'right', padding: 8 }}>Gesamt (netto, EUR)</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Zahltag</th>
                  <th style={{ textAlign: 'right', padding: 8 }}>Rendite</th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((e, idx) => {
                  const monthKey = toMonthKey(e.payDate);
                  const prevMonthKey = idx > 0 ? toMonthKey(sortedEntries[idx - 1].payDate) : null;
                  const showMonthHeader = monthKey !== prevMonthKey;
                  const isTodayPay = new Date().toDateString() === e.payDate.toDateString();

                  return (
                    <Fragment key={`${e.ticker}-${e.payDate.toISOString()}-${idx}`}>
                      {showMonthHeader && (
                        <tr style={{ background: '#0d131d' }}>
                          <td colSpan={6} style={{ padding: '7px 8px', color: '#93c5fd', fontSize: 11, fontWeight: 800, letterSpacing: 0.4 }}>
                            {e.payDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                          </td>
                        </tr>
                      )}
                      <tr style={{ borderBottom: '1px solid #1f2937', background: isTodayPay ? '#052e1f' : 'transparent' }}>
                        <td style={{ padding: 8, color: '#e5e7eb' }}>{e.name}</td>
                        <td style={{ padding: 8, textAlign: 'right', color: '#e5e7eb' }}>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: e.currency }).format(e.amountPerShare || 0)}</td>
                        <td style={{ padding: 8, textAlign: 'right', color: '#e5e7eb' }}>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: e.currency }).format(e.grossTotal || 0)}</td>
                        <td style={{ padding: 8, textAlign: 'right', color: '#e5e7eb' }}>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(e.netTotalEUR || 0)}</td>
                        <td style={{ padding: 8, color: '#e5e7eb' }}>{e.payDate.toLocaleDateString('de-DE')}</td>
                        <td style={{ padding: 8, textAlign: 'right', color: '#e5e7eb' }}>{e.yieldPercent ? `${e.yieldPercent.toFixed(2)}%` : '-'}</td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {tab === 'yearly' && (
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={h2}>Jahresübersicht</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1f2937', background: '#0f172a', color: '#cbd5e1' }}>
                <th style={{ textAlign: 'left', padding: 8 }}>Jahr</th>
                <th style={{ textAlign: 'right', padding: 8 }}>Brutto (EUR)</th>
                <th style={{ textAlign: 'right', padding: 8 }}>Netto (EUR)</th>
                <th style={{ textAlign: 'right', padding: 8 }}>Wachstum vs. Vorjahr</th>
              </tr>
            </thead>
            <tbody>
              {yearsAgg.map((y, idx) => {
                const prev = yearsAgg[idx - 1];
                const growth = prev ? ((y.grossEUR - prev.grossEUR) / prev.grossEUR) : undefined;
                return (
                  <tr key={y.year} style={{ borderBottom: '1px solid #1f2937' }}>
                    <td style={{ padding: 8, color: '#e5e7eb' }}>{y.year}</td>
                    <td style={{ padding: 8, textAlign: 'right', color: '#e5e7eb' }}>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(y.grossEUR)}</td>
                    <td style={{ padding: 8, textAlign: 'right', color: '#e5e7eb' }}>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(y.netEUR)}</td>
                    <td style={{ padding: 8, textAlign: 'right', color: '#e5e7eb' }}>{growth !== undefined ? `${(growth*100).toFixed(1)}%` : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {tab === 'insights' && (
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={h2}>Dividenden-Insights</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ color: '#e5e7eb', fontWeight: 600, marginBottom: 8 }}>Nächste Ausschüttungen</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {next.map((n, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#e5e7eb', borderBottom: '1px dashed #1f2937', paddingBottom: 4 }}>
                  <span>{n.payDate.toLocaleDateString('de-DE')} · {n.ticker}</span>
                  <span>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n.grossTotalEUR)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div style={{ color: '#e5e7eb', fontWeight: 600, marginBottom: 8 }}>Top-Beitrag</div>
            {top ? (
              <div style={{ color: '#e5e7eb', fontSize: 13 }}>{top[0]} trägt <strong>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(top[1])}</strong> bei.</div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: 12 }}>Keine Daten</div>
            )}
            <div style={{ color: '#e5e7eb', fontWeight: 600, margin: '10px 0 8px' }}>Verteilung nach Aktie</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={byAsset} dataKey="value" nameKey="name" outerRadius={70} label>
                  {byAsset.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v)} contentStyle={{ background: '#0b0b0b', border: '1px solid #1f1f1f' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div style={{ color: '#e5e7eb', fontWeight: 600, marginBottom: 8 }}>Verteilung nach Land</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={byCountry} dataKey="value" nameKey="name" outerRadius={70} label>
                  {byCountry.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v)} contentStyle={{ background: '#0b0b0b', border: '1px solid #1f1f1f' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ color: '#e5e7eb', fontWeight: 600, margin: '10px 0 8px' }}>Verteilung nach Währung</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={byCurrency} dataKey="value" nameKey="name" outerRadius={70} label>
                  {byCurrency.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v)} contentStyle={{ background: '#0b0b0b', border: '1px solid #1f1f1f' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
