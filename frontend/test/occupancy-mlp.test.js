import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreOccupancyCandidate, OCCUPANCY_MLP } from '../src/ai/occupancy-mlp.js';
import { PersonalizedOccupancyModel } from '../src/ai/personalized-occupancy.js';

test('browser occupancy inference scores an unshot candidate from observable state', () => {
  const state = {
    boardSize: 10,
    shotsTaken: [{ row: 4, col: 4 }],
    shotResults: [{ cell: { row: 4, col: 4 }, result: 'hit' }],
    remainingShipLengths: [5, 4, 3, 3, 2],
    knownSunkShipLengths: [],
  };
  const score = scoreOccupancyCandidate(state, { row: 4, col: 5 });
  assert.equal(Number.isFinite(score), true);
  assert.ok(score >= 0 && score <= 1);
  assert.equal(OCCUPANCY_MLP.features.length, OCCUPANCY_MLP.weights.mean.length);
});

test('occupancy inference does not require hidden fleet coordinates', () => {
  const state = { shotsTaken: [], shotResults: [], remainingShipLengths: [5, 4, 3, 3, 2] };
  const candidate = { row: 0, col: 0 };
  assert.equal(Number.isFinite(scoreOccupancyCandidate(state, candidate)), true);
  assert.equal(Object.hasOwn(state, 'hiddenFleet'), false);
});

test('the unvalidated occupancy model stays out of runtime rankings at zero weight', () => {
  const candidates = [
    { cell: { row: 0, col: 0 }, score: 10 },
    { cell: { row: 9, col: 9 }, score: 1 },
  ];
  const result = PersonalizedOccupancyModel.combine(candidates, [], {
    shotsTaken: [], shotResults: [], remainingShipLengths: [5, 4, 3, 3, 2],
  });
  assert.equal(result.modelWeight, 0);
  assert.deepEqual(result.candidates.map(({ cell }) => cell), candidates.map(({ cell }) => cell));
});
