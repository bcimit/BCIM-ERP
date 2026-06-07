/**
 * CPM Engine — Critical Path Method
 * Forward pass → Early Start / Early Finish
 * Backward pass → Late Start / Late Finish
 * Float = LS - ES (or LF - EF)
 * Critical path = activities with Total Float = 0
 *
 * Dependency types:
 *   FS (Finish-to-Start): successor ES = predecessor EF + lag  [default]
 *   SS (Start-to-Start):  successor ES = predecessor ES + lag
 *   FF (Finish-to-Finish):successor EF = predecessor EF + lag → ES = EF - dur
 *   SF (Start-to-Finish): successor EF = predecessor ES + lag → ES = EF - dur
 */

/**
 * Run CPM on a set of activities + dependencies.
 *
 * @param {Array} activities  — [{id, duration, baseline_start_date, baseline_end_date}]
 * @param {Array} dependencies — [{predecessor_id, successor_id, dependency_type, lag_days}]
 * @param {Date|string} dataDate — project data date / start anchor
 * @returns {Map} activityId → {es, ef, ls, lf, totalFloat, freeFloat, isCritical}
 */
function runCPM(activities, dependencies, dataDate) {
  if (!activities.length) return new Map();

  const actMap = new Map();
  activities.forEach(a => {
    const dur = a.baseline_duration || Math.ceil(
      (new Date(a.baseline_end_date) - new Date(a.baseline_start_date)) / 86400000
    ) || 1;
    actMap.set(a.id, { ...a, dur, es: 0, ef: 0, ls: 0, lf: 0, totalFloat: 0, freeFloat: 0, isCritical: false });
  });

  // Build adjacency
  const successors   = new Map(); // id → [{succ_id, type, lag}]
  const predecessors = new Map(); // id → [{pred_id, type, lag}]
  activities.forEach(a => { successors.set(a.id, []); predecessors.set(a.id, []); });

  dependencies.forEach(d => {
    if (successors.has(d.predecessor_id) && predecessors.has(d.successor_id)) {
      successors.get(d.predecessor_id).push({
        id: d.successor_id, type: d.dependency_type || 'FS', lag: parseInt(d.lag_days || 0)
      });
      predecessors.get(d.successor_id).push({
        id: d.predecessor_id, type: d.dependency_type || 'FS', lag: parseInt(d.lag_days || 0)
      });
    }
  });

  // Topological sort (Kahn's algorithm)
  const inDegree = new Map();
  activities.forEach(a => inDegree.set(a.id, (predecessors.get(a.id) || []).length));

  const queue = [];
  inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });

  const topoOrder = [];
  while (queue.length) {
    const id = queue.shift();
    topoOrder.push(id);
    (successors.get(id) || []).forEach(({ id: succId }) => {
      const newDeg = inDegree.get(succId) - 1;
      inDegree.set(succId, newDeg);
      if (newDeg === 0) queue.push(succId);
    });
  }

  // If cycle detected, fall back to baseline dates
  if (topoOrder.length < activities.length) {
    const result = new Map();
    activities.forEach(a => {
      const dur = actMap.get(a.id).dur;
      result.set(a.id, { es: 0, ef: dur, ls: 0, lf: dur, totalFloat: 0, freeFloat: 0, isCritical: a.is_critical_path || false });
    });
    return result;
  }

  // ── FORWARD PASS ─────────────────────────────────────────────────
  topoOrder.forEach(id => {
    const act = actMap.get(id);
    const preds = predecessors.get(id) || [];

    if (!preds.length) {
      // No predecessors — starts at day 0
      act.es = 0;
    } else {
      let maxES = 0;
      preds.forEach(({ id: predId, type, lag }) => {
        const pred = actMap.get(predId);
        let candidateES = 0;
        switch (type) {
          case 'FS': candidateES = pred.ef + lag; break;
          case 'SS': candidateES = pred.es + lag; break;
          case 'FF': candidateES = pred.ef + lag - act.dur; break;
          case 'SF': candidateES = pred.es + lag - act.dur; break;
          default:   candidateES = pred.ef + lag;
        }
        maxES = Math.max(maxES, candidateES);
      });
      act.es = Math.max(0, maxES);
    }
    act.ef = act.es + act.dur;
  });

  // Project finish = max EF
  const projectFinish = Math.max(...topoOrder.map(id => actMap.get(id).ef));

  // ── BACKWARD PASS ────────────────────────────────────────────────
  [...topoOrder].reverse().forEach(id => {
    const act  = actMap.get(id);
    const succs = successors.get(id) || [];

    if (!succs.length) {
      act.lf = projectFinish;
    } else {
      let minLF = Infinity;
      succs.forEach(({ id: succId, type, lag }) => {
        const succ = actMap.get(succId);
        let candidateLF = Infinity;
        switch (type) {
          case 'FS': candidateLF = succ.ls - lag; break;
          case 'SS': candidateLF = succ.ls - lag + act.dur; break;
          case 'FF': candidateLF = succ.lf - lag; break;
          case 'SF': candidateLF = succ.ls - lag + act.dur; break;
          default:   candidateLF = succ.ls - lag;
        }
        minLF = Math.min(minLF, candidateLF);
      });
      act.lf = minLF === Infinity ? projectFinish : minLF;
    }
    act.ls = act.lf - act.dur;
    act.totalFloat = act.ls - act.es;  // or act.lf - act.ef
    act.isCritical = act.totalFloat <= 0;
  });

  // ── FREE FLOAT ────────────────────────────────────────────────────
  topoOrder.forEach(id => {
    const act = actMap.get(id);
    const succs = successors.get(id) || [];
    if (!succs.length) {
      act.freeFloat = act.lf - act.ef;
    } else {
      let minSuccES = Infinity;
      succs.forEach(({ id: succId, type, lag }) => {
        const succ = actMap.get(succId);
        let v = Infinity;
        switch (type) {
          case 'FS': v = succ.es - lag; break;
          case 'SS': v = succ.es - lag + act.dur; break;
          case 'FF': v = succ.ef - lag; break;
          case 'SF': v = succ.es - lag + act.dur; break;
          default:   v = succ.es - lag;
        }
        minSuccES = Math.min(minSuccES, v);
      });
      act.freeFloat = minSuccES === Infinity ? 0 : Math.max(0, minSuccES - act.ef);
    }
  });

  // Return results map
  const result = new Map();
  actMap.forEach((act, id) => {
    result.set(id, {
      es: act.es, ef: act.ef, ls: act.ls, lf: act.lf,
      totalFloat: act.totalFloat, freeFloat: act.freeFloat,
      isCritical: act.isCritical, duration: act.dur,
    });
  });
  return result;
}

/**
 * Convert CPM day offsets back to real dates from project start.
 * projectStart: the earliest baseline_start_date in the project
 */
function offsetToDate(projectStart, offsetDays) {
  if (!projectStart) return null;
  const d = new Date(projectStart);
  d.setDate(d.getDate() + Math.round(offsetDays));
  return d.toISOString().slice(0, 10);
}

module.exports = { runCPM, offsetToDate };
