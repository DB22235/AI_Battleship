import React, { useState, useMemo } from 'react';
import { Header } from './components/Header.jsx';
import { SettingsModal } from './components/SettingsModal.jsx';
import { CommandCenter } from './views/CommandCenter.jsx';
import { DifficultySelection } from './views/DifficultySelection.jsx';
import { FleetDeployment } from './views/FleetDeployment.jsx';
import { GameplayArena } from './views/GameplayArena.jsx';
import { Results } from './views/Results.jsx';
import { LearningLab } from './views/LearningLab.jsx';
import { MatchHistory } from './views/MatchHistory.jsx';
import { GameEngine } from './engine/game.js';

export function App() {
  const [currentView, setCurrentView] = useState('command-center');
  const [selectedDifficulty, setSelectedDifficulty] = useState('strategist');
  const [lastMatchSummary, setLastMatchSummary] = useState(null);
  const [lastMatchProgress, setLastMatchProgress] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const gameEngine = useMemo(() => new GameEngine(), []);

  const navigate = (view) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartMatch = (placedShips) => {
    gameEngine.startMatch(selectedDifficulty, placedShips);
    navigate('arena');
  };

  const handleMatchFinished = (summary, progress) => {
    setLastMatchSummary(summary);
    setLastMatchProgress(progress);
    navigate('results');
  };

  return (
    <div id="app-root">
      <Header
        activeView={currentView}
        onNavigate={navigate}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="app-main" id="app-main">
        {currentView === 'command-center' && (
          <CommandCenter
            onStartNewMatch={() => navigate('difficulty')}
            onExploreAI={() => navigate('learning-lab')}
          />
        )}

        {currentView === 'difficulty' && (
          <DifficultySelection
            onSelectDifficulty={(diff) => {
              setSelectedDifficulty(diff);
              navigate('deployment');
            }}
            onBack={() => navigate('command-center')}
          />
        )}

        {currentView === 'deployment' && (
          <FleetDeployment
            difficulty={selectedDifficulty}
            onLaunchMatch={handleStartMatch}
            onBack={() => navigate('difficulty')}
          />
        )}

        {currentView === 'arena' && (
          <GameplayArena
            gameEngine={gameEngine}
            onExitMatch={() => navigate('command-center')}
            onMatchFinished={handleMatchFinished}
          />
        )}

        {currentView === 'results' && (
          <Results
            summary={lastMatchSummary || { won: true, difficulty: selectedDifficulty, turns: 32, hitRate: 0.44 }}
            progress={lastMatchProgress || { totalWins: 1, totalLosses: 0, unlockedLevels: ['recruit', 'strategist'] }}
            onPlayAgain={() => navigate('deployment')}
            onReturnHome={() => navigate('command-center')}
          />
        )}

        {currentView === 'learning-lab' && (
          <LearningLab onBack={() => navigate('command-center')} />
        )}

        {currentView === 'history' && (
          <MatchHistory
            onBack={() => navigate('command-center')}
            onPlayNewMatch={() => navigate('difficulty')}
          />
        )}
      </main>

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
}

