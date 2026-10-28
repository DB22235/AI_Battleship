/* ==========================================================================
   Adaptive AI Battleship — Types, Constants & Coordinate Utilities (React)
   ========================================================================== */

export const BOARD_SIZE = 10;
export const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
export const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

/**
 * Canonical 5-ship fleet defined in AGENTS.md
 */
export const FLEET_CONFIG = [
  { id: 'carrier', name: 'Carrier', length: 5 },
  { id: 'battleship', name: 'Battleship', length: 4 },
  { id: 'cruiser', name: 'Cruiser', length: 3 },
  { id: 'submarine', name: 'Submarine', length: 3 },
  { id: 'destroyer', name: 'Destroyer', length: 2 },
];

/**
 * 4 Difficulty tiers matching AGENTS.md
 */
export const DIFFICULTY_LEVELS = {
  RECRUIT: {
    id: 'recruit',
    name: 'Recruit',
    tagline: 'Casual Recon',
    description: 'Random legal shots with basic orthogonal hit follow-up.',
    modelStatus: 'rule_based',
    unlockedByDefault: true,
  },
  STRATEGIST: {
    id: 'strategist',
    name: 'Strategist',
    tagline: 'Algorithmic Hunter',
    description: 'Rule-based probability-density hunt-and-target with parity pruning.',
    modelStatus: 'rule_based',
    unlockedByDefault: true,
  },
  ADAPTIVE: {
    id: 'adaptive',
    name: 'Adaptive',
    tagline: 'Pattern Sensitive',
    description: 'Rule-based targeting with a local profile learned from your completed fleet layouts.',
    modelStatus: 'rule_based',
    unlockedByDefault: false,
    unlockWinsRequired: 2,
  },
  COMMANDER: {
    id: 'commander',
    name: 'Commander',
    tagline: 'Maximum Precision',
    description: 'Optimal probability-density solver with zero random tie-breaking jitter.',
    modelStatus: 'rule_based',
    unlockedByDefault: false,
    unlockWinsRequired: 4,
  },
};

export function rowColToLabel(row, col) {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return '??';
  }
  return `${COL_LABELS[col]}${ROW_LABELS[row]}`;
}

export function labelToRowCol(label) {
  if (!label || label.length < 2) return null;
  const colChar = label[0].toUpperCase();
  const rowStr = label.slice(1);
  const col = COL_LABELS.indexOf(colChar);
  const row = parseInt(rowStr, 10) - 1;
  if (col < 0 || col >= BOARD_SIZE || isNaN(row) || row < 0 || row >= BOARD_SIZE) {
    return null;
  }
  return { row, col };
}

export function areCellsEqual(c1, c2) {
  return c1 && c2 && c1.row === c2.row && c1.col === c2.col;
}
