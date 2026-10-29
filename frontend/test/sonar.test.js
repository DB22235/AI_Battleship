import test from 'node:test';
import assert from 'node:assert/strict';
import { Board } from '../src/engine/board.js';
import { GameEngine, GAME_STATES } from '../src/engine/game.js';
import { buildObservableAIState } from '../src/ai/observable.js';
import { AIPolicies } from '../src/ai/policies.js';
import { PDMSolver } from '../src/ai/pdm-solver.js';
import { BackendClient } from '../src/api/backend-client.js';
import { LocalStorageProvider } from '../src/storage/storage.js';

const fleet = [
  { id: 'carrier', name: 'Carrier', length: 5, orientation: 'H', cells: [0, 1, 2, 3, 4].map(col => ({ row: 0, col })) },
  { id: 'battleship', name: 'Battleship', length: 4, orientation: 'H', cells: [0, 1, 2, 3].map(col => ({ row: 2, col })) },
  { id: 'cruiser', name: 'Cruiser', length: 3, orientation: 'H', cells: [0, 1, 2].map(col => ({ row: 4, col })) },
  { id: 'submarine', name: 'Submarine', length: 3, orientation: 'H', cells: [3, 4, 5].map(col => ({ row: 4, col })) },
  { id: 'destroyer', name: 'Destroyer', length: 2, orientation: 'H', cells: [0, 1].map(col => ({ row: 6, col })) },
];

const memoryStorage = new Map();
globalThis.localStorage = {
  getItem: key => memoryStorage.get(key) ?? null,
  setItem: (key, value) => memoryStorage.set(key, String(value)),
  removeItem: key => memoryStorage.delete(key),
};

function makeBoard() {
  const board = new Board(true);
  board.setFleet(fleet);
  return board;
}

function patchPolicy(t, action) {
  const original = AIPolicies.selectAction;
  AIPolicies.selectAction = async () => action;
  t.after(() => { AIPolicies.selectAction = original; });
}

function putEngineInAITurn(engine) {
  engine.state = GAME_STATES.AI_PROCESSING;
}

test('Sonar centers are legal only when the complete 3×3 region is in bounds', () => {
  const board = makeBoard();
  assert.equal(board.isLegalSonarCenter(1, 1), true);
  assert.equal(board.isLegalSonarCenter(8, 8), true);
  for (const [row, col] of [[0, 1], [9, 8], [1, 0], [8, 9], [-1, 4], [4, 10]]) {
    assert.equal(board.isLegalSonarCenter(row, col), false, `expected (${row}, ${col}) to be illegal`);
  }
});

test('Sonar returns only the count of unshot ship cells in the centered 3×3 region', () => {
  const board = makeBoard();
  // The center region rows 3–5, columns 3–5 intersects cells (4,3), (4,4), (4,5).
  assert.equal(board.scanUnshotShipCount(4, 4), 3);
  assert.equal(board.scanUnshotShipCount(8, 8), 0);
});

test('Sonar excludes ship cells that have already been shot', () => {
  const board = makeBoard();
  assert.equal(board.receiveShot(4, 3).result, 'hit');
  assert.equal(board.scanUnshotShipCount(4, 4), 2);
  assert.equal(board.receiveShot(4, 4).result, 'hit');
  assert.equal(board.scanUnshotShipCount(4, 4), 1);
});

test('AI observations contain aggregate scan records but no hidden cells or ship identity', () => {
  const board = makeBoard();
  board.receiveShot(4, 3);
  const observed = buildObservableAIState(board, [{ center: { row: 4, col: 4 }, count: 2 }], true);
  assert.deepEqual(observed.sonarObservations, [{ center: { row: 4, col: 4 }, count: 2 }]);
  assert.equal(observed.sonarAvailable, true);
  const serialized = JSON.stringify(observed);
  for (const forbidden of ['ships', 'shipId', 'shipName', 'cells', 'grid', 'carrier', 'battleship']) {
    assert.equal(serialized.includes(forbidden), false, `observation leaked ${forbidden}`);
  }
  assert.equal(Object.hasOwn(observed.sonarObservations[0], 'cells'), false);
});

