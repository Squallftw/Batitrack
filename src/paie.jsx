// Paie + Bon de paie
const { useState: usePaState, useMemo: usePaMemo } = React;

function computePayslip(ctx, workerId, year, monthIdx, half) {
  const w = OUVRIERS.find(o => o.id === workerId);
  const { start, end } = quinzaineRange(year, monthIdx, half);
  const qkey = quinzaineKey(year, monthIdx, half);
  const days = [];
  let joursPresents = 0;
  let brut = 0;
  const primes = [];
  for (let d = start; d <= end; d++) {
    const dk = dateKey(year, monthIdx, d);
    const c = ctx.pointage[workerId]?.[dk];
    days.push({ day: d, dk, c });
    if (c?.statut === 'P') {
      joursPresents++;
      brut += w.tarif;
      if (c.prime > 0) primes.push({ day: d, dk, amount: c.prime, motif: c.motif || 'Prime', chantierId: c.chantierId });
    }
  }
  const adj = ctx.adjustments[qkey]?.[workerId] || { avances: [], retenues: [] };
  const totalPrimes = primes.reduce((a,p) => a+p.amount, 0);
  const totalAvances = adj.avances.reduce((a,p) => a+p.montant, 0);
  const totalRetenues = adj.retenues.reduce((a,p) => a+p.montant, 0);
  const net = brut + totalPrimes - totalAvances - totalRetenues;
  return { worker: w, days, joursPresents, brut, primes, totalPrimes, avances: adj.avances, totalAvances, retenues: adj.retenues, totalRetenues, net };
}

