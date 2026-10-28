/* ==========================================================================
   Adaptive AI Battleship — Game Controller & State Machine (React)
   ========================================================================== */

import { Board } from './board.js';
import { RulesValidator } from './rules.js';
import { buildObservableAIState } from '../ai/observable.js';
import { AIPolicies } from '../ai/policies.js';
import { LocalStorageProvider } from '../storage/storage.js';

export const GAME_STATES = {
  IDLE: 'IDLE',
  DEPLOYING: 'DEPLOYING',
  PLAYER_TURN: 'PLAYER_TURN',
  AI_PROCESSING: 'AI_PROCESSING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
};

export class GameEngine {
  constructor(listeners = {}) {
    this.state = GAME_STATES.IDLE;
    this.difficulty = 'strategist';
    this.turnNumber = 0;
    this.playerBoard = new Board(true);
    this.enemyBoard = new Board(false);
    this.listeners = listeners;
    this.lastAIResponse = null;
    this.selectedTargetCell = null;
    this.matchStartTime = null;
    this.isPaused = false;
    this.previousStateBeforePause = null;
  }

  startMatch(difficulty, playerFleet) {
    this.difficulty = difficulty;
    this.turnNumber = 1;
    this.matchStartTime = Date.now();
    this.isPaused = false;

    this.playerBoard = new Board(true);
    this.playerBoard.setFleet(playerFleet);

    this.enemyBoard = new Board(false);
    const enemyFleet = RulesValidator.generateRandomFleet();
    this.enemyBoard.setFleet(enemyFleet);

    this.selectedTargetCell = null;
    this.lastAIResponse = null;
    this.state = GAME_STATES.PLAYER_TURN;
    this._notifyState();
  }

  selectTarget(row, col) {
    if (this.state !== GAME_STATES.PLAYER_TURN) return false;
    if (this.enemyBoard.isCellShot(row, col)) return false;

    this.selectedTargetCell = { row, col };
    this._emit('onTargetSelected', this.selectedTargetCell);
    return true;
  }

  async confirmPlayerShot() {
    if (this.state !== GAME_STATES.PLAYER_TURN || !this.selectedTargetCell) {
      return null;
    }

    const { row, col } = this.selectedTargetCell;
    const shotResult = this.enemyBoard.receiveShot(row, col);

    if (!shotResult.success) {
      return null;
    }

    LocalStorageProvider.recordPlayerShot(row, col);

    this._emit('onShotResolved', {
      shooter: 'player',
      cell: { row, col },
      result: shotResult.result,
      hitShip: shotResult.hitShip,
      justSunk: shotResult.justSunk,
    });

    this.selectedTargetCell = null;

    if (shotResult.allSunk) {
      this._finishGame(true);
      return shotResult;
    }

    this.state = GAME_STATES.AI_PROCESSING;
    this._notifyState();

    setTimeout(() => {
      if (this.state === GAME_STATES.AI_PROCESSING) {
        this._executeAITurn();
      }
    }, 500);

    return shotResult;
  }

  _executeAITurn() {
    const observableState = buildObservableAIState(this.playerBoard);
    const targeting = AIPolicies.selectTarget(this.difficulty, observableState);
    this.lastAIResponse = targeting;

    const { targetCell } = targeting;
    const shotResult = this.playerBoard.receiveShot(targetCell.row, targetCell.col);

    this._emit('onShotResolved', {
      shooter: 'ai',
      cell: targetCell,
      result: shotResult.result,
      hitShip: shotResult.hitShip,
      justSunk: shotResult.justSunk,
      targetingInfo: targeting,
    });

    if (shotResult.allSunk) {
      this._finishGame(false);
      return;
    }

    this.turnNumber += 1;
    this.state = GAME_STATES.PLAYER_TURN;
    this._notifyState();
  }

  togglePause() {
    if (this.state === GAME_STATES.PAUSED) {
      this.state = this.previousStateBeforePause || GAME_STATES.PLAYER_TURN;
      this.isPaused = false;
    } else if (this.state === GAME_STATES.PLAYER_TURN || this.state === GAME_STATES.AI_PROCESSING) {
      this.previousStateBeforePause = this.state;
      this.state = GAME_STATES.PAUSED;
      this.isPaused = true;
    }
    this._notifyState();
  }

  _finishGame(playerWon) {
    this.state = GAME_STATES.GAME_OVER;

    const playerHits = this.enemyBoard.shots.filter(s => s.result === 'hit' || s.result === 'sunk').length;
    const playerTotal = this.enemyBoard.shots.length || 1;
    const hitRate = playerHits / playerTotal;

    const summary = {
      won: playerWon,
      difficulty: this.difficulty,
      turns: this.turnNumber,
      hitRate,
      playerShipsRemaining: this.playerBoard.ships.filter(s => !s.sunk).length,
      enemyShipsRemaining: this.enemyBoard.ships.filter(s => !s.sunk).length,
      durationSeconds: Math.round((Date.now() - (this.matchStartTime || Date.now())) / 1000),
    };

    const updatedProgress = LocalStorageProvider.recordMatchResult(summary);

    this._emit('onGameOver', { summary, updatedProgress });
    this._notifyState();
  }

  _notifyState() {
    this._emit('onStateChange', {
      state: this.state,
      turn: this.turnNumber,
      isPaused: this.isPaused,
      difficulty: this.difficulty,
    });
  }

  _emit(event, data) {
    if (typeof this.listeners[event] === 'function') {
      this.listeners[event](data);
    }
  }
}

