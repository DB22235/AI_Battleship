/* ==========================================================================
   Adaptive AI Battleship — Leakage-Safe Observable State Builder
   ========================================================================== */

import { BOARD_SIZE } from '../types/constants.js';

export function buildObservableAIState(playerBoard, sonarObservations = [], sonarAvailable = false) {
  const shotsTaken = [];
  const shotResults = [];

  for (const shot of playerBoard.shots) {
    shotsTaken.push({ row: shot.cell.row, col: shot.cell.col });
    shotResults.push({
      cell: { row: shot.cell.row, col: shot.cell.col },
      result: shot.result,
    });
  }

  return {
    boardSize: BOARD_SIZE,
    shotsTaken,
    shotResults,
    remainingShipLengths: playerBoard.getRemainingShipLengths(),
    knownSunkShipLengths: playerBoard.getSunkShipLengths(),
    sonarObservations: sonarObservations.map(({ center, count, shotsObserved }) => ({
      center: { row: center.row, col: center.col },
      count,
      ...(Number.isInteger(shotsObserved) ? { shotsObserved } : {}),
    })),
    sonarAvailable,
  };
}
