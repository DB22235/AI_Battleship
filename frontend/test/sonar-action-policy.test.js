import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decideSonarAction,
  sonarPolicyContext,
  SONAR_POLICY_VERSION,
  FIXED_SCAN_POLICY_VERSION,
} from '../src/ai/sonar-action-policy.js';
import { AIPolicies } from '../src/ai/policies.js';

function broadCandidates() {
  return Array.from({ length: 100 }, (_, index) => ({
    cell: { row: Math.floor(index / 10), col: index % 10 },
    score: index < 9 ? 10 : 1,
  }));
}

function state(overrides = {}) {
  return {
    boardSize: 10,
    shotsTaken: [],
    shotResults: [],
    remainingShipLengths: [5, 4, 3, 3, 2],
    knownSunkShipLengths: [],
    sonarObservations: [],
    sonarAvailable: true,
    ...overrides,
  };
}

function trainedArtifact(observation, candidates, scanActions = 20, shotActions = 25) {
  const context = sonarPolicyContext(observation, candidates);
  return {
    format: 'adaptive-battleship-sonar-tabular-q-v1',
    version: SONAR_POLICY_VERSION,
    runtimeEnabled: true,
    minimumVisitsPerAction: 5,
    table: {
      [context.key]: {
        shot: { meanRemainingActions: shotActions, visits: 30 },
        scan: { meanRemainingActions: scanActions, visits: 30 },
      },
    },
  };
}

test('trained policy emits only legal shot or interior 3×3 scan actions', () => {
  const observation = state({ shotsTaken: [{ row: 0, col: 0 }], shotResults: [{ cell: { row: 0, col: 0 }, result: 'miss' }] });
  const candidates = broadCandidates().filter(({ cell }) => cell.row !== 0 || cell.col !== 0);
  const artifact = trainedArtifact(observation, candidates);
  const decision = decideSonarAction({ state: observation, candidates, artifact });
  assert.ok(['shot', 'scan'].includes(decision.action));
  if (decision.action === 'scan') {
    assert.ok(decision.center.row >= 1 && decision.center.row <= 8);
    assert.ok(decision.center.col >= 1 && decision.center.col <= 8);
    assert.equal(Object.hasOwn(decision, 'targetCell'), false);
  } else {
    assert.ok(candidates.some(({ cell }) => cell.row === decision.targetCell.row && cell.col === decision.targetCell.col));
    assert.equal(observation.shotsTaken.some(cell => cell.row === decision.targetCell.row && cell.col === decision.targetCell.col), false);
  }
});

test('inference is deterministic for the same observable state, artifact, and seed', () => {
  const observation = state();
  const candidates = broadCandidates();
  const artifact = trainedArtifact(observation, candidates);
  const first = decideSonarAction({ state: observation, candidates, artifact, seed: 9182 });
  const second = decideSonarAction({ state: observation, candidates, artifact, seed: 9182 });
  assert.deepEqual(first, second);
});

test('policy inference reads no hidden fleet data', () => {
  const observation = state();
  Object.defineProperty(observation, 'hiddenFleet', { get() { throw new Error('hidden fleet accessed'); } });
  const candidates = broadCandidates();
  const decision = decideSonarAction({ state: observation, candidates,
    artifact: trainedArtifact(observation, candidates), seed: 3 });
  assert.ok(['shot', 'scan'].includes(decision.action));
  assert.equal(Object.hasOwn(decision, 'hiddenFleet'), false);
});

test('charge-available action selection does not inspect stored fleet history', async () => {
  const original = AIPolicies.selectTarget;
  AIPolicies.selectTarget = async () => { throw new Error('historical fleet profile was consulted'); };
  try {
    const layouts = new Proxy([], { get() { throw new Error('fleet history accessed'); } });
    const decision = await AIPolicies.selectAction('adaptive', state(), layouts);
    assert.ok(['shot', 'scan'].includes(decision.action));
    assert.equal(decision.occupancyModelVersion, 'none-active');
  } finally {
    AIPolicies.selectTarget = original;
  }
});

test('structured reason and action values describe the selected action', () => {
  const observation = state();
  const candidates = broadCandidates();
  const context = sonarPolicyContext(observation, candidates);
  const scan = decideSonarAction({ state: observation, candidates,
    artifact: trainedArtifact(observation, candidates, 20, 25) });
  assert.equal(scan.action, 'scan');
  assert.deepEqual(scan.center, context.region.center);
  assert.match(scan.decisionReason, /^Scanned:/);
  assert.equal(scan.modelVersion, SONAR_POLICY_VERSION);
  assert.equal(scan.policyFeatures.bestRegionRelativeScoreShare, context.features.bestRegionRelativeScoreShare);
  assert.equal(scan.actionValues.scan.estimatedRemainingActions, 20);

  const fire = decideSonarAction({ state: observation, candidates,
    artifact: trainedArtifact(observation, candidates, 28, 25) });
  assert.equal(fire.action, 'shot');
  assert.match(fire.decisionReason, /^Fired:/);
  assert.ok(candidates.some(({ cell }) => cell.row === fire.targetCell.row && cell.col === fire.targetCell.col));
});

test('charge unavailable preserves a normal shot and never selects scan', () => {
  const observation = state({ sonarAvailable: false });
  const candidates = broadCandidates();
  const decision = decideSonarAction({ state: observation, candidates,
    artifact: trainedArtifact(observation, candidates) });
  assert.equal(decision.action, 'shot');
  assert.match(decision.decisionReason, /charge is unavailable/i);
});

test('missing, invalid, disabled, or unsupported artifacts use the fixed-rule fallback', () => {
  const observation = state({
    shotsTaken: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
    shotResults: [0, 1, 2].map(col => ({ cell: { row: 0, col }, result: 'miss' })),
  });
  const candidates = broadCandidates().filter(({ cell }) => cell.row !== 0 || cell.col > 2);
  for (const artifact of [null, {}, { ...trainedArtifact(observation, candidates), runtimeEnabled: false }]) {
    const decision = decideSonarAction({ state: observation, candidates, artifact });
    assert.equal(decision.policyVersion, FIXED_SCAN_POLICY_VERSION);
    assert.equal(decision.modelStatus, 'rule_based_fallback');
    assert.match(decision.decisionReason, /fallback/i);
  }
  const unsupported = trainedArtifact(observation, candidates);
  unsupported.table = {};
  const decision = decideSonarAction({ state: observation, candidates, artifact: unsupported });
  assert.equal(decision.policyVersion, FIXED_SCAN_POLICY_VERSION);
});
