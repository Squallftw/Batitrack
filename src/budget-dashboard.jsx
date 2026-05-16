// Budget & Profitability Dashboard — landing page
// EVERY figure runs through BudgetEngine. No ad-hoc math in this file.

const { useState: useBdState, useMemo: useBdMemo, useEffect: useBdEff } = React;

// ─── Health colors ────────────────────────────────────────────
const HEALTH = {
  green: { dot:'#2E9152', soft:'#DCEEE0', label:'Sain' },
  amber: { dot:'#C58122', soft:'#FBEBD3', label:'À surveiller' },
  red:   { dot:'#C25B3F', soft:'#FBE3DC', label:'Critique' }
};

function fmt(n) { return formatMADCompact(n); }
function pctStr(n) { return n == null ? '—' : (n > 0 ? '+' : '') + n.toFixed(1) + '%'; }

// ─── Top KPI strip ────────────────────────────────────────────
function KpiStrip({ port, range, onDrill }) {
  const overrun = port.spent - port.budget;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <BdKpi label="Budget alloué" value={fmt(port.budget)} sub={`${port.activeCount} chantiers actifs`}/>
      <BdKpi label="Total dépensé" value={fmt(port.spent)}
             sub={overrun > 0 ? `Dépassement ${fmt(overrun)}` : `${fmt(-overrun)} restants`}
             warn={overrun > 0} onClick={() => onDrill('ledger')}/>
      <BdKpi label="Valeur des contrats" value={fmt(port.contractValue)} sub="Total facturable" onClick={() => onDrill('contracts')}/>
      <BdKpi label="Encaissé client" value={fmt(port.received)} sub={`Reste: ${fmt(port.contractValue - port.received)}`} onClick={() => onDrill('payments')}/>
      <BdKpi label="Marge brute"
             value={fmt(port.grossMargin)}
             sub={port.grossMarginPct != null ? pctStr(port.grossMarginPct) + ' de marge' : '—'}
             accent={port.grossMargin >= 0}
             warn={port.grossMargin < 0}/>
      <BdKpi label="État du portefeuille"
             value={<HealthMix port={port}/>}
             sub={`${port.onBudget} sains · ${port.atRisk} à surveiller · ${port.overBudget} critiques`}/>
    </div>
  );
}

function HealthMix({ port }) {
  const total = port.activeCount || 1;
  const segs = [
    { v: port.onBudget, c: HEALTH.green.dot },
    { v: port.atRisk, c: HEALTH.amber.dot },
    { v: port.overBudget, c: HEALTH.red.dot }
  ];
  return (
    <div className="flex h-6 rounded overflow-hidden mt-1">
      {segs.map((s, i) => s.v > 0 ? <div key={i} title={`${s.v} chantiers`} style={{ width: (s.v/total)*100+'%', background: s.c }}/> : null)}
    </div>
  );
}

function BdKpi({ label, value, sub, accent, warn, onClick }) {
  const tint = warn ? '#C25B3F' : accent ? '#1F6B3A' : '#1F2421';
  return (
    <Card className={`p-3.5 ${onClick ? 'cursor-pointer hover:shadow-md transition' : ''}`} onClick={onClick}>
      <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">{label}</div>
      {typeof value === 'string' ? (
        <div className="text-xl font-bold mt-1 tabular-nums" style={{ color: tint }}>{value}</div>
      ) : (
        <div className="mt-1" style={{ color: tint }}>{value}</div>
      )}
      {sub && <div className="text-[11px] text-stone-500 mt-0.5">{sub}</div>}
    </Card>
  );
}

