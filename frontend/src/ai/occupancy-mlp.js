/* Browser inference for the NumPy model exported in model/artifacts. */
import { OCCUPANCY_MLP } from './occupancy-model.generated.js';
export { OCCUPANCY_MLP };

function sigmoid(value) {
  const bounded = Math.max(-30, Math.min(30, value));
  return 1 / (1 + Math.exp(-bounded));
}

function orthogonalNeighbors({ row, col }, diagonal = false) {
  const cells = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if ((dr === 0 && dc === 0) || (!diagonal && Math.abs(dr) + Math.abs(dc) !== 1)) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < 10 && c >= 0 && c < 10) cells.push(`${r},${c}`);
    }
  }
  return cells;
}

export function scoreOccupancyCandidate(state, cell) {
  const { weights, features } = OCCUPANCY_MLP;
  const shotResults = state.shotResults || [];
  const shotSet = new Set((state.shotsTaken || []).map(shot => `${shot.row},${shot.col}`));
  const outcomeByCell = new Map(shotResults.map(({ cell: shotCell, result }) => [
    `${shotCell.row},${shotCell.col}`,
    result,
  ]));
  const sunkCells = new Set(shotResults.filter(shot => shot.result === 'sunk')
    .map(shot => `${shot.cell.row},${shot.cell.col}`));
  const unsunkHits = new Set(shotResults.filter(shot => shot.result === 'hit' &&
    !sunkCells.has(`${shot.cell.row},${shot.cell.col}`))
    .map(shot => `${shot.cell.row},${shot.cell.col}`));
  const misses = new Set(shotResults.filter(shot => shot.result === 'miss')
    .map(shot => `${shot.cell.row},${shot.cell.col}`));
  const orthogonal = orthogonalNeighbors(cell).map(key => key);
  const diagonalAndOrthogonal = orthogonalNeighbors(cell, true);
  const hitCoords = [...unsunkHits].map(key => key.split(',').map(Number));
  const nearestHit = hitCoords.length
    ? Math.min(...hitCoords.map(([row, col]) => Math.abs(cell.row - row) + Math.abs(cell.col - col)))
    : 10;
  const remainingLengths = state.remainingShipLengths || [];
  const featureValues = [
    cell.row / 9,
    cell.col / 9,
    (Math.abs(cell.row - 4.5) + Math.abs(cell.col - 4.5)) / 9,
    Math.min(cell.row, cell.col, 9 - cell.row, 9 - cell.col) / 4.5,
    Number([0, 9].includes(cell.row) && [0, 9].includes(cell.col)),
    cell.row % 2,
    cell.col % 2,
    shotSet.size / 100,
    [...outcomeByCell.values()].filter(result => result === 'hit').length / 17,
    misses.size / 100,
    orthogonal.filter(key => unsunkHits.has(key)).length / 4,
    orthogonal.filter(key => misses.has(key)).length / 4,
    diagonalAndOrthogonal.filter(key => unsunkHits.has(key)).length / 4,
    hitCoords.filter(([row]) => row === cell.row).length / 5,
    hitCoords.filter(([, col]) => col === cell.col).length / 5,
    nearestHit / 10,
    remainingLengths.reduce((sum, length) => sum + length, 0) / 17,
    remainingLengths.length / 5,
  ];

  if (featureValues.length !== features.length) return 0;
  const normalized = featureValues.map((value, i) => Math.max(-5, Math.min(5,
    (value - weights.mean[i]) / (weights.scale[i] || 1))));
  const hidden = weights.b1.map((bias, j) => {
    let activation = bias;
    for (let i = 0; i < normalized.length; i += 1) activation += normalized[i] * weights.w1[i][j];
    return Math.tanh(activation);
  });
  let output = weights.b2[0];
  for (let j = 0; j < hidden.length; j += 1) output += hidden[j] * weights.w2[j][0];
  return sigmoid(output);
}
