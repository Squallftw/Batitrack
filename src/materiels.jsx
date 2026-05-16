// Matériels — equipment inventory with deployment calendar
const { useState: useMtState, useMemo: useMtMemo, useEffect: useMtEff } = React;

// Categories with colors
const CATEGORIES = {
  'engins':    { label: 'Engins lourds',       color: '#0E5460', soft: '#D8E5E7', icon: 'Chantier' },
  'beton':     { label: 'Béton & vibration',   color: '#7C5E2A', soft: '#EBE3CC', icon: 'Building' },
  'energie':   { label: 'Énergie & fluides',   color: '#C58122', soft: '#FBEBD3', icon: 'TrendUp' },
  'coffrage':  { label: 'Coffrage & étais',    color: '#C25B3F', soft: '#F2DCD3', icon: 'Building' },
  'vehicules': { label: 'Véhicules',           color: '#5B6E7F', soft: '#E0E5EA', icon: 'Chantier' },
  'outils':    { label: 'Outillage',           color: '#7B6685', soft: '#E5DCEA', icon: 'Edit' }
};

// Helper: generate seed deployment periods centered around TODAY
function seedPeriods(snapshot) {
  // snapshot: { chantierId: qty }
  // produce periods: each chantier gets 1-2 periods around today
  const out = [];
  let id = 1;
  Object.entries(snapshot).forEach(([cid, qty]) => {
    // 3 months back to 3 months forward
    out.push({
      id: `dep-${cid}-${id++}`,
      chantierId: cid,
      start: '2026-03-01',
      end: '2026-06-30',
      qty
    });
  });
  return out;
}

