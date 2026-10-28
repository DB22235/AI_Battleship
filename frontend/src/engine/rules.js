/* ==========================================================================
   Adaptive AI Battleship — Rules Validator & Fleet Geometry
   ========================================================================== */

import { BOARD_SIZE, FLEET_CONFIG } from '../types/constants.js';

export class RulesValidator {
  static isCellInBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  static getShipCells(startRow, startCol, length, orientation) {
    const cells = [];
    for (let i = 0; i < length; i++) {
      const row = orientation === 'V' ? startRow + i : startRow;
      const col = orientation === 'H' ? startCol + i : startCol;
      cells.push({ row, col });
    }
    return cells;
  }

  static isValidPlacement(startRow, startCol, length, orientation, existingShips = []) {
    const candidateCells = this.getShipCells(startRow, startCol, length, orientation);

    for (const cell of candidateCells) {
      if (!this.isCellInBounds(cell.row, cell.col)) {
        return { valid: false, reason: 'Placement extends beyond board boundary' };
      }
    }

    for (const ship of existingShips) {
      for (const shipCell of ship.cells) {
        for (const candidate of candidateCells) {
          if (shipCell.row === candidate.row && shipCell.col === candidate.col) {
            return { valid: false, reason: 'Ships cannot overlap each other' };
          }
        }
      }
    }

    return { valid: true, cells: candidateCells };
  }

  static generateRandomFleet() {
    const ships = [];

    for (const config of FLEET_CONFIG) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 500) {
        attempts++;
        const orientation = Math.random() < 0.5 ? 'H' : 'V';
        const maxRow = orientation === 'V' ? BOARD_SIZE - config.length : BOARD_SIZE - 1;
        const maxCol = orientation === 'H' ? BOARD_SIZE - config.length : BOARD_SIZE - 1;

        const row = Math.floor(Math.random() * (maxRow + 1));
        const col = Math.floor(Math.random() * (maxCol + 1));

        const check = this.isValidPlacement(row, col, config.length, orientation, ships);
        if (check.valid) {
          ships.push({
            id: config.id,
            name: config.name,
            length: config.length,
            orientation,
            startRow: row,
            startCol: col,
            cells: check.cells,
            hits: 0,
            sunk: false,
          });
          placed = true;
        }
      }

      if (!placed) {
        return this.generateRandomFleet();
      }
    }

    return ships;
  }
}
