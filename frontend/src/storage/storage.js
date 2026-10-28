/* ==========================================================================
   Adaptive AI Battleship — Browser-Local Persistence (Stored in this browser)
   ========================================================================== */

const STORAGE_KEYS = {
  SETTINGS: 'adaptive_battleship_settings_v1',
  PROGRESS: 'adaptive_battleship_progress_v1',
  HISTORY: 'adaptive_battleship_history_v1',
  PLAYER_SHOT_PATTERNS: 'adaptive_battleship_player_shots_v1',
  PLAYER_FLEET_LAYOUTS: 'adaptive_battleship_player_fleet_layouts_v1',
  FLEET_LAYOUT_LOG: 'adaptive_battleship_fleet_layout_log_v1',
  AI_LEARNING_LOG: 'adaptive_battleship_ai_learning_log_v1',
};

const DEFAULT_SETTINGS = {
  reducedMotion: false,
  showHeatmap: true,
  confirmExit: true,
  autoAdvanceTurn: false,
};

const DEFAULT_PROGRESS = {
  totalWins: 0,
  totalLosses: 0,
  unlockedLevels: ['recruit', 'strategist'],
  currentLevel: 'strategist',
};

export class LocalStorageProvider {
  static getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  static saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Unable to save settings to localStorage', e);
    }
  }

  static getProgress() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      return data ? { ...DEFAULT_PROGRESS, ...JSON.parse(data) } : { ...DEFAULT_PROGRESS };
    } catch {
      return { ...DEFAULT_PROGRESS };
    }
  }

  static recordMatchResult({ won, difficulty, turns, hitRate, matchId }) {
    try {
      const progress = this.getProgress();
      if (won) {
        progress.totalWins += 1;
        if (progress.totalWins >= 2 && !progress.unlockedLevels.includes('adaptive')) {
          progress.unlockedLevels.push('adaptive');
        }
        if (progress.totalWins >= 4 && !progress.unlockedLevels.includes('commander')) {
          progress.unlockedLevels.push('commander');
        }
      } else {
        progress.totalLosses += 1;
      }
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));

      const history = this.getHistory();
      history.unshift({
        id: matchId || `match_${Date.now()}`,
        timestamp: new Date().toISOString(),
        difficulty,
        result: won ? 'victory' : 'defeat',
        turns,
        hitRate: Math.round(hitRate * 100),
      });
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history.slice(0, 25)));
      return progress;
    } catch (e) {
      console.warn('Unable to record match progress', e);
      return DEFAULT_PROGRESS;
    }
  }

  static getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static recordPlayerFleetLayout(ships, matchId = null) {
    try {
      const cells = ships.flatMap(ship => ship.cells.map(cell => ({ row: cell.row, col: cell.col })));
      if (cells.length !== 17) return false;
      const history = this.getPlayerFleetLayouts();
      history.unshift({
        id: matchId || `fleet_${Date.now()}`,
        matchId: matchId || null,
        timestamp: new Date().toISOString(),
        cells,
      });
      localStorage.setItem(STORAGE_KEYS.PLAYER_FLEET_LAYOUTS, JSON.stringify(history.slice(0, 20)));
      return true;
    } catch (e) {
      console.warn('Unable to save player fleet layout locally', e);
      return false;
    }
  }

  static recordFleetDeployment({ matchId, difficulty, ships, startedAt = new Date().toISOString() }) {
    try {
      const records = this.getFleetLayoutLog();
      records.unshift({
        matchId,
        timestamp: startedAt,
        difficulty,
        status: 'in_progress',
        result: '',
        ships: ships.map(ship => ({
          id: ship.id,
          name: ship.name,
          length: ship.length,
          orientation: ship.orientation,
          startRow: ship.startRow,
          startCol: ship.startCol,
          cells: ship.cells.map(cell => ({ row: cell.row, col: cell.col })),
        })),
      });
      localStorage.setItem(STORAGE_KEYS.FLEET_LAYOUT_LOG, JSON.stringify(records.slice(0, 500)));
      return true;
    } catch (e) {
      console.warn('Unable to record fleet deployment locally', e);
      return false;
    }
  }

  static completeFleetDeployment({ matchId, won, difficulty, turns, ships }) {
    try {
      const records = this.getFleetLayoutLog();
      let record = records.find(item => item.matchId === matchId);
      if (!record) {
        this.recordFleetDeployment({ matchId, difficulty, ships });
        record = this.getFleetLayoutLog().find(item => item.matchId === matchId);
      }
      if (record) {
        record.status = 'completed';
        record.result = won ? 'victory' : 'defeat';
        record.turns = turns;
        record.completedAt = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.FLEET_LAYOUT_LOG, JSON.stringify(records.slice(0, 500)));
      }
      return this.recordPlayerFleetLayout(ships, matchId);
    } catch (e) {
      console.warn('Unable to complete fleet deployment log', e);
      return false;
    }
  }

  static getFleetLayoutLog() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FLEET_LAYOUT_LOG);
      const records = data ? JSON.parse(data) : [];
      const safeRecords = Array.isArray(records) ? records : [];
      const knownIds = new Set(safeRecords.map(record => record.matchId));
      const legacyRecords = this.getPlayerFleetLayouts()
        .filter(layout => !knownIds.has(layout.matchId || layout.id))
        .map(layout => ({
          matchId: layout.matchId || layout.id,
          timestamp: layout.timestamp,
          completedAt: layout.timestamp,
          difficulty: layout.difficulty || 'unknown',
          status: 'completed',
          result: 'legacy_record',
          ships: [{
            id: 'legacy_occupancy',
            name: 'Legacy fleet occupancy (ship grouping unavailable)',
            length: layout.cells.length,
            orientation: 'unknown',
            startRow: '',
            startCol: '',
            cells: layout.cells,
          }],
        }));
      return [...safeRecords, ...legacyRecords];
    } catch {
      return [];
    }
  }

  static recordAIEvent(event) {
    try {
      const events = this.getAILearningLog();
      events.push({ id: `ai_${Date.now()}_${events.length}`, timestamp: new Date().toISOString(), ...event });
      localStorage.setItem(STORAGE_KEYS.AI_LEARNING_LOG, JSON.stringify(events.slice(-10000)));
      return true;
    } catch (e) {
      console.warn('Unable to record AI learning event locally', e);
      return false;
    }
  }

  static getAILearningLog() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AI_LEARNING_LOG);
      if (!data) {
        const legacyEvents = this.getPlayerFleetLayouts().map((layout, index) => ({
          id: `historical_layout_${layout.matchId || layout.id}`,
          timestamp: layout.timestamp,
          eventType: 'historical_layout_import',
          matchId: layout.matchId || layout.id,
          profileLayoutCountBefore: index,
          profileLayoutCountAfter: index + 1,
          fleetCellsLearned: layout.cells.length,
          trainingSource: 'previously saved completed player fleet layout; per-shot AI logs were not available',
          updateApplied: true,
        }));
        if (legacyEvents.length) {
          localStorage.setItem(STORAGE_KEYS.AI_LEARNING_LOG, JSON.stringify(legacyEvents));
          return legacyEvents;
        }
      }
      const events = data ? JSON.parse(data) : [];
      return Array.isArray(events) ? events : [];
    } catch {
      return [];
    }
  }

  static getPlayerFleetLayouts() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PLAYER_FLEET_LAYOUTS);
      const layouts = data ? JSON.parse(data) : [];
      return Array.isArray(layouts) ? layouts.filter(layout => Array.isArray(layout.cells)) : [];
    } catch {
      return [];
    }
  }

  static resetAllLocalData() {
    try {
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.PROGRESS);
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_SHOT_PATTERNS);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_FLEET_LAYOUTS);
      localStorage.removeItem(STORAGE_KEYS.FLEET_LAYOUT_LOG);
      localStorage.removeItem(STORAGE_KEYS.AI_LEARNING_LOG);
      return true;
    } catch (e) {
      console.warn('Reset local data failed', e);
      return false;
    }
  }
}
