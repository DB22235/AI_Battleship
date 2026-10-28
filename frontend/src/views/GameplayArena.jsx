import React, { useState, useEffect } from 'react';
import { Board } from '../components/Board.jsx';
import { AIAnalysisPanel } from '../components/AIAnalysisPanel.jsx';
import { rowColToLabel } from '../types/constants.js';
import { GAME_STATES } from '../engine/game.js';

export function GameplayArena({ gameEngine, onExitMatch, onMatchFinished }) {
  const [, setTick] = useState(0); // Force re-render on state changes
  const [activeMobileBoard, setActiveMobileBoard] = useState('enemy');
  const [latestEventMessage, setLatestEventMessage] = useState('Commence firing on Enemy Waters.');

  useEffect(() => {
    // Connect React listener to the GameEngine
    gameEngine.listeners.onShotResolved = ({ shooter, cell, result, hitShip, justSunk }) => {
      const label = rowColToLabel(cell.row, cell.col);
      if (shooter === 'player') {
        if (justSunk) {
          setLatestEventMessage(`🎯 Direct hit at ${label}! You sunk the enemy ${hitShip.name}!`);
        } else if (result === 'hit') {
          setLatestEventMessage(`🔥 Direct hit at ${label}!`);
        } else {
          setLatestEventMessage(`🌊 Miss at ${label}.`);
        }
      } else {
        if (justSunk) {
          setLatestEventMessage(`⚠ Enemy AI hit ${label} and sunk your ${hitShip.name}!`);
        } else if (result === 'hit') {
          setLatestEventMessage(`💥 Enemy AI hit your ship at ${label}!`);
        } else {
          setLatestEventMessage(`🛡 Enemy AI shot missed at ${label}.`);
        }
      }
      setTick(t => t + 1);
    };

    gameEngine.listeners.onStateChange = () => {
      setTick(t => t + 1);
    };

    gameEngine.listeners.onGameOver = ({ summary, updatedProgress }) => {
      onMatchFinished(summary, updatedProgress);
    };

    return () => {
      gameEngine.listeners = {};
    };
  }, [gameEngine, onMatchFinished]);

  const isPlayerTurn = gameEngine.state === GAME_STATES.PLAYER_TURN;
  const isAITurn = gameEngine.state === GAME_STATES.AI_PROCESSING;
  const selected = gameEngine.selectedTargetCell;

  const playerRemaining = gameEngine.playerBoard.ships.filter(s => !s.sunk).length;
  const enemyRemaining = gameEngine.enemyBoard.ships.filter(s => !s.sunk).length;

  const handleCellClick = (r, c) => {
    if (!isPlayerTurn || gameEngine.isPaused) return;
    if (gameEngine.selectTarget(r, c)) {
      setTick(t => t + 1);
    }
  };

  const handleFireShot = async () => {
    if (!isPlayerTurn || !selected || gameEngine.isPaused) return;
    await gameEngine.confirmPlayerShot();
    setTick(t => t + 1);
  };

  return (
    <div style={{ maxWidth: '1380px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Top Tactical Status Bar */}
      <div className="card" style={{ padding: 'var(--space-3) var(--space-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => {
              gameEngine.togglePause();
              setTick(t => t + 1);
            }}
            title="Pause Match"
          >
            {gameEngine.isPaused ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            )}
          </button>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Tactical Match</div>
            <div style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              Turn #{gameEngine.turnNumber}
              <span className="badge badge-cyan">{gameEngine.difficulty.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Turn Status Alert */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '2px' }}>Combat Status</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: isPlayerTurn ? 'var(--accent-cyan)' : isAITurn ? 'var(--accent-purple)' : 'var(--text-primary)' }}>
            {gameEngine.isPaused ? '⏸ MATCH PAUSED' : isPlayerTurn ? '● YOUR TURN — SELECT TARGET' : '● AI IS EVALUATING LEGAL TARGETS...'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm('Abandon this match? Progress will be lost.')) {
                onExitMatch();
              }
            }}
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            Abandon Match
          </button>
        </div>
      </div>

      {/* Latest Event Banner */}
      <div className="banner-info" style={{ fontSize: '13px', fontWeight: 600 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
        </svg>
        <span>{latestEventMessage}</span>
      </div>

      {/* Mobile Board Toggle */}
      <div className="tabs mobile-only-toggle" style={{ display: 'none', marginBottom: 'var(--space-2)' }}>
        <button
          className={`tab-btn ${activeMobileBoard === 'enemy' ? 'active' : ''}`}
          onClick={() => setActiveMobileBoard('enemy')}
        >
          Enemy Waters ({enemyRemaining} ships)
        </button>
        <button
          className={`tab-btn ${activeMobileBoard === 'player' ? 'active' : ''}`}
          onClick={() => setActiveMobileBoard('player')}
        >
          Your Fleet ({playerRemaining} ships)
        </button>
      </div>

      {/* Main Boards Grid (Desktop: Side-by-side) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 340px', gap: 'var(--space-5)', alignItems: 'start' }} className="arena-boards-grid">
        {/* Your Fleet Board */}
        <div className={`board-player-side ${activeMobileBoard === 'enemy' ? 'mobile-hidden' : ''}`}>
          <Board
            title="Your Fleet"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2">
                <path d="M22 18H2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z"/><path d="M6 14V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10"/>
              </svg>
            }
            subtitle={<>Remaining: <strong className="text-cyan">{playerRemaining}/5</strong></>}
            grid={gameEngine.playerBoard.grid}
            isInteractive={false}
          />
        </div>

        {/* Enemy Waters Board (Interactive) */}
        <div className={`board-enemy-side ${activeMobileBoard === 'player' ? 'mobile-hidden' : ''}`}>
          <Board
            title="Enemy Waters (Attack Grid)"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>
              </svg>
            }
            subtitle={<>Target Ships Left: <strong className="text-cyan">{enemyRemaining}/5</strong></>}
            grid={gameEngine.enemyBoard.grid}
            showShips={false}
            isInteractive={isPlayerTurn && !gameEngine.isPaused}
            selectedCell={selected}
            onCellClick={handleCellClick}
          />

          {/* Action Bar */}
          <div style={{ marginTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div style={{ fontSize: '13px' }}>
              {selected ? (
                <>Target: <span className="badge badge-cyan font-mono">{rowColToLabel(selected.row, selected.col)}</span></>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Select an unshot cell on Enemy Waters</span>
              )}
            </div>

            <button
              className="btn btn-primary"
              disabled={!selected || !isPlayerTurn || gameEngine.isPaused}
              onClick={handleFireShot}
              style={{ padding: '8px 24px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><polygon points="12 8 16 12 12 16 12 8"/>
              </svg>
              Fire Shot
            </button>
          </div>
        </div>

        {/* AI Intelligence Hub Sidebar */}
        <div>
          <AIAnalysisPanel
            aiResponse={gameEngine.lastAIResponse}
            playerShots={gameEngine.enemyBoard.shots}
          />
        </div>
      </div>
    </div>
  );
}

