/* ==========================================================================
   Adaptive AI Battleship — Difficulty Policies & Shot Selector
   ========================================================================== */

import { PDMSolver } from './pdm-solver.js';
import { PersonalizedOccupancyModel } from './personalized-occupancy.js';
import { BackendClient } from '../api/backend-client.js';

export class AIPolicies {
  static async selectTarget(difficulty, state, playerFleetLayouts = []) {
    switch (difficulty.toLowerCase()) {
      case 'recruit':
        return this.recruitPolicy(state);
      case 'adaptive':
        return this.adaptivePolicy(state, playerFleetLayouts);
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

  static async adaptivePolicy(state, playerFleetLayouts = []) {
    const { candidates } = PDMSolver.computeDensity(state);
    if (candidates.length === 0) {
      return this.recruitPolicy(state);
    }

    let profile;
    try {
      const response = await BackendClient.scoreAdaptive(state, candidates);
      profile = {
        candidates: response.candidates,
        layoutCount: response.profileLayoutCount,
        profileWeight: response.profileWeight,
        modelWeight: response.syntheticModelWeight,
        explanation: response.explanation,
        strategy: response.strategy,
        modelStatus: response.modelStatus,
      };
    } catch (error) {
      profile = PersonalizedOccupancyModel.combine(candidates, playerFleetLayouts, state);
      profile.explanation += ' Backend unavailable; using the browser-local profile fallback.';
      profile.modelStatus = profile.layoutCount >= 2 ? 'local_profile' : 'rule_based';
    }

    const selected = profile.candidates[0];

    return {
      targetCell: selected.cell,
      strategy: profile.strategy || (profile.layoutCount >= 2
        ? 'Adaptive (Rule-Based + Local Fleet Profile)'
        : profile.modelWeight > 0
          ? 'Adaptive (Rule-Based + Synthetic Model; Profile Collecting Data)'
          : 'Adaptive (Rule-Based; Profile Collecting Data)'),
      modelStatus: profile.modelStatus || (profile.layoutCount >= 2 ? 'local_profile' : profile.modelWeight > 0 ? 'trained_model' : 'rule_based'),
      profileLayoutCount: profile.layoutCount,
      profileWeight: profile.profileWeight,
      syntheticModelWeight: profile.modelWeight,
      explanation: profile.explanation,
      candidates: profile.candidates.slice(0, 15),
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