const MATERIELS_SEED = [
  // Engins lourds — typically rented in Morocco
  { id: 'mt-1',  name: 'Grues mobiles',           cat: 'engins',    type: 'loue',    qty: 2,    cost: 1200, deployments: seedPeriods({ 'ch-1': 1 }) },
  { id: 'mt-2',  name: 'Pelles excavatrices',     cat: 'engins',    type: 'loue',    qty: 2,    cost: 1500, deployments: [
    { id:'d1', chantierId:'ch-2', start:'2025-09-01', end:'2026-02-28', qty:1 },
    { id:'d2', chantierId:'ch-2', start:'2026-04-01', end:'2026-06-30', qty:1 }
  ]},
  { id: 'mt-3',  name: 'Camions bennes',          cat: 'engins',    type: 'loue',    qty: 3,    cost: 800,  deployments: [
    { id:'d3', chantierId:'ch-2', start:'2026-02-01', end:'2026-06-30', qty:2 },
    { id:'d4', chantierId:'ch-3', start:'2025-11-15', end:'2026-01-15', qty:1 }
  ]},
  { id: 'mt-4',  name: 'Dumpers',                 cat: 'engins',    type: 'loue',    qty: 2,    cost: 600,  deployments: seedPeriods({ 'ch-2': 1 }) },
  { id: 'mt-5',  name: 'Compacteurs',             cat: 'engins',    type: 'loue',    qty: 2,    cost: 500,  deployments: [
    { id:'d5', chantierId:'ch-1', start:'2025-11-20', end:'2025-12-15', qty:1 },
    { id:'d6', chantierId:'ch-2', start:'2025-10-01', end:'2025-12-31', qty:1 }
  ]},
  { id: 'mt-6',  name: 'Élévateurs',              cat: 'engins',    type: 'loue',    qty: 2,    cost: 700,  deployments: seedPeriods({ 'ch-1': 1 }) },

  // Béton & vibration — centrale rented, bétonnières/vibreurs owned
  { id: 'mt-7',  name: 'Centrales à béton',       cat: 'beton',     type: 'loue',    qty: 1,    cost: 2500, deployments: seedPeriods({ 'ch-2': 1 }) },
  { id: 'mt-8',  name: 'Bétonnières',             cat: 'beton',     type: 'possede', qty: 4,    cost: 250,  deployments: [
    { id:'d7', chantierId:'ch-1', start:'2026-03-15', end:'2026-06-30', qty:1 },
    { id:'d8', chantierId:'ch-3', start:'2026-02-01', end:'2026-05-31', qty:1 }
  ]},
  { id: 'mt-9',  name: 'Vibreurs à essence',      cat: 'beton',     type: 'possede', qty: 5,    cost: 80,   deployments: [
    { id:'d9',  chantierId:'ch-1', start:'2026-01-15', end:'2026-06-30', qty:2 },
    { id:'d10', chantierId:'ch-2', start:'2026-02-01', end:'2026-06-30', qty:1 }
  ]},
  { id: 'mt-10', name: 'Vibreurs à air comprimé', cat: 'beton',     type: 'possede', qty: 3,    cost: 100,  deployments: seedPeriods({ 'ch-2': 1 }) },

  // Énergie & fluides — compresseurs owned, groupes électrogènes rented
  { id: 'mt-11', name: 'Compresseurs',            cat: 'energie',   type: 'possede', qty: 4,    cost: 350,  deployments: [
    { id:'d11', chantierId:'ch-1', start:'2026-01-15', end:'2026-06-30', qty:1 },
    { id:'d12', chantierId:'ch-2', start:'2025-10-01', end:'2026-06-30', qty:1 }
  ]},
  { id: 'mt-12', name: 'Groupes motopompes',      cat: 'energie',   type: 'possede', qty: 2,    cost: 200,  deployments: seedPeriods({ 'ch-2': 1 }) },
  { id: 'mt-13', name: 'Groupes électrogènes',    cat: 'energie',   type: 'loue',    qty: 2,    cost: 450,  deployments: [
    { id:'d13', chantierId:'ch-1', start:'2025-11-01', end:'2026-06-30', qty:1 },
    { id:'d14', chantierId:'ch-3', start:'2025-12-01', end:'2026-04-30', qty:1 }
  ]},

  // Coffrage & étais — typically rented from coffrage suppliers
  { id: 'mt-14', name: 'Tours pall',              cat: 'coffrage',  type: 'loue',    qty: 100,  cost: 15,   deployments: [
    { id:'d15', chantierId:'ch-1', start:'2025-12-01', end:'2026-05-15', qty:40 },
    { id:'d16', chantierId:'ch-2', start:'2025-10-15', end:'2026-06-30', qty:30 }
  ]},
  { id: 'mt-15', name: 'Étais',                   cat: 'coffrage',  type: 'possede', qty: 1000, cost: 2,    deployments: [
    { id:'d17', chantierId:'ch-1', start:'2025-11-20', end:'2026-06-30', qty:320 },
    { id:'d18', chantierId:'ch-2', start:'2025-09-15', end:'2026-06-30', qty:280 },
    { id:'d19', chantierId:'ch-3', start:'2025-11-15', end:'2026-04-30', qty:90 }
  ]},
  { id: 'mt-16', name: 'Échafaudage métallique',  cat: 'coffrage',  type: 'loue',    qty: null, unit: 'm²', cost: 25,   deployments: [
    { id:'d20', chantierId:'ch-2', start:'2026-02-01', end:'2026-06-30', qty:1 },
    { id:'d21', chantierId:'ch-3', start:'2026-01-15', end:'2026-04-30', qty:1 }
  ]},

  // Véhicules — fleet owned
  { id: 'mt-17', name: 'Véhicules de service',    cat: 'vehicules', type: 'possede', qty: 4,    cost: 250,  deployments: [
    { id:'d22', chantierId:'ch-1', start:'2025-10-15', end:'2026-08-31', qty:1 },
    { id:'d23', chantierId:'ch-2', start:'2025-09-01', end:'2026-08-31', qty:1 },
    { id:'d24', chantierId:'ch-3', start:'2025-11-10', end:'2026-04-30', qty:1 }
  ]},

  // Outillage — owned
  { id: 'mt-18', name: 'Cisailles',               cat: 'outils',    type: 'possede', qty: 10,   cost: 50,   deployments: [
    { id:'d25', chantierId:'ch-1', start:'2025-11-20', end:'2026-06-30', qty:3 },
    { id:'d26', chantierId:'ch-2', start:'2025-09-15', end:'2026-06-30', qty:4 }
  ]},
  { id: 'mt-19', name: 'Petit matériel & outillage', cat: 'outils', type: 'possede', qty: null, unit: 'lot', cost: 120,  deployments: [
    { id:'d27', chantierId:'ch-1', start:'2025-10-15', end:'2026-08-31', qty:1 },
    { id:'d28', chantierId:'ch-2', start:'2025-09-01', end:'2026-08-31', qty:1 },
    { id:'d29', chantierId:'ch-3', start:'2025-11-10', end:'2026-04-30', qty:1 }
  ]}
];

