export function evaluateAudit(id, checks, runnerOutputs, reference) {
  const issues = [];

  if (!checks.rejectsInvalidCalendar) {
    issues.push('rolls over invalid ISO dates (2026-02-31)');
  }
  if (checks.springForwardDst !== reference.checks.springForwardDst) {
    issues.push(`spring-forward DST shift (${checks.springForwardDst} vs ${reference.checks.springForwardDst})`);
  }
  if (checks.leapYearClamp !== '2025-02-28') {
    issues.push(`leap-year clamp (${checks.leapYearClamp} vs 2025-02-28)`);
  }

  let dstMatches = 0;
  for (let i = 0; i < reference.dstOut.length; i++) {
    if (runnerOutputs.dstOut[i] === reference.dstOut[i]) dstMatches++;
  }
  const dstAccuracyPct = Number(((dstMatches / reference.dstOut.length) * 100).toFixed(1));
  if (dstAccuracyPct < 100) {
    issues.push(`DST array parity ${dstAccuracyPct}%`);
  }

  if (runnerOutputs.parseSum !== reference.parseSum) {
    issues.push(`parse checksum ${runnerOutputs.parseSum} != ${reference.parseSum}`);
  }
  if (runnerOutputs.gridHits !== reference.gridHits) {
    issues.push(`month grid hits ${runnerOutputs.gridHits} != ${reference.gridHits}`);
  }
  if (runnerOutputs.openSlots !== reference.openSlots) {
    issues.push(`booking slots ${runnerOutputs.openSlots} != ${reference.openSlots}`);
  }

  return {
    passed: issues.length === 0,
    dstAccuracyPct,
    rejectsInvalidCalendar: checks.rejectsInvalidCalendar,
    leapYearClamp: checks.leapYearClamp === '2025-02-28',
    issues,
  };
}
