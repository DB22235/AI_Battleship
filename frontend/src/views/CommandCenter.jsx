import React from 'react';
import { LocalStorageProvider } from '../storage/storage.js';
import { DIFFICULTY_LEVELS } from '../types/constants.js';

export function CommandCenter({ onStartNewMatch, onExploreAI }) {
  const progress = LocalStorageProvider.getProgress();
  const history = LocalStorageProvider.getHistory();
  const currentLevelInfo = DIFFICULTY_LEVELS[progress.currentLevel?.toUpperCase()] || DIFFICULTY_LEVELS.STRATEGIST;

  const totalMatches = progress.totalWins + progress.totalLosses;
  const winRate = totalMatches > 0 ? Math.round((progress.totalWins / totalMatches) * 100) : 0;

  const nextUnlockText = progress.totalWins < 2
    ? `${2 - progress.totalWins} wins needed to unlock Adaptive`
    : progress.totalWins < 4
    ? `${4 - progress.totalWins} wins needed to unlock Commander`
    : 'All tactical difficulty tiers unlocked';

  return (
    <div className="command-center-layout">
      {/* Hero Banner */}
      <div className="card card-elevated hero-banner" style={{ marginBottom: 'var(--space-6)', background: 'linear-gradient(135deg, rgba(17, 28, 46, 0.95), rgba(8, 13, 24, 0.95))', borderColor: 'rgba(69, 215, 232, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div style={{ maxWidth: '640px' }}>
            <div className="badge badge-cyan" style={{ marginBottom: 'var(--space-3)' }}>Tactical Operations Active</div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 'var(--space-3)', lineHeight: 1.2 }}>
              Your strategy. <span className="text-cyan">Its next challenge.</span>
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-5)' }}>
              Engage an explainable Battleship opponent powered by legal probability-density targeting and optional learned occupancy signals. Client-side, transparent, and completely React-driven.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={onStartNewMatch}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                </svg>
                Deploy Fleet
              </button>
              <button className="btn btn-secondary" onClick={onExploreAI}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="m10 15 5-3-5-3v6z"/>
                </svg>
                Explore AI Intelligence
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', minWidth: '200px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Deployment Stats</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Matches Played:</span>
              <span className="font-mono" style={{ fontWeight: 700 }}>{totalMatches}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Fleet Victories:</span>
              <span className="font-mono text-cyan" style={{ fontWeight: 700 }}>{progress.totalWins}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Win Rate:</span>
              <span className="font-mono text-success" style={{ fontWeight: 700 }}>{winRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Level Progress & System Boundary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Current Active Tier</div>
            <span className="badge badge-cyan">{currentLevelInfo.name}</span>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{currentLevelInfo.tagline}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
            {currentLevelInfo.description}
          </p>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', fontSize: '12px' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Progression Path:</div>
            <div style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{nextUnlockText}</div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>System Boundary</div>
            <span className="badge badge-purple">Stored In This Browser</span>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>100% Client-Side Engine</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
            No backend, no remote API calls, no hidden cloud training. All game rules, parity algorithms, and Probability Density Matrices execute natively within your browser.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span className="badge badge-muted">Zero Cloud Leakage</span>
            <span className="badge badge-muted">Deterministic Rules</span>
            <span className="badge badge-muted">Explainable AI</span>
          </div>
        </div>
      </div>

      {/* Recent Matches */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Recent Match Records</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Local History Only</span>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--text-secondary)' }}>No match logs recorded yet</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '420px', margin: '0 auto var(--space-4)' }}>
              Your tactical shot data, turns-to-sink, and hit rates will be recorded locally in this browser after your first match.
            </p>
            <button className="btn btn-secondary" onClick={onStartNewMatch}>Deploy First Fleet</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 12px' }}>Result</th>
                  <th style={{ padding: '10px 12px' }}>Difficulty</th>
                  <th style={{ padding: '10px 12px' }}>Turns</th>
                  <th style={{ padding: '10px 12px' }}>Hit Rate</th>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 5).map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid rgba(36, 51, 74, 0.5)' }}>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${m.result === 'victory' ? 'badge-cyan' : 'badge-danger'}`}>
                        {m.result.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{m.difficulty}</td>
                    <td style={{ padding: '12px' }} className="font-mono">{m.turns}</td>
                    <td style={{ padding: '12px' }} className="font-mono text-cyan">{m.hitRate}%</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(m.timestamp).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

