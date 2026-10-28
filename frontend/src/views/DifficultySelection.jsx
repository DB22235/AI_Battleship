import React, { useState } from 'react';
import { DIFFICULTY_LEVELS } from '../types/constants.js';
import { LocalStorageProvider } from '../storage/storage.js';

export function DifficultySelection({ onSelectDifficulty, onBack }) {
  const progress = LocalStorageProvider.getProgress();
  const [selectedId, setSelectedId] = useState(progress.currentLevel || 'strategist');

  const list = Object.values(DIFFICULTY_LEVELS);

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 'var(--space-3)' }}>
            ← Back to Command Center
          </button>
          <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>Select AI Difficulty Tier</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Choose your opponent's targeting policy. Difficulty adjusts algorithmic intelligence, never altering rules or peeking at ships.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => onSelectDifficulty(selectedId)}
          style={{ padding: '12px 28px', fontSize: '15px' }}
        >
          Proceed to Fleet Deployment →
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
        {list.map(diff => {
          const isUnlocked = progress.unlockedLevels.includes(diff.id);
          const isSelected = diff.id === selectedId;

          return (
            <div
              key={diff.id}
              className={`card difficulty-card ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`}
              onClick={() => {
                if (isUnlocked) {
                  setSelectedId(diff.id);
                  progress.currentLevel = diff.id;
                }
              }}
              style={{
                cursor: isUnlocked ? 'pointer' : 'not-allowed',
                position: 'relative',
                borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                background: isSelected ? 'rgba(69, 215, 232, 0.05)' : 'var(--surface-card)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <span className={`badge ${isSelected ? 'badge-cyan' : isUnlocked ? 'badge-muted' : 'badge-warning'}`}>
                  {isSelected ? 'Active Selection' : isUnlocked ? 'Available' : 'Locked Tier'}
                </span>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                  {diff.modelStatus.replace('_', ' ')}
                </span>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{diff.name}</h3>
              <div style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>{diff.tagline}</div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
                {diff.description}
              </p>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', fontSize: '12px', marginTop: 'auto' }}>
                <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>What changes at this level?</div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  {diff.id === 'recruit' && 'Pure random probing + adjacent orthogonal check.'}
                  {diff.id === 'strategist' && 'Probability Density Matrix solver with checkerboard parity hunt.'}
                  {diff.id === 'adaptive' && 'Blends probability solver with observed player click patterns from local history.'}
                  {diff.id === 'commander' && 'Zero-jitter mathematical maximum density targeting.'}
                </div>
                {!isUnlocked && (
                  <div style={{ color: 'var(--status-warning)', marginTop: '6px', fontWeight: 600 }}>
                    🔒 Requires {diff.unlockWinsRequired} total wins to unlock.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="banner-info">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
        <span>
          <strong>Scientific Truth:</strong> Higher difficulty levels represent concrete targeting policies, not synthetic claims of human thought. The rule-based solver is already an optimal constraint baseline.
        </span>
      </div>
    </div>
  );
}

