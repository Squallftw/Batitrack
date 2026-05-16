// Chantiers, Ouvriers, Paramètres screens
const { useState: useExState, useMemo: useExMemo } = React;

// ─── CHANTIERS ────────────────────────────────────────────────
function Chantiers({ ctx, openId, setOpenId }) {
  if (openId) return <ChantierDetail ctx={ctx} id={openId} onBack={() => setOpenId(null)}/>;

  const spent = useExMemo(() => {
    const m = {};
    CHANTIERS.forEach(c => m[c.id] = 0);
    Object.entries(ctx.pointage).forEach(([wid, days]) => {
      const w = OUVRIERS.find(o => o.id === wid);
      Object.values(days).forEach(c => {
        if (c.statut === 'P') m[c.chantierId] = (m[c.chantierId]||0) + w.tarif + (c.prime||0);
      });
    });
    return m;
  }, [ctx.pointage]);

  return (
    <div>
      <PageHeader title="Chantiers" subtitle={`${CHANTIERS.length} chantiers actifs`}
                  right={<Btn variant="primary" icon={<Icons.Plus size={14}/>}>Nouveau chantier</Btn>}/>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {CHANTIERS.map(c => {
          const sp = spent[c.id] || 0;
          const pct = (sp / c.budgetMO) * 100;
          const color = pct > 100 ? '#C25B3F' : pct > 80 ? '#C58122' : '#2E9152';
          const status = pct > 100 ? 'Dépassement' : pct > 80 ? 'À surveiller' : 'Conforme';
          return (
            <Card key={c.id} className="overflow-hidden cursor-pointer hover:shadow-md transition" onClick={() => setOpenId(c.id)}>
              {/* Header band with subtle motif */}
              <div className="h-20 relative overflow-hidden" style={{ background: c.color }}>
                <svg className="absolute inset-0 w-full h-full opacity-15" preserveAspectRatio="none">
                  <pattern id={`p-${c.id}`} width="22" height="22" patternUnits="userSpaceOnUse">
                    <path d="M11 0 L22 11 L11 22 L0 11 Z" fill="none" stroke="white" strokeWidth="0.6"/>
                  </pattern>
                  <rect width="100%" height="100%" fill={`url(#p-${c.id})`}/>
                </svg>
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <div className="text-white">
                    <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80">{c.type}</div>
                    <div className="font-bold">{c.name}</div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/90" style={{ color }}>{status}</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="text-xs">
                  <div className="text-stone-500">Client</div>
                  <div className="font-semibold">{c.client}</div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-xs text-stone-500">Main d'œuvre dépensée</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color }}>{Math.round(pct)}%</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: Math.min(100,pct)+'%', background: color }}/>
                  </div>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="font-bold tabular-nums">{formatMADCompact(sp)}</span>
                    <span className="text-xs text-stone-500 tabular-nums">/ {formatMADCompact(c.budgetMO)} budgétés</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ChantierDetail({ ctx, id, onBack }) {
  const c = CHANTIERS.find(x => x.id === id);
  const data = useExMemo(() => {
    // per-quinzaine breakdown
    const byQ = {};
    const byWorker = {};
    let total = 0;
    let totalDays = 0;
    Object.entries(ctx.pointage).forEach(([wid, days]) => {
      const w = OUVRIERS.find(o => o.id === wid);
      Object.entries(days).forEach(([dk, ce]) => {
        if (ce.statut !== 'P' || ce.chantierId !== id) return;
        const cost = w.tarif + (ce.prime||0);
        total += cost; totalDays++;
        const { year, monthIdx, day } = parseDateKey(dk);
        const half = day <= 15 ? 1 : 2;
        const qkey = quinzaineKey(year, monthIdx, half);
        if (!byQ[qkey]) byQ[qkey] = { label: quinzaineLabel(year, monthIdx, half), days: 0, cost: 0, year, monthIdx, half };
        byQ[qkey].days++; byQ[qkey].cost += cost;
        if (!byWorker[wid]) byWorker[wid] = { w, days: 0, cost: 0 };
        byWorker[wid].days++; byWorker[wid].cost += cost;
      });
    });
    return { byQ: Object.values(byQ).sort((a,b)=>(b.year-a.year)||(b.monthIdx-a.monthIdx)||(b.half-a.half)),
             byWorker: Object.values(byWorker).sort((a,b)=>b.cost-a.cost),
             total, totalDays };
  }, [ctx.pointage, id]);

  const pct = (data.total / c.budgetMO) * 100;
  const color = pct > 100 ? '#C25B3F' : pct > 80 ? '#C58122' : '#2E9152';

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-stone-500 hover:text-stone-800 inline-flex items-center gap-1.5">
        <Icons.ChevronLeft size={14}/> Retour aux chantiers
      </button>
      <div className="rounded-xl overflow-hidden border" style={{ borderColor:'#E8E2D8' }}>
        <div className="h-28 relative" style={{ background: c.color }}>
          <svg className="absolute inset-0 w-full h-full opacity-15" preserveAspectRatio="none">
            <pattern id="pd" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M15 0 L30 15 L15 30 L0 15 Z" fill="none" stroke="white" strokeWidth="0.8"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#pd)"/>
          </svg>
        </div>
        <div className="bg-white p-5 -mt-12 relative">
          <div className="flex items-end justify-between flex-wrap gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-white bg-black/40 px-2 py-1 rounded">{c.type}</span>
              <h1 className="text-2xl font-bold mt-2">{c.name}</h1>
              <div className="text-sm text-stone-500 mt-0.5">{c.client} · {c.address}</div>
            </div>
            <div className="flex gap-2">
              <Btn icon={<Icons.Edit size={13}/>}>Modifier</Btn>
              <Btn variant="primary" icon={<Icons.Plus size={13}/>}>Ajouter du budget</Btn>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-stone-50 rounded-xl p-5" style={{ background:'#FAF7F1' }}>
              <div className="text-[11px] uppercase tracking-wider text-stone-500 font-bold">Coût main d'œuvre à ce jour</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold tabular-nums" style={{ color:'#0E5460' }}>{formatMADCompact(data.total)}</span>
                <span className="text-stone-400 text-sm">/ {formatMADCompact(c.budgetMO)} budgétés</span>
              </div>
              <div className="h-2.5 bg-stone-200 rounded-full overflow-hidden mt-4">
                <div className="h-full rounded-full" style={{ width: Math.min(100,pct)+'%', background: color }}/>
              </div>
              <div className="flex items-baseline justify-between mt-2 text-xs">
                <span className="text-stone-600 font-semibold">{Math.round(pct)}% consommé · {data.totalDays} jours-ouvrier</span>
                {pct > 100 && <span className="font-bold" style={{ color }}>Dépassement: {formatMADCompact(data.total - c.budgetMO)}</span>}
              </div>
            </div>
            <div className="space-y-3">
              <div className="bati-card p-3">
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Période</div>
                <div className="text-sm font-semibold mt-0.5">{c.dateStart.slice(8)}/{c.dateStart.slice(5,7)} → {c.dateEndPrev.slice(8)}/{c.dateEndPrev.slice(5,7)}</div>
              </div>
              <div className="bati-card p-3">
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Ouvriers ayant participé</div>
                <div className="text-sm font-semibold mt-0.5">{data.byWorker.length} ouvriers</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cumulative chart */}
      <Card className="p-4">
        <h3 className="font-bold text-sm mb-3">Coût cumulé vs budget</h3>
        <CumChart data={data.byQ} budget={c.budgetMO} color={c.color}/>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b font-bold text-sm" style={{ borderColor:'#F0EAE0' }}>Par quinzaine</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-stone-500" style={{ background:'#FAF7F1' }}>
                <th className="px-3 py-2 text-left">Quinzaine</th>
                <th className="px-3 py-2 text-center">Jours</th>
                <th className="px-3 py-2 text-right">Coût</th>
              </tr>
            </thead>
            <tbody>
              {data.byQ.map(q => (
                <tr key={q.label} className="border-t" style={{ borderColor:'#F0EAE0' }}>
                  <td className="px-3 py-2 font-medium">{q.label}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{q.days}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatMADCompact(q.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b font-bold text-sm" style={{ borderColor:'#F0EAE0' }}>Contribution par ouvrier</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-stone-500" style={{ background:'#FAF7F1' }}>
                <th className="px-3 py-2 text-left">Ouvrier</th>
                <th className="px-3 py-2 text-center">Jours</th>
                <th className="px-3 py-2 text-right">Coût attribué</th>
              </tr>
            </thead>
            <tbody>
              {data.byWorker.map(b => (
                <tr key={b.w.id} className="border-t" style={{ borderColor:'#F0EAE0' }}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar worker={b.w} size={22}/>
                      <div>
                        <div className="font-semibold text-xs">{b.w.nom}</div>
                        <div className="text-[10px] text-stone-500">{b.w.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">{b.days}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatMADCompact(b.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function CumChart({ data, budget, color }) {
  if (data.length === 0) return <div className="text-stone-400 text-sm">Aucune donnée</div>;
  const sorted = [...data].reverse();
  let cum = 0;
  const pts = sorted.map(d => { cum += d.cost; return { label: d.label.split(' (')[0], cum }; });
  const max = Math.max(budget * 1.05, ...pts.map(p => p.cum));
  const w = 600, h = 160, pad = 30;
  const x = (i) => pad + (i/(Math.max(1,pts.length-1))) * (w - 2*pad);
  const y = (v) => h - pad - (v/max) * (h - 2*pad);
  const linePath = pts.map((p, i) => `${i===0?'M':'L'}${x(i)},${y(p.cum)}`).join(' ');
  const areaPath = `${linePath} L${x(pts.length-1)},${y(0)} L${x(0)},${y(0)} Z`;
  const budgetY = y(budget);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <line x1={pad} y1={budgetY} x2={w-pad} y2={budgetY} stroke="#C25B3F" strokeDasharray="4 3" strokeWidth="1.5"/>
      <text x={w-pad} y={budgetY-4} textAnchor="end" fontSize="9" fill="#C25B3F" fontWeight="700">Budget {formatMADCompact(budget)}</text>
      <path d={areaPath} fill="url(#grad)"/>
      <path d={linePath} fill="none" stroke={color} strokeWidth="2"/>
      {pts.map((p,i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.cum)} r="3" fill="#fff" stroke={color} strokeWidth="2"/>
          <text x={x(i)} y={h-10} textAnchor="middle" fontSize="9" fill="#6B6359" fontWeight="500">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── OUVRIERS ─────────────────────────────────────────────────
function Ouvriers({ ctx, openId, setOpenId }) {
  if (openId) return <OuvrierDetail ctx={ctx} id={openId} onBack={() => setOpenId(null)}/>;

  const stats = useExMemo(() => {
    const m = {};
    OUVRIERS.forEach(w => {
      m[w.id] = { days: 0, cost: 0 };
      Object.entries(ctx.pointage[w.id]||{}).forEach(([dk, c]) => {
        const { monthIdx, year } = parseDateKey(dk);
        if (year === TODAY.year && monthIdx === TODAY.monthIdx && c.statut === 'P') {
          m[w.id].days++;
          m[w.id].cost += w.tarif + (c.prime || 0);
        }
      });
    });
    return m;
  }, [ctx.pointage]);

  const [showAdd, setShowAdd] = useExState(false);
  const [filterRole, setFilterRole] = useExState('all');

  const filteredWorkers = OUVRIERS.filter(w => filterRole === 'all' || w.role === filterRole);

  return (
    <div>
      <PageHeader title="Ouvriers" subtitle={`${filteredWorkers.length} ouvrier${filteredWorkers.length>1?'s':''} actif${filteredWorkers.length>1?'s':''}`}
                  right={<>
                    <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                            className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm">
                      <option value="all">Tous les rôles</option>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <Btn variant="primary" icon={<Icons.Plus size={14}/>} onClick={() => setShowAdd(true)}>Ajouter un ouvrier</Btn>
                  </>}/>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-stone-500 font-semibold" style={{ background:'#FAF7F1' }}>
              <th className="px-3 py-3">Ouvrier</th>
              <th className="px-3 py-3">Rôle</th>
              <th className="px-3 py-3">Téléphone</th>
              <th className="px-3 py-3">Date d'embauche</th>
              <th className="px-3 py-3 text-right">Tarif/jour</th>
              <th className="px-3 py-3 text-center">Statut</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkers.map(w => (
              <tr key={w.id} className="border-t hover:bg-stone-50 cursor-pointer" style={{ borderColor:'#F0EAE0' }}
                  onClick={() => setOpenId(w.id)}>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar worker={w} size={32}/>
                    <div>
                      <div className="font-semibold text-sm">{w.nom}</div>
                      <div className="text-[10px] text-stone-500">CIN {w.cin}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs">{w.role}</td>
                <td className="px-3 py-2.5 text-xs text-stone-600 tabular-nums">{w.phone}</td>
                <td className="px-3 py-2.5 text-xs text-stone-600 tabular-nums">{w.dateEmbauche.slice(8)}/{w.dateEmbauche.slice(5,7)}/{w.dateEmbauche.slice(0,4)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{formatMADCompact(w.tarif)}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-800 bg-green-50 px-1.5 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600"/> Actif
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-stone-300"><Icons.ChevronRight size={14}/></td>
              </tr>
            ))}
            {filteredWorkers.length === 0 && (
              <tr><td colSpan={7}>
                <EmptyState icon={<Icons.Search size={20}/>} title="Aucun ouvrier ne correspond"
                            hint="Ajustez le rôle sélectionné."/>
              </td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {showAdd && (
        <Modal title="Ajouter un ouvrier" onClose={() => setShowAdd(false)}>
          <AddWorkerForm onClose={() => setShowAdd(false)}/>
        </Modal>
      )}
    </div>
  );
}

function AddWorkerForm({ onClose }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom complet"><input className="bati-input" placeholder="Mohamed Naciri"/></Field>
        <Field label="Téléphone"><input className="bati-input" placeholder="06XX XX XX XX"/></Field>
        <Field label="Rôle">
          <select className="bati-input">{ROLES.map(r => <option key={r}>{r}</option>)}</select>
        </Field>
        <Field label="Tarif journalier (DH)"><input type="number" className="bati-input" placeholder="250"/></Field>
        <Field label="CIN (optionnel)"><input className="bati-input" placeholder="BK 145872"/></Field>
        <Field label="Date d'embauche"><input type="date" className="bati-input"/></Field>
      </div>
      <Field label="Photo">
        <div className="border-2 border-dashed rounded-lg p-4 text-center text-xs text-stone-500" style={{ borderColor:'#E8E2D8' }}>
          Glissez une photo ou <span className="text-stone-800 underline cursor-pointer">parcourez</span>
        </div>
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Btn onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" onClick={onClose}>Ajouter</Btn>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-1">{label}</div>
      {children}
    </div>
  );
}

function OuvrierDetail({ ctx, id, onBack }) {
  const w = OUVRIERS.find(x => x.id === id);
  const cq = currentQuinzaine();
  const { start, end } = quinzaineRange(cq.year, cq.monthIdx, cq.half);
  const days = [];
  for (let d = start; d <= end; d++) days.push(d);

  // Primes received (worker-level info)
  const primesRecues = [];
  Object.entries(ctx.pointage[id] || {}).forEach(([dk, c]) => {
    if (c.prime > 0) {
      const { year, monthIdx, day } = parseDateKey(dk);
      primesRecues.push({ date: frenchDate(year, monthIdx, day), montant: c.prime, motif: c.motif });
    }
  });

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-stone-500 hover:text-stone-800 inline-flex items-center gap-1.5">
        <Icons.ChevronLeft size={14}/> Retour aux ouvriers
      </button>

      <Card className="p-5">
        <div className="flex items-start gap-4">
          <Avatar worker={w} size={64}/>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{w.nom}</h1>
            <div className="text-stone-500 text-sm">{w.role}</div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Tarif journalier</div>
                <div className="font-bold text-base text-stone-900 mt-0.5">{formatMADCompact(w.tarif)}</div>
                <div className="text-[10px] text-stone-400">Depuis le 01/01/2025 (était 240 DH)</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Téléphone</div>
                <div className="font-semibold mt-0.5 tabular-nums">{w.phone}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">CIN</div>
                <div className="font-semibold mt-0.5">{w.cin}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Embauché le</div>
                <div className="font-semibold mt-0.5">{w.dateEmbauche.slice(8)}/{w.dateEmbauche.slice(5,7)}/{w.dateEmbauche.slice(0,4)}</div>
              </div>
            </div>
          </div>
          <Btn icon={<Icons.Edit size={13}/>}>Modifier</Btn>
        </div>
      </Card>

      {primesRecues.length > 0 && (
        <Card className="p-4">
          <h3 className="font-bold text-sm mb-3">Primes reçues</h3>
          <div className="space-y-1 text-xs">
            {primesRecues.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b" style={{ borderColor:'#F0EAE0' }}>
                <span className="text-stone-600 w-32">{p.date}</span>
                <span className="flex-1">{p.motif || '—'}</span>
                <span className="font-semibold text-green-700 tabular-nums">+{formatMADCompact(p.montant)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── PARAMÈTRES ───────────────────────────────────────────────
function Parametres({ ctx }) {
  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader title="Paramètres" subtitle="Société, abonnement, équipe et préférences."/>

      <Card className="p-5">
        <h2 className="font-bold mb-4">Informations de l'entreprise</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Raison sociale"><input className="bati-input" defaultValue={COMPANY.name}/></Field>
          <Field label="ICE"><input className="bati-input" defaultValue={COMPANY.ice}/></Field>
          <Field label="Registre de commerce (RC)"><input className="bati-input" defaultValue={COMPANY.rc}/></Field>
          <Field label="Identifiant fiscal (IF)"><input className="bati-input" defaultValue={COMPANY.if}/></Field>
          <Field label="Adresse"><input className="bati-input" defaultValue={COMPANY.address}/></Field>
          <Field label="Téléphone"><input className="bati-input" defaultValue={COMPANY.phone}/></Field>
        </div>
        <div className="mt-4">
          <Field label="Logo">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg flex items-center justify-center text-white border-2 border-dashed" style={{ background:'#0E5460', borderColor:'#E8E2D8' }}>
                <Icons.Logo size={28}/>
              </div>
              <Btn size="sm">Téléverser un logo</Btn>
            </div>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-1">Abonnement Batitrack</h2>
        <p className="text-xs text-stone-500 mb-4">14 jours d'essai gratuit — pas de carte requise.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PlanCard name="Démarrage" price="199" features={['Jusqu\'à 10 ouvriers', '2 chantiers', 'Pointage et paie']}/>
          <PlanCard name="Pro" price="499" current features={['Jusqu\'à 50 ouvriers', 'Chantiers illimités', 'Exports PDF/Excel', 'Audit log complet']}/>
          <PlanCard name="Entreprise" price="1 299" features={['Ouvriers et chantiers illimités', 'Multi-sociétés', 'Support prioritaire', 'API et intégrations']}/>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-4">Paie</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Décalage de la date de paie">
            <select className="bati-input"><option>1 jour après clôture</option><option>2 jours après clôture</option><option>Le jour même</option></select>
          </Field>
          <Field label="Langue de l'interface">
            <select className="bati-input"><option>Français</option><option>العربية</option></select>
          </Field>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-5 border-b" style={{ borderColor:'#F0EAE0' }}>
          <h2 className="font-bold">Permissions et rôles</h2>
          <p className="text-xs text-stone-500 mt-0.5">Définissez ce que chaque membre de votre équipe peut voir et modifier.</p>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background:'#FAF7F1' }} className="text-left uppercase tracking-wider text-stone-500 text-[10px] font-bold">
              <th className="px-4 py-2.5">Action</th>
              <th className="px-2 py-2.5 text-center">Patron</th>
              <th className="px-2 py-2.5 text-center">Conducteur</th>
              <th className="px-2 py-2.5 text-center">Chef de chantier</th>
              <th className="px-2 py-2.5 text-center">Comptable</th>
              <th className="px-2 py-2.5 text-center">Ouvrier</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Voir le tableau de bord',      [1,1,1,1,0]],
              ['Pointer les ouvriers',         [1,1,1,0,0]],
              ['Modifier après clôture',       [1,1,0,0,0]],
              ['Voir les bons de paie',        [1,1,0,1,'self']],
              ['Régler une quinzaine',         [1,0,0,1,0]],
              ['Gérer les ouvriers',           [1,1,0,0,0]],
              ['Modifier les paramètres',      [1,0,0,0,0]]
            ].map(([label, perms]) => (
              <tr key={label} className="border-t" style={{ borderColor:'#F0EAE0' }}>
                <td className="px-4 py-2 font-medium">{label}</td>
                {perms.map((p, i) => (
                  <td key={i} className="px-2 py-2 text-center">
                    {p === 1 ? <Icons.Check size={14} className="inline" style={{ color:'#2E9152' }}/>
                     : p === 'self' ? <span className="text-[10px] font-semibold text-stone-500">Soi-même</span>
                     : <span className="text-stone-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function PlanCard({ name, price, features, current }) {
  return (
    <div className={`relative rounded-xl p-4 border-2`} style={{ borderColor: current ? '#0E5460' : '#E8E2D8', background: current ? '#FAF7F1' : 'white' }}>
      {current && <span className="absolute -top-2.5 left-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white" style={{ background:'#0E5460' }}>Plan actif</span>}
      <div className="font-bold text-base">{name}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums">{price}</span>
        <span className="text-xs text-stone-500">DH / mois</span>
      </div>
      <ul className="mt-3 space-y-1.5 text-xs text-stone-600">
        {features.map(f => (
          <li key={f} className="flex items-start gap-1.5">
            <Icons.Check size={12} className="mt-0.5 flex-shrink-0" style={{ color:'#0E5460' }}/>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {!current && <Btn size="sm" className="mt-3 w-full">Choisir ce plan</Btn>}
    </div>
  );
}

Object.assign(window, { Chantiers, Ouvriers, Parametres });
