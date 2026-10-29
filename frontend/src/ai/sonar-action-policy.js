import { SONAR_ACTION_POLICY } from './sonar-action-policy.generated.js';

export const SONAR_POLICY_VERSION = 'sonar-tabular-q-v1';
export const FIXED_SCAN_POLICY_VERSION = 'sonar-fixed-scan-v1';
export const FIXED_SCAN_SCORE_SHARE = 0.2;
const VALID_FORMAT = 'adaptive-battleship-sonar-tabular-q-v1';

function legalCandidates(state, candidates) {
  const shotSet = new Set((state.shotsTaken || []).map(({ row, col }) => `${row},${col}`));
  return (candidates || []).filter(({ cell, score }) => cell &&
    Number.isInteger(cell.row) && Number.isInteger(cell.col) &&
    cell.row >= 0 && cell.row < state.boardSize && cell.col >= 0 && cell.col < state.boardSize &&
    !shotSet.has(`${cell.row},${cell.col}`) && Number.isFinite(score));
}

function rankDistribution(candidates) {
  const scores = candidates.map(({ score }) => Math.max(0, score));
  const total = scores.reduce((sum, score) => sum + score, 0);
  const shares = total > 0 ? scores.map(score => score / total) : scores.map(() => 1 / Math.max(1, scores.length));
  const denominator = Math.log(Math.max(2, shares.length));
  const entropy = -shares.filter(share => share > 0)
    .reduce((sum, share) => sum + share * Math.log(share), 0) / denominator;
  return { total, shares, entropy: Math.max(0, Math.min(1, entropy)) };
}

export function selectBestSonarRegion(candidates, boardSize = 10) {
  const { total } = rankDistribution(candidates);
  if (total <= 0) return null;
  let best = null;
  for (let row = 1; row < boardSize - 1; row += 1) {
    for (let col = 1; col < boardSize - 1; col += 1) {
      const score = candidates.reduce((sum, candidate) => {
        const inside = Math.abs(candidate.cell.row - row) <= 1 && Math.abs(candidate.cell.col - col) <= 1;
        return sum + (inside ? Math.max(0, candidate.score) : 0);
      }, 0);
      if (!best || score > best.score) best = { center: { row, col }, score };
    }
  }
  return best ? { ...best, scoreShare: best.score / total } : null;
}

export function sonarPolicyContext(state, rankedCandidates) {
  const candidates = legalCandidates(state, rankedCandidates);
  const { entropy } = rankDistribution(candidates);
  const region = selectBestSonarRegion(candidates, state.boardSize || 10);
  const regionShare = region?.scoreShare || 0;
  const activeUnsunkHit = (state.shotResults || []).some(({ result }) => result === 'hit');
  const shotsBucket = (state.shotsTaken || []).length < 3 ? 0 :
    (state.shotsTaken || []).length < 15 ? 1 : 2;
  const fewRemainingShips = (state.remainingShipLengths || []).length <= 2;
  const entropyBucket = Number(entropy >= 0.82);
  const regionBucket = regionShare < 0.15 ? 0 : regionShare < 0.25 ? 1 : 2;
  const features = {
    shotsBucket,
    activeUnsunkHit,
    fewRemainingShips,
    relativeScoreEntropy: entropy,
    bestRegionRelativeScoreShare: regionShare,
    relativeScoreEntropyBucket: entropyBucket,
    regionScoreShareBucket: regionBucket,
    observableScanCount: (state.sonarObservations || []).length,
  };
  return {
    candidates,
    region,
    features,
    key: [shotsBucket, Number(activeUnsunkHit), Number(fewRemainingShips), entropyBucket, regionBucket].join('|'),
  };
}

export function isValidSonarPolicyArtifact(artifact) {
  return Boolean(artifact && artifact.format === VALID_FORMAT && artifact.version === SONAR_POLICY_VERSION &&
    artifact.runtimeEnabled === true && artifact.table && typeof artifact.table === 'object' &&
    Number.isInteger(artifact.minimumVisitsPerAction) && artifact.minimumVisitsPerAction > 0);
}

function supportedActionValues(artifact, key) {
  if (!isValidSonarPolicyArtifact(artifact)) return null;
  const values = artifact.table[key];
  const minimum = artifact.minimumVisitsPerAction;
  if (!values || !['shot', 'scan'].every(action =>
    Number.isFinite(values[action]?.meanRemainingActions) &&
    Number.isInteger(values[action]?.visits) && values[action].visits >= minimum)) return null;
  return {
    shot: { estimatedRemainingActions: values.shot.meanRemainingActions, visits: values.shot.visits },
    scan: { estimatedRemainingActions: values.scan.meanRemainingActions, visits: values.scan.visits },
  };
}

