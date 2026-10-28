/*
 * Browser-local player fleet occupancy model.
 *
 * It learns from completed fleet layouts that the player actually deployed.
 * Player attack coordinates are intentionally not used as ship-placement
 * evidence. This lightweight empirical-Bayes profile supplies a prior only;
 * the current game's observable shot history and legal PDM remain authoritative.
 */

import { OCCUPANCY_MLP, scoreOccupancyCandidate } from './occupancy-mlp.js';

const BOARD_SIZE = 10;
const FLEET_CELLS = 17;
const PRIOR_LAYOUT_STRENGTH = 4;
const MAX_PROFILE_WEIGHT = 0.25;
const MIN_LAYOUTS = 2;

export class PersonalizedOccupancyModel {
  static combine(candidates, layoutHistory, observableState) {
    const layoutCount = layoutHistory.length;
    const occupancyCounts = new Uint16Array(BOARD_SIZE * BOARD_SIZE);
    for (const layout of layoutHistory) {
      for (const cell of layout.cells) {
        const row = Number(cell.row);
        const col = Number(cell.col);
        if (Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
          occupancyCounts[row * BOARD_SIZE + col] += 1;
        }
      }
    }

    const priorProbability = FLEET_CELLS / (BOARD_SIZE * BOARD_SIZE);
    const profileScores = candidates.map(({ cell }) => {
      const index = cell.row * BOARD_SIZE + cell.col;
      return (occupancyCounts[index] + PRIOR_LAYOUT_STRENGTH * priorProbability) /
        (layoutCount + PRIOR_LAYOUT_STRENGTH);
    });
    const ruleTotal = candidates.reduce((sum, candidate) => sum + Math.max(0, candidate.score), 0) || 1;
    const modelScores = OCCUPANCY_MLP.recommended_hybrid_weight > 0
      ? candidates.map(({ cell }) => scoreOccupancyCandidate(observableState, cell))
      : candidates.map(() => 0);
    const modelTotal = modelScores.reduce((sum, score) => sum + score, 0) || 1;
    const profileTotal = profileScores.reduce((sum, score) => sum + score, 0) || 1;
    const profileWeight = layoutCount >= MIN_LAYOUTS
      ? MAX_PROFILE_WEIGHT * layoutCount / (layoutCount + PRIOR_LAYOUT_STRENGTH + 8)
      : 0;
    const modelWeight = OCCUPANCY_MLP.recommended_hybrid_weight || 0;
    const ruleWeight = 1 - modelWeight - profileWeight;

    const ranked = candidates.map((candidate, index) => {
      const ruleShare = Math.max(0, candidate.score) / ruleTotal;
      const modelShare = modelScores[index] / modelTotal;
      const profileShare = profileScores[index] / profileTotal;
      return {
        ...candidate,
        ruleScore: candidate.score,
        occupancyScore: modelScores[index],
        score: ruleWeight * ruleShare + modelWeight * modelShare + profileWeight * profileShare,
      };
    });
    const maxScore = Math.max(...ranked.map(candidate => candidate.score), 0);
    for (const candidate of ranked) {
      candidate.relativeScore = maxScore > 0 ? Math.round(candidate.score / maxScore * 100) : 0;
    }
    ranked.sort((a, b) => b.score - a.score);

    return {
      candidates: ranked,
      active: true,
      layoutCount,
      profileWeight,
      modelWeight,
      explanation: layoutCount >= MIN_LAYOUTS
        ? `Combines current-game legal placements with the validated synthetic occupancy weight (${Math.round(modelWeight * 100)}%) and a smoothed profile from ${layoutCount} completed fleet layouts stored in this browser (${Math.round(profileWeight * 100)}% of relative ranking). Previously fired cells remain excluded.`
        : modelWeight > 0
          ? `The offline-trained synthetic occupancy model contributes ${Math.round(modelWeight * 100)}% alongside rule-based targeting. Insufficient data for personal adaptation: ${layoutCount}/${MIN_LAYOUTS} completed fleet layouts stored in this browser.`
          : `Rule-based targeting is active. The synthetic model received zero weight during validation, so it is excluded. Personal adaptation starts after ${MIN_LAYOUTS} completed fleet layouts are stored in this browser; current count: ${layoutCount}.`,
    };
  }
}
