/**
 * EVM — Earned Value Management calculations
 * PV  = Planned Value (BCWS)   — budget planned to be spent by data date
 * EV  = Earned Value  (BCWP)   — budget for work actually done
 * AC  = Actual Cost   (ACWP)   — actual money spent
 * BAC = Budget at Completion
 *
 * Derived:
 * SV  = EV - PV    (Schedule Variance; negative = behind)
 * CV  = EV - AC    (Cost Variance; negative = over budget)
 * SPI = EV / PV    (Schedule Performance Index; <1 = behind)
 * CPI = EV / AC    (Cost Performance Index; <1 = over cost)
 * EAC = BAC / CPI  (Estimate at Completion)
 * ETC = EAC - AC   (Estimate to Complete)
 * VAC = BAC - EAC  (Variance at Completion)
 * TCPI = (BAC-EV)/(BAC-AC)  (To-Complete Performance Index)
 * Percent Complete = EV / BAC * 100
 */

function calcEVM({ pv, ev, ac, bac }) {
  const _pv  = parseFloat(pv  || 0);
  const _ev  = parseFloat(ev  || 0);
  const _ac  = parseFloat(ac  || 0);
  const _bac = parseFloat(bac || 0);

  const sv   = _ev - _pv;
  const cv   = _ev - _ac;
  const spi  = _pv  > 0 ? _ev / _pv  : null;
  const cpi  = _ac  > 0 ? _ev / _ac  : null;
  const eac  = cpi  && cpi > 0 ? _bac / cpi : (_bac > 0 ? _bac - cv : null);
  const etc  = eac !== null ? eac - _ac : null;
  const vac  = eac !== null ? _bac - eac : null;
  const tcpi = (_bac - _ev) >= 0 && (_bac - _ac) > 0
    ? (_bac - _ev) / (_bac - _ac) : null;
  const percentComplete = _bac > 0 ? (_ev / _bac) * 100 : 0;

  const scheduleStatus =
    spi === null ? 'unknown' :
    spi >= 1.05  ? 'ahead' :
    spi >= 0.95  ? 'on_track' :
    spi >= 0.85  ? 'slightly_behind' : 'behind';

  const costStatus =
    cpi === null ? 'unknown' :
    cpi >= 1.05  ? 'under_budget' :
    cpi >= 0.95  ? 'on_budget' :
    cpi >= 0.85  ? 'slightly_over' : 'over_budget';

  return {
    pv: _pv, ev: _ev, ac: _ac, bac: _bac,
    sv, cv,
    spi: spi ? +spi.toFixed(4) : null,
    cpi: cpi ? +cpi.toFixed(4) : null,
    eac: eac ? +eac.toFixed(2) : null,
    etc: etc ? +etc.toFixed(2) : null,
    vac: vac ? +vac.toFixed(2) : null,
    tcpi: tcpi ? +tcpi.toFixed(4) : null,
    percent_complete: +percentComplete.toFixed(2),
    schedule_status: scheduleStatus,
    cost_status: costStatus,
  };
}

/**
 * Aggregate EVM from array of activities.
 * Each activity needs: planned_value, earned_value, actual_cost, budget_at_completion
 */
function aggregateEVM(activities) {
  const totals = activities.reduce((acc, a) => ({
    pv:  acc.pv  + parseFloat(a.planned_value           || 0),
    ev:  acc.ev  + parseFloat(a.earned_value            || 0),
    ac:  acc.ac  + parseFloat(a.actual_cost             || 0),
    bac: acc.bac + parseFloat(a.budget_at_completion    || 0),
  }), { pv: 0, ev: 0, ac: 0, bac: 0 });

  return calcEVM(totals);
}

module.exports = { calcEVM, aggregateEVM };
