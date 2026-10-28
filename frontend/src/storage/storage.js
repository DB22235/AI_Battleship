/* ==========================================================================
   Adaptive AI Battleship — Browser-Local Persistence (Stored in this browser)
   ========================================================================== */

const STORAGE_KEYS = {
  SETTINGS: 'adaptive_battleship_settings_v1',
  PROGRESS: 'adaptive_battleship_progress_v1',
  HISTORY: 'adaptive_battleship_history_v1',
  PLAYER_SHOT_PATTERNS: 'adaptive_battleship_player_shots_v1',
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

  static recordMatchResult({ won, difficulty, turns, hitRate }) {
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
        id: `match_${Date.now()}`,
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

  static recordPlayerShot(row, col) {
    try {
      const patterns = this.getPlayerShotPatterns();
      const key = `${row},${col}`;
      patterns[key] = (patterns[key] || 0) + 1;
      patterns._totalShots = (patterns._totalShots || 0) + 1;
      localStorage.setItem(STORAGE_KEYS.PLAYER_SHOT_PATTERNS, JSON.stringify(patterns));
    } catch (e) {
      console.warn('Unable to record player shot pattern', e);
    }
  }

  static getPlayerShotPatterns() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PLAYER_SHOT_PATTERNS);
      return data ? JSON.parse(data) : { _totalShots: 0 };
    } catch {
      return { _totalShots: 0 };
    }
  }

  static resetAllLocalData() {
    try {
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.PROGRESS);
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_SHOT_PATTERNS);
      return true;
    } catch (e) {
      console.warn('Reset local data failed', e);
      return false;
    }
  }
}
