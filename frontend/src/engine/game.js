/* ==========================================================================
   Adaptive AI Battleship — Game Controller & State Machine (React)
   ========================================================================== */

import { Board } from './board.js';
import { RulesValidator } from './rules.js';
import { buildObservableAIState } from '../ai/observable.js';
import { AIPolicies } from '../ai/policies.js';
import { LocalStorageProvider } from '../storage/storage.js';
import { BackendClient } from '../api/backend-client.js';

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
    this.matchId = null;
    this.profileLayoutCountAtStart = 0;
    this.aiDecisionLog = [];
    this.aiPolicyPending = false;
    this.aiTurnTimer = null;
  }

  startMatch(difficulty, playerFleet) {
    this.difficulty = difficulty;
    this.turnNumber = 1;
    this.matchStartTime = Date.now();
    this.matchId = `match_${this.matchStartTime}`;
    this.isPaused = false;

    this.playerBoard = new Board(true);
    this.playerBoard.setFleet(playerFleet);
    this.profileLayoutCountAtStart = LocalStorageProvider.getPlayerFleetLayouts().length;
    this.aiDecisionLog = [];
    this.aiPolicyPending = false;
    if (this.aiTurnTimer) clearTimeout(this.aiTurnTimer);
    this.aiTurnTimer = null;
    LocalStorageProvider.recordFleetDeployment({
      matchId: this.matchId,
      difficulty,
      ships: this.playerBoard.ships,
      startedAt: new Date(this.matchStartTime).toISOString(),
    });

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

    this._emit('onShotResolved', {
      shooter: 'player',
      cell: { row, col },
      result: shotResult.result,
      hitShip: shotResult.hitShip,
      justSunk: shotResult.justSunk,
    });

    this.selectedTargetCell = null;

    if (shotResult.allSunk) {
      await this._finishGame(true);
      return shotResult;
    }

    // In standard Battleship, a hit (including a sink) earns another shot.
    // Keep the player in control until they miss or win.
    if (shotResult.result !== 'miss') {
      this.state = GAME_STATES.PLAYER_TURN;
      this._notifyState();
      return shotResult;
    }

    this.state = GAME_STATES.AI_PROCESSING;
    this._notifyState();

    this._scheduleAITurn();

    return shotResult;
  }

  async _executeAITurn() {
    if (this.aiPolicyPending || this.state !== GAME_STATES.AI_PROCESSING) return;
    this.aiPolicyPending = true;
    const observableState = buildObservableAIState(this.playerBoard);
    const playerFleetLayouts = LocalStorageProvider.getPlayerFleetLayouts();
    let targeting;
    try {
      targeting = await AIPolicies.selectTarget(this.difficulty, observableState, playerFleetLayouts);
    } finally {
      this.aiPolicyPending = false;
    }
    if (this.state !== GAME_STATES.AI_PROCESSING) return;
    this.lastAIResponse = targeting;

    const { targetCell } = targeting;
    const shotResult = this.playerBoard.receiveShot(targetCell.row, targetCell.col);

    const decision = {
      eventType: 'ai_shot',
      matchId: this.matchId,
      difficulty: this.difficulty,
      strategy: targeting.strategy,
      modelStatus: targeting.modelStatus,
      profileLayoutCount: targeting.profileLayoutCount ?? this.profileLayoutCountAtStart,
      profileWeight: targeting.profileWeight ?? 0,
      syntheticModelWeight: targeting.syntheticModelWeight ?? 0,
      shotsObserved: observableState.shotsTaken.length,
      remainingShipLengths: observableState.remainingShipLengths,
      targetRow: targetCell.row,
      targetCol: targetCell.col,
      targetCoordinate: `${String.fromCharCode(65 + targetCell.col)}${targetCell.row + 1}`,
      outcome: shotResult.result,
      candidateRanks: (targeting.candidates || []).slice(0, 10).map(candidate => ({
        row: candidate.cell.row,
        col: candidate.cell.col,
        relativeScore: candidate.relativeScore ?? null,
      })),
      explanation: targeting.explanation,
    };
    this.aiDecisionLog.push(decision);
    LocalStorageProvider.recordAIEvent(decision);

    this._emit('onShotResolved', {
      shooter: 'ai',
      cell: targetCell,
      result: shotResult.result,
      hitShip: shotResult.hitShip,
      justSunk: shotResult.justSunk,
      targetingInfo: targeting,
    });

    if (shotResult.allSunk) {
      await this._finishGame(false);
      return;
    }

    if (shotResult.result !== 'miss') {
      // The AI also keeps firing after a hit until it misses or wins.
      this.state = GAME_STATES.AI_PROCESSING;
      this._notifyState();
      this._scheduleAITurn();
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
      if (this.state === GAME_STATES.AI_PROCESSING && !this.aiPolicyPending) {
        this._scheduleAITurn();
      }
    } else if (this.state === GAME_STATES.PLAYER_TURN || this.state === GAME_STATES.AI_PROCESSING) {
      this.previousStateBeforePause = this.state;
      this.state = GAME_STATES.PAUSED;
      this.isPaused = true;
      if (this.aiTurnTimer) clearTimeout(this.aiTurnTimer);
      this.aiTurnTimer = null;
    }
    this._notifyState();
  }

  _scheduleAITurn() {
    if (this.aiTurnTimer || this.aiPolicyPending) return;
    this.aiTurnTimer = setTimeout(() => {
      this.aiTurnTimer = null;
      if (this.state === GAME_STATES.AI_PROCESSING) {
        this._executeAITurn().catch(error => {
          console.error('AI turn failed:', error);
          this.state = GAME_STATES.PLAYER_TURN;
          this._notifyState();
        });
      }
    }, 500);
  }

  async _finishGame(playerWon) {
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

    const profileLayoutsBefore = LocalStorageProvider.getPlayerFleetLayouts().length;
    const fleetSaved = LocalStorageProvider.completeFleetDeployment({
      matchId: this.matchId,
      won: playerWon,
      difficulty: this.difficulty,
      turns: this.turnNumber,
      ships: this.playerBoard.ships,
    });
    const profileLayoutsAfter = LocalStorageProvider.getPlayerFleetLayouts().length;
    LocalStorageProvider.recordAIEvent({
      eventType: 'fleet_profile_update',
      matchId: this.matchId,
      difficulty: this.difficulty,
      profileLayoutCountBefore: profileLayoutsBefore,
      profileLayoutCountAfter: profileLayoutsAfter,
      fleetCellsLearned: fleetSaved ? 17 : 0,
      trainingSource: 'completed player-deployed fleet layout',
      updateApplied: Boolean(fleetSaved),
    });
    const updatedProgress = LocalStorageProvider.recordMatchResult({ ...summary, matchId: this.matchId });
    const payload = {
      matchId: this.matchId,
      difficulty: this.difficulty,
      won: playerWon,
      turns: this.turnNumber,
      hitRate,
      durationSeconds: summary.durationSeconds,
      startedAt: new Date(this.matchStartTime).toISOString(),
      completedAt: new Date().toISOString(),
      fleet: this.playerBoard.ships.map(({ id, name, length, orientation, cells }) => ({ id, name, length, orientation, cells })),
      playerShots: this.enemyBoard.shots.map(({ cell, result }) => ({ cell, result })),
      aiDecisions: this.aiDecisionLog,
    };
    try {
      const saved = await BackendClient.saveMatch(payload);
      summary.backendSaved = saved.saved;
      summary.backendMatchId = saved.matchId;
      this._emit('onBackendSaved', { summary, saved });
    } catch (error) {
      summary.backendSaved = false;
      summary.backendError = error.message;
      this._emit('onBackendSaved', { summary, error });
    }
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

