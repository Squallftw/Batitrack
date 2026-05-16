// Affectations — assign workers to planning tasks
const { useState: useAfState, useMemo: useAfMemo, useRef: useAfRef, useEffect: useAfEff } = React;

// Date range for a task (uses local helpers exposed by planning.jsx)
function taskRange(task) {
  const s = window.dateFromYMD(task.start[0], task.start[1], task.start[2]);
  const e = window.addDaysD(s, task.duration - 1);
  return [s, e];
}

function rangesOverlap(a, b) {
  return a[0] <= b[1] && b[0] <= a[1];
}

function workerAssignments(workerId, plan, assignments) {
  const out = [];
  plan.forEach(g => g.children.forEach(t => {
    if ((assignments[t.id] || []).includes(workerId)) out.push({ task: t, group: g });
  }));
  return out;
}

function detectConflicts(workerId, plan, assignments) {
  const tasks = workerAssignments(workerId, plan, assignments);
  const conflicts = new Set();
  for (let i = 0; i < tasks.length; i++) {
    for (let j = i+1; j < tasks.length; j++) {
      const ra = taskRange(tasks[i].task);
      const rb = taskRange(tasks[j].task);
      if (rangesOverlap(ra, rb)) {
        conflicts.add(tasks[i].task.id);
        conflicts.add(tasks[j].task.id);
      }
    }
  }
  return conflicts;
}

function Affectations({ ctx }) {
  const [chantierId, setChantierId] = useAfState((CHANTIERS[0]?.id || ''));
  const plan = ctx.plans[chantierId] || [];
  const { assignments, assignWorker, unassignWorker } = ctx;
  const [view, setView] = useAfState('task'); // 'task' | 'worker'
  const [search, setSearch] = useAfState('');
  const [openTask, setOpenTask] = useAfState(null);

  // Precompute per-worker conflicts (within selected chantier)
  const workerConflicts = useAfMemo(() => {
    const m = {};
    OUVRIERS.forEach(w => { m[w.id] = detectConflicts(w.id, plan, assignments); });
    return m;
  }, [plan, assignments]);

  const chantier = CHANTIERS.find(c => c.id === chantierId);
  const totalTasks = plan.reduce((a, g) => a + g.children.length, 0);
  const totalAssigned = plan.reduce((a, g) => a + g.children.reduce((b, t) => b + (assignments[t.id]?.length || 0), 0), 0);

  return (
    <div>
      <PageHeader title="Affectations"
                  subtitle="Assignez vos ouvriers aux tâches du planning du chantier sélectionné. Les chevauchements sont signalés."
                  right={<>
                    <select value={chantierId} onChange={e => setChantierId(e.target.value)}
                            className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm">
                      {CHANTIERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="flex bg-stone-100 rounded-lg p-0.5">
                      <button onClick={() => setView('task')}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${view==='task'?'bg-white shadow-sm text-stone-900':'text-stone-500'}`}>Par tâche</button>
                      <button onClick={() => setView('worker')}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${view==='worker'?'bg-white shadow-sm text-stone-900':'text-stone-500'}`}>Par ouvrier</button>
                    </div>
                    <div className="relative">
                      <Icons.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"/>
                      <input value={search} onChange={e => setSearch(e.target.value)}
                             placeholder={view==='task' ? 'Rechercher une tâche…' : 'Rechercher un ouvrier…'}
                             className="bg-white border border-stone-200 rounded-lg pl-7 pr-3 py-1.5 text-sm w-56 focus:outline-none focus:border-stone-400"/>
                    </div>
                  </>}/>

      {/* Chantier banner */}
      <Card className="p-4 mb-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ background: chantier.color }}/>
        <div className="flex-1 min-w-0">
          <div className="font-bold">{chantier.name}</div>
          <div className="text-xs text-stone-500">{chantier.client} · {chantier.address}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Tâches</div>
          <div className="font-bold tabular-nums">{totalTasks}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Affectations</div>
          <div className="font-bold tabular-nums" style={{ color:'#0E5460' }}>{totalAssigned}</div>
        </div>
      </Card>

      {view === 'task'
        ? <ByTaskView plan={plan} assignments={assignments} assignWorker={assignWorker} unassignWorker={unassignWorker} workerConflicts={workerConflicts} search={search} onOpenTask={(t) => setOpenTask(t)}/>
        : <ByWorkerView plan={plan} assignments={assignments} assignWorker={assignWorker} unassignWorker={unassignWorker} workerConflicts={workerConflicts} search={search} onOpenTask={(t) => setOpenTask(t)}/>}

      {openTask && (
        <TaskCalendarModal task={openTask} chantierId={chantierId} chantier={chantier}
                           assignedIds={assignments[openTask.id] || []}
                           pointage={ctx.pointage}
                           onClose={() => setOpenTask(null)}/>
      )}
    </div>
  );
}

