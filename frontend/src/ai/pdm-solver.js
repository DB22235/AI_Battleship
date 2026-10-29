/* ==========================================================================
   Adaptive AI Battleship — Probability Density Matrix (PDM) Solver
   ========================================================================== */

import { BOARD_SIZE, areCellsEqual } from '../types/constants.js';

export class PDMSolver {
  static computeDensity(state) {
    const size = state.boardSize || BOARD_SIZE;
    const heatmap = Array.from({ length: size }, () => Array(size).fill(0));

    const shotSet = new Set(state.shotsTaken.map(c => `${c.row},${c.col}`));
    const missSet = new Set();
    const sunkSet = new Set();
    const unsunkHits = [];

    for (const sr of state.shotResults) {
      const key = `${sr.cell.row},${sr.cell.col}`;
      if (sr.result === 'miss') {
        missSet.add(key);
      } else if (sr.result === 'sunk') {
        sunkSet.add(key);
      } else if (sr.result === 'hit') {
        unsunkHits.push(sr.cell);
      }
    }

    const inTargetMode = unsunkHits.length > 0;
    const remainingLengths = state.remainingShipLengths.length > 0
      ? state.remainingShipLengths
      : [2];

    const minLength = Math.min(...remainingLengths);

    for (const length of remainingLengths) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c <= size - length; c++) {
          let isValid = true;
          let hitsCovered = 0;
          const placementCells = [];

          for (let i = 0; i < length; i++) {
            const cell = { row: r, col: c + i };
            const key = `${cell.row},${cell.col}`;
            if (missSet.has(key) || sunkSet.has(key)) {
              isValid = false;
              break;
            }
            if (unsunkHits.some(h => areCellsEqual(h, cell))) {
              hitsCovered++;
            }
            placementCells.push(cell);
          }

          if (isValid) {
            let weight = 1;
            if (inTargetMode) {
              if (hitsCovered === 0) {
                weight = 0.05;
              } else {
                weight = Math.pow(15, hitsCovered);
              }
            }

            for (const cell of placementCells) {
              const key = `${cell.row},${cell.col}`;
              if (!shotSet.has(key)) {
                heatmap[cell.row][cell.col] += weight;
              }
            }
          }
        }
      }

      for (let c = 0; c < size; c++) {
        for (let r = 0; r <= size - length; r++) {
          let isValid = true;
          let hitsCovered = 0;
          const placementCells = [];

          for (let i = 0; i < length; i++) {
            const cell = { row: r + i, col: c };
            const key = `${cell.row},${cell.col}`;
            if (missSet.has(key) || sunkSet.has(key)) {
              isValid = false;
              break;
            }
            if (unsunkHits.some(h => areCellsEqual(h, cell))) {
              hitsCovered++;
            }
            placementCells.push(cell);
          }

          if (isValid) {
            let weight = 1;
            if (inTargetMode) {
              if (hitsCovered === 0) {
                weight = 0.05;
              } else {
                weight = Math.pow(15, hitsCovered);
              }
            }

            for (const cell of placementCells) {
              const key = `${cell.row},${cell.col}`;
              if (!shotSet.has(key)) {
                heatmap[cell.row][cell.col] += weight;
              }
            }
          }
        }
      }
    }

    if (!inTargetMode && minLength >= 2) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if ((r + c) % minLength !== 0) {
            heatmap[r][c] *= 0.15;
          }
        }
      }
    }

    // Sonar counts are aggregate constraints, not per-cell labels. Reweight
    // each scanned region by its observed remaining occupancy versus the
    // PDM's approximate expected occupancy. A zero count is an exact exclusion.
    for (const scan of state.sonarObservations || []) {
      const { row, col } = scan.center;
      let remainingCount = scan.count;
      const shotsAtScan = Number.isInteger(scan.shotsObserved) ? scan.shotsObserved : 0;
      for (const shot of state.shotResults.slice(shotsAtScan)) {
        const inRegion = Math.abs(shot.cell.row - row) <= 1 && Math.abs(shot.cell.col - col) <= 1;
        if (inRegion && (shot.result === 'hit' || shot.result === 'sunk')) remainingCount -= 1;
      }
      const regionCells = [];
      for (let r = row - 1; r <= row + 1; r += 1) {
        for (let c = col - 1; c <= col + 1; c += 1) {
          if (!shotSet.has(`${r},${c}`)) regionCells.push({ row: r, col: c });
        }
      }
      remainingCount = Math.max(0, Math.min(regionCells.length, remainingCount));
      const expectedCount = regionCells.reduce((sum, cell) => sum + heatmap[cell.row][cell.col], 0) /
        (candidatesDenominator(heatmap) || 1) * remainingLengths.reduce((sum, length) => sum + length, 0);
      if (remainingCount === 0) {
        for (const cell of regionCells) heatmap[cell.row][cell.col] = 0;
      } else {
        const scale = Math.max(0.25, Math.min(4, remainingCount / Math.max(expectedCount, 0.25)));
        for (const cell of regionCells) heatmap[cell.row][cell.col] *= scale;
      }
    }

    const candidates = [];
    let maxScore = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!shotSet.has(`${r},${c}`)) {
          const score = heatmap[r][c];
          candidates.push({ cell: { row: r, col: c }, score });
          if (score > maxScore) maxScore = score;
        }
      }
    }

    if (maxScore > 0) {
      for (const item of candidates) {
        item.relativeScore = Math.round((item.score / maxScore) * 100);
      }
    } else {
      for (const item of candidates) {
        item.relativeScore = 0;
      }
    }

    candidates.sort((a, b) => b.score - a.score);

    return { heatmap, candidates };
  }
}

function candidatesDenominator(heatmap) {
  return heatmap.reduce((sum, row) => sum + row.reduce((rowSum, score) => rowSum + score, 0), 0);
}