test('a zero-count scan removes its still-unshot region from PDM candidates', () => {
  const state = {
    boardSize: 10,
    shotsTaken: [],
    shotResults: [],
    remainingShipLengths: [5, 4, 3, 3, 2],
    sonarObservations: [{ center: { row: 4, col: 4 }, count: 0, shotsObserved: 0 }],
  };
  const { candidates } = PDMSolver.computeDensity(state);
  assert.ok(candidates.filter(({ cell }) => Math.abs(cell.row - 4) <= 1 && Math.abs(cell.col - 4) <= 1)
    .every(candidate => candidate.score === 0));
});

test('rule-based action selection may spend the charge when a legal region is concentrated', async (t) => {
  const originalTarget = AIPolicies.selectTarget;
  const originalDensity = PDMSolver.computeDensity;
  AIPolicies.selectTarget = async () => ({ targetCell: { row: 5, col: 5 }, candidates: [] });
  const candidates = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) candidates.push({ cell: { row, col }, score: 10 });
  }
  candidates.push({ cell: { row: 9, col: 9 }, score: 10 });
  PDMSolver.computeDensity = () => ({ candidates });
  t.after(() => {
    AIPolicies.selectTarget = originalTarget;
    PDMSolver.computeDensity = originalDensity;
  });
  const state = {
    boardSize: 10,
    shotsTaken: [{ row: 0, col: 9 }, { row: 9, col: 0 }, { row: 9, col: 9 }],
    shotResults: [{ result: 'miss' }, { result: 'miss' }, { result: 'miss' }],
    remainingShipLengths: [5, 4, 3, 3, 2],
    sonarAvailable: true,
  };
  const action = await AIPolicies.selectAction('strategist', state);
  assert.equal(action.action, 'scan');
  assert.deepEqual(action.center, { row: 1, col: 1 });
  assert.equal(Object.hasOwn(action, 'targetCell'), false);
});

test('Recruit, Strategist, Adaptive, and Commander retain normal shot actions when sonar is unavailable', async (t) => {
  const originalScoreAdaptive = BackendClient.scoreAdaptive;
  BackendClient.scoreAdaptive = async (_state, candidates) => ({
    candidates,
    profileLayoutCount: 0,
    profileWeight: 0,
    syntheticModelWeight: 0,
    strategy: 'Adaptive fallback fixture',
    modelStatus: 'rule_based',
    explanation: 'Test-only local fallback.',
  });
  t.after(() => { BackendClient.scoreAdaptive = originalScoreAdaptive; });
  const state = {
    boardSize: 10,
    shotsTaken: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }],
    shotResults: [
      { cell: { row: 0, col: 0 }, result: 'miss' },
      { cell: { row: 0, col: 1 }, result: 'miss' },
      { cell: { row: 1, col: 0 }, result: 'miss' },
    ],
    remainingShipLengths: [5, 4, 3, 3, 2],
    knownSunkShipLengths: [],
    sonarObservations: [],
    sonarAvailable: false,
  };
  for (const difficulty of ['recruit', 'strategist', 'adaptive', 'commander']) {
    const action = await AIPolicies.selectAction(difficulty, state, []);
    assert.equal(action.action, 'shot', `${difficulty} should return a shot action`);
    assert.ok(action.targetCell, `${difficulty} should retain a target cell`);
    assert.equal(Object.hasOwn(action, 'center'), false);
  }
});

