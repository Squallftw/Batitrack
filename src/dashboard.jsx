// Dashboard
const { useState: useDsState, useMemo: useDsMemo } = React;

function Dashboard({ ctx, onNav, onOpenChantier }) {
  const today = TODAY;
  const cq = currentQuinzaine();
  const cqkey = quinzaineKey(cq.year, cq.monthIdx, cq.half);

  // Pointage today
  const todayDK = dateKey(today.year, today.monthIdx, today.day);
  const presentsToday = OUVRIERS.filter(w => ctx.pointage[w.id]?.[todayDK]?.statut === 'P');
  const missingToday = OUVRIERS.filter(w => !ctx.pointage[w.id]?.[todayDK]);

  // Current Q cost
  const { start, end } = quinzaineRange(cq.year, cq.monthIdx, cq.half);
  let qCost = 0;
  OUVRIERS.forEach(w => {
    for (let d = start; d <= end; d++) {
      const c = ctx.pointage[w.id]?.[dateKey(cq.year, cq.monthIdx, d)];
      if (c?.statut === 'P') qCost += w.tarif + (c.prime || 0);
    }
  });

  // Per-chantier spent (this q)
  const chantierSpent = useDsMemo(() => {
    const m = {};
    CHANTIERS.forEach(c => m[c.id] = 0);
    // cumulative across all known dates
    Object.entries(ctx.pointage).forEach(([wid, days]) => {
      const w = OUVRIERS.find(o => o.id === wid);
      Object.entries(days).forEach(([dk, c]) => {
        if (c.statut === 'P') m[c.chantierId] = (m[c.chantierId]||0) + w.tarif + (c.prime||0);
      });
    });
    return m;
  }, [ctx.pointage]);

  // Last 6 quinzaines chart data
  const chartData = useDsMemo(() => {
    const out = [];
    let q = { ...cq };
    for (let i = 0; i < 6; i++) q = previousQuinzaine(q.year, q.monthIdx, q.half);
    for (let i = 0; i < 6; i++) {
      const { start: s, end: e } = quinzaineRange(q.year, q.monthIdx, q.half);
      const perCh = {};
      CHANTIERS.forEach(c => perCh[c.id] = 0);
      OUVRIERS.forEach(w => {
        for (let d = s; d <= e; d++) {
          const c = ctx.pointage[w.id]?.[dateKey(q.year, q.monthIdx, d)];
          if (c?.statut === 'P') perCh[c.chantierId] = (perCh[c.chantierId]||0) + w.tarif + (c.prime||0);
        }
      });
      out.push({ label: `Q${q.half} ${MOIS_FR_SHORT[q.monthIdx]}`, perCh, total: Object.values(perCh).reduce((a,b)=>a+b,0) });
      q = nextQuinzaine(q.year, q.monthIdx, q.half);
    }
    return out;
  }, [ctx.pointage]);
  const chartMax = Math.max(...chartData.map(d => d.total), 1);

  // Days until next pay
  const payDay = end + 1;
  const daysToPay = Math.max(0, payDay - today.day);

  return (
    <div className="space-y-6">
      <PageHeader title={`Bonjour, Youssef 👋`} subtitle={`${frenchDate(today.year, today.monthIdx, today.day)} — Voici un aperçu de votre activité.`}/>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon="Ouvrier" label="Ouvriers présents aujourd'hui"
                 value={`${presentsToday.length} / ${OUVRIERS.length}`}
                 sub={`${missingToday.length} sans pointage`} trend="+1"/>
        <KpiCard icon="Coins" label="Coût main d'œuvre · quinzaine"
                 value={formatMADCompact(qCost)} sub={`Q${cq.half} ${MOIS_FR_SHORT[cq.monthIdx]} en cours`} accent/>
        <KpiCard icon="Chantier" label="Chantiers actifs"
                 value={CHANTIERS.length} sub="1 en alerte budget"/>
        <KpiCard icon="Calendar" label="Fin de quinzaine"
                 value={`${daysToPay} j`}
                 sub={`Clôture le ${frenchDate(cq.year, cq.monthIdx, end)}`}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chantiers cards */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">Chantiers en cours</h2>
            <button onClick={() => onNav('chantiers')} className="text-xs text-stone-500 hover:text-stone-800 inline-flex items-center gap-1">Voir tout <Icons.Arrow size={11}/></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CHANTIERS.map(c => {
              const spent = chantierSpent[c.id] || 0;
              const pct = Math.min(100, (spent / c.budgetMO) * 100);
              const color = pct > 100 ? '#C25B3F' : pct > 80 ? '#C58122' : '#2E9152';
              const activeWorkers = new Set();
              OUVRIERS.forEach(w => {
                const todayC = ctx.pointage[w.id]?.[todayDK];
                if (todayC?.statut === 'P' && todayC.chantierId === c.id) activeWorkers.add(w.id);
              });
              return (
                <Card key={c.id} className="p-4 cursor-pointer hover:shadow-md transition" onClick={() => onOpenChantier(c.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-sm" style={{ background: c.color }}/>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-stone-500">{c.type}</span>
                      </div>
                      <div className="font-bold text-sm truncate">{c.name}</div>
                      <div className="text-xs text-stone-500 truncate">{c.client}</div>
                    </div>
                    {pct > 100 && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background:'#FBE3DC', color:'#8A2C1E' }}>
                        Dépassement
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs text-stone-500">Main d'œuvre</span>
                      <span className="text-xs font-bold tabular-nums" style={{ color }}>{Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: Math.min(100,pct)+'%', background: color }}/>
                    </div>
                    <div className="flex items-baseline justify-between mt-1.5">
                      <span className="font-bold tabular-nums text-sm">{formatMADCompact(spent)}</span>
                      <span className="text-xs text-stone-500 tabular-nums">/ {formatMADCompact(c.budgetMO)}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor:'#F0EAE0' }}>
                    <span className="text-stone-500"><b className="text-stone-900">{activeWorkers.size}</b> actifs aujourd'hui</span>
                    <span className="text-stone-400">Voir détails →</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Chart */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm">Coût main d'œuvre par chantier</h3>
                <p className="text-xs text-stone-500">6 dernières quinzaines</p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                {CHANTIERS.map(c => (
                  <div key={c.id} className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }}/>
                    <span className="text-stone-600">{c.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-end justify-between gap-2 h-44">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center group">
                  <div className="text-[10px] font-bold text-stone-700 tabular-nums opacity-0 group-hover:opacity-100 transition mb-1">{formatMADCompact(d.total)}</div>
                  <div className="w-full flex flex-col-reverse rounded-md overflow-hidden border" style={{ height: `${(d.total/chartMax)*140 + 6}px`, borderColor:'#F0EAE0' }}>
                    {CHANTIERS.map(c => {
                      const h = (d.perCh[c.id] / d.total) * 100;
                      if (!h) return null;
                      return <div key={c.id} style={{ background: c.color, height: `${h}%` }}/>;
                    })}
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1.5 font-medium">{d.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">Pointages manquants aujourd'hui</h3>
              <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded" style={{ background:'#FBEBD3', color:'#8A5114' }}>
                {missingToday.length}
              </span>
            </div>
            {missingToday.length === 0 ? (
              <div className="text-center py-6 text-stone-500 text-sm">
                <Icons.Check size={28} className="mx-auto mb-2 text-green-600"/>
                Tout est pointé ✓
              </div>
            ) : (
              <div className="space-y-1.5">
                {missingToday.slice(0, 6).map(w => (
                  <div key={w.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-stone-50">
                    <Avatar worker={w} size={28}/>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs truncate">{w.nom}</div>
                      <div className="text-[10px] text-stone-500">{w.role}</div>
                    </div>
                    <button onClick={() => onNav('pointage')}
                            className="text-[10px] font-semibold px-2 py-1 rounded-md text-white" style={{ background:'#0E5460' }}>
                      Pointer →
                    </button>
                  </div>
                ))}
                {missingToday.length > 6 && (
                  <button onClick={() => onNav('pointage')} className="text-xs text-stone-500 hover:text-stone-800 mt-2">
                    +{missingToday.length - 6} autres →
                  </button>
                )}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="font-bold text-sm mb-3">Activité récente</h3>
            <div className="space-y-2.5 text-xs">
              {ctx.audit.slice(0,4).map(e => {
                const w = OUVRIERS.find(o => o.id === e.workerId);
                return (
                  <div key={e.id} className="flex gap-2">
                    <Avatar worker={w} size={22}/>
                    <div className="flex-1 min-w-0">
                      <div><b>{w?.nom}</b> · {e.field}</div>
                      <div className="text-[10px] text-stone-500">{e.newVal} — {relativeTime(new Date(e.ts))}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, accent, trend }) {
  const Ic = Icons[icon];
  return (
    <Card className="p-4 relative overflow-hidden">
      <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full opacity-[0.07]" style={{ background: accent ? '#0E5460' : '#C25B3F' }}/>
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: accent ? '#D8E5E7' : '#F2DCD3', color: accent ? '#0E5460' : '#8A2C1E' }}>
          <Ic size={17}/>
        </div>
        {trend && <span className="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">{trend}</span>}
      </div>
      <div className="text-2xl font-bold mt-3 tabular-nums" style={{ color: accent ? '#0E5460' : '#1F2421' }}>{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mt-0.5">{label}</div>
      {sub && <div className="text-xs text-stone-500 mt-1.5">{sub}</div>}
    </Card>
  );
}

window.Dashboard = Dashboard;
