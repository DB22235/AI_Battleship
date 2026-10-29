/* ==========================================================================
   Adaptive AI Battleship — Board State Model
   ========================================================================== */

import { BOARD_SIZE, areCellsEqual } from '../types/constants.js';
import { RulesValidator } from './rules.js';

export class Board {
  constructor(isPlayerBoard = true) {
    this.isPlayerBoard = isPlayerBoard;
    this.ships = [];
    this.shots = [];
    this.grid = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => ({
        shot: false,
        result: null,
        shipId: null,
      }))
    );
  }

  setFleet(ships) {
    this.ships = ships.map(s => ({ ...s, hits: 0, sunk: false }));
    for (const ship of this.ships) {
      for (const cell of ship.cells) {
        this.grid[cell.row][cell.col].shipId = ship.id;
      }
    }
  }

  isCellShot(row, col) {
    if (!RulesValidator.isCellInBounds(row, col)) return true;
    return this.grid[row][col].shot;
  }

  isLegalSonarCenter(row, col) {
    return Number.isInteger(row) && Number.isInteger(col) &&
      row >= 1 && row <= BOARD_SIZE - 2 && col >= 1 && col <= BOARD_SIZE - 2;
  }

  scanUnshotShipCount(row, col) {
    if (!this.isLegalSonarCenter(row, col)) return null;
    let count = 0;
    for (let r = row - 1; r <= row + 1; r += 1) {
      for (let c = col - 1; c <= col + 1; c += 1) {
        const cell = this.grid[r][c];
        if (cell.shipId !== null && !cell.shot) count += 1;
      }
    }
    return count;
  }

  receiveShot(row, col) {
    if (this.isCellShot(row, col)) {
      return { success: false, reason: 'Cell has already been shot' };
    }

    const cellObj = this.grid[row][col];
    cellObj.shot = true;

    const hitShip = this.ships.find(s =>
      s.cells.some(c => areCellsEqual(c, { row, col }))
    );

    if (hitShip) {
      hitShip.hits += 1;
      const justSunk = hitShip.hits === hitShip.length;
      hitShip.sunk = justSunk;

      const result = justSunk ? 'sunk' : 'hit';
      cellObj.result = result;

      if (justSunk) {
        for (const c of hitShip.cells) {
          this.grid[c.row][c.col].result = 'sunk';
        }
        // Keep observable shot history aligned with the now-known sunk ship.
        for (const shot of this.shots) {
          if (hitShip.cells.some(c => areCellsEqual(c, shot.cell))) {
            shot.result = 'sunk';
          }
        }
      }

      const shotRecord = {
        cell: { row, col },
        result,
        shipId: hitShip.id,
        shipName: hitShip.name,
        justSunk,
      };
      this.shots.push(shotRecord);

      return {
        success: true,
        result,
        hitShip,
        justSunk,
        allSunk: this.isFleetSunk(),
      };
    } else {
      cellObj.result = 'miss';
      const shotRecord = { cell: { row, col }, result: 'miss' };
      this.shots.push(shotRecord);

      return {
        success: true,
        result: 'miss',
        justSunk: false,
        allSunk: false,
      };
    }
  }

  isFleetSunk() {
    return this.ships.length > 0 && this.ships.every(s => s.sunk);
  }

  getRemainingShipLengths() {
    return this.ships.filter(s => !s.sunk).map(s => s.length);
  }

  getSunkShipLengths() {
    return this.ships.filter(s => s.sunk).map(s => s.length);
  }

  getRemainingShipCellsCount() {
    return this.ships.reduce((acc, s) => acc + (s.length - s.hits), 0);
  }
}
