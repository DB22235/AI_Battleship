import React from 'react';

export function Header({ activeView, onNavigate, onOpenSettings }) {
  return (
    <header className="app-header">
      <div className="brand-section" onClick={() => onNavigate('command-center')}>
        <div className="brand-icon">
          <svg viewBox="0 0 24 24">
            <path d="M22 18H2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z" />
            <path d="M6 14V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10" />
          </svg>
        </div>
        <div>
          <span className="brand-title">Adaptive AI Battleship</span>
        </div>
        <span className="brand-badge">React Prototype</span>
      </div>

      <nav className="nav-links">
        <button
          className={`nav-item ${activeView === 'command-center' ? 'active' : ''}`}
          onClick={() => onNavigate('command-center')}
        >
          Command Center
        </button>
        <button
          className={`nav-item ${activeView === 'difficulty' || activeView === 'deployment' ? 'active' : ''}`}
          onClick={() => onNavigate('difficulty')}
        >
          Deploy Fleet
        </button>
        <button
          className={`nav-item ${activeView === 'learning-lab' ? 'active' : ''}`}
          onClick={() => onNavigate('learning-lab')}
        >
          Learning Lab
        </button>
        <button
          className={`nav-item ${activeView === 'history' ? 'active' : ''}`}
          onClick={() => onNavigate('history')}
        >
          Match History
        </button>
      </nav>

      <div className="header-actions">
        <button
          className="btn btn-secondary btn-icon"
          id="btn-open-settings"
          title="Tactical Preferences"
          onClick={onOpenSettings}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  );
}