test('an AI scan consumes its only charge and passes the turn without firing', async (t) => {
  patchPolicy(t, { action: 'scan', center: { row: 4, col: 4 }, strategy: 'Sonar Scan' });
  const engine = new GameEngine();
  engine.startMatch('strategist', fleet);
  putEngineInAITurn(engine);
  const shotCount = engine.playerBoard.shots.length;
  await engine._executeAITurn();
  assert.equal(engine.sonarAvailable, false);
  assert.equal(engine.sonarObservations.length, 1);
  assert.equal(engine.playerBoard.shots.length, shotCount);
  assert.equal(engine.state, GAME_STATES.PLAYER_TURN);
  assert.equal(engine.turnNumber, 2);
  const [decision] = engine.aiDecisionLog;
  assert.equal(decision.action, 'scan');
  assert.equal(decision.chargeBefore, true);
  assert.equal(decision.chargeAfter, false);
  assert.equal(decision.scanResultCount, 3);
  assert.equal(decision.policyVersion, 'sonar-action-baseline-v1');
  assert.ok(decision.modelVersion);
  assert.equal(typeof decision.decisionReason, 'string');
  assert.equal(Object.hasOwn(decision, 'targetRow'), false);
  assert.equal(Object.hasOwn(decision, 'targetCol'), false);
  assert.equal(Object.hasOwn(decision.observationSummary, 'ships'), false);
  const serializedDecision = JSON.stringify(decision);
  for (const forbidden of ['shipId', 'shipName', 'fleetCells', 'shipCells', 'hiddenFleet']) {
    assert.equal(serializedDecision.includes(forbidden), false, `decision log leaked ${forbidden}`);
  }
});