// ─── BY TASK ──────────────────────────────────────────────────
function ByTaskView({ plan, assignments, assignWorker, unassignWorker, workerConflicts, search, onOpenTask }) {
  const filtered = plan.map(g => ({
    ...g,
    children: g.children.filter(t => !search || t.label.toLowerCase().includes(search.toLowerCase()))
  })).filter(g => g.children.length > 0);

  if (filtered.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState icon={<Icons.Calendar size={20}/>} title="Aucune tâche trouvée" hint="Ajustez votre recherche ou créez une tâche dans le planning."/>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {filtered.map(g => (
        <div key={g.id}>
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-bold text-[11px] uppercase tracking-wider text-stone-700">{g.label}</h2>
            <span className="text-[10px] text-stone-500 font-medium tabular-nums">{g.children.length} tâche{g.children.length>1?'s':''}</span>
          </div>
          <Card className="overflow-hidden">
            {g.children.map((t, i) => (
              <TaskRow key={t.id} task={t} group={g} assignments={assignments}
                       assignWorker={assignWorker} unassignWorker={unassignWorker}
                       workerConflicts={workerConflicts}
                       onOpenTask={onOpenTask}
                       isLast={i === g.children.length-1}/>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}

function TaskRow({ task, group, assignments, assignWorker, unassignWorker, workerConflicts, onOpenTask, isLast }) {
  const sc = STATUS_COLORS[task.status] || STATUS_COLORS.todo;
  const assignedIds = assignments[task.id] || [];
  const assignedWorkers = assignedIds.map(id => OUVRIERS.find(w => w.id === id)).filter(Boolean);
  const [s, e] = taskRange(task);

  return (
    <div className={`flex items-center gap-4 px-4 py-3 hover:bg-stone-50/60 transition cursor-pointer ${isLast ? '' : 'border-b'}`}
         style={{ borderColor:'#F0EAE0' }}
         onClick={(ev) => {
           // Ignore clicks inside chips and on the add button
           if (ev.target.closest('[data-stop]')) return;
           onOpenTask?.(task);
         }}>
      <div className="flex items-center gap-2 min-w-0" style={{ width: 280 }}>
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sc.dot }}/>
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate inline-flex items-center gap-1.5">
            {task.label}
            <Icons.Calendar size={11} className="text-stone-300"/>
          </div>
          <div className="text-[10px] text-stone-500 tabular-nums">
            {window.frenchDay(s)} → {window.frenchDay(e)} · {task.duration}j
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {assignedWorkers.length === 0 ? (
          <div className="text-[11px] text-stone-400 italic">Aucun ouvrier assigné</div>
        ) : (
          <div className="flex flex-wrap gap-1.5" data-stop>
            {assignedWorkers.map(w => {
              const conflict = workerConflicts[w.id]?.has(task.id);
              return (
                <div key={w.id}
                     className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 rounded-full pl-1 pr-2 py-0.5 group/chip transition"
                     style={conflict ? { background:'#FBE3DC' } : undefined}
                     title={conflict ? 'Conflit: chevauchement avec une autre tâche' : ''}>
                  <Avatar worker={w} size={20}/>
                  <span className="text-[11px] font-semibold">{w.nom.split(' ')[0]}</span>
                  {conflict && <Icons.AlertTri size={11} style={{ color:'#C25B3F' }}/>}
                  <button onClick={() => unassignWorker(task.id, w.id)}
                          className="text-stone-400 hover:text-red-600 opacity-0 group-hover/chip:opacity-100 transition">
                    <Icons.X size={12}/>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3" data-stop>
        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: sc.bar + '22', color: sc.bar }}>{sc.label}</span>
        <AddWorkerMenu taskId={task.id} assignedIds={assignedIds} onAdd={(wid) => assignWorker(task.id, wid)} task={task} workerConflicts={workerConflicts}/>
      </div>
    </div>
  );
}

function AddWorkerMenu({ taskId, assignedIds, onAdd, task, workerConflicts }) {
  const [open, setOpen] = useAfState(false);
  const [coords, setCoords] = useAfState({ top: 0, right: 0 });
  const buttonRef = useAfRef(null);
  const menuRef = useAfRef(null);

  function toggle() {
    if (open) { setOpen(false); return; }
    if (buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen(true);
  }

  useAfEff(() => {
    if (!open) return;
    const onClick = (e) => {
      if (buttonRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  const available = OUVRIERS.filter(w => !assignedIds.includes(w.id));
  const byRole = {};
  available.forEach(w => { (byRole[w.role] = byRole[w.role] || []).push(w); });

  return (
    <>
      <button ref={buttonRef} onClick={toggle}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-sm hover:opacity-90"
              style={{ background:'#0E5460' }} title="Affecter un ouvrier">
        <Icons.Plus size={14}/>
      </button>
      {open && (
        <div ref={menuRef}
             className="fixed bg-white border rounded-xl shadow-xl z-50 w-72 max-h-96 overflow-y-auto"
             style={{ top: coords.top, right: coords.right, borderColor:'#E8E2D8' }}>
          <div className="px-3 py-2 border-b text-[10px] font-bold uppercase tracking-wider text-stone-500" style={{ borderColor:'#F0EAE0' }}>
            Ouvriers disponibles
          </div>
          {available.length === 0 && (
            <div className="px-3 py-4 text-xs text-stone-400 italic text-center">Tous les ouvriers sont déjà affectés.</div>
          )}
          {ROLES.map(role => {
            const list = byRole[role] || [];
            if (list.length === 0) return null;
            return (
              <div key={role}>
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">{role}</div>
                {list.map(w => (
                  <button key={w.id}
                          onClick={() => { onAdd(w.id); setOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-stone-50 text-left">
                    <Avatar worker={w} size={26}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{w.nom}</div>
                      <div className="text-[10px] text-stone-500">{formatMADCompact(w.tarif)}/j</div>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── BY WORKER ────────────────────────────────────────────────
function ByWorkerView({ plan, assignments, assignWorker, unassignWorker, workerConflicts, search, onOpenTask }) {
  const filtered = OUVRIERS.filter(w => !search || w.nom.toLowerCase().includes(search.toLowerCase()));
  if (filtered.length === 0) {
    return <Card className="p-8"><EmptyState icon={<Icons.User size={20}/>} title="Aucun ouvrier" hint="Ajustez votre recherche."/></Card>;
  }
  return (
    <Card className="overflow-hidden">
      {filtered.map((w, i) => (
        <WorkerRow key={w.id} w={w} plan={plan} assignments={assignments}
                   assignWorker={assignWorker} unassignWorker={unassignWorker}
                   workerConflicts={workerConflicts[w.id] || new Set()}
                   onOpenTask={onOpenTask}
                   isLast={i === filtered.length-1}/>
      ))}
    </Card>
  );
}

function WorkerRow({ w, plan, assignments, assignWorker, unassignWorker, workerConflicts, onOpenTask, isLast }) {
  const tasks = workerAssignments(w.id, plan, assignments);
  const hasConflict = workerConflicts.size > 0;
  return (
    <div className={`flex items-start gap-4 px-4 py-3 ${isLast ? '' : 'border-b'}`} style={{ borderColor:'#F0EAE0' }}>
      <div className="flex items-center gap-2.5 flex-shrink-0" style={{ width: 220 }}>
        <Avatar worker={w} size={32}/>
        <div>
          <div className="font-semibold text-sm flex items-center gap-1.5">
            {w.nom}
            {hasConflict && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background:'#FBE3DC', color:'#8A2C1E' }}>
                <Icons.AlertTri size={10}/>
                Conflit
              </span>
            )}
          </div>
          <div className="text-[10px] text-stone-500">{w.role} · {formatMADCompact(w.tarif)}/j</div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        {tasks.length === 0 ? (
          <div className="text-[11px] text-stone-400 italic">Aucune tâche assignée</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tasks.map(({ task, group }) => {
              const sc = STATUS_COLORS[task.status] || STATUS_COLORS.todo;
              const conflict = workerConflicts.has(task.id);
              const [s, e] = taskRange(task);
              return (
                <div key={task.id}
                     className="inline-flex items-center gap-1.5 rounded-md pl-1.5 pr-1 py-1 border group/chip cursor-pointer hover:shadow-sm transition"
                     style={{ borderColor: conflict ? '#F0C5B9' : '#E8E2D8', background: conflict ? '#FBE3DC' : '#FAF7F1' }}
                     title={`${group.label} · ${window.frenchDay(s)} → ${window.frenchDay(e)}`}
                     onClick={() => onOpenTask?.(task)}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }}/>
                  <span className="text-[11px] font-semibold tracking-wider">{task.label}</span>
                  <span className="text-[10px] text-stone-500 tabular-nums">{task.duration}j</span>
                  {conflict && <Icons.AlertTri size={11} style={{ color:'#C25B3F' }}/>}
                  <button onClick={(ev) => { ev.stopPropagation(); unassignWorker(task.id, w.id); }}
                          className="text-stone-400 hover:text-red-600 opacity-0 group-hover/chip:opacity-100 transition ml-0.5 px-0.5">
                    <Icons.X size={12}/>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div>
        <AddTaskMenu workerId={w.id} plan={plan} assignments={assignments} onAdd={(tid) => assignWorker(tid, w.id)}/>
      </div>
    </div>
  );
}

function AddTaskMenu({ workerId, plan, assignments, onAdd }) {
  const [open, setOpen] = useAfState(false);
  const [hoverGroup, setHoverGroup] = useAfState(null);
  const [coords, setCoords] = useAfState({ top: 0, right: 0 });
  const buttonRef = useAfRef(null);
  const menuRef = useAfRef(null);

  function toggle() {
    if (open) { setOpen(false); setHoverGroup(null); return; }
    if (buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen(true);
    setHoverGroup(plan[0]?.id || null);
  }

  useAfEff(() => {
    if (!open) return;
    const onClick = (e) => {
      if (buttonRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false); setHoverGroup(null);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <>
      <button ref={buttonRef} onClick={toggle}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-sm hover:opacity-90"
              style={{ background:'#0E5460' }} title="Assigner une tâche">
        <Icons.Plus size={14}/>
      </button>
      {open && (
        <div ref={menuRef}
             className="fixed bg-white border rounded-xl shadow-xl z-50 flex max-h-96"
             style={{ top: coords.top, right: coords.right, borderColor:'#E8E2D8' }}>
          {/* Groups column */}
          <div className="py-1 w-56 border-r overflow-y-auto" style={{ borderColor:'#F0EAE0' }}>
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Groupes</div>
            {plan.length === 0 && <div className="px-3 py-3 text-xs text-stone-400 italic">Aucun groupe</div>}
            {plan.map(g => (
              <button key={g.id}
                      onMouseEnter={() => setHoverGroup(g.id)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-stone-50 ${hoverGroup === g.id ? 'bg-stone-50' : ''}`}>
                <span className="text-xs font-semibold tracking-wider">{g.label}</span>
                <Icons.ChevronRight size={12} className="text-stone-400"/>
              </button>
            ))}
          </div>
          {/* Tasks column */}
          <div className="py-1 w-60 overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Tâches</div>
            {(() => {
              const g = plan.find(x => x.id === hoverGroup) || plan[0];
              if (!g) return <div className="px-3 py-3 text-xs text-stone-400 italic">—</div>;
              return g.children.map(t => {
                const sc = STATUS_COLORS[t.status] || STATUS_COLORS.todo;
                const already = (assignments[t.id] || []).includes(workerId);
                return (
                  <button key={t.id}
                          disabled={already}
                          onClick={() => { onAdd(t.id); setOpen(false); setHoverGroup(null); }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sc.dot }}/>
                    <span className="text-xs font-semibold flex-1 truncate">{t.label}</span>
                    <span className="text-[10px] text-stone-400 tabular-nums">{t.duration}j</span>
                    {already && <Icons.Check size={11} style={{ color:'#2E9152' }}/>}
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}
    </>
  );
}

window.Affectations = Affectations;
window.workerAssignments = workerAssignments;
window.taskRange = taskRange;

// ─── Task calendar modal ──────────────────────────────────────
function TaskCalendarModal({ task, chantierId, chantier, assignedIds, pointage, onClose }) {
  const [s, e] = taskRange(task);
  const sc = STATUS_COLORS[task.status] || STATUS_COLORS.todo;
  const days = [];
  let cur = new Date(s);
  while (cur <= e) { days.push(new Date(cur)); cur = window.addDaysD(cur, 1); }

  const workers = assignedIds.map(id => OUVRIERS.find(w => w.id === id)).filter(Boolean);

  // Compute attendance matrix
  function cellState(workerId, d) {
    const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const c = pointage[workerId]?.[dk];
    if (!c) return { kind: 'none' };
    if (c.statut === 'A') return { kind: 'absent' };
    if (c.statut === 'P') {
      if (c.chantierId === chantierId) return { kind: 'present_here' };
      return { kind: 'present_elsewhere', chantierId: c.chantierId };
    }
    return { kind: 'none' };
  }

  // Stats: jours-ouvrier réellement travaillés sur cette tâche / prévus
  let workedHere = 0, workedElsewhere = 0, absent = 0, notPointed = 0;
  workers.forEach(w => {
    days.forEach(d => {
      const st = cellState(w.id, d);
      if (st.kind === 'present_here') workedHere++;
      else if (st.kind === 'present_elsewhere') workedElsewhere++;
      else if (st.kind === 'absent') absent++;
      else notPointed++;
    });
  });
  const expected = workers.length * days.length;

  const today = new Date(window.TODAY.year, window.TODAY.monthIdx, window.TODAY.day);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose}/>
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-[min(100vw-2rem,1100px)] max-h-[90vh] flex flex-col"
           style={{ border:'1px solid #E8E2D8' }}>
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-start justify-between gap-4" style={{ borderColor:'#EDE6D8' }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ background: sc.dot }}/>
              <span className="text-[10px] uppercase tracking-wider font-bold text-stone-500">{sc.label}</span>
              <span className="text-stone-300">·</span>
              <div className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: chantier.color }}/>
                <span className="text-[11px] font-semibold text-stone-600">{chantier.name}</span>
              </div>
            </div>
            <div className="text-xl font-bold">{task.label}</div>
            <div className="text-xs text-stone-500 mt-0.5 tabular-nums">
              {window.frenchDay(s)} → {window.frenchDay(e)} · {task.duration} jours prévus
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-100 flex-shrink-0"><Icons.X size={18}/></button>
        </div>

        {/* Stats */}
        <div className="px-5 py-3 border-b grid grid-cols-2 md:grid-cols-4 gap-3" style={{ borderColor:'#EDE6D8', background:'#FAF7F1' }}>
          <StatBlock label="Ouvriers assignés" value={workers.length}/>
          <StatBlock label="Jours travaillés sur cette tâche" value={workedHere} sub={`sur ${expected} prévus`} accent/>
          <StatBlock label="Présents ailleurs" value={workedElsewhere} sub="autre chantier"/>
          <StatBlock label="Absents" value={absent} sub={`${notPointed} non pointés`}/>
        </div>

        {/* Calendar */}
        <div className="flex-1 overflow-auto p-5">
          {workers.length === 0 ? (
            <EmptyState icon={<Icons.User size={20}/>} title="Aucun ouvrier assigné"
                        hint="Affectez des ouvriers à cette tâche pour suivre leur présence."/>
          ) : (
            <div className="overflow-x-auto">
              <table className="bati-grid" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-stone-500 sticky left-0 bg-white z-10"
                        style={{ minWidth: 200, boxShadow:'1px 0 0 #F0EAE0' }}>Ouvrier</th>
                    {days.map((d, i) => {
                      const isToday = d.getTime() === today.getTime();
                      return (
                        <th key={i} className="text-center px-1 py-2 font-semibold text-[10px] text-stone-500 border-l" style={{ borderColor:'#F0EAE0', minWidth: 32 }}>
                          <div className={`text-stone-700 text-xs font-bold tabular-nums ${isToday ? 'inline-flex items-center justify-center w-5 h-5 rounded-full text-white' : ''}`}
                               style={isToday ? { background:'#0E5460' } : undefined}>{d.getDate()}</div>
                          <div className="text-[9px] font-medium text-stone-400">{JOURS_FR[d.getDay()][0]}</div>
                        </th>
                      );
                    })}
                    <th className="text-right px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-stone-500 border-l sticky right-0 bg-white z-10"
                        style={{ borderColor:'#E8E2D8', minWidth: 80 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map(w => {
                    let row = 0;
                    return (
                      <tr key={w.id} className="border-t" style={{ borderColor:'#F0EAE0' }}>
                        <td className="px-3 py-1.5 sticky left-0 bg-white z-10" style={{ boxShadow:'1px 0 0 #F0EAE0' }}>
                          <div className="flex items-center gap-2">
                            <Avatar worker={w} size={26}/>
                            <div className="min-w-0">
                              <div className="font-semibold text-xs truncate">{w.nom}</div>
                              <div className="text-[10px] text-stone-500">{w.role}</div>
                            </div>
                          </div>
                        </td>
                        {days.map((d, i) => {
                          const st = cellState(w.id, d);
                          if (st.kind === 'present_here') row++;
                          const title = st.kind === 'present_here'
                            ? `${window.frenchDay(d)} · Travaillé sur cette tâche`
                            : window.frenchDay(d);
                          return (
                            <td key={i} className="border-l p-0" style={{ borderColor:'#F0EAE0' }} title={title}>
                              <div className="w-full h-8 flex items-center justify-center">
                                {st.kind === 'present_here' && (
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ background:'#2E9152' }}/>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-1.5 text-right sticky right-0 bg-white z-10 border-l" style={{ borderColor:'#E8E2D8' }}>
                          <div className="text-xs font-bold tabular-nums" style={{ color:'#0E5460' }}>{row}j</div>
                          <div className="text-[10px] text-stone-400">sur {task.duration}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-t flex items-center flex-wrap gap-4 text-[11px] text-stone-500" style={{ borderColor:'#EDE6D8', background:'#FAF7F1' }}>
          <LegendDot color="#2E9152" label="A travaillé sur cette tâche ce jour-là"/>
          <span className="text-stone-400">·</span>
          <span>Une cellule vide signifie absent, non pointé, ou sur un autre chantier.</span>
        </div>
      </div>
    </>
  );
}

function StatBlock({ label, value, sub, accent }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">{label}</div>
      <div className="text-xl font-bold tabular-nums mt-0.5" style={{ color: accent ? '#0E5460' : '#1F2421' }}>{value}</div>
      {sub && <div className="text-[10px] text-stone-500">{sub}</div>}
    </div>
  );
}

function LegendDot({ color, label, muted }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`rounded-full ${muted ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} style={{ background: color }}/>
      {label}
    </div>
  );
}

// Helper: suggest a chantier for a worker on a date from their task assignments.
// Scans plans across all chantiers; returns the chantierId whose plan contains the matching task.
window.suggestChantierForDay = function(workerId, dk, plans, assignments) {
  if (!plans || !assignments) return null;
  const { year, monthIdx, day } = window.parseDateKey(dk);
  const target = window.dateFromYMD(year, monthIdx, day);
  for (const chantierId of Object.keys(plans)) {
    for (const g of plans[chantierId]) {
      for (const t of g.children) {
        if (!(assignments[t.id] || []).includes(workerId)) continue;
        const [s, e] = window.taskRange(t);
        if (target >= s && target <= e) return { chantierId, taskLabel: t.label };
      }
    }
  }
  return null;
};
