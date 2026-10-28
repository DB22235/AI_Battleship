import React, { useState } from 'react';
import { rowColToLabel } from '../types/constants.js';
import { PlayerShotPredictor } from '../ai/player-predictor.js';

export function AIAnalysisPanel({ aiResponse, playerShots = [] }) {
  const [activeTab, setActiveTab] = useState('ai-targeting');
  const playerPrediction = PlayerShotPredictor.predictNextPlayerShot(playerShots);

  return (
    <div className="card" style={{ padding: 'var(--space-4)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="2">
            <path d="M2 12h20M12 2v20M4.93 4.93l14.14 14.14M4.93 19.07 19.07 4.93" />
          </svg>
          <h3 style={{ fontSize: '14px', fontWeight: 700 }}>AI Intelligence Hub</h3>
        </div>
        <span className="badge badge-purple font-mono" style={{ fontSize: '10px' }}>
          {aiResponse ? aiResponse.modelStatus.replace('_', ' ') : 'STANDBY'}
        </span>
      </div>

      <div className="tabs" style={{ marginBottom: 'var(--space-3)' }}>
        <button
          className={`tab-btn ${activeTab === 'ai-targeting' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai-targeting')}
        >
          AI Ship-Targeting
        </button>
        <button
          className={`tab-btn ${activeTab === 'player-prediction' ? 'active' : ''}`}
          onClick={() => setActiveTab('player-prediction')}
        >
          Predicted Player Shots
        </button>
      </div>

      {activeTab === 'ai-targeting' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 'var(--space-2)', lineHeight: 1.4 }}>
            <strong>Concept:</strong> Where the AI is evaluating to attack on <em>Your Fleet</em>, derived from observable hit/miss evidence and probability density.
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)', fontSize: '12px' }}>
            <div style={{ color: 'var(--accent-purple)', fontWeight: 600, marginBottom: '2px' }}>
              {aiResponse ? aiResponse.strategy : 'Evaluating legal unshot space...'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
              {aiResponse ? aiResponse.explanation : 'Waiting for initial turn engagement.'}
            </div>
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
            Top Ranked Target Candidates
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '180px' }}>
            {aiResponse && aiResponse.candidates && aiResponse.candidates.length > 0 ? (
              aiResponse.candidates.slice(0, 5).map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-muted)', width: '14px' }}>#{i + 1}</span>
                    <span className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {rowColToLabel(c.cell.row, c.cell.col)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div style={{ width: '48px', height: '6px', background: 'var(--surface-card)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${c.relativeScore || 50}%`, height: '100%', background: 'var(--accent-purple)' }}></div>
                    </div>
                    <span className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {c.relativeScore || 0}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No candidate state available.</div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 'var(--space-2)', lineHeight: 1.4 }}>
            <strong>Concept:</strong> Estimates which cell <em>you</em> may fire at next on Enemy Waters based on prior shot coordinates. <strong>Does not</strong> reveal enemy ships.
          </div>

          {playerPrediction.status === 'insufficient_data' ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-4)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)', marginTop: 'var(--space-2)' }}>
              <span className="badge badge-warning" style={{ marginBottom: 'var(--space-2)' }}>Insufficient Data</span>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {playerPrediction.explanation}
              </p>
            </div>
          ) : (
            <>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)', fontSize: '12px' }}>
                <div style={{ color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '2px' }}>
                  Pattern Proximity Model
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                  {playerPrediction.explanation}
                </div>
              </div>

              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                Predicted Next Player Clicks
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '180px' }}>
                {playerPrediction.candidates.slice(0, 5).map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)', width: '14px' }}>#{i + 1}</span>
                      <span className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {rowColToLabel(c.cell.row, c.cell.col)}
                      </span>
                    </div>
                    <span className="font-mono text-cyan" style={{ fontSize: '11px' }}>
                      {c.relativeScore}% prob
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