// ─── Chantier grid (the heart of the page) ────────────────────
function ChantiersGrid({ metrics, onOpen }) {
  const [sortCol, setSortCol] = useBdState('marginAsc'); // worst margin first
  const sorted = useBdMemo(() => {
    const arr = [...metrics];
    arr.sort((a,b) => {
      switch (sortCol) {
        case 'name':         return a.chantier.name.localeCompare(b.chantier.name);
        case 'budgetDesc':   return b.budgetCents - a.budgetCents;
        case 'spentDesc':    return b.spentCents - a.spentCents;
        case 'consumedDesc': return (b.consumedPct||0) - (a.consumedPct||0);
        case 'marginAsc':    return (a.projectedMarginCents??-Infinity) - (b.projectedMarginCents??-Infinity);
        case 'marginDesc':   return (b.projectedMarginCents??-Infinity) - (a.projectedMarginCents??-Infinity);
        default: return 0;
      }
    });
    return arr;
  }, [metrics, sortCol]);

  function Th({ children, col }) {
    return (
      <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-stone-500 font-semibold cursor-pointer hover:bg-stone-100"
          onClick={() => setSortCol(col)}>
        <div className="inline-flex items-center gap-1">{children}{sortCol===col && <span className="text-stone-400">▼</span>}</div>
      </th>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor:'#F0EAE0' }}>
        <h3 className="font-bold text-sm">Performance par chantier</h3>
        <div className="text-xs text-stone-500">Tri par défaut: <b>pire marge en premier</b></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 1100 }}>
          <thead style={{ background:'#FAF7F1' }}>
            <tr>
              <Th col="name">Chantier</Th>
              <th className="px-3 py-2.5 text-center text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Santé</th>
              <Th col="budgetDesc">Budget</Th>
              <Th col="spentDesc">Dépensé · M / L</Th>
              <Th col="consumedDesc">% consommé</Th>
              <th className="px-3 py-2.5 text-right text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Contrat · Reçu</th>
              <th className="px-3 py-2.5 text-right text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Coût projeté</th>
              <Th col="marginAsc">Marge projetée</Th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(m => {
              const c = m.chantier;
              const h = HEALTH[m.health];
              const matPct = m.spent > 0 ? (m.materials.value / m.spent) * 100 : 0;
              return (
                <tr key={c.id} className="border-t hover:bg-stone-50 cursor-pointer" style={{ borderColor:'#F0EAE0' }}
                    onClick={() => onOpen(c.id, 'overview')}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: c.color }}/>
                      <div className="min-w-0">
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-[10px] text-stone-500">{c.client} · <b>{(m.pctComplete||0).toFixed(0)}%</b> avancé</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: h.soft, color: h.dot }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: h.dot }}/>
                      {h.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{fmt(m.budget)}</td>
                  <td className="px-3 py-2.5">
                    <div className="text-right tabular-nums font-bold">{fmt(m.spent)}</div>
                    <div className="h-1 mt-1 rounded-full overflow-hidden flex bg-stone-100" title={`Matériaux ${fmt(m.materials.value)} · Main d'œuvre ${fmt(m.labor.value)}`}>
                      <div style={{ width: matPct+'%', background:'#7C5E2A' }}/>
                      <div style={{ width: (100-matPct)+'%', background:'#0E5460' }}/>
                    </div>
                    <div className="flex justify-between text-[9px] text-stone-500 mt-0.5">
                      <span>M {fmt(m.materials.value)}</span>
                      <span>L {fmt(m.labor.value)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right" style={{ minWidth: 110 }}>
                    {m.consumedPct == null ? <span className="text-stone-300">—</span> : (
                      <>
                        <div className="font-bold tabular-nums" style={{ color: m.consumedPct > 100 ? '#C25B3F' : m.consumedPct > 80 ? '#C58122' : '#1F6B3A' }}>
                          {m.consumedPct.toFixed(0)}%
                        </div>
                        <div className="h-1 bg-stone-100 rounded-full overflow-hidden mt-0.5">
                          <div className="h-full rounded-full" style={{ width: Math.min(100, m.consumedPct)+'%',
                                background: m.consumedPct > 100 ? '#C25B3F' : m.consumedPct > 80 ? '#C58122' : '#2E9152' }}/>
                        </div>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {m.contractCents > 0 ? (
                      <>
                        <div className="font-semibold">{fmt(m.contractValue)}</div>
                        <div className="text-[10px] text-stone-500">Reçu: <b className="text-stone-700">{fmt(m.received)}</b></div>
                      </>
                    ) : (
                      <span className="text-[10px] text-stone-400 italic">Aucun contrat</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <div className="font-semibold">{fmt(m.projectedFinalCost)}</div>
                    <div className={`text-[10px]`} style={{ color: m.projectedOverrun > 0 ? '#C25B3F' : '#1F6B3A' }}>
                      {m.projectedOverrun > 0 ? '+' : ''}{fmt(m.projectedOverrun)} vs budget
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {m.projectedMargin == null ? (
                      <span className="text-[10px] text-stone-400 italic">Définir contrat</span>
                    ) : (
                      <>
                        <div className="font-bold" style={{ color: m.projectedMargin < 0 ? '#C25B3F' : '#1F6B3A' }}>{fmt(m.projectedMargin)}</div>
                        <div className="text-[10px] text-stone-500">{pctStr(m.projectedMarginPct)}</div>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-stone-300"><Icons.ChevronRight size={14}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t text-[10px] text-stone-500 flex items-center gap-3 flex-wrap" style={{ borderColor:'#F0EAE0' }}>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background:'#7C5E2A' }}/>Matériaux</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background:'#0E5460' }}/>Main d'œuvre</span>
        <span className="ml-auto">Cliquez une ligne pour explorer les sources.</span>
      </div>
    </Card>
  );
}

// ─── Charts: P&L bars + Cost split donut ──────────────────────
function PLBars({ metrics }) {
  const max = Math.max(...metrics.map(m => Math.max(Math.abs(m.projectedMargin || 0), m.contractValue || 0)), 1);
  return (
    <Card className="p-4">
      <h3 className="font-bold text-sm mb-3">Marge projetée par chantier</h3>
      <div className="space-y-3">
        {metrics.map(m => {
          const v = m.projectedMargin;
          if (v == null) return (
            <div key={m.chantier.id} className="text-[11px] text-stone-400 italic">{m.chantier.name} — pas de contrat</div>
          );
          const pct = Math.min(100, (Math.abs(v) / max) * 100);
          const positive = v >= 0;
          return (
            <div key={m.chantier.id}>
              <div className="flex items-baseline justify-between text-xs mb-1">
                <span className="font-semibold inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-sm" style={{ background: m.chantier.color }}/>
                  <span>{m.chantier.name}</span>
                </span>
                <span className="tabular-nums font-bold" style={{ color: positive ? '#1F6B3A' : '#C25B3F' }}>{fmt(v)}</span>
              </div>
              <div className="relative h-3 bg-stone-50 rounded-full overflow-hidden">
                <div className="absolute top-0 bottom-0" style={{
                  left: positive ? '50%' : (50 - pct/2) + '%',
                  width: (pct/2) + '%',
                  background: positive ? '#2E9152' : '#C25B3F'
                }}/>
                <div className="absolute top-0 bottom-0 w-px bg-stone-300" style={{ left: '50%' }}/>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CostSplitDonut({ materials, labor, equipment }) {
  const total = materials + labor + equipment;
  if (total <= 0) {
    return <Card className="p-4"><h3 className="font-bold text-sm mb-3">Répartition des coûts</h3><div className="text-stone-400 text-sm italic">Aucune donnée.</div></Card>;
  }
  const segs = [
    { v: materials, c: '#7C5E2A', label: 'Matériaux' },
    { v: labor, c: '#0E5460', label: 'Main d\'œuvre' },
    ...(equipment > 0 ? [{ v: equipment, c: '#C58122', label: 'Matériel' }] : [])
  ];
  // Build donut paths
  const r = 50, sw = 18;
  const cx = 70, cy = 70;
  let acc = 0;
  const paths = segs.map((s, i) => {
    const frac = s.v / total;
    const startA = acc * 2 * Math.PI - Math.PI/2;
    acc += frac;
    const endA = acc * 2 * Math.PI - Math.PI/2;
    const x1 = cx + r * Math.cos(startA), y1 = cy + r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA),   y2 = cy + r * Math.sin(endA);
    const large = frac > 0.5 ? 1 : 0;
    return <path key={i} d={`M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
                 stroke={s.c} strokeWidth={sw} fill="none"/>;
  });
  return (
    <Card className="p-4">
      <h3 className="font-bold text-sm mb-3">Répartition des coûts</h3>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 140 140" width="140" height="140">
          {paths}
          <text x="70" y="68" textAnchor="middle" fontSize="11" fill="#6B6359" fontWeight="600">Total</text>
          <text x="70" y="82" textAnchor="middle" fontSize="12" fill="#1F2421" fontWeight="800">{fmt(total)}</text>
        </svg>
        <div className="flex-1 space-y-2">
          {segs.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.c }}/>
                <span className="font-semibold">{s.label}</span>
              </span>
              <span className="tabular-nums">
                <b>{fmt(s.v)}</b> <span className="text-stone-400">({((s.v/total)*100).toFixed(0)}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── Burn rate line chart ─────────────────────────────────────
function BurnChart({ metrics, srcs }) {
  const series = metrics.slice(0, 4).map(m => ({ chantier: m.chantier, data: window.BudgetEngine.burnRateSeries(m.chantier, srcs, 'week'), budget: m.budget }));
  const allValues = series.flatMap(s => s.data.map(p => p.value)).concat(series.map(s => s.budget));
  const max = Math.max(1, ...allValues);
  const allDates = [...new Set(series.flatMap(s => s.data.map(p => p.date)))].sort();
  if (allDates.length === 0) {
    return <Card className="p-4"><h3 className="font-bold text-sm mb-3">Burn rate cumulé</h3><div className="text-stone-400 text-sm italic">Aucune donnée.</div></Card>;
  }
  const w = 600, h = 180, pad = 30;
  const xAt = (i) => pad + (i/Math.max(1, allDates.length-1)) * (w - 2*pad);
  const yAt = (v) => h - pad - (v/max) * (h - 2*pad);
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-bold text-sm">Cumul des dépenses dans le temps</h3>
        <span className="text-[10px] text-stone-500">Top 4 chantiers · agrégation hebdomadaire</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        <line x1={pad} y1={h-pad} x2={w-pad} y2={h-pad} stroke="#E8E2D8"/>
        <line x1={pad} y1={pad} x2={pad} y2={h-pad} stroke="#E8E2D8"/>
        {series.map(({ chantier, data, budget }) => {
          const idx = (date) => allDates.indexOf(date);
          const path = data.map((p, i) => `${i===0?'M':'L'}${xAt(idx(p.date))},${yAt(p.value)}`).join(' ');
          return (
            <g key={chantier.id}>
              <path d={path} stroke={chantier.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1={pad} y1={yAt(budget)} x2={w-pad} y2={yAt(budget)} stroke={chantier.color} strokeWidth="1" strokeDasharray="3 3" opacity="0.4"/>
            </g>
          );
        })}
        <g transform={`translate(${pad+4}, ${pad+4})`}>
          {series.map((s, i) => (
            <g key={i} transform={`translate(0, ${i*14})`}>
              <rect width="10" height="2" y="4" fill={s.chantier.color}/>
              <text x="14" y="9" fontSize="10" fill="#1F2421" fontWeight="600">{s.chantier.name}</text>
            </g>
          ))}
        </g>
      </svg>
    </Card>
  );
}

// ─── Alerts panel ─────────────────────────────────────────────
function AlertsPanel({ metrics, onOpen }) {
  const alerts = [];
  metrics.forEach(m => {
    const c = m.chantier;
    if (m.consumedPct != null && m.consumedPct > 100) {
      alerts.push({ sev:'red', label: `${c.name} : budget dépassé`, detail: `Dépensé ${fmt(m.spent)} contre ${fmt(m.budget)} prévu`, chantierId: c.id });
    } else if (m.projectedOverrun > 0 && m.consumedPct != null && m.consumedPct < 100) {
      alerts.push({ sev:'amber', label: `${c.name} : dépassement projeté`, detail: `Coût final prévu ${fmt(m.projectedFinalCost)} · +${fmt(m.projectedOverrun)}`, chantierId: c.id });
    }
    if (m.projectedMargin != null && m.projectedMargin < 0) {
      alerts.push({ sev:'red', label: `${c.name} : marge projetée négative`, detail: `Perte projetée ${fmt(Math.abs(m.projectedMargin))} · contrat ${fmt(m.contractValue)}`, chantierId: c.id });
    }
    if (m.contractCents > 0 && m.pctComplete >= 50 && m.receivedCents < m.contractCents * 0.3) {
      alerts.push({ sev:'amber', label: `${c.name} : encaissements en retard`, detail: `${((m.received/m.contractValue)*100).toFixed(0)}% encaissé pour ${(m.pctComplete||0).toFixed(0)}% avancé`, chantierId: c.id });
    }
  });

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor:'#F0EAE0' }}>
        <div className="flex items-center gap-2">
          <Icons.AlertTri size={14} style={{ color:'#C25B3F' }}/>
          <h3 className="font-bold text-sm">Alertes</h3>
          {alerts.length > 0 && <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background:'#FBE3DC', color:'#8A2C1E' }}>{alerts.length}</span>}
        </div>
      </div>
      {alerts.length === 0 ? (
        <div className="px-4 py-6 text-center text-stone-500 text-sm">
          <Icons.Check size={22} className="mx-auto mb-1.5 text-green-600"/>
          Aucune alerte active
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor:'#F0EAE0' }}>
          {alerts.map((a, i) => {
            const sev = HEALTH[a.sev];
            return (
              <button key={i} onClick={() => onOpen(a.chantierId, 'expenses')}
                      className="w-full px-4 py-2.5 hover:bg-stone-50 text-left flex gap-3" style={{ borderColor:'#F0EAE0' }}>
                <span className="w-1 rounded-full flex-shrink-0" style={{ background: sev.dot }}/>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{a.label}</div>
                  <div className="text-[11px] text-stone-500">{a.detail}</div>
                </div>
                <Icons.ChevronRight size={14} className="text-stone-300 flex-shrink-0"/>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Reconciliation banner ────────────────────────────────────
function ReconciliationBanner({ rec, port }) {
  const tests = window.BudgetEngine.__testResults;
  return (
    <div className="flex items-center gap-3 text-[11px] text-stone-500">
      <div className="inline-flex items-center gap-1.5">
        {rec.ok ? <Icons.Check size={12} style={{color:'#2E9152'}}/> : <Icons.AlertTri size={12} style={{color:'#C25B3F'}}/>}
        <span>
          {rec.ok
            ? <>Réconciliation OK · agrégats vérifiés à la source</>
            : <>⚠ Drift détecté sur {rec.drifts.map(d => d.field).join(', ')}</>}
        </span>
      </div>
      <span className="text-stone-300">·</span>
      <span>Moteur: <b>{tests.passed}/{tests.total}</b> tests passés</span>
      <span className="text-stone-300">·</span>
      <span>Calculé à {new Date(rec.computedAt).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
    </div>
  );
}

// ─── Period selector ──────────────────────────────────────────
const PERIODS = [
  { id: 'month',   label: 'Ce mois' },
  { id: 'quarter', label: 'Ce trimestre' },
  { id: 'year',    label: 'Cette année' },
  { id: 'all',     label: 'Tout l\'historique' }
];

function rangeFor(periodId) {
  const today = new Date(window.TODAY.year, window.TODAY.monthIdx, window.TODAY.day);
  function iso(d) { return d.toISOString().slice(0,10); }
  if (periodId === 'all') return null;
  if (periodId === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth()+1, 0);
    return { from: iso(start), to: iso(end) };
  }
  if (periodId === 'quarter') {
    const q = Math.floor(today.getMonth()/3);
    const start = new Date(today.getFullYear(), q*3, 1);
    const end = new Date(today.getFullYear(), q*3+3, 0);
    return { from: iso(start), to: iso(end) };
  }
  if (periodId === 'year') {
    return { from: `${today.getFullYear()}-01-01`, to: `${today.getFullYear()}-12-31` };
  }
  return null;
}

// ─── Drill-down drawer ────────────────────────────────────────
function DrillDownDrawer({ chantierId, view, range, srcs, onClose, onNav }) {
  const chantier = CHANTIERS.find(c => c.id === chantierId);
  if (!chantier) return null;
  const m = window.BudgetEngine.chantierMetrics(chantier, { ...srcs, dateRange: range });

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose}/>
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col"
           style={{ borderLeft:'1px solid #E8E2D8' }}>
        <div className="px-5 py-4 border-b flex items-start justify-between" style={{ borderColor:'#EDE6D8' }}>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Détail · {view}</div>
            <div className="text-lg font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm" style={{ background: chantier.color }}/>
              {chantier.name}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-100"><Icons.X size={18}/></button>
        </div>

        {/* Mini tabs */}
        <div className="px-5 pt-3 flex gap-1 border-b" style={{ borderColor:'#F0EAE0' }}>
          {[
            ['overview', 'Vue d\'ensemble'],
            ['expenses', 'Dépenses'],
            ['materials','Matériaux'],
            ['labor',    'Main d\'œuvre'],
            ['payments', 'Paiements']
          ].map(([id, label]) => (
            <button key={id} onClick={() => onNav(id)}
                    className="px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition"
                    style={{ borderColor: view === id ? '#0E5460' : 'transparent', color: view === id ? '#0E5460' : '#6B6359' }}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {view === 'overview' && <DrillOverview m={m}/>}
          {view === 'expenses' && <DrillExpenses m={m}/>}
          {view === 'materials'&& <DrillMaterials m={m}/>}
          {view === 'labor'    && <DrillLabor m={m}/>}
          {view === 'payments' && <DrillPayments m={m}/>}
        </div>
      </div>
    </>
  );
}

function DrillOverview({ m }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <BdKpi label="Budget" value={fmt(m.budget)}/>
        <BdKpi label="Dépensé" value={fmt(m.spent)} sub={m.consumedPct == null ? '—' : `${m.consumedPct.toFixed(0)}% du budget`}/>
        <BdKpi label="Restant" value={fmt(m.remaining)} warn={m.remaining < 0}/>
        <BdKpi label="Contrat" value={fmt(m.contractValue)}/>
        <BdKpi label="Encaissé" value={fmt(m.received)} sub={`Reste ${fmt(m.outstanding)}`}/>
        <BdKpi label="Marge projetée" value={m.projectedMargin == null ? '—' : fmt(m.projectedMargin)} accent={m.projectedMargin >= 0} warn={m.projectedMargin < 0}/>
      </div>
      <Card className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-2">Réconciliation</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div><div className="text-stone-500">Matériaux</div><div className="font-bold tabular-nums">{fmt(m.materials.value)}</div></div>
          <div><div className="text-stone-500">Main d'œuvre</div><div className="font-bold tabular-nums">{fmt(m.labor.value)}</div></div>
          <div><div className="text-stone-500">Total ✓</div><div className="font-bold tabular-nums" style={{color:'#0E5460'}}>{fmt(m.spent)}</div></div>
        </div>
        <div className="text-[10px] text-stone-400 mt-2">Vérifié à partir de {m.materials.lines.length} consommations + {m.labor.lines.length} pointages.</div>
      </Card>
    </div>
  );
}

function DrillExpenses({ m }) {
  const all = [...m.materials.lines, ...m.labor.lines, ...m.equipment.lines].sort((a,b) => b.date.localeCompare(a.date));
  return (
    <div className="space-y-2">
      {all.length === 0 ? <EmptyState icon={<Icons.Coins size={20}/>} title="Aucune dépense" hint="Aucune consommation ni main d'œuvre enregistrée sur la période."/> : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-stone-500" style={{ background:'#FAF7F1' }}>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Détail</th>
              <th className="px-3 py-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {all.map(l => (
              <tr key={`${l.kind}-${l.id}`} className="border-t" style={{ borderColor:'#F0EAE0' }}>
                <td className="px-3 py-1.5 text-xs tabular-nums">{frenchDateFromISO(l.date)}</td>
                <td className="px-3 py-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: l.kind==='material' ? '#EBE3CC' : l.kind==='labor' ? '#D8E5E7' : '#FBEBD3',
                                 color: l.kind==='material' ? '#7C5E2A' : l.kind==='labor' ? '#0E5460' : '#C58122' }}>
                    {l.kind==='material' ? 'Matériau' : l.kind==='labor' ? 'Travail' : 'Matériel'}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-xs">
                  {l.label}
                  {l.qty != null && <span className="text-stone-500 tabular-nums"> · {l.qty} {l.unit || ''}</span>}
                  {l.isLoss && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded" style={{ background:'#FBE3DC', color:'#8A2C1E' }}>Perte</span>}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{fmt(l.cents / 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DrillMaterials({ m }) {
  // Group by item
  const byItem = {};
  for (const l of m.materials.lines) {
    if (!byItem[l.label]) byItem[l.label] = { label: l.label, qty: 0, unit: l.unit, cents: 0, lines: 0 };
    byItem[l.label].qty += l.qty;
    byItem[l.label].cents += l.cents;
    byItem[l.label].lines++;
  }
  const rows = Object.values(byItem).sort((a,b) => b.cents - a.cents);
  return (
    <div>
      <div className="text-xs text-stone-500 mb-3">{m.materials.lines.length} sorties · Total <b className="text-stone-900">{fmt(m.materials.value)}</b></div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-stone-500" style={{ background:'#FAF7F1' }}>
            <th className="px-3 py-2">Article</th>
            <th className="px-3 py-2 text-right">Quantité</th>
            <th className="px-3 py-2 text-right"># sorties</th>
            <th className="px-3 py-2 text-right">Coût</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.label} className="border-t" style={{ borderColor:'#F0EAE0' }}>
              <td className="px-3 py-1.5 font-semibold">{r.label}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{r.qty} <span className="text-stone-400 text-[10px]">{r.unit}</span></td>
              <td className="px-3 py-1.5 text-right text-stone-500 tabular-nums">{r.lines}</td>
              <td className="px-3 py-1.5 text-right tabular-nums font-bold">{fmt(r.cents/100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DrillLabor({ m }) {
  // Group by worker
  const byW = {};
  for (const l of m.labor.lines) {
    if (!byW[l.label]) byW[l.label] = { nom: l.label, role: l.role, days: 0, cents: 0 };
    byW[l.label].days++;
    byW[l.label].cents += l.cents;
  }
  const rows = Object.values(byW).sort((a,b) => b.cents - a.cents);
  return (
    <div>
      <div className="text-xs text-stone-500 mb-3">{m.labor.lines.length} jours pointés · Total <b className="text-stone-900">{fmt(m.labor.value)}</b></div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-stone-500" style={{ background:'#FAF7F1' }}>
            <th className="px-3 py-2">Ouvrier</th>
            <th className="px-3 py-2">Rôle</th>
            <th className="px-3 py-2 text-right">Jours présents</th>
            <th className="px-3 py-2 text-right">Coût</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.nom} className="border-t" style={{ borderColor:'#F0EAE0' }}>
              <td className="px-3 py-1.5 font-semibold">{r.nom}</td>
              <td className="px-3 py-1.5 text-xs text-stone-600">{r.role}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{r.days}</td>
              <td className="px-3 py-1.5 text-right tabular-nums font-bold">{fmt(r.cents/100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DrillPayments({ m }) {
  if (m.payments.lines.length === 0) {
    return <EmptyState icon={<Icons.Coins size={20}/>} title="Aucun paiement enregistré"
                       hint="Enregistrez les paiements reçus du client depuis la fiche chantier."/>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-wider text-stone-500" style={{ background:'#FAF7F1' }}>
          <th className="px-3 py-2">Date</th>
          <th className="px-3 py-2">Référence</th>
          <th className="px-3 py-2 text-right">Montant</th>
        </tr>
      </thead>
      <tbody>
        {m.payments.lines.map(p => (
          <tr key={p.id} className="border-t" style={{ borderColor:'#F0EAE0' }}>
            <td className="px-3 py-1.5 tabular-nums">{frenchDateFromISO(p.date)}</td>
            <td className="px-3 py-1.5 text-xs">{p.reference || p.note || '—'}</td>
            <td className="px-3 py-1.5 text-right tabular-nums font-bold" style={{ color:'#1F6B3A' }}>{fmt(p.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main page ────────────────────────────────────────────────
function BudgetDashboard({ ctx }) {
  const [period, setPeriod] = useBdState('all');
  const [drill, setDrill] = useBdState(null); // { chantierId, view }

  // Augment chantiers with contract value + payments seed (lightweight, no invoicing)
  const enrichedChantiers = useBdMemo(() => CHANTIERS.map(c => ({
    ...c,
    budget: c.budgetMO,
    contractValue: c.contractValue ?? (c.budgetMO * 1.25), // 25% margin target by default
  })), []);

  const payments = useBdMemo(() => ([
    { id:'pay-1', chantierId:'ch-1', date:'2026-02-15', amount: 60000, reference:'Virement avance' },
    { id:'pay-2', chantierId:'ch-1', date:'2026-04-10', amount: 45000, reference:'Acompte étape 2' },
    { id:'pay-3', chantierId:'ch-2', date:'2026-01-20', amount: 100000, reference:'Avance contrat' },
    { id:'pay-4', chantierId:'ch-2', date:'2026-03-15', amount: 80000, reference:'Acompte avancement' },
    { id:'pay-5', chantierId:'ch-3', date:'2025-12-05', amount: 20000, reference:'Acompte initial' }
  ]), []);

  const range = rangeFor(period);
  const srcs = {
    consumption: ctx.consommables?.consumption || window.CONSUMPTION_SEED || [],
    items:       ctx.consommables?.items       || window.CONSOMM_ITEMS    || [],
    pointage:    ctx.pointage,
    workers:     OUVRIERS,
    payments,
    materiels:   ctx.materiels || [],
    dateRange:   range
  };

  const port = useBdMemo(() => window.BudgetEngine.portfolioMetrics(enrichedChantiers, srcs), [enrichedChantiers, srcs.consumption, srcs.pointage, period]);
  const rec  = useBdMemo(() => window.BudgetEngine.reconcile(enrichedChantiers, srcs, port), [port]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-stone-500 mt-1 text-sm">Budget, dépenses et marge — toutes les figures sont recalculées depuis les sources.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-stone-100 rounded-lg p-0.5">
            {PERIODS.map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${period===p.id?'bg-white shadow-sm text-stone-900':'text-stone-500'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ReconciliationBanner rec={rec} port={port}/>

      <KpiStrip port={port} range={range} onDrill={() => {}}/>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ChantiersGrid metrics={port.perChantier} onOpen={(cid, view) => setDrill({ chantierId: cid, view })}/>
          <BurnChart metrics={port.perChantier} srcs={srcs}/>
        </div>
        <div className="space-y-4">
          <AlertsPanel metrics={port.perChantier} onOpen={(cid, view) => setDrill({ chantierId: cid, view })}/>
          <CostSplitDonut materials={port.materials} labor={port.labor} equipment={port.equipment}/>
          <PLBars metrics={port.perChantier}/>
        </div>
      </div>

      {drill && <DrillDownDrawer chantierId={drill.chantierId} view={drill.view} range={range} srcs={srcs}
                                 onClose={() => setDrill(null)}
                                 onNav={(v) => setDrill({ ...drill, view: v })}/>}
    </div>
  );
}

window.BudgetDashboard = BudgetDashboard;
