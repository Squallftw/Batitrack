// Pointage screen — Quinzaine + Mois entier views
const { useState: usePtState, useEffect: usePtEff, useRef: usePtRef, useMemo: usePtMemo } = React;

// ─── Cell popover ─────────────────────────────────────────────
function CellPopover({ open, anchor, onClose, cell, worker, onSave, onDelete, suggestedChantierId, suggestedTaskLabel }) {
  const [statut, setStatut] = usePtState(cell?.statut || 'P');
  const [chantierId, setChantierId] = usePtState(cell?.chantierId || suggestedChantierId || (CHANTIERS[0]?.id || ''));
  const [prime, setPrime] = usePtState(cell?.prime || '');
  const [motif, setMotif] = usePtState(cell?.motif || '');
  const [note, setNote] = usePtState(cell?.note || '');

  usePtEff(() => {
    setStatut(cell?.statut || 'P');
    setChantierId(cell?.chantierId || suggestedChantierId || (CHANTIERS[0]?.id || ''));
    setPrime(cell?.prime || '');
    setMotif(cell?.motif || '');
    setNote(cell?.note || '');
  }, [cell, open]);

  usePtEff(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'p' || e.key === 'P') setStatut('P');
      if (e.key === 'a' || e.key === 'A') setStatut('A');
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, statut, chantierId, prime, motif, note]);

  if (!open || !anchor) return null;
  const r = anchor.getBoundingClientRect();
  const popoverW = 320;
  let left = r.left + r.width/2 - popoverW/2;
  if (left + popoverW > window.innerWidth - 16) left = window.innerWidth - popoverW - 16;
  if (left < 16) left = 16;
  let top = r.bottom + 8;
  if (top + 380 > window.innerHeight) top = r.top - 380 - 8;

  const handleSave = () => {
    if (statut === 'A') {
      onSave({ statut: 'A' });
    } else {
      const c = { statut: 'P', chantierId };
      const p = parseFloat(prime);
      if (!isNaN(p) && p > 0) { c.prime = p; if (motif.trim()) c.motif = motif.trim(); }
      if (note.trim()) c.note = note.trim();
      onSave(c);
    }
  };

  const ch = CHANTIERS.find(c => c.id === chantierId);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}/>
      <div className="fixed z-50 bg-white rounded-xl shadow-xl border w-[320px] overflow-hidden"
           style={{ left, top, borderColor:'#E8E2D8' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2.5" style={{ borderColor:'#EDE6D8', background:'#FAF7F1' }}>
          <Avatar worker={worker} size={32}/>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{worker.nom}</div>
            <div className="text-[11px] text-stone-500">{anchor.dataset.dateLabel} · {formatMADCompact(worker.tarif)}/j</div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <div className="text-xs font-medium text-stone-600 mb-1.5">Statut</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => setStatut('P')}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition border ${statut==='P'?'border-transparent shadow-sm':'border-stone-200 text-stone-600 bg-white'}`}
                      style={statut==='P' ? { background:'#E3F1E5', color:'#1F6B3A', borderColor:'#BFE0C5' } : undefined}>
                Présent <span className="text-[10px] opacity-60 ml-1">P</span>
              </button>
              <button onClick={() => setStatut('A')}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition border ${statut==='A'?'border-transparent shadow-sm':'border-stone-200 text-stone-600 bg-white'}`}
                      style={statut==='A' ? { background:'#FBE3DC', color:'#8A2C1E', borderColor:'#F0C5B9' } : undefined}>
                Absent <span className="text-[10px] opacity-60 ml-1">A</span>
              </button>
            </div>
          </div>

          {statut === 'P' && (
            <>
              <div>
                <div className="text-xs font-medium text-stone-600 mb-1.5 flex items-center justify-between">
                  <span>Chantier</span>
                  {!cell && suggestedTaskLabel && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background:'#D8E5E7', color:'#0E5460' }} title={`Suggéré d'après ${suggestedTaskLabel}`}>
                      Planning
                    </span>
                  )}
                </div>
                <div className="relative">
                  <select value={chantierId} onChange={e => setChantierId(e.target.value)}
                          className="w-full appearance-none bg-white border border-stone-200 rounded-lg pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
                          style={{ '--tw-ring-color':'#0E5460' }}>
                    {CHANTIERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-sm" style={{ background: ch?.color }}/>
                  <Icons.ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs font-medium text-stone-600 mb-1.5">Prime (DH)</div>
                  <input type="number" value={prime} onChange={e => setPrime(e.target.value)}
                         placeholder="0"
                         className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-stone-400"/>
                </div>
                <div>
                  <div className="text-xs font-medium text-stone-600 mb-1.5">Motif</div>
                  <input type="text" value={motif} onChange={e => setMotif(e.target.value)}
                         placeholder="Optionnel"
                         disabled={!parseFloat(prime)}
                         className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-stone-400 disabled:bg-stone-50 disabled:text-stone-400"/>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-stone-600 mb-1.5">Note interne</div>
                <input type="text" value={note} onChange={e => setNote(e.target.value)}
                       placeholder="Optionnelle"
                       className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-stone-400"/>
              </div>
            </>
          )}
        </div>

        <div className="px-4 py-3 bg-stone-50 border-t flex items-center justify-between" style={{ borderColor:'#EDE6D8' }}>
          {cell ? (
            <button onClick={onDelete} className="text-xs text-stone-500 hover:text-red-600 inline-flex items-center gap-1">
              <Icons.Trash size={12}/> Effacer
            </button>
          ) : <span/>}
          <div className="flex gap-2">
            <Btn size="sm" onClick={onClose}>Annuler</Btn>
            <Btn size="sm" variant="primary" onClick={handleSave}>Enregistrer</Btn>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Bulk popover ─────────────────────────────────────────────
function BulkPopover({ count, onApply, onClear }) {
  const [statut, setStatut] = usePtState('P');
  const [chantierId, setChantierId] = usePtState((CHANTIERS[0]?.id || ''));
  if (count === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white rounded-xl shadow-2xl border flex items-center gap-3 px-4 py-3"
         style={{ borderColor:'#E8E2D8' }}>
      <div className="text-sm">
        <span className="font-bold">{count}</span> cellule{count>1?'s':''} sélectionnée{count>1?'s':''}
      </div>
      <div className="h-6 w-px bg-stone-200"/>
      <div className="flex gap-1">
        <button onClick={() => setStatut('P')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${statut==='P'?'bg-green-100 text-green-800':'bg-stone-100 text-stone-500'}`}>Présent</button>
        <button onClick={() => setStatut('A')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${statut==='A'?'bg-red-100 text-red-800':'bg-stone-100 text-stone-500'}`}>Absent</button>
      </div>
      {statut === 'P' && (
        <select value={chantierId} onChange={e => setChantierId(e.target.value)}
                className="border border-stone-200 rounded px-2 py-1 text-xs">
          {CHANTIERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <Btn size="sm" variant="primary" onClick={() => onApply(statut, chantierId)}>Appliquer</Btn>
      <button onClick={onClear} className="text-stone-400 hover:text-stone-700"><Icons.X size={16}/></button>
    </div>
  );
}

window.CellPopover = CellPopover;
window.BulkPopover = BulkPopover;
