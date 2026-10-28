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
