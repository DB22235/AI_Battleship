/* ==========================================================================
   Adaptive AI Battleship — Difficulty Policies & Shot Selector
   ========================================================================== */

import { areCellsEqual } from '../types/constants.js';
import { PDMSolver } from './pdm-solver.js';
import { LocalStorageProvider } from '../storage/storage.js';

export class AIPolicies {
  static selectTarget(difficulty, state) {
    switch (difficulty.toLowerCase()) {
      case 'recruit':
        return this.recruitPolicy(state);
      case 'adaptive':
        return this.adaptivePolicy(state);
      case 'commander':
        return this.commanderPolicy(state);
      case 'strategist':
      default:
        return this.strategistPolicy(state);
    }
  }

  static recruitPolicy(state) {
    const shotSet = new Set(state.shotsTaken.map(c => `${c.row},${c.col}`));
    const unsunkHits = state.shotResults
      .filter(sr => sr.result === 'hit')
      .map(sr => sr.cell);

    if (unsunkHits.length > 0) {
      const adjacentCandidates = [];
      const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];

      for (const hit of unsunkHits) {
        for (const [dr, dc] of deltas) {
          const nr = hit.row + dr;
          const nc = hit.col + dc;
          if (nr >= 0 && nr < state.boardSize && nc >= 0 && nc < state.boardSize) {
            if (!shotSet.has(`${nr},${nc}`)) {
              adjacentCandidates.push({ row: nr, col: nc });
            }
          }
        }
      }

      if (adjacentCandidates.length > 0) {
        const picked = adjacentCandidates[Math.floor(Math.random() * adjacentCandidates.length)];
        return {
          targetCell: picked,
          strategy: 'Recruit (Hit Proximity Follow-up)',
          modelStatus: 'rule_based',
          explanation: 'Randomly checking orthogonal neighbors of an active unsunk hit.',
          candidates: adjacentCandidates.map(c => ({ cell: c, score: 50, relativeScore: 50 })),
        };
      }
    }

    const unshotCells = [];
    for (let r = 0; r < state.boardSize; r++) {
      for (let c = 0; c < state.boardSize; c++) {
        if (!shotSet.has(`${r},${c}`)) {
          unshotCells.push({ row: r, col: c });
        }
      }
    }

    const targetCell = unshotCells[Math.floor(Math.random() * unshotCells.length)];
    return {
      targetCell,
      strategy: 'Recruit (Uniform Random)',
      modelStatus: 'rule_based',
      explanation: 'Exploring legal cells uniformly at random.',
      candidates: unshotCells.slice(0, 10).map(c => ({ cell: c, score: 10, relativeScore: 10 })),
    };
  }

  static strategistPolicy(state) {
    const { candidates } = PDMSolver.computeDensity(state);
    if (candidates.length === 0) {
      return this.recruitPolicy(state);
    }

    const topScore = candidates[0].score;
    const topCandidates = candidates.filter(c => c.score >= topScore * 0.95);
    const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    const hasHits = state.shotResults.some(sr => sr.result === 'hit');
    const explanation = hasHits
      ? 'Target mode active: tracking ship orientation and bounding unhit segments.'
      : 'Hunt mode active: probing high-probability cells on parity checkerboard.';

    return {
      targetCell: selected.cell,
      strategy: 'Strategist (Probability Density Solver)',
      modelStatus: 'rule_based',
      explanation,
      candidates: candidates.slice(0, 15),
    };
  }

  static adaptivePolicy(state) {
    const { candidates } = PDMSolver.computeDensity(state);
    if (candidates.length === 0) {
      return this.recruitPolicy(state);
    }

    const history = LocalStorageProvider.getHistory();
    const hasEnoughData = history.length >= 2;

    if (!hasEnoughData) {
      const res = this.strategistPolicy(state);
      return {
        ...res,
        strategy: 'Adaptive (Rule-Based Fallback Active)',
        modelStatus: 'demo_model',
        explanation: 'Insufficient player history in this browser (< 2 matches). Rule-based fallback active.',
      };
    }

    const patterns = LocalStorageProvider.getPlayerShotPatterns();
    const totalRecorded = patterns._totalShots || 1;

    for (const item of candidates) {
      const clickCount = patterns[`${item.cell.row},${item.cell.col}`] || 0;
      const playerPreference = clickCount / totalRecorded;
      item.score = item.score * 0.8 + (playerPreference * 100) * 0.2;
    }

    candidates.sort((a, b) => b.score - a.score);
    const selected = candidates[0];

    return {
      targetCell: selected.cell,
      strategy: 'Adaptive (Hybrid PDM + Local Player Profile)',
      modelStatus: 'demo_model',
      explanation: 'Blending probability density solver with observed player click density from local browser history.',
      candidates: candidates.slice(0, 15),
    };
  }

  static commanderPolicy(state) {
    const { candidates } = PDMSolver.computeDensity(state);
    if (candidates.length === 0) {
      return this.recruitPolicy(state);
    }

    const selected = candidates[0];

    return {
      targetCell: selected.cell,
      strategy: 'Commander (Optimal PDM Solver)',
      modelStatus: 'rule_based',
      explanation: 'Zero tie-breaking jitter. Targeting the absolute mathematical maximum probability density cell.',
      candidates: candidates.slice(0, 15),
    };
  }
}
