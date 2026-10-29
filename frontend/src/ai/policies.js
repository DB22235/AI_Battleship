/* ==========================================================================
   Adaptive AI Battleship — Difficulty Policies & Shot Selector
   ========================================================================== */

import { PDMSolver } from './pdm-solver.js';
import { PersonalizedOccupancyModel } from './personalized-occupancy.js';
import { BackendClient } from '../api/backend-client.js';
import { OCCUPANCY_MLP, scoreOccupancyCandidate } from './occupancy-mlp.js';
import { decideSonarAction } from './sonar-action-policy.js';

/**
 * @typedef {{action: 'shot', targetCell: {row: number, col: number}}} ShotAction
 * @typedef {{action: 'scan', center: {row: number, col: number}}} SonarScanAction
 * @typedef {ShotAction | SonarScanAction} AIDecisionAction
 */

const SONAR_ACTION_POLICY_VERSION = 'sonar-action-baseline-v1';

export class AIPolicies {
  static async selectAction(difficulty, state, playerFleetLayouts = []) {
    if (!state.sonarAvailable) {
      const targeting = await this.selectTarget(difficulty, state, playerFleetLayouts);
      return this.asShotAction(targeting);
    }

    // A charge-available power-up decision receives only this match's
    // observable PDM candidates. It does not consult hidden fleet state or
    // browser-stored fleet layouts. The previous occupancy experiment failed
    // its gameplay gate, so its scores are not computed or blended here.
    const { candidates } = PDMSolver.computeDensity(state);
    let rankedCandidates = candidates;
    let occupancyModelVersion = 'none-active';
    if (OCCUPANCY_MLP.gameplay_gate_passed === true &&
        Number.isFinite(OCCUPANCY_MLP.recommended_hybrid_weight) &&
        OCCUPANCY_MLP.recommended_hybrid_weight > 0) {
      const modelWeight = OCCUPANCY_MLP.recommended_hybrid_weight;
      const modelScores = candidates.map(({ cell }) => scoreOccupancyCandidate(state, cell));
      const ruleTotal = candidates.reduce((sum, item) => sum + Math.max(0, item.score), 0) || 1;
      const modelTotal = modelScores.reduce((sum, score) => sum + score, 0) || 1;
      rankedCandidates = candidates.map((item, index) => ({
        ...item,
        score: (1 - modelWeight) * Math.max(0, item.score) / ruleTotal +
          modelWeight * modelScores[index] / modelTotal,
      })).sort((a, b) => b.score - a.score || a.cell.row - b.cell.row || a.cell.col - b.cell.col);
      occupancyModelVersion = OCCUPANCY_MLP.format;
    }

    const action = decideSonarAction({ state, candidates: rankedCandidates });
    return {
      ...action,
      strategy: action.modelStatus === 'trained_action_policy'
        ? 'Trained Sonar Action-Value Policy'
        : action.modelStatus === 'rule_based_fallback'
          ? 'PDM + Fixed Sonar Scan Rule'
          : 'Observable PDM Action Policy',
      occupancyModelVersion,
      ...(occupancyModelVersion !== 'none-active'
        ? { syntheticModelWeight: OCCUPANCY_MLP.recommended_hybrid_weight }
        : { syntheticModelWeight: 0 }),
    };
  }

  static asShotAction(targeting) {
    const { center: _scanCenter, ...analysis } = targeting;
    return {
      ...analysis,
      action: 'shot',
      targetCell: targeting.targetCell,
      policyVersion: targeting.policyVersion || SONAR_ACTION_POLICY_VERSION,
    };
  }

  static bestSonarRegion(candidates, boardSize) {
    if (!candidates.length) return null;
    const scoreByCell = new Map(candidates.map(({ cell, score }) => [`${cell.row},${cell.col}`, Math.max(0, score)]));
    const totalScore = [...scoreByCell.values()].reduce((sum, score) => sum + score, 0);
    if (!totalScore) return null;
    let best = null;
    for (let row = 1; row < boardSize - 1; row += 1) {
      for (let col = 1; col < boardSize - 1; col += 1) {
        let score = 0;
        for (let r = row - 1; r <= row + 1; r += 1) {
          for (let c = col - 1; c <= col + 1; c += 1) score += scoreByCell.get(`${r},${c}`) || 0;
        }
        if (!best || score > best.score) best = { center: { row, col }, score };
      }
    }
    return best ? { ...best, scoreShare: best.score / totalScore } : null;
  }

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
