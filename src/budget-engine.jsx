// Calculation engine — single source of truth for budget & profitability
// Every figure on the dashboard MUST go through this module.
// No ad-hoc aggregations in components; everything computed live from records.

(function() {
  // ─── Money math: integer centimes ─────────────────────────────
  // Avoids floating-point drift. All public values are returned as plain numbers in DH for UI display.
  function toCents(n) { return Math.round((+n || 0) * 100); }
  function fromCents(c) { return c / 100; }

  // ─── Source aggregators ───────────────────────────────────────
  // MATERIALS: Consumption × item price. Purchases are a separate cash-flow lens (paid/pending).
  // The cost the chantier *bears* is the consumption (what was actually used).
  function materialsSpentForChantier(chantierId, { consumption, items, dateRange }) {
    let cents = 0;
    const lines = [];
    for (const u of consumption) {
      if (u.chantierId !== chantierId) continue;
      if (dateRange && !inRange(u.date, dateRange)) continue;
      const it = items.find(i => i.id === u.itemId);
      if (!it) continue;
      const c = Math.round(toCents(it.price) * (+u.qty || 0));
      cents += c;
      lines.push({ kind: 'material', id: u.id, date: u.date, label: it.name, qty: u.qty, unit: it.unit, cents: c, taskId: u.taskId, isLoss: u.isLoss });
    }
    return { cents, value: fromCents(cents), lines };
  }

  // LABOR: per worker, per day pointed Present × tarif on a chantier + primes that day
  function laborSpentForChantier(chantierId, { pointage, workers, dateRange }) {
    let cents = 0;
    const lines = [];
    for (const w of workers) {
      const days = pointage[w.id] || {};
      for (const dk of Object.keys(days)) {
        const cell = days[dk];
        if (cell?.statut !== 'P') continue;
        if (cell.chantierId !== chantierId) continue;
        if (dateRange && !inRange(dk, dateRange)) continue;
        const base = toCents(w.tarif);
        const prime = toCents(cell.prime || 0);
        const sum = base + prime;
        cents += sum;
        lines.push({ kind: 'labor', id: `${w.id}|${dk}`, date: dk, label: w.nom, role: w.role, cents: sum });
      }
    }
    return { cents, value: fromCents(cents), lines };
  }

  // EQUIPMENT (optional 3rd cost stream): material deployments × daily cost × days in range, scoped to chantier
  // Kept simple — extension point for future cost streams.
  function equipmentSpentForChantier(chantierId, { materiels, dateRange }) {
    if (!materiels) return { cents: 0, value: 0, lines: [] };
    let cents = 0;
    const lines = [];
    for (const m of materiels) {
      for (const dep of (m.deployments || [])) {
        if (dep.chantierId !== chantierId) continue;
        // Effective overlap days with dateRange
        const dStart = dep.start, dEnd = dep.end;
        const overlap = overlapDays(dStart, dEnd, dateRange);
        if (overlap <= 0) continue;
        const c = Math.round(toCents(m.cost) * (+dep.qty || 0) * overlap);
        cents += c;
        lines.push({ kind: 'equipment', id: `${m.id}|${dep.id}`, date: dStart, label: m.name, qty: dep.qty, days: overlap, cents: c });
      }
    }
    return { cents, value: fromCents(cents), lines };
  }

  // PAYMENTS received from client
  function paymentsForChantier(chantierId, { payments, dateRange }) {
    let cents = 0;
    const lines = [];
    for (const p of (payments || [])) {
      if (p.chantierId !== chantierId) continue;
      if (dateRange && !inRange(p.date, dateRange)) continue;
      const c = toCents(p.amount);
      cents += c;
      lines.push({ ...p, cents: c });
    }
    return { cents, value: fromCents(cents), lines };
  }

  // ─── Per-chantier rollup ──────────────────────────────────────
  function chantierMetrics(chantier, srcs) {
    const materials = materialsSpentForChantier(chantier.id, srcs);
    const labor     = laborSpentForChantier(chantier.id, srcs);
    const equipment = equipmentSpentForChantier(chantier.id, srcs);
    const payments  = paymentsForChantier(chantier.id, srcs);

    const spentCents = materials.cents + labor.cents + equipment.cents;
    const budgetCents = toCents(chantier.budget || (chantier.budgetMO || 0));
    const contractCents = toCents(chantier.contractValue || 0);
    const receivedCents = payments.cents;

    const remainingCents = budgetCents - spentCents;
    const consumedPct = budgetCents > 0 ? (spentCents / budgetCents) * 100 : null;

    // Projected final cost based on time elapsed vs % complete
    const projectedCents = projectFinalCost(chantier, spentCents);
    const projectedOverrunCents = projectedCents - budgetCents;

    // Margins
    const currentMarginCents = contractCents > 0 ? contractCents - spentCents : null;
    const projectedMarginCents = contractCents > 0 ? contractCents - projectedCents : null;
    const currentMarginPct = contractCents > 0 ? (currentMarginCents / contractCents) * 100 : null;
    const projectedMarginPct = contractCents > 0 ? (projectedMarginCents / contractCents) * 100 : null;

    // Health: red if over budget or projected loss, amber if >80% or low margin, green otherwise
    let health = 'green';
    if (spentCents > budgetCents || (projectedMarginCents !== null && projectedMarginCents < 0)) health = 'red';
    else if ((consumedPct !== null && consumedPct > 80) || (projectedMarginPct !== null && projectedMarginPct < 10)) health = 'amber';

    return {
      chantier,
      budget: fromCents(budgetCents), budgetCents,
      spent: fromCents(spentCents), spentCents,
      remaining: fromCents(remainingCents), remainingCents,
      consumedPct,
      contractValue: fromCents(contractCents), contractCents,
      received: fromCents(receivedCents), receivedCents,
      outstanding: fromCents(contractCents - receivedCents),
      materials, labor, equipment, payments,
      projectedFinalCost: fromCents(projectedCents),
      projectedOverrun: fromCents(projectedOverrunCents),
      currentMargin: currentMarginCents !== null ? fromCents(currentMarginCents) : null,
      projectedMargin: projectedMarginCents !== null ? fromCents(projectedMarginCents) : null,
      currentMarginPct, projectedMarginPct,
      pctComplete: computePctComplete(chantier),
      health
    };
  }

  function projectFinalCost(chantier, spentCents) {
    const pct = computePctComplete(chantier);
    if (!pct || pct <= 0) return spentCents;
    if (pct >= 100) return spentCents;
    // Burn rate extrapolation: spent / pct = projected total
    return Math.round(spentCents / (pct / 100));
  }

  function computePctComplete(chantier) {
    // Time-based: elapsed / total duration
    const start = chantier.dateStart ? new Date(chantier.dateStart) : null;
    const end = chantier.dateEndPrev ? new Date(chantier.dateEndPrev) : null;
    if (!start || !end || end <= start) return null;
    const today = new Date(window.TODAY.year, window.TODAY.monthIdx, window.TODAY.day);
    if (today <= start) return 0;
    if (today >= end) return 100;
    return ((today - start) / (end - start)) * 100;
  }

  // ─── Portfolio rollup ─────────────────────────────────────────
  function portfolioMetrics(chantiers, srcs) {
    const perChantier = chantiers.map(c => chantierMetrics(c, srcs));
    const totals = perChantier.reduce((acc, m) => {
      acc.budgetCents      += m.budgetCents;
      acc.spentCents       += m.spentCents;
      acc.contractCents    += m.contractCents;
      acc.receivedCents    += m.receivedCents;
      acc.materialsCents   += m.materials.cents;
      acc.laborCents       += m.labor.cents;
      acc.equipmentCents   += m.equipment.cents;
      return acc;
    }, { budgetCents:0, spentCents:0, contractCents:0, receivedCents:0, materialsCents:0, laborCents:0, equipmentCents:0 });

    const buckets = {
      onBudget: perChantier.filter(m => m.health === 'green').length,
      atRisk:   perChantier.filter(m => m.health === 'amber').length,
      overBudget: perChantier.filter(m => m.health === 'red').length
    };

    return {
      perChantier,
      budget: fromCents(totals.budgetCents),
      spent: fromCents(totals.spentCents),
      contractValue: fromCents(totals.contractCents),
      received: fromCents(totals.receivedCents),
      materials: fromCents(totals.materialsCents),
      labor: fromCents(totals.laborCents),
      equipment: fromCents(totals.equipmentCents),
      grossMargin: fromCents(totals.contractCents - totals.spentCents),
      grossMarginPct: totals.contractCents > 0 ? ((totals.contractCents - totals.spentCents) / totals.contractCents) * 100 : null,
      activeCount: perChantier.length,
      ...buckets
    };
  }

  // ─── Reconciliation check ─────────────────────────────────────
  // Re-aggregates from raw sources and compares to portfolioMetrics totals.
  // Returns { ok: bool, drifts: [{ field, expected, actual, deltaCents }] }
  function reconcile(chantiers, srcs, port) {
    let mat = 0, lab = 0, pay = 0;
    for (const u of srcs.consumption) {
      const it = srcs.items.find(i => i.id === u.itemId);
      if (!it) continue;
      mat += Math.round(toCents(it.price) * (+u.qty || 0));
    }
    for (const w of srcs.workers) {
      const days = srcs.pointage[w.id] || {};
      for (const dk of Object.keys(days)) {
        const c = days[dk];
        if (c?.statut !== 'P') continue;
        if (!chantiers.find(x => x.id === c.chantierId)) continue;
        lab += toCents(w.tarif) + toCents(c.prime || 0);
      }
    }
    for (const p of (srcs.payments || [])) {
      if (!chantiers.find(x => x.id === p.chantierId)) continue;
      pay += toCents(p.amount);
    }
    const drifts = [];
    const expMat = Math.round(toCents(port.materials));
    const expLab = Math.round(toCents(port.labor));
    const expPay = Math.round(toCents(port.received));
    if (Math.abs(expMat - mat) > 0) drifts.push({ field: 'materials', expectedCents: expMat, actualCents: mat });
    if (Math.abs(expLab - lab) > 0) drifts.push({ field: 'labor', expectedCents: expLab, actualCents: lab });
    if (Math.abs(expPay - pay) > 0) drifts.push({ field: 'payments', expectedCents: expPay, actualCents: pay });
    return { ok: drifts.length === 0, drifts, computedAt: Date.now() };
  }

  // ─── Burn rate series (for line chart) ────────────────────────
  function burnRateSeries(chantier, srcs, granularity = 'week') {
    // Build cumulative spent over time
    const events = [];
    // Materials
    for (const u of srcs.consumption) {
      if (u.chantierId !== chantier.id) continue;
      const it = srcs.items.find(i => i.id === u.itemId);
      if (!it) continue;
      events.push({ date: u.date, cents: Math.round(toCents(it.price) * (+u.qty || 0)) });
    }
    // Labor
    for (const w of srcs.workers) {
      const days = srcs.pointage[w.id] || {};
      for (const dk of Object.keys(days)) {
        const c = days[dk];
        if (c?.statut !== 'P' || c.chantierId !== chantier.id) continue;
        events.push({ date: dk, cents: toCents(w.tarif) + toCents(c.prime || 0) });
      }
    }
    events.sort((a,b) => a.date.localeCompare(b.date));
    // Bucket by week
    const buckets = {};
    for (const ev of events) {
      const key = bucketKey(ev.date, granularity);
      buckets[key] = (buckets[key] || 0) + ev.cents;
    }
    let cum = 0;
    return Object.entries(buckets).sort().map(([key, c]) => {
      cum += c;
      return { date: key, cents: c, cumulativeCents: cum, value: fromCents(cum) };
    });
  }

  function bucketKey(dateStr, gran) {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (gran === 'month') return `${y}-${String(m).padStart(2,'0')}`;
    // weekly: anchor to Monday
    const dt = new Date(y, m-1, d);
    const dow = (dt.getDay() + 6) % 7; // 0=Mon
    dt.setDate(dt.getDate() - dow);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  }

  // ─── Range helpers ────────────────────────────────────────────
  function inRange(isoDate, range) {
    if (!range) return true;
    const { from, to } = range;
    if (from && isoDate < from) return false;
    if (to && isoDate > to) return false;
    return true;
  }
  function overlapDays(start, end, range) {
    const s = new Date(start);
    const e = end ? new Date(end) : s;
    if (range?.from) {
      const r = new Date(range.from);
      if (e < r) return 0;
      if (s < r) { /* clamp */ const ms = r - s; s.setTime(r.getTime()); }
    }
    if (range?.to) {
      const r = new Date(range.to);
      if (s > r) return 0;
      if (e > r) e.setTime(r.getTime());
    }
    return Math.max(0, Math.floor((e - s) / 86400000) + 1);
  }

  // ─── Self-tests (run once on load, fail loudly) ───────────────
  function selfTest() {
    const T = []; // assertions
    const assert = (label, ok, detail) => T.push({ label, ok, detail });

    // money math
    assert('toCents/fromCents roundtrip', fromCents(toCents(1234.56)) === 1234.56);
    assert('no float drift on sum', toCents(0.1) + toCents(0.2) === toCents(0.3));

    // zero budget
    const ch0 = { id: 'z', dateStart: '2026-01-01', dateEndPrev: '2026-12-31', budget: 0, contractValue: 0 };
    const srcs0 = { consumption: [], items: [], pointage: {}, workers: [], payments: [], materiels: [] };
    const m0 = chantierMetrics(ch0, srcs0);
    assert('zero budget → no division', m0.consumedPct === null);
    assert('zero contract → margin null', m0.currentMargin === null);
    assert('green when no activity', m0.health === 'green');

    // over budget
    const items = [{ id:'i', price: 100, unit:'sac' }];
    const consumption = [{ id:'u', chantierId:'c', itemId:'i', qty: 20, date:'2026-05-01' }];
    const chOver = { id:'c', dateStart:'2026-01-01', dateEndPrev:'2026-12-31', budget: 1000, contractValue: 3000 };
    const m1 = chantierMetrics(chOver, { consumption, items, pointage:{}, workers:[], payments:[], materiels:[] });
    assert('materials cost = qty × price', m1.materials.value === 2000);
    assert('spent over budget triggers red', m1.health === 'red');
    assert('current margin = contract - spent', m1.currentMargin === 1000);

    // labor
    const workers = [{ id:'w', nom:'X', tarif: 200 }];
    const pointage = { w: { '2026-05-01': { statut:'P', chantierId:'c', prime: 50 } } };
    const m2 = chantierMetrics(chOver, { consumption:[], items:[], pointage, workers, payments:[], materiels:[] });
    assert('labor = tarif + prime', m2.labor.value === 250);

    // payments
    const payments = [{ id:'p', chantierId:'c', date:'2026-05-01', amount: 500 }];
    const m3 = chantierMetrics(chOver, { consumption:[], items:[], pointage:{}, workers:[], payments, materiels:[] });
    assert('payments aggregate', m3.received === 500);
    assert('outstanding = contract - received', m3.outstanding === 2500);

    // portfolio reconcile
    const port = portfolioMetrics([chOver], { consumption, items, pointage, workers, payments, materiels:[] });
    const rec = reconcile([chOver], { consumption, items, pointage, workers, payments, materiels:[] }, port);
    assert('reconciliation passes', rec.ok === true);

    const failed = T.filter(t => !t.ok);
    if (failed.length > 0) {
      console.error('[Budget engine] Self-tests failed:', failed);
    }
    return { total: T.length, passed: T.length - failed.length, failed };
  }

  const __testResults = selfTest();

  window.BudgetEngine = {
    chantierMetrics,
    portfolioMetrics,
    materialsSpentForChantier,
    laborSpentForChantier,
    equipmentSpentForChantier,
    paymentsForChantier,
    burnRateSeries,
    reconcile,
    computePctComplete,
    selfTest,
    __testResults,
    toCents, fromCents
  };
})();