// Helpers
function parseISO(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function isoDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

function deploymentOnDate(item, dateStr) {
  // returns { [chantierId]: qty } for that day
  const out = {};
  (item.deployments || []).forEach(d => {
    if (dateStr >= d.start && dateStr <= d.end) {
      out[d.chantierId] = (out[d.chantierId] || 0) + d.qty;
    }
  });
  return out;
}

function totalDeployedOn(item, dateStr) {
  return Object.values(deploymentOnDate(item, dateStr)).reduce((a,b)=>a+b,0);
}

// ─── Main list ─────────────────────────────────────────────────
function Materiels({ ctx }) {
  const [items, setItems] = useMtState(() => {
    const ud = window.__BATI_USER_DATA;
    if (ud && Object.prototype.hasOwnProperty.call(ud, 'materiels')) {
      return JSON.parse(JSON.stringify(ud.materiels || []));
    }
    return window.__BATI_DEMO_MODE === true
      ? JSON.parse(JSON.stringify(MATERIELS_SEED))
      : [];
  });
  // Persist materiels to Supabase via the shared saver
  React.useEffect(() => {
    if (window.__BATI_SAVER && window.__BATI_PERSIST_PATCH) {
      window.__BATI_PERSIST_PATCH({ materiels: items });
    }
  }, [items]);
  const [filterType, setFilterType] = useMtState('all');
  const [filterCat, setFilterCat] = useMtState('all');
  const [filterChantier, setFilterChantier] = useMtState('all');
  const [search, setSearch] = useMtState('');
  const [showAdd, setShowAdd] = useMtState(false);
  const [openItem, setOpenItem] = useMtState(null);
  const [editingDetails, setEditingDetails] = useMtState(null);

  const todayStr = isoDate(new Date(TODAY.year, TODAY.monthIdx, TODAY.day));

  const stats = useMtMemo(() => {
    let totalUnits = 0, deployedUnits = 0, dailyCostTheoric = 0, dailyCostDeployed = 0;
    const perChantier = {};
    CHANTIERS.forEach(c => perChantier[c.id] = 0);
    items.forEach(m => {
      const todayDep = deploymentOnDate(m, todayStr);
      const used = Object.values(todayDep).reduce((a,b)=>a+b,0);
      const qty = m.qty || used;
      totalUnits += qty;
      deployedUnits += used;
      dailyCostTheoric += qty * m.cost;
      dailyCostDeployed += used * m.cost;
      Object.entries(todayDep).forEach(([cid, n]) => {
        perChantier[cid] = (perChantier[cid] || 0) + n * m.cost;
      });
    });
    return { totalUnits, deployedUnits, dailyCostTheoric, dailyCostDeployed, perChantier };
  }, [items, todayStr]);

  const filtered = items.filter(m => {
    if (filterType !== 'all' && (m.type || 'loue') !== filterType) return false;
    if (filterCat !== 'all' && m.cat !== filterCat) return false;
    if (filterChantier !== 'all' && !deploymentOnDate(m, todayStr)[filterChantier]) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = {};
  filtered.forEach(m => { (grouped[m.cat] = grouped[m.cat] || []).push(m); });

  function saveItem(updated) {
    setItems(prev => {
      const exists = prev.some(m => m.id === updated.id);
      if (exists) return prev.map(m => m.id === updated.id ? updated : m);
      return [...prev, updated];
    });
  }
  function deleteItem(id) {
    setItems(prev => prev.filter(m => m.id !== id));
    setOpenItem(null); setEditingDetails(null);
  }
  function updateDeployments(itemId, deployments) {
    setItems(prev => prev.map(m => m.id === itemId ? { ...m, deployments } : m));
    setOpenItem(prev => prev && prev.id === itemId ? { ...prev, deployments } : prev);
  }

  return (
    <div>
      <PageHeader title="Matériels"
                  subtitle="Inventaire, déploiement et coût d'utilisation journalier."
                  right={<>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                            className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm">
                      <option value="all">Tous types</option>
                      <option value="loue">Loué</option>
                      <option value="possede">Possédé</option>
                    </select>
                    <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                            className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm">
                      <option value="all">Toutes catégories</option>
                      {Object.entries(CATEGORIES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select value={filterChantier} onChange={e => setFilterChantier(e.target.value)}
                            className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm">
                      <option value="all">Tous les chantiers</option>
                      {CHANTIERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="relative">
                      <Icons.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"/>
                      <input value={search} onChange={e => setSearch(e.target.value)}
                             placeholder="Rechercher…"
                             className="bg-white border border-stone-200 rounded-lg pl-7 pr-3 py-1.5 text-sm w-44 focus:outline-none focus:border-stone-400"/>
                    </div>
                    <Btn variant="primary" icon={<Icons.Plus size={14}/>} onClick={() => setShowAdd(true)}>Ajouter</Btn>
                  </>}/>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <MtStat label="Types de matériel" value={items.length} sub={`${Object.keys(CATEGORIES).length} catégories`}/>
        <MtStat label="Unités déployées aujourd'hui" value={`${stats.deployedUnits}`} sub={`sur ${stats.totalUnits} disponibles`}/>
        <MtStat label="Coût matériel · aujourd'hui" value={formatMADCompact(stats.dailyCostDeployed)} sub="utilisation actuelle" accent/>
        <MtStat label="Coût maximum théorique" value={formatMADCompact(stats.dailyCostTheoric)} sub="si tout est utilisé"/>
      </div>

      {/* Per-chantier breakdown */}
      <Card className="p-4 mb-5">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-bold text-sm">Coût matériel d'aujourd'hui par chantier</h3>
          <span className="text-xs text-stone-500">Total: <b className="text-stone-900 tabular-nums">{formatMADCompact(stats.dailyCostDeployed)}</b>/jour</span>
        </div>
        <div className="space-y-2">
          {CHANTIERS.map(c => {
            const cost = stats.perChantier[c.id] || 0;
            const pct = stats.dailyCostDeployed > 0 ? (cost / stats.dailyCostDeployed) * 100 : 0;
            return (
              <div key={c.id} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: c.color }}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between text-xs mb-0.5">
                    <span className="font-semibold truncate">{c.name}</span>
                    <span className="tabular-nums font-bold" style={{ color: c.color }}>{formatMADCompact(cost)} <span className="text-stone-400 font-medium">/j</span></span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: pct+'%', background: c.color }}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* List */}
      {Object.keys(grouped).length === 0 ? (
        <Card className="p-8"><EmptyState icon={<Icons.Search size={20}/>} title="Aucun matériel ne correspond" hint="Ajustez les filtres ou la recherche."/></Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(CATEGORIES).map(([catKey, cat]) => {
            const list = grouped[catKey];
            if (!list || list.length === 0) return null;
            const catCost = list.reduce((a, m) => a + Object.values(deploymentOnDate(m, todayStr)).reduce((b,n)=>b+n,0) * m.cost, 0);
            return (
              <div key={catKey}>
                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-sm" style={{ background: cat.color }}/>
                    <h2 className="font-bold text-[11px] uppercase tracking-wider text-stone-700">{cat.label}</h2>
                    <span className="text-[10px] text-stone-500 font-medium tabular-nums">{list.length} type{list.length>1?'s':''}</span>
                  </div>
                  <span className="text-xs text-stone-500">
                    <b className="text-stone-900 tabular-nums" style={{ color: cat.color }}>{formatMADCompact(catCost)}</b><span className="text-stone-400">/j aujourd'hui</span>
                  </span>
                </div>
                <Card className="overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-stone-500 font-semibold" style={{ background:'#FAF7F1' }}>
                        <th className="px-4 py-2.5">Matériel</th>
                        <th className="px-3 py-2.5 text-right">Quantité</th>
                        <th className="px-3 py-2.5 text-right">Coût / jour</th>
                        <th className="px-3 py-2.5">Aujourd'hui</th>
                        <th className="px-3 py-2.5 text-right">Coût journalier</th>
                        <th className="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map(m => {
                        const todayDep = deploymentOnDate(m, todayStr);
                        const used = Object.values(todayDep).reduce((a,b)=>a+b,0);
                        const totalCost = used * m.cost;
                        return (
                          <tr key={m.id} className="border-t hover:bg-stone-50 cursor-pointer" style={{ borderColor:'#F0EAE0' }}
                              onClick={() => setOpenItem(m)}>
                            <td className="px-4 py-2.5">
                              <div className="font-semibold inline-flex items-center gap-1.5">
                                {m.name}
                                {(() => {
                                  const t = m.type || 'loue';
                                  const isOwned = t === 'possede';
                                  return (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                          style={{
                                            background: isOwned ? '#D8E5E7' : '#F2DCD3',
                                            color: isOwned ? '#0E5460' : '#C25B3F'
                                          }}>
                                      {isOwned ? 'Possédé' : 'Loué'}
                                    </span>
                                  );
                                })()}
                                <Icons.Calendar size={11} className="text-stone-300"/>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {m.qty != null ? <><b>{m.qty}</b> <span className="text-stone-400 text-[10px]">{m.unit || 'unités'}</span></> : <span className="text-stone-400 italic text-[11px]">À la demande</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{formatMADCompact(m.cost)}<span className="text-stone-400 text-[10px]">/j</span></td>
                            <td className="px-3 py-2.5">
                              {used === 0 ? <span className="text-[11px] text-stone-400 italic">Au dépôt</span> : (
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(todayDep).map(([cid, n]) => {
                                    const ch = CHANTIERS.find(c => c.id === cid);
                                    if (!ch) return null;
                                    return (
                                      <span key={cid} className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                            style={{ background: ch.colorSoft, color: ch.color }}>
                                        <span className="w-1.5 h-1.5 rounded-sm" style={{ background: ch.color }}/>
                                        {ch.name.split(' ')[0]} <span className="tabular-nums opacity-70">×{n}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-bold" style={{ color: cat.color }}>
                              {totalCost > 0 ? formatMADCompact(totalCost) : <span className="text-stone-300 font-normal">—</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right text-stone-300"><Icons.ChevronRight size={14}/></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <MaterielForm item={null} onClose={() => setShowAdd(false)}
                      onSave={(m) => { saveItem(m); setShowAdd(false); }}/>
      )}

      {editingDetails && (
        <MaterielForm item={editingDetails} onClose={() => setEditingDetails(null)}
                      onSave={(m) => { saveItem(m); setEditingDetails(null); setOpenItem(m); }}
                      onDelete={() => deleteItem(editingDetails.id)}/>
      )}

      {openItem && !editingDetails && (
        <DeploymentCalendar item={openItem}
                            onClose={() => setOpenItem(null)}
                            onUpdateDeployments={(deps) => updateDeployments(openItem.id, deps)}
                            onEditDetails={() => setEditingDetails(openItem)}/>
      )}
    </div>
  );
}

function MtStat({ label, value, sub, accent }) {
  return (
    <Card className="p-4">
      <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">{label}</div>
      <div className="text-2xl font-bold tabular-nums mt-1" style={{ color: accent ? '#0E5460' : '#1F2421' }}>{value}</div>
      {sub && <div className="text-xs text-stone-500 mt-0.5">{sub}</div>}
    </Card>
  );
}

// ─── Deployment calendar drawer ────────────────────────────────
function DeploymentCalendar({ item, onClose, onUpdateDeployments, onEditDetails }) {
  const today = new Date(TODAY.year, TODAY.monthIdx, TODAY.day);
  const [month, setMonth] = useMtState({ year: TODAY.year, monthIdx: TODAY.monthIdx });
  const [editingDep, setEditingDep] = useMtState(null); // {mode:'create'|'edit', dep}
  const cat = CATEGORIES[item.cat];

  const dim = daysInMonth(month.year, month.monthIdx);
  const days = [];
  for (let d = 1; d <= dim; d++) days.push(d);

  // Rows = chantiers that have any deployment in this month for this item
  const activeChantiers = useMtMemo(() => {
    const set = new Set();
    (item.deployments || []).forEach(d => {
      const s = parseISO(d.start), e = parseISO(d.end);
      const monthStart = new Date(month.year, month.monthIdx, 1);
      const monthEnd = new Date(month.year, month.monthIdx, dim);
      if (s <= monthEnd && e >= monthStart) set.add(d.chantierId);
    });
    // Always include all chantiers so user can add to any
    CHANTIERS.forEach(c => set.add(c.id));
    return CHANTIERS.filter(c => set.has(c.id));
  }, [item.deployments, month]);

  function qtyOnDate(chantierId, day) {
    const dateStr = `${month.year}-${String(month.monthIdx+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    let total = 0;
    (item.deployments || []).forEach(d => {
      if (d.chantierId !== chantierId) return;
      if (dateStr >= d.start && dateStr <= d.end) total += d.qty;
    });
    return total;
  }

  // Per-day totals across all chantiers (top sparkline)
  const dayTotals = days.map(d => {
    let total = 0;
    activeChantiers.forEach(c => total += qtyOnDate(c.id, d));
    return total;
  });
  const monthCost = dayTotals.reduce((a,b)=>a+b,0) * item.cost;

  function nextMonth() {
    const n = month.monthIdx === 11 ? { year: month.year+1, monthIdx: 0 } : { year: month.year, monthIdx: month.monthIdx+1 };
    setMonth(n);
  }
  function prevMonth() {
    const p = month.monthIdx === 0 ? { year: month.year-1, monthIdx: 11 } : { year: month.year, monthIdx: month.monthIdx-1 };
    setMonth(p);
  }

  function addDeployment(dep) {
    onUpdateDeployments([...(item.deployments || []), { ...dep, id: 'd-' + Date.now().toString(36) }]);
    setEditingDep(null);
  }
  function updateDeployment(dep) {
    onUpdateDeployments((item.deployments || []).map(d => d.id === dep.id ? dep : d));
    setEditingDep(null);
  }
  function deleteDeployment(id) {
    onUpdateDeployments((item.deployments || []).filter(d => d.id !== id));
    setEditingDep(null);
  }

  // Periods for current month for the side list
  const periodsInMonth = (item.deployments || []).filter(d => {
    const s = parseISO(d.start), e = parseISO(d.end);
    const monthStart = new Date(month.year, month.monthIdx, 1);
    const monthEnd = new Date(month.year, month.monthIdx, dim);
    return s <= monthEnd && e >= monthStart;
  }).sort((a,b) => a.start.localeCompare(b.start));

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose}/>
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-[min(100vw-2rem,1200px)] max-h-[90vh] flex flex-col"
           style={{ border:'1px solid #E8E2D8' }}>
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-start justify-between gap-4" style={{ borderColor:'#EDE6D8' }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: cat.color }}/>
              <span className="text-[10px] uppercase tracking-wider font-bold text-stone-500">{cat.label}</span>
            </div>
            <div className="text-xl font-bold">{item.name}</div>
            <div className="text-xs text-stone-500 mt-0.5 tabular-nums">
              {item.qty != null ? `${item.qty} ${item.unit || 'unités'}` : 'À la demande'} · {formatMADCompact(item.cost)}/jour
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Btn size="sm" icon={<Icons.Edit size={12}/>} onClick={onEditDetails}>Modifier détails</Btn>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-100"><Icons.X size={18}/></button>
          </div>
        </div>

        {/* Month nav */}
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:'#EDE6D8', background:'#FAF7F1' }}>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50"><Icons.ChevronLeft size={14}/></button>
            <div className="font-bold text-sm min-w-[140px] text-center">
              {MOIS_FR[month.monthIdx][0].toUpperCase() + MOIS_FR[month.monthIdx].slice(1)} {month.year}
            </div>
            <button onClick={nextMonth} className="p-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50"><Icons.ChevronRight size={14}/></button>
            <button onClick={() => setMonth({ year: TODAY.year, monthIdx: TODAY.monthIdx })}
                    className="text-xs text-stone-500 hover:text-stone-900 underline ml-1">Aujourd'hui</button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-stone-500">Coût du mois: <b className="text-stone-900 tabular-nums">{formatMADCompact(monthCost)}</b></div>
            <Btn size="sm" variant="primary" icon={<Icons.Plus size={12}/>}
                 onClick={() => setEditingDep({ mode:'create', dep:{
                   chantierId: (CHANTIERS[0]?.id || ''),
                   start: `${month.year}-${String(month.monthIdx+1).padStart(2,'0')}-01`,
                   end: `${month.year}-${String(month.monthIdx+1).padStart(2,'0')}-${String(dim).padStart(2,'0')}`,
                   qty: 1
                 } })}>Nouvelle période</Btn>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-auto">
          <DragPanContainer><div className="overflow-x-auto">
            <table className="bati-grid w-full" style={{ minWidth: 800 }}>
              <thead>
                <tr style={{ background:'#FAF7F1' }}>
                  <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-stone-500 sticky left-0 z-10"
                      style={{ background:'#FAF7F1', minWidth: 180, boxShadow:'1px 0 0 #E8E2D8' }}>Chantier</th>
                  {days.map(d => {
                    const dow = dayOfWeek(month.year, month.monthIdx, d);
                    const isToday = month.year === TODAY.year && month.monthIdx === TODAY.monthIdx && d === TODAY.day;
                    return (
                      <th key={d} className="text-center px-1 py-2 font-semibold text-[10px] text-stone-500 border-l" style={{ borderColor:'#F0EAE0', minWidth: 30 }}>
                        <div className={`text-xs font-bold tabular-nums ${isToday ? 'inline-flex items-center justify-center w-5 h-5 rounded-full text-white' : 'text-stone-700'}`}
                             style={isToday ? { background:'#0E5460' } : undefined}>{d}</div>
                        <div className="text-[9px] font-medium text-stone-400">{JOURS_FR[dow][0]}</div>
                      </th>
                    );
                  })}
                  <th className="text-right px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-stone-500 border-l sticky right-0 z-10"
                      style={{ background:'#FAF7F1', borderColor:'#E8E2D8', minWidth: 90 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {activeChantiers.map(c => {
                  let rowTotal = 0;
                  return (
                    <tr key={c.id} className="border-t" style={{ borderColor:'#F0EAE0' }}>
                      <td className="px-3 py-1.5 sticky left-0 bg-white z-10" style={{ boxShadow:'1px 0 0 #E8E2D8' }}>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-sm" style={{ background: c.color }}/>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs truncate">{c.name}</div>
                            <div className="text-[10px] text-stone-500">{c.client}</div>
                          </div>
                        </div>
                      </td>
                      {days.map(d => {
                        const qty = qtyOnDate(c.id, d);
                        if (qty > 0) rowTotal += qty;
                        return (
                          <td key={d} className="border-l p-0 text-center" style={{ borderColor:'#F0EAE0' }}
                              title={qty > 0 ? `${frenchDate(month.year, month.monthIdx, d)} · ${qty} × ${formatMADCompact(item.cost)} = ${formatMADCompact(qty * item.cost)}` : `${frenchDate(month.year, month.monthIdx, d)} · Au dépôt`}>
                            {qty > 0 ? (
                              <div className="w-full h-7 flex items-center justify-center text-[10px] font-bold tabular-nums"
                                   style={{ background:'#D8E5E7', color:'#0E5460' }}>
                                {qty}
                              </div>
                            ) : <div className="w-full h-7"/>}
                          </td>
                        );
                      })}
                      <td className="px-3 py-1.5 text-right sticky right-0 bg-white z-10 border-l" style={{ borderColor:'#E8E2D8' }}>
                        <div className="text-xs font-bold tabular-nums" style={{ color: c.color }}>{rowTotal}</div>
                        <div className="text-[9px] text-stone-400 tabular-nums">{formatMADCompact(rowTotal * item.cost)}</div>
                      </td>
                    </tr>
                  );
                })}
                {/* Bottom total row */}
                <tr className="border-t-2" style={{ borderColor:'#0E5460', background:'#F1ECE0' }}>
                  <td className="px-3 py-2 sticky left-0 z-10 font-bold text-[10px] uppercase tracking-wider text-stone-700"
                      style={{ background:'#F1ECE0', boxShadow:'1px 0 0 #E8E2D8' }}>Total / jour</td>
                  {days.map((d, i) => {
                    const total = dayTotals[i];
                    return (
                      <td key={d} className="border-l text-center px-0.5 py-1.5 tabular-nums text-[10px] font-bold"
                          style={{ borderColor:'#E8E2D8', color: total > 0 ? '#0E5460' : '#C9C2B5' }}>
                        {total > 0 ? total : '—'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right border-l sticky right-0 z-10"
                      style={{ background:'#0E5460', color:'#fff', borderColor:'#E8E2D8' }}>
                    <div className="text-[10px] uppercase tracking-wider opacity-80">Coût mois</div>
                    <div className="font-bold text-sm tabular-nums">{formatMADCompact(monthCost)}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div></DragPanContainer>
        </div>

        {/* Periods list */}
        <div className="px-5 py-3 border-t" style={{ borderColor:'#EDE6D8', background:'#FAF7F1' }}>
          <div className="flex items-baseline justify-between mb-2">
            <h4 className="text-[10px] uppercase tracking-wider font-bold text-stone-500">Périodes de déploiement actives ce mois</h4>
            <span className="text-[10px] text-stone-400">{periodsInMonth.length} période{periodsInMonth.length>1?'s':''}</span>
          </div>
          {periodsInMonth.length === 0 ? (
            <div className="text-xs text-stone-400 italic py-2">Aucune période ce mois. Cliquez "Nouvelle période" pour en ajouter une.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {periodsInMonth.map(d => {
                const ch = CHANTIERS.find(c => c.id === d.chantierId);
                if (!ch) return null;
                return (
                  <button key={d.id} onClick={() => setEditingDep({ mode:'edit', dep: d })}
                          className="text-left p-2 rounded-lg bg-white border hover:shadow-sm transition flex items-center gap-2"
                          style={{ borderColor:'#E8E2D8' }}>
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: ch.color }}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{ch.name}</div>
                      <div className="text-[10px] text-stone-500 tabular-nums">
                        {d.start.split('-').reverse().join('/')} → {d.end.split('-').reverse().join('/')}
                      </div>
                    </div>
                    <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded" style={{ background: ch.colorSoft, color: ch.color }}>×{d.qty}</span>
                    <Icons.Edit size={11} className="text-stone-300"/>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editingDep && (
        <DeploymentEditModal mode={editingDep.mode} dep={editingDep.dep}
                             item={item}
                             onClose={() => setEditingDep(null)}
                             onSave={editingDep.mode === 'create' ? addDeployment : updateDeployment}
                             onDelete={editingDep.mode === 'edit' ? () => deleteDeployment(editingDep.dep.id) : null}/>
      )}
    </>
  );
}

function DeploymentEditModal({ mode, dep, item, onSave, onDelete, onClose }) {
  const [chantierId, setChantierId] = useMtState(dep.chantierId);
  const [start, setStart] = useMtState(dep.start);
  const [end, setEnd] = useMtState(dep.end);
  const [qty, setQty] = useMtState(dep.qty);

  function save() {
    onSave({ ...dep, chantierId, start, end, qty: parseInt(qty,10) || 1 });
  }

  const ch = CHANTIERS.find(c => c.id === chantierId);
  const startD = parseISO(start), endD = parseISO(end);
  const days = Math.max(0, Math.floor((endD - startD) / 86400000) + 1);
  const totalCost = days * (parseInt(qty,10) || 0) * item.cost;

  return (
    <Modal title={mode === 'create' ? 'Nouvelle période de déploiement' : 'Modifier la période'} onClose={onClose} width="max-w-md">
      <div className="space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-1.5">Chantier</div>
          <select className="bati-input" value={chantierId} onChange={e => setChantierId(e.target.value)}>
            {CHANTIERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-1.5">Du</div>
            <input type="date" className="bati-input" value={start} onChange={e => setStart(e.target.value)}/>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-1.5">Au</div>
            <input type="date" className="bati-input" value={end} onChange={e => setEnd(e.target.value)}/>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-1.5">Quantité déployée</div>
          <input type="number" min="1" className="bati-input" value={qty} onChange={e => setQty(e.target.value)}/>
        </div>
        <div className="bg-stone-50 rounded-lg p-3 flex items-baseline justify-between" style={{ background:'#FAF7F1' }}>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">{days} jour{days>1?'s':''} sur {ch?.name}</div>
            <div className="text-[10px] text-stone-400">{qty} × {formatMADCompact(item.cost)}/j × {days} j</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Coût total</div>
            <div className="font-bold text-base tabular-nums" style={{ color:'#0E5460' }}>{formatMADCompact(totalCost)}</div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor:'#F0EAE0' }}>
          {onDelete ? (
            <button onClick={onDelete} className="text-xs font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1">
              <Icons.Trash size={12}/> Supprimer
            </button>
          ) : <span/>}
          <div className="flex gap-2">
            <Btn onClick={onClose}>Annuler</Btn>
            <Btn variant="primary" onClick={save}>{mode === 'create' ? 'Ajouter' : 'Enregistrer'}</Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Material details form (name, cost, qty) ───────────────────
function MaterielForm({ item, onSave, onDelete, onClose }) {
  const [name, setName] = useMtState(item?.name || '');
  const [cat, setCat] = useMtState(item?.cat || 'engins');
  const [type, setType] = useMtState(item?.type || 'loue');
  const [qty, setQty] = useMtState(item?.qty ?? '');
  const [unit, setUnit] = useMtState(item?.unit || 'unités');
  const [cost, setCost] = useMtState(item?.cost || 0);

  function save() {
    if (!name.trim()) return;
    const updated = {
      ...(item || { deployments: [] }),
      id: item?.id || ('mt-' + Date.now().toString(36)),
      name: name.trim(),
      cat,
      type,
      qty: qty === '' ? null : parseInt(qty, 10),
      unit: qty === '' ? unit : undefined,
      cost: parseFloat(cost) || 0
    };
    onSave(updated);
  }

  const isOwned = type === 'possede';
  const costLabel = isOwned ? "Coût d'amortissement (DH / jour)" : "Coût d'utilisation (DH / jour)";

  function TypeBtn({ value, label }) {
    const active = type === value;
    return (
      <button type="button" onClick={() => setType(value)}
              className={`flex-1 px-3 py-2 text-sm font-semibold transition ${value === 'loue' ? 'rounded-l-lg border-r-0' : 'rounded-r-lg'}`}
              style={{
                background: active ? '#0E5460' : '#fff',
                color: active ? '#fff' : '#6B6359',
                border: '1px solid ' + (active ? '#0E5460' : '#E8E2D8')
              }}>
        {label}
      </button>
    );
  }

  return (
    <Modal title={item ? 'Modifier le matériel' : 'Ajouter un matériel'} onClose={onClose} width="max-w-lg">
      <div className="space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-1.5">Nom du matériel</div>
          <input className="bati-input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="ex. Pelle excavatrice CAT 320"/>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-1.5">Type</div>
          <div className="flex">
            <TypeBtn value="loue" label="Loué"/>
            <TypeBtn value="possede" label="Possédé"/>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-1.5">Catégorie</div>
            <select className="bati-input" value={cat} onChange={e => setCat(e.target.value)}>
              {Object.entries(CATEGORIES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-1.5">{costLabel}</div>
            <input type="number" className="bati-input" value={cost} onChange={e => setCost(e.target.value)} placeholder="0"/>
            {isOwned && (
              <div className="text-[10px] text-stone-500 mt-1">Tarif interne pour répartir l'achat sur les chantiers.</div>
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-1.5">Quantité totale</div>
            <input type="number" className="bati-input" value={qty} onChange={e => setQty(e.target.value)} placeholder="Laisser vide si à la demande"/>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-1.5">Unité (si à la demande)</div>
            <select className="bati-input" value={unit} onChange={e => setUnit(e.target.value)}>
              <option value="unités">unités</option>
              <option value="m²">m²</option>
              <option value="m³">m³</option>
              <option value="ml">mètres linéaires</option>
              <option value="lot">lot</option>
            </select>
          </div>
        </div>
        <div className="text-xs text-stone-500 bg-stone-50 rounded-lg p-2.5" style={{ background:'#FAF7F1' }}>
          <b>Astuce:</b> ouvrez le matériel pour ajouter des périodes de déploiement par chantier avec un calendrier dédié.
        </div>
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor:'#F0EAE0' }}>
          {onDelete ? (
            <button onClick={onDelete} className="text-xs font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1">
              <Icons.Trash size={12}/> Supprimer
            </button>
          ) : <span/>}
          <div className="flex gap-2">
            <Btn onClick={onClose}>Annuler</Btn>
            <Btn variant="primary" onClick={save} disabled={!name.trim()}>{item ? 'Enregistrer' : 'Ajouter'}</Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
}

window.Materiels = Materiels;

// Drag-to-pan wrapper: left-click on empty area + drag pans the horizontal scroll
function DragPanContainer({ children }) {
  const ref = useMtState ? React.useRef(null) : null;
  const wrapRef = React.useRef(null);
  const dragRef = React.useRef(null);

  function onMouseDown(e) {
    // Ignore drag if started on a button or input (let those handle their own clicks)
    if (e.target.closest('button, input, select, a, [data-stop]')) return;
    if (e.button !== 0) return;
    const el = wrapRef.current.querySelector('.overflow-x-auto');
    if (!el) return;
    dragRef.current = { startX: e.clientX, startScroll: el.scrollLeft, el, moved: false };
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }
  function onMouseMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 3) dragRef.current.moved = true;
    dragRef.current.el.scrollLeft = dragRef.current.startScroll - dx;
  }
  function onMouseUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  React.useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  return (
    <div ref={wrapRef} onMouseDown={onMouseDown} style={{ cursor: 'grab' }}>
      {children}
    </div>
  );
}
