import React from 'react';

export function Results({ summary, progress, onPlayAgain, onReturnHome }) {
  const won = summary.won;

  let unlockNotice = '';
  if (won && progress.totalWins === 2) {
    unlockNotice = '🎉 Tactical Promotion: "Adaptive" Difficulty Tier is now UNLOCKED!';
  } else if (won && progress.totalWins === 4) {
    unlockNotice = '🎖 Master Promotion: "Commander" Difficulty Tier is now UNLOCKED!';
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>
      <div className="card card-elevated" style={{ padding: 'var(--space-8)', textAlign: 'center', borderColor: won ? 'rgba(69, 215, 232, 0.4)' : 'rgba(255, 100, 124, 0.4)' }}>
        
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: won ? 'rgba(69, 215, 232, 0.15)' : 'rgba(255, 100, 124, 0.15)', border: `2px solid ${won ? 'var(--accent-cyan)' : 'var(--status-hit)'}` }}>
          {won ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--status-hit)" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          )}
        </div>

        <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 'var(--space-2)', color: won ? 'var(--accent-cyan)' : 'var(--status-hit)' }}>
          {won ? 'FLEET VICTORY' : 'FLEET DEFEAT'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: 'var(--space-6)' }}>
          {won
            ? 'Outstanding admiral. You completely neutralized the enemy fleet before your defenses fell.'
            : 'The opponent AI isolated and sank your fleet. Study its probability density targeting and redeploy.'
          }
        </p>

        {unlockNotice && (
          <div style={{ background: 'rgba(74, 222, 155, 0.12)', border: '1px solid var(--status-success)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-6)', fontWeight: 700, color: 'var(--status-success)', fontSize: '14px' }}>
            {unlockNotice}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', textAlign: 'left' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '2px' }}>Turns Taken</div>
            <div style={{ fontSize: '24px', fontWeight: 800 }} className="font-mono">{summary.turns}</div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '2px' }}>Your Hit Rate</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-cyan)' }} className="font-mono">{Math.round(summary.hitRate * 100)}%</div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '2px' }}>AI Difficulty</div>
            <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '6px' }}>{summary.difficulty.toUpperCase()}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={onPlayAgain} style={{ padding: '12px 24px' }}>
            Play Again ({summary.difficulty})
          </button>
          <button className="btn btn-secondary" onClick={onReturnHome} style={{ padding: '12px 24px' }}>
            Command Center
          </button>
        </div>

        <div style={{ marginTop: 'var(--space-5)', fontSize: '12px', color: 'var(--text-muted)' }}>
          Match statistics have been safely saved to this browser.
        </div>
      </div>
    </div>
  );
}

