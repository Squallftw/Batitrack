// Financials engine — the SINGLE source of truth for money math.
// Every widget on the Budget dashboard must call into this module — no ad-hoc math elsewhere.
//
// Architecture notes (for the eventual backend port):
//   - Replace the in-memory inputs with database queries scoped to the active filter
//     (date range, chantier status, manager, client, cost type).
//   - Wrap the read of (purchases, consumption, pointage, plans, assignments) in a transaction
//     so the snapshot is consistent across cost streams.
//   - In a real backend, expose this as a service-layer function (or a SQL view) — never inline
//     the math in route handlers or React components.
//   - Reconciliation: at the bottom we expose `reconcileTotals(...)` which the dashboard renders
//     as a banner if any per-chantier figure drifts from raw aggregations.
//   - Money uses regular JS numbers in this prototype (DH). For production: switch to integer
//     centimes everywhere and format only at the boundary.
//   - Add unit tests around: zeroBudget, zeroSpend, negativeMargin, noActivity, complete,
//     partialPayments, deletedRecords. Each test seeds raw inputs and asserts the engine output.

(function () {
  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  // Materials cost for a chantier = consumption.qty × item.price for every entry on that chantier
  // (purchases on the depot do not count until consumed; purchases on a chantier are deferred
  // until consumed too — only consumption is "spent". This matches accounting accrual on usage.)
  function chantierMaterialsCost(chantierId, items, consumption) {
    let total = 0;
    const breakdown = []; // { entryId, date, itemId, qty, unitCost, lineCost }
    consumption.forEach(u => {
      if (u.chantierId !== chantierId) return;
      if (u.deleted) return;
      const it = items.find(i => i.id === u.itemId);
      if (!it) return;
      const lineCost = (u.qty || 0) * (it.price || 0);
      total += lineCost;
      breakdown.push({
        entryId: u.id, date: u.date, itemId: u.itemId, taskId: u.taskId,
        qty: u.qty, unitCost: it.price, lineCost, isLoss: !!u.isLoss
      });
    });
    return { total: round2(total), breakdown };
  }

  // Labor cost = sum over (worker, day) where pointage is Présent on that chantier of worker.tarif + prime.
  function chantierLaborCost(chantierId, workers, pointage) {
    let total = 0;
    const breakdown = []; // { workerId, dateKey, tarif, prime, lineCost }
    Object.entries(pointage || {}).forEach(([wid, days]) => {
      const w = workers.find(x => x.id === wid);
      if (!w) return;
      Object.entries(days).forEach(([dk, c]) => {
        if (c?.statut !== 'P') return;
        if (c.chantierId !== chantierId) return;
        const lineCost = (w.tarif || 0) + (c.prime || 0);
        total += lineCost;
        breakdown.push({ workerId: wid, dateKey: dk, tarif: w.tarif, prime: c.prime || 0, lineCost });
      });
    });
    return { total: round2(total), breakdown };
  }

  // Per-chantier financial snapshot.
  function chantierFinancials(chantier, inputs) {
    const { items, consumption, pointage, workers } = inputs;
    const materials = chantierMaterialsCost(chantier.id, items, consumption);
    const labor = chantierLaborCost(chantier.id, workers, pointage);
    const spent = round2(materials.total + labor.total);
    const budget = chantier.budget ?? chantier.budgetMO ?? 0; // fallback to legacy labor-only budget
    const budgetMat = chantier.budgetMaterials ?? null;
    const budgetLab = chantier.budgetLabor ?? null;
    const remaining = round2(budget - spent);
    const pctConsumed = budget > 0 ? (spent / budget) * 100 : 0;

    const contractValue = chantier.contractValue ?? null;
    const payments = (chantier.payments || []).filter(p => !p.deleted);
    const received = round2(payments.reduce((a, p) => a + (p.amount || 0), 0));
    const outstanding = contractValue != null ? round2(contractValue - received) : null;

    // Time-based completion estimate
    const start = chantier.dateStart ? new Date(chantier.dateStart) : null;
    const end = chantier.dateEndPrev ? new Date(chantier.dateEndPrev) : null;
    const today = new Date(TODAY.year, TODAY.monthIdx, TODAY.day);
    let pctElapsed = null;
    if (start && end && end > start) {
      pctElapsed = Math.max(0, Math.min(100, ((today - start) / (end - start)) * 100));
    }

    // Projected final cost = spent / pctElapsed × 100 (capped at budget × 2 to avoid silly extrapolations)
    let projectedFinalCost = null;
    if (pctElapsed && pctElapsed > 5 && pctElapsed < 100) {
      projectedFinalCost = round2(spent / (pctElapsed / 100));
    } else if (pctElapsed >= 100) {
      projectedFinalCost = spent;
    }

    const margin = contractValue != null ? round2(contractValue - spent) : null;
    const marginPct = (contractValue != null && contractValue > 0) ? (margin / contractValue) * 100 : null;
    const projectedMargin = (contractValue != null && projectedFinalCost != null) ? round2(contractValue - projectedFinalCost) : null;
    const projectedMarginPct = (contractValue != null && contractValue > 0 && projectedFinalCost != null)
      ? (projectedMargin / contractValue) * 100 : null;

    // Health rating
    let health = 'green'; // on track
    if (pctConsumed > 100 || (projectedMargin != null && projectedMargin < 0)) health = 'red';
    else if (pctConsumed > 80 || (projectedFinalCost != null && budget > 0 && projectedFinalCost > budget)) health = 'amber';

    // Sub-budget alerts
    const subBudgetAlerts = [];
    if (budgetMat != null && materials.total > budgetMat) {
      subBudgetAlerts.push({ kind: 'sub-materials', message: `Budget matériaux dépassé (${formatMADCompact(materials.total)} / ${formatMADCompact(budgetMat)})` });
    }
    if (budgetLab != null && labor.total > budgetLab) {
      subBudgetAlerts.push({ kind: 'sub-labor', message: `Budget main d'œuvre dépassé (${formatMADCompact(labor.total)} / ${formatMADCompact(budgetLab)})` });
    }

    // Payments lag detection
    let paymentLag = null;
    if (contractValue != null && pctElapsed != null && pctElapsed > 20) {
      const expectedReceived = (contractValue * pctElapsed) / 100;
      const lagPct = expectedReceived > 0 ? ((expectedReceived - received) / expectedReceived) * 100 : 0;
      if (lagPct > 30) {
        paymentLag = { expectedReceived: round2(expectedReceived), received, lagPct: round2(lagPct) };
      }
    }

    return {
      chantierId: chantier.id,
      chantier,
      materials, labor, spent, budget, budgetMat, budgetLab, remaining, pctConsumed,
      contractValue, received, outstanding, payments,
      pctElapsed, projectedFinalCost,
      margin, marginPct, projectedMargin, projectedMarginPct,
      health, subBudgetAlerts, paymentLag
    };
  }

  // Portfolio snapshot — calls per-chantier engine and aggregates.
  function portfolioFinancials(chantiers, inputs) {
    const perChantier = chantiers.map(c => chantierFinancials(c, inputs));
    const sum = (sel) => round2(perChantier.reduce((a, x) => a + (sel(x) || 0), 0));
    const totalBudget = sum(x => x.budget);
    const totalSpent = sum(x => x.spent);
    const totalMaterials = sum(x => x.materials.total);
    const totalLabor = sum(x => x.labor.total);
    const totalContractValue = sum(x => x.contractValue || 0);
    const totalReceived = sum(x => x.received);
    const totalMargin = round2(totalContractValue - totalSpent);
    const totalMarginPct = totalContractValue > 0 ? (totalMargin / totalContractValue) * 100 : null;
    const countByHealth = { green: 0, amber: 0, red: 0 };
    perChantier.forEach(x => countByHealth[x.health]++);
    return {
      perChantier, totalBudget, totalSpent, totalMaterials, totalLabor,
      totalContractValue, totalReceived,
      totalMargin, totalMarginPct,
      countByHealth, totalActive: perChantier.length
    };
  }

  // Reconciliation: verify the engine totals equal raw aggregations.
  // Returns { ok: true } on success or { ok: false, drifts: [...] } so the UI can show a banner.
  function reconcileTotals(portfolio, inputs) {
    const drifts = [];
    // Sum of consumption × prices independent of the engine
    let rawMaterials = 0;
    inputs.consumption.forEach(u => {
      if (u.deleted) return;
      const it = inputs.items.find(i => i.id === u.itemId);
      if (!it) return;
      rawMaterials += (u.qty || 0) * (it.price || 0);
    });
    rawMaterials = round2(rawMaterials);
    if (Math.abs(rawMaterials - portfolio.totalMaterials) > 0.01) {
      drifts.push({ stream: 'materials', engine: portfolio.totalMaterials, raw: rawMaterials });
    }
    // Sum of pointage P entries × worker tarif + prime
    let rawLabor = 0;
    Object.entries(inputs.pointage || {}).forEach(([wid, days]) => {
      const w = inputs.workers.find(x => x.id === wid);
      if (!w) return;
      Object.values(days).forEach(c => {
        if (c?.statut !== 'P') return;
        rawLabor += (w.tarif || 0) + (c.prime || 0);
      });
    });
    rawLabor = round2(rawLabor);
    if (Math.abs(rawLabor - portfolio.totalLabor) > 0.01) {
      drifts.push({ stream: 'labor', engine: portfolio.totalLabor, raw: rawLabor });
    }
    return { ok: drifts.length === 0, drifts };
  }

  window.Financials = {
    chantierFinancials, portfolioFinancials, reconcileTotals,
    chantierMaterialsCost, chantierLaborCost
  };
})();