function legalFireCell(context) {
  return [...context.candidates].sort((a, b) => b.score - a.score ||
    a.cell.row - b.cell.row || a.cell.col - b.cell.col)[0]?.cell || null;
}

function explainFire(reason, features, actionValues, region) {
  const share = Math.round((region?.scoreShare || 0) * 100);
  if (actionValues) {
    return `Fired: the tabular policy estimates ${actionValues.shot.estimatedRemainingActions.toFixed(2)} remaining AI actions for firing versus ${actionValues.scan.estimatedRemainingActions.toFixed(2)} after scanning. The best legal region contains ${share}% of normalized relative PDM score mass; score entropy is ${features.relativeScoreEntropy.toFixed(2)} (not a probability).`;
  }
  return reason || `Rule-based fallback fired: the best legal 3×3 region contains ${share}% of normalized relative PDM score mass, below the ${Math.round(FIXED_SCAN_SCORE_SHARE * 100)}% scan threshold.`;
}

export function decideSonarAction({
  state,
  candidates,
  artifact = SONAR_ACTION_POLICY,
  seed = 0,
}) {
  const context = sonarPolicyContext(state, candidates);
  const fireCell = legalFireCell(context);
  const base = {
    seed,
    candidates: [...context.candidates].sort((a, b) => b.score - a.score ||
      a.cell.row - b.cell.row || a.cell.col - b.cell.col).slice(0, 15),
    policyFeatures: context.features,
    selectedRegionScoreShare: context.region?.scoreShare || 0,
    actionValues: null,
  };
  if (!state.sonarAvailable || !context.region || !fireCell) {
    return {
      ...base, action: 'shot', targetCell: fireCell,
      policyVersion: FIXED_SCAN_POLICY_VERSION, modelVersion: 'none-active', modelStatus: 'rule_based',
      decisionReason: !state.sonarAvailable ? 'The scan charge is unavailable; preserved normal legal-shot behavior.' :
        'No legal scan region or legal ranked shot was available; selected a legal shot fallback.',
      explanation: !state.sonarAvailable ? 'Sonar is unavailable. The existing shot policy remains in control.' :
        'No legal scan action was available, so the policy selected a legal ranked shot.',
    };
  }

  const values = supportedActionValues(artifact, context.key);
  if (values) {
    const scan = values.scan.estimatedRemainingActions < values.shot.estimatedRemainingActions;
    const action = scan ? 'scan' : 'shot';
    const reason = scan
      ? `Scanned: the trained tabular policy estimates ${values.scan.estimatedRemainingActions.toFixed(2)} remaining AI actions after scanning versus ${values.shot.estimatedRemainingActions.toFixed(2)} after firing. The selected legal region contains ${Math.round(context.region.scoreShare * 100)}% of normalized relative PDM score mass; relative-score entropy is ${context.features.relativeScoreEntropy.toFixed(2)}, not a calibrated probability.`
      : null;
    return {
      ...base, action, ...(scan ? { center: context.region.center } : { targetCell: fireCell }),
      actionValues: values, policyVersion: SONAR_POLICY_VERSION, modelVersion: SONAR_POLICY_VERSION,
      modelStatus: 'trained_action_policy',
      decisionReason: reason || explainFire(null, context.features, values, context.region),
      explanation: reason || explainFire(null, context.features, values, context.region),
    };
  }

  const fixedScan = (state.shotsTaken || []).length >= 3 &&
    !(state.shotResults || []).some(({ result }) => result === 'hit') &&
    context.region.scoreShare >= FIXED_SCAN_SCORE_SHARE;
  const fallbackReason = isValidSonarPolicyArtifact(artifact)
    ? 'The trained table has insufficient support for this observable state; used the documented fixed scan rule.'
    : 'The trained action artifact is missing, disabled by evaluation, or invalid; used the documented fixed scan rule.';
  const fallbackExplanation = fixedScan
    ? `Rule-based fixed fallback scanned: after at least three shots and with no active unsunk hit, the best legal 3×3 region contains ${Math.round(context.region.scoreShare * 100)}% of normalized relative PDM score mass (threshold ${Math.round(FIXED_SCAN_SCORE_SHARE * 100)}%).`
    : `${fallbackReason} ${explainFire(null, context.features, null, context.region)}`;
  return {
    ...base, action: fixedScan ? 'scan' : 'shot',
    ...(fixedScan ? { center: context.region.center } : { targetCell: fireCell }),
    policyVersion: FIXED_SCAN_POLICY_VERSION, modelVersion: 'none-active', modelStatus: 'rule_based_fallback',
    fallbackReason, decisionReason: fallbackExplanation, explanation: fallbackExplanation,
  };
}