function Paie({ ctx, onNav }) {
  const [selected, setSelected] = usePaState(null); // qkey
  const [previewWorker, setPreviewWorker] = usePaState(null);
  const [showPayModal, setShowPayModal] = usePaState(false);

  const quinzaines = [
    { year: 2026, monthIdx: 0,  half: 1 },
    { year: 2025, monthIdx: 11, half: 2 },
    { year: 2025, monthIdx: 11, half: 1 },
    { year: 2025, monthIdx: 10, half: 2 }
  ];

  if (selected) {
    const [y, m, h] = selected.split(/[-Q]/).filter(Boolean).map(Number);
    const q = { year: y, monthIdx: m-1, half: h };
    return <PaieDetail ctx={ctx} q={q} qkey={selected}
                       onBack={() => setSelected(null)}
                       previewWorker={previewWorker}
                       setPreviewWorker={setPreviewWorker}
                       showPayModal={showPayModal}
                       setShowPayModal={setShowPayModal}/>;
  }

  return (
    <div>
      <PageHeader title="Paie" subtitle="Bons de paie et règlements par quinzaine."/>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-stone-500 font-semibold" style={{ background:'#FAF7F1' }}>
              <th className="px-4 py-3">Période</th>
              <th className="px-4 py-3 text-center">Ouvriers</th>
              <th className="px-4 py-3 text-right">Total à payer</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {quinzaines.map(q => {
              const qkey = quinzaineKey(q.year, q.monthIdx, q.half);
              const state = ctx.qStates[qkey]?.state || 'En cours';
              let total = 0, count = 0;
              OUVRIERS.forEach(w => {
                const p = computePayslip(ctx, w.id, q.year, q.monthIdx, q.half);
                if (p.joursPresents > 0) { total += p.net; count++; }
              });
              return (
                <tr key={qkey} className="border-t hover:bg-stone-50" style={{ borderColor:'#F0EAE0' }}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-sm">{quinzaineLabel(q.year, q.monthIdx, q.half)}</div>
                    <div className="text-[11px] text-stone-500">
                      {(() => {
                        const r = quinzaineRange(q.year, q.monthIdx, q.half);
                        return `${frenchDate(q.year, q.monthIdx, r.start)} → ${frenchDate(q.year, q.monthIdx, r.end)}`;
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold tabular-nums">{count}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color:'#0E5460' }}>{formatMADCompact(total)}</td>
                  <td className="px-4 py-3"><StatusPill state={state}/></td>
                  <td className="px-4 py-3 text-right">
                    <Btn size="sm" onClick={() => setSelected(qkey)} icon={<Icons.Arrow size={12}/>}>Ouvrir</Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function PaieDetail({ ctx, q, qkey, onBack, previewWorker, setPreviewWorker, showPayModal, setShowPayModal }) {
  const state = ctx.qStates[qkey]?.state || 'En cours';
  const [expandedRow, setExpandedRow] = usePaState(null);

  const rows = OUVRIERS.map(w => computePayslip(ctx, w.id, q.year, q.monthIdx, q.half))
                       .filter(p => p.joursPresents > 0 || p.totalAvances || p.totalRetenues);

  const grandNet = rows.reduce((a,r) => a + r.net, 0);

  const lifecycleSteps = ['En cours', 'Clôturée', 'Payée'];
  const stepIdx = lifecycleSteps.indexOf(state);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-stone-500 hover:text-stone-800 inline-flex items-center gap-1.5">
        <Icons.ChevronLeft size={14}/> Retour à Paie
      </button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{quinzaineLabel(q.year, q.monthIdx, q.half)}</h1>
          <p className="text-stone-500 mt-1 text-sm">
            {(() => {
              const r = quinzaineRange(q.year, q.monthIdx, q.half);
              return `${frenchDate(q.year, q.monthIdx, r.start)} → ${frenchDate(q.year, q.monthIdx, r.end)} · ${rows.length} ouvriers`;
            })()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill state={state}/>
          {state === 'Clôturée' && (
            <Btn variant="primary" icon={<Icons.Check size={14}/>} onClick={() => setShowPayModal(true)}>
              Marquer comme Payée
            </Btn>
          )}
        </div>
      </div>

      {/* Lifecycle progress */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          {lifecycleSteps.map((s, i) => {
            const done = i <= stepIdx;
            const active = i === stepIdx;
            return (
              <React.Fragment key={s}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold`}
                       style={{ background: done ? '#0E5460' : '#F0EAE0', color: done ? '#fff' : '#998C75' }}>
                    {i < stepIdx ? <Icons.Check size={13}/> : i+1}
                  </div>
                  <span className={`text-sm ${active ? 'font-bold' : done ? 'text-stone-700' : 'text-stone-400'}`}>{s}</span>
                </div>
                {i < lifecycleSteps.length-1 && <div className="flex-1 h-px" style={{ background: i < stepIdx ? '#0E5460' : '#F0EAE0' }}/>}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Ouvriers" value={rows.length}/>
        <StatCard label="Total brut" value={formatMADCompact(rows.reduce((a,r)=>a+r.brut,0))}/>
        <StatCard label="Primes — Avances — Retenues" value={formatMADCompact(rows.reduce((a,r)=>a+r.totalPrimes-r.totalAvances-r.totalRetenues,0))}/>
        <StatCard label="Total à payer" value={formatMADCompact(grandNet)} accent/>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-stone-500 font-semibold" style={{ background:'#FAF7F1' }}>
                <th className="px-3 py-3">Ouvrier</th>
                <th className="px-2 py-3 text-center">Jours</th>
                <th className="px-2 py-3 text-right">Brut</th>
                <th className="px-2 py-3 text-right">Primes</th>
                <th className="px-2 py-3 text-right">Avances</th>
                <th className="px-2 py-3 text-right">Retenues</th>
                <th className="px-3 py-3 text-right">Net à payer</th>
                <th className="px-3 py-3 text-center">Statut</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <React.Fragment key={r.worker.id}>
                  <tr className="border-t hover:bg-stone-50" style={{ borderColor:'#F0EAE0' }}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar worker={r.worker} size={28}/>
                        <div>
                          <div className="font-semibold text-xs">{r.worker.nom}</div>
                          <div className="text-[10px] text-stone-500">{r.worker.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center tabular-nums">{r.joursPresents}</td>
                    <td className="px-2 py-3 text-right tabular-nums">{formatMADCompact(r.brut)}</td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      <button onClick={() => setExpandedRow(expandedRow === r.worker.id+'p' ? null : r.worker.id+'p')}
                              className="text-green-700 font-semibold hover:underline">
                        {r.totalPrimes > 0 ? `+${formatMADCompact(r.totalPrimes)}` : '—'}
                      </button>
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      <button onClick={() => setExpandedRow(expandedRow === r.worker.id+'a' ? null : r.worker.id+'a')}
                              className="font-semibold hover:underline" style={{ color:'#C58122' }}>
                        {r.totalAvances > 0 ? `−${formatMADCompact(r.totalAvances)}` : '—'}
                      </button>
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      <button onClick={() => setExpandedRow(expandedRow === r.worker.id+'r' ? null : r.worker.id+'r')}
                              className="font-semibold hover:underline" style={{ color:'#8A2C1E' }}>
                        {r.totalRetenues > 0 ? `−${formatMADCompact(r.totalRetenues)}` : '—'}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums" style={{ color:'#0E5460' }}>
                      {formatMADCompact(r.net)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded`} style={{
                        background: state === 'Payée' ? '#DDE8F4' : '#F0EAE0',
                        color: state === 'Payée' ? '#1F4E87' : '#6B6359'
                      }}>{state === 'Payée' ? 'Payé' : 'Non payé'}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => setPreviewWorker(r.worker.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900">
                        <Icons.Eye size={13}/>
                      </button>
                    </td>
                  </tr>
                  {expandedRow === r.worker.id+'p' && r.primes.length > 0 && (
                    <tr style={{ background:'#F6F9F4' }}><td colSpan={9} className="px-3 py-2">
                      <div className="text-[11px] font-semibold text-green-800 uppercase tracking-wider mb-1.5">Détail des primes</div>
                      <div className="space-y-1">
                        {r.primes.map(p => (
                          <div key={p.dk} className="flex items-center text-xs">
                            <span className="w-24 text-stone-600">{frenchDateShort(q.year, q.monthIdx, p.day)}</span>
                            <span className="flex-1">{p.motif}</span>
                            <span className="tabular-nums font-semibold">+{formatMADCompact(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </td></tr>
                  )}
                  {expandedRow === r.worker.id+'a' && (
                    <tr style={{ background:'#FCF5EC' }}><td colSpan={9} className="px-3 py-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider" style={{color:'#8A5114'}}>Avances</div>
                        <button className="text-[11px] font-semibold inline-flex items-center gap-1" style={{ color:'#8A5114' }}>
                          <Icons.Plus size={11}/> Ajouter une avance
                        </button>
                      </div>
                      <div className="space-y-1">
                        {r.avances.length === 0 && <div className="text-xs text-stone-400 italic">Aucune avance</div>}
                        {r.avances.map(a => (
                          <div key={a.id} className="flex items-center text-xs">
                            <span className="w-24 text-stone-600">{a.date.slice(8)} {MOIS_FR_SHORT[parseInt(a.date.slice(5,7))-1]}</span>
                            <span className="flex-1">{a.motif}</span>
                            <span className="tabular-nums font-semibold">−{formatMADCompact(a.montant)}</span>
                          </div>
                        ))}
                      </div>
                    </td></tr>
                  )}
                  {expandedRow === r.worker.id+'r' && (
                    <tr style={{ background:'#FCF1EE' }}><td colSpan={9} className="px-3 py-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider" style={{color:'#8A2C1E'}}>Retenues</div>
                        <button className="text-[11px] font-semibold inline-flex items-center gap-1" style={{ color:'#8A2C1E' }}>
                          <Icons.Plus size={11}/> Ajouter une retenue
                        </button>
                      </div>
                      <div className="space-y-1">
                        {r.retenues.length === 0 && <div className="text-xs text-stone-400 italic">Aucune retenue</div>}
                        {r.retenues.map(rt => (
                          <div key={rt.id} className="flex items-center text-xs">
                            <span className="flex-1">{rt.motif}</span>
                            <span className="tabular-nums font-semibold">−{formatMADCompact(rt.montant)}</span>
                          </div>
                        ))}
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
              <tr style={{ background:'#0E5460', color:'#fff' }}>
                <td className="px-3 py-3 font-bold uppercase text-xs tracking-wider" colSpan={6}>Total à payer</td>
                <td className="px-3 py-3 text-right font-bold text-lg tabular-nums">{formatMADCompact(grandNet)}</td>
                <td colSpan={2}/>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Audit log */}
      <details className="bg-white rounded-xl border" style={{ borderColor:'#E8E2D8' }}>
        <summary className="px-4 py-3 cursor-pointer font-semibold text-sm text-stone-700 inline-flex items-center gap-2">
          <Icons.History size={14}/> Historique des modifications ({ctx.audit.filter(a => a.qkey === qkey).length})
        </summary>
        <div className="px-4 pb-4 space-y-2">
          {ctx.audit.filter(a => a.qkey === qkey).map(e => {
            const w = OUVRIERS.find(o => o.id === e.workerId);
            return (
              <div key={e.id} className="text-xs text-stone-600 flex gap-4 py-1 border-t" style={{ borderColor:'#F0EAE0' }}>
                <span className="text-stone-400 w-24">{relativeTime(new Date(e.ts))}</span>
                <span className="font-semibold w-24">{e.user}</span>
                <span className="w-32">{w?.nom}</span>
                <span className="w-20">{e.field}</span>
                <span className="line-through text-stone-400">{e.oldVal}</span>
                <Icons.Arrow size={11} className="text-stone-400"/>
                <span className="font-medium">{e.newVal}</span>
              </div>
            );
          })}
          {ctx.audit.filter(a => a.qkey === qkey).length === 0 && (
            <div className="text-xs text-stone-400 italic py-2">Aucune modification enregistrée.</div>
          )}
        </div>
      </details>

      {previewWorker && (
        <BonDePaie payslip={computePayslip(ctx, previewWorker, q.year, q.monthIdx, q.half)}
                   q={q} onClose={() => setPreviewWorker(null)}/>
      )}

      {showPayModal && (
        <Modal title="Marquer la quinzaine comme Payée" onClose={() => setShowPayModal(false)}>
          <PayModal q={q} qkey={qkey} ctx={ctx} grandNet={grandNet} onClose={() => setShowPayModal(false)}/>
        </Modal>
      )}
    </div>
  );
}

function PayModal({ q, qkey, ctx, grandNet, onClose }) {
  const [method, setMethod] = usePaState('Espèces');
  const [date, setDate] = usePaState(new Date().toISOString().slice(0,10));
  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Toutes les fiches de paie de cette quinzaine seront marquées comme payées. Vous pourrez toujours modifier les détails après.
      </p>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Mode de paiement</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id:'Espèces', icon:'Cash' },
            { id:'Virement', icon:'Bank' },
            { id:'Chèque', icon:'Doc' }
          ].map(m => {
            const Ic = Icons[m.icon];
            const active = method === m.id;
            return (
              <button key={m.id} onClick={() => setMethod(m.id)}
                      className={`p-3 border rounded-lg text-sm font-semibold ${active ? 'shadow-sm' : 'text-stone-500'}`}
                      style={{ background: active ? '#D8E5E7' : 'white', borderColor: active ? '#0E5460' : '#E8E2D8', color: active ? '#0E5460' : undefined }}>
                <Ic size={18} className="mx-auto mb-1"/>
                {m.id}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Date de paiement</div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
               className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm"/>
      </div>
      <div className="bg-stone-50 rounded-lg p-3 flex items-baseline justify-between" style={{ background:'#FAF7F1' }}>
        <span className="text-sm text-stone-600">Total à régler</span>
        <span className="font-bold text-xl tabular-nums" style={{ color:'#0E5460' }}>{formatMADCompact(grandNet)}</span>
      </div>
      <div className="flex justify-end gap-2">
        <Btn onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" icon={<Icons.Check size={14}/>}
             onClick={() => { ctx.setQState(qkey, { state: 'Payée', paidDate: date, paidMethod: method }); onClose(); }}>
          Confirmer le règlement
        </Btn>
      </div>
    </div>
  );
}

// ─── Bon de paie ──────────────────────────────────────────────
function BonDePaie({ payslip, q, onClose }) {
  const { worker, days, joursPresents, brut, primes, totalPrimes, avances, totalAvances, retenues, totalRetenues, net } = payslip;
  const r = quinzaineRange(q.year, q.monthIdx, q.half);
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}/>
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
        <div className="bg-stone-100 px-4 py-2 rounded-t-xl flex items-center justify-between border-b" style={{ borderColor:'#E8E2D8' }}>
          <div className="text-sm font-semibold text-stone-700">Aperçu du bon de paie</div>
          <div className="flex items-center gap-2">
            <Btn size="sm" icon={<Icons.Download size={13}/>}>Télécharger PDF</Btn>
            <Btn size="sm" icon={<Icons.Print size={13}/>}>Imprimer</Btn>
            <button onClick={onClose} className="p-1 rounded hover:bg-stone-200"><Icons.X size={16}/></button>
          </div>
        </div>
        <div className="bg-white p-8 overflow-y-auto flex-1" style={{ fontFamily: '"Manrope", sans-serif' }}>
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b-2" style={{ borderColor:'#0E5460' }}>
            <div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white mb-2" style={{ background:'#0E5460' }}>
                <Icons.Logo size={22}/>
              </div>
              <div className="font-bold text-base">{COMPANY.name}</div>
              <div className="text-xs text-stone-500">{COMPANY.address}</div>
              <div className="text-xs text-stone-500">{COMPANY.phone} · {COMPANY.email}</div>
              <div className="text-[10px] text-stone-400 mt-1.5">
                ICE: {COMPANY.ice} · RC: {COMPANY.rc} · IF: {COMPANY.if}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Bon de paie · ورقة الأجر</div>
              <div className="text-xl font-bold mt-1">{quinzaineLabel(q.year, q.monthIdx, q.half).split('(')[0]}</div>
              <div className="text-xs text-stone-600 mt-0.5">{frenchDate(q.year, q.monthIdx, r.start)} → {frenchDate(q.year, q.monthIdx, r.end)}</div>
              <div className="text-[10px] text-stone-500 mt-1">N° {worker.id.toUpperCase().replace('-','')}-{q.year}{String(q.monthIdx+1).padStart(2,'0')}Q{q.half}</div>
            </div>
          </div>

          {/* Worker info */}
          <div className="grid grid-cols-3 gap-3 py-4 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Ouvrier · العامل</div>
              <div className="font-bold text-sm mt-0.5">{worker.nom}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">CIN</div>
              <div className="font-semibold text-sm mt-0.5">{worker.cin}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Poste · المنصب</div>
              <div className="font-semibold text-sm mt-0.5">{worker.role}</div>
            </div>
          </div>

          {/* Day-by-day */}
          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-2">Détail journalier · التفاصيل اليومية</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor:'#E8E2D8' }}>
                  <th className="text-left py-1.5 font-semibold w-16">Date</th>
                  <th className="text-left py-1.5 font-semibold">Chantier</th>
                  <th className="text-center py-1.5 font-semibold w-16">Statut</th>
                  <th className="text-right py-1.5 font-semibold w-20">Montant</th>
                </tr>
              </thead>
              <tbody>
                {days.map(d => {
                  const ch = d.c?.chantierId ? CHANTIERS.find(x => x.id === d.c.chantierId) : null;
                  return (
                    <tr key={d.day} className="border-b" style={{ borderColor:'#F5EFE3' }}>
                      <td className="py-1 tabular-nums text-stone-600">{String(d.day).padStart(2,'0')}/{String(q.monthIdx+1).padStart(2,'0')}</td>
                      <td className="py-1">{ch ? <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-sm" style={{ background: ch.color }}/>{ch.name}</span> : <span className="text-stone-400">—</span>}</td>
                      <td className="py-1 text-center">
                        {d.c ? <span className={`text-[10px] font-bold`} style={{ color: d.c.statut==='P'?'#1F6B3A':'#8A2C1E' }}>{d.c.statut === 'P' ? 'P' : 'A'}</span> : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="py-1 text-right tabular-nums">{d.c?.statut === 'P' ? formatMADCompact(worker.tarif) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
            <Line label={`Brut · ${joursPresents} jours × ${formatMADCompact(worker.tarif)}`} value={formatMADCompact(brut)}/>
            {primes.map(p => (
              <Line key={p.dk} label={`Prime · ${p.motif} (${String(p.day).padStart(2,'0')}/${String(q.monthIdx+1).padStart(2,'0')})`} value={`+${formatMADCompact(p.amount)}`} positive/>
            ))}
            {totalPrimes > 0 && <Line label="Sous-total après primes" value={formatMADCompact(brut + totalPrimes)} bold/>}
            {avances.map(a => (
              <Line key={a.id} label={`Avance · ${a.motif}`} value={`−${formatMADCompact(a.montant)}`} negative/>
            ))}
            {retenues.map(rt => (
              <Line key={rt.id} label={`Retenue · ${rt.motif}`} value={`−${formatMADCompact(rt.montant)}`} negative/>
            ))}
            <div className="pt-3 mt-3 border-t-2" style={{ borderColor:'#0E5460' }}>
              <div className="flex items-baseline justify-between">
                <span className="font-bold uppercase text-xs tracking-wider">Net à payer · الصافي</span>
                <span className="text-2xl font-bold tabular-nums" style={{ color:'#0E5460' }}>{formatMADCompact(net)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-10 pt-6">
            <div>
              <div className="border-t pt-2 text-xs" style={{ borderColor:'#1F2421' }}>
                <div className="font-semibold">Signature de l'employeur</div>
                <div className="text-[10px] text-stone-500" dir="rtl">توقيع رب العمل</div>
              </div>
            </div>
            <div>
              <div className="border-t pt-2 text-xs" style={{ borderColor:'#1F2421' }}>
                <div className="font-semibold">Signature de l'ouvrier</div>
                <div className="text-[10px] text-stone-500" dir="rtl">توقيع العامل</div>
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-stone-400 mt-8">
            Document généré par Batitrack · {frenchDate(2026, 0, 12)}
          </div>
        </div>
      </div>
    </>
  );
}

function Line({ label, value, positive, negative, bold }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={`text-xs ${bold ? 'font-bold' : 'text-stone-600'}`}>{label}</span>
      <span className={`tabular-nums font-semibold ${positive ? 'text-green-700' : negative ? 'text-red-700' : ''} ${bold ? 'font-bold' : ''}`}>{value}</span>
    </div>
  );
}

window.Paie = Paie;
window.computePayslip = computePayslip;