test('charge-available engine decisions do not read stored player fleet layouts', async (t) => {
  const engine = new GameEngine();
  engine.startMatch('adaptive', fleet);
  const original = LocalStorageProvider.getPlayerFleetLayouts;
  LocalStorageProvider.getPlayerFleetLayouts = () => { throw new Error('hidden fleet history accessed'); };
  t.after(() => { LocalStorageProvider.getPlayerFleetLayouts = original; });
  putEngineInAITurn(engine);
  await engine._executeAITurn();
  const decision = engine.aiDecisionLog.at(-1);
  assert.ok(['shot', 'scan'].includes(decision.action));
  assert.equal(decision.policyVersion, 'sonar-fixed-scan-v1');
  assert.equal(decision.modelVersion, 'none-active');
  assert.ok(decision.policyFeatures);
  assert.match(decision.decisionReason, /Signals: \{"features":/);
  assert.deepEqual(decision.observedOutcome.type, decision.action);
  assert.equal(Object.hasOwn(decision, 'hiddenFleet'), false);
  clearTimeout(engine.aiTurnTimer);
});

test('a second scan is rejected after the one-match charge is spent', async (t) => {
  patchPolicy(t, { action: 'scan', center: { row: 4, col: 4 } });
  const engine = new GameEngine();
  engine.startMatch('strategist', fleet);
  putEngineInAITurn(engine);
  await engine._executeAITurn();
  putEngineInAITurn(engine);
  const historyLength = engine.sonarObservations.length;
  await engine._executeAITurn();
  assert.equal(engine.sonarObservations.length, historyLength);
  assert.equal(engine.sonarAvailable, false);
  assert.equal(engine.aiDecisionLog.filter(decision => decision.action === 'scan').length, 1);
  assert.equal(engine.playerBoard.shots.length, 1);
  clearTimeout(engine.aiTurnTimer);
});

test('a new match restores exactly one Sonar charge', () => {
  const engine = new GameEngine();
  engine.startMatch('strategist', fleet);
  engine.sonarAvailable = false;
  engine.startMatch('strategist', fleet);
  assert.equal(engine.sonarAvailable, true);
  assert.deepEqual(engine.sonarObservations, []);
});

test('an illegal scan center is not resolved or recorded and falls back to a legal shot', async (t) => {
  patchPolicy(t, { action: 'scan', center: { row: 0, col: 0 }, targetCell: { row: 9, col: 9 } });
  const engine = new GameEngine();
  engine.startMatch('strategist', fleet);
  putEngineInAITurn(engine);
  await engine._executeAITurn();
  assert.equal(engine.sonarAvailable, true);
  assert.equal(engine.sonarObservations.length, 0);
  assert.equal(engine.playerBoard.shots.length, 1);
  assert.equal(engine.state, GAME_STATES.PLAYER_TURN);
});

test('normal AI shot behavior still retains the turn on hit and passes on miss', async (t) => {
  patchPolicy(t, { action: 'shot', targetCell: { row: 0, col: 0 }, strategy: 'test shot' });
  const engine = new GameEngine();
  engine.startMatch('strategist', fleet);
  putEngineInAITurn(engine);
  await engine._executeAITurn();
  assert.equal(engine.playerBoard.shots.length, 1);
  assert.equal(engine.playerBoard.shots[0].result, 'hit');
  assert.equal(engine.state, GAME_STATES.AI_PROCESSING);
  assert.equal(engine.sonarAvailable, true);
  clearTimeout(engine.aiTurnTimer);
  engine.aiTurnTimer = null;

  AIPolicies.selectAction = async () => ({ action: 'shot', targetCell: { row: 1, col: 9 }, strategy: 'test miss' });
  engine.state = GAME_STATES.AI_PROCESSING;
  await engine._executeAITurn();
  assert.equal(engine.playerBoard.shots[1].result, 'miss');
  assert.equal(engine.state, GAME_STATES.PLAYER_TURN);
  const shotDecision = engine.aiDecisionLog[1];
  assert.equal(shotDecision.action, 'shot');
  assert.deepEqual(shotDecision.selectedTarget, { row: 1, col: 9 });
  assert.equal(shotDecision.chargeBefore, true);
  assert.equal(shotDecision.chargeAfter, true);
  clearTimeout(engine.aiTurnTimer);
});

test('a repeated AI target is rejected and replaced by a legal unshot cell', async (t) => {
  patchPolicy(t, { action: 'shot', targetCell: { row: 0, col: 0 } });
  const engine = new GameEngine();
  engine.startMatch('strategist', fleet);
  putEngineInAITurn(engine);
  await engine._executeAITurn();
  clearTimeout(engine.aiTurnTimer);
  engine.aiTurnTimer = null;
  engine.state = GAME_STATES.AI_PROCESSING;
  await engine._executeAITurn();
  assert.equal(engine.playerBoard.shots.length, 2);
  assert.equal(new Set(engine.playerBoard.shots.map(shot => `${shot.cell.row},${shot.cell.col}`)).size, 2);
  assert.notDeepEqual(engine.playerBoard.shots[1].cell, engine.playerBoard.shots[0].cell);
  clearTimeout(engine.aiTurnTimer);
});

test('pause and resume preserve the current turn without applying an action while paused', async (t) => {
  patchPolicy(t, { action: 'scan', center: { row: 4, col: 4 } });
  const engine = new GameEngine();
  engine.startMatch('strategist', fleet);
  putEngineInAITurn(engine);
  engine.togglePause();
  assert.equal(engine.state, GAME_STATES.PAUSED);
  await engine._executeAITurn();
  assert.equal(engine.sonarObservations.length, 0);
  engine.togglePause();
  assert.equal(engine.state, GAME_STATES.AI_PROCESSING);
  await engine._executeAITurn();
  assert.equal(engine.sonarObservations.length, 1);
  assert.equal(engine.state, GAME_STATES.PLAYER_TURN);
  clearTimeout(engine.aiTurnTimer);
});

test('game-over state rejects scan actions', async (t) => {
  patchPolicy(t, { action: 'scan', center: { row: 4, col: 4 } });
  const engine = new GameEngine();
  engine.startMatch('strategist', fleet);
  engine.state = GAME_STATES.GAME_OVER;
  await engine._executeAITurn();
  assert.equal(engine.sonarObservations.length, 0);
  assert.equal(engine.playerBoard.shots.length, 0);
});

