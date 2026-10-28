import React, { useState } from 'react';
import { LocalStorageProvider } from '../storage/storage.js';

export function MatchHistory({ onBack, onPlayNewMatch }) {
  const [filterResult, setFilterResult] = useState('all');

  const rawHistory = LocalStorageProvider.getHistory();
  const progress = LocalStorageProvider.getProgress();
  const totalMatches = progress.totalWins + progress.totalLosses;
  const winRate = totalMatches > 0 ? Math.round((progress.totalWins / totalMatches) * 100) : 0;

  const filtered = rawHistory.filter(m => {
    if (filterResult === 'all') return true;
    return m.result === filterResult;
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 'var(--space-2)', padding: '6px 14px', fontSize: '13px' }}>
            ← Back to Command Center
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>Match History</h1>
            <span className="badge badge-purple">Stored In This Browser</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            All records are stored locally in your browser cache. No data is sent or synchronized to a remote server.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-primary" onClick={onPlayNewMatch}>
            Deploy Fleet →
          </button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '2px' }}>Total Matches</div>
          <div style={{ fontSize: '26px', fontWeight: 800 }} className="font-mono">{totalMatches}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '2px' }}>Victories</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-cyan)' }} className="font-mono">{progress.totalWins}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '2px' }}>Defeats</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--status-hit)' }} className="font-mono">{progress.totalLosses}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '2px' }}>Win Rate</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--status-success)' }} className="font-mono">{winRate}%</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div className="tabs">
          <button className={`tab-btn ${filterResult === 'all' ? 'active' : ''}`} onClick={() => setFilterResult('all')}>All Matches ({rawHistory.length})</button>
          <button className={`tab-btn ${filterResult === 'victory' ? 'active' : ''}`} onClick={() => setFilterResult('victory')}>Victories</button>
          <button className={`tab-btn ${filterResult === 'defeat' ? 'active' : ''}`} onClick={() => setFilterResult('defeat')}>Defeats</button>
        </div>
      </div>

      {/* Match Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
              No matching match records found
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Complete a battle to populate this history log.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>Result</th>
                <th style={{ padding: '12px 16px' }}>Difficulty</th>
                <th style={{ padding: '12px 16px' }}>Turns to Finish</th>
                <th style={{ padding: '12px 16px' }}>Hit Accuracy</th>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid rgba(36, 51, 74, 0.4)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={`badge ${m.result === 'victory' ? 'badge-cyan' : 'badge-danger'}`}>
                      {m.result.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700 }}>{m.difficulty.toUpperCase()}</td>
                  <td style={{ padding: '14px 16px' }} className="font-mono">{m.turns} turns</td>
                  <td style={{ padding: '14px 16px' }} className="font-mono text-cyan">{m.hitRate}%</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    {new Date(m.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

