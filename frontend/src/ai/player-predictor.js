/* ==========================================================================
   Adaptive AI Battleship — Player Next-Shot Predictor
   ========================================================================== */

import { BOARD_SIZE } from '../types/constants.js';

export class PlayerShotPredictor {
  static predictNextPlayerShot(playerShotsOnEnemy = []) {
    if (playerShotsOnEnemy.length < 3) {
      return {
        status: 'insufficient_data',
        candidates: [],
        explanation: 'Insufficient data: Player has fired fewer than 3 shots in this match.',
      };
    }

    const shotSet = new Set(playerShotsOnEnemy.map(s => `${s.cell.row},${s.cell.col}`));
    const lastShot = playerShotsOnEnemy[playerShotsOnEnemy.length - 1].cell;
    const candidates = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!shotSet.has(`${r},${c}`)) {
          const distToLast = Math.hypot(r - lastShot.row, c - lastShot.col);
          const score = Math.max(0, 100 - distToLast * 18);
          candidates.push({
            cell: { row: r, col: c },
            relativeScore: Math.round(score),
          });
        }
      }
    }

    candidates.sort((a, b) => b.relativeScore - a.relativeScore);

    return {
      status: 'predicted',
      candidates: candidates.slice(0, 8),
      explanation: 'Estimating player click likelihood from localized proximity to recent shot coordinates.',
    };
  }
}

