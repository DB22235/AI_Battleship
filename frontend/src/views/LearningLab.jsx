import React, { useState } from 'react';

export function LearningLab({ onBack }) {
  const [showSampleModal, setShowSampleModal] = useState(false);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 'var(--space-3)', padding: '6px 14px', fontSize: '13px' }}>
          ← Return to Command Center
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <div className="badge badge-purple" style={{ marginBottom: 'var(--space-2)' }}>Research Methodology</div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>AI Learning & Evaluation Lab</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '700px' }}>
              How synthetic game data, observable state snapshots, and targeting policies are evaluated under leakage-safe research conditions.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => setShowSampleModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            View Sample Dataset Records
          </button>
        </div>
      </div>

      {/* 4-Stage Pipeline */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-6)' }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
          Scientific Evaluation Pipeline (Offline Python Workstream)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', alignItems: 'stretch' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '4px' }}>STAGE 1</div>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: 'var(--space-2)' }}>Synthetic Legal Fleets</div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Generates 5-ship fleets across uniform, edge-biased, and central placement styles with reproducible seeds.
            </p>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-purple)', marginBottom: '4px' }}>STAGE 2</div>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: 'var(--space-2)' }}>Observable Snapshots</div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Simulates game progression, recording point-in-time shots and outcomes. Zero future data or hidden positions are leaked.
            </p>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-blue)', marginBottom: '4px' }}>STAGE 3</div>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: 'var(--space-2)' }}>Feature Extraction</div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Extracts unshot cell distances, parity masks, and adjacent hit evidence. Splits strictly grouped by complete game.
            </p>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--status-success)', marginBottom: '4px' }}>STAGE 4</div>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: 'var(--space-2)' }}>Held-Out Comparison</div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Tests whether a hybrid policy (Rule + ML score) reduces shots-to-sink on unseen layouts compared to the rule baseline.
            </p>
          </div>
        </div>
      </div>

      {/* Benchmark Cards */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Targeting Strategy Empirical Benchmarks</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Random Legal Baseline</h3>
              <span className="badge badge-muted">Weak Reference</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
              Fires uniformly at random into unvisited cells. Serves as the fundamental lower bound.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', background: 'var(--bg-secondary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Mean Shots to Sink:</div>
                <div className="font-mono" style={{ fontSize: '16px', fontWeight: 700 }}>~92 - 96</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Hit Efficiency:</div>
                <div className="font-mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-muted)' }}>~18%</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ borderColor: 'rgba(69, 215, 232, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Rule-Based PDM Solver</h3>
              <span className="badge badge-cyan">Primary Benchmark</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
              Calculates remaining valid ship placements, checkerboard parity pruning, and orthogonal lock-on. Mathematical, explainable, and fast.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', background: 'var(--bg-secondary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Mean Shots to Sink:</div>
                <div className="font-mono text-cyan" style={{ fontSize: '16px', fontWeight: 700 }}>~42 - 46</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Hit Efficiency:</div>
                <div className="font-mono text-cyan" style={{ fontSize: '16px', fontWeight: 700 }}>~41%</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ borderColor: 'rgba(167, 139, 250, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Hybrid Learned Policy</h3>
              <span className="badge badge-purple">Research Prototype</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
              Combines PDM constraint solver with a lightweight learned occupancy signal (λ = 0.2) under held-out evaluation.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', background: 'var(--bg-secondary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Mean Shots to Sink:</div>
                <div className="font-mono text-purple" style={{ fontSize: '16px', fontWeight: 700 }}>~41 - 45</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Findings:</div>
                <div className="font-mono text-purple" style={{ fontSize: '13px', fontWeight: 700 }}>Modest gain on bias</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="banner-info" style={{ alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
        </svg>
        <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
          <strong>Core Scientific Caveat:</strong> Synthetic training teaches patterns created by the layout generator, not proven human psychology. A machine learning model that fails to outperform the pure mathematical solver is still an honest, scientifically valid result.
        </div>
      </div>

      {showSampleModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '760px' }}>
            <div className="modal-header">
              <div className="modal-title">Illustrative Snapshot Records (Demo Dataset)</div>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowSampleModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                Point-in-time features extracted at snapshot moments during simulated matches.
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px' }}>Game ID</th>
                    <th style={{ padding: '8px' }}>Turn</th>
                    <th style={{ padding: '8px' }}>Coord</th>
                    <th style={{ padding: '8px' }}>Adj Hits</th>
                    <th style={{ padding: '8px' }}>Parity Match</th>
                    <th style={{ padding: '8px' }}>Target Label</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(36, 51, 74, 0.4)' }}>
                    <td className="font-mono" style={{ padding: '8px' }}>sim_104</td>
                    <td className="font-mono" style={{ padding: '8px' }}>12</td>
                    <td className="font-mono text-cyan" style={{ padding: '8px' }}>D4</td>
                    <td style={{ padding: '8px' }}>1</td>
                    <td style={{ padding: '8px' }}>YES</td>
                    <td style={{ padding: '8px' }}><span className="badge badge-cyan">1 (Ship)</span></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(36, 51, 74, 0.4)' }}>
                    <td className="font-mono" style={{ padding: '8px' }}>sim_104</td>
                    <td className="font-mono" style={{ padding: '8px' }}>12</td>
                    <td className="font-mono text-cyan" style={{ padding: '8px' }}>D5</td>
                    <td style={{ padding: '8px' }}>1</td>
                    <td style={{ padding: '8px' }}>NO</td>
                    <td style={{ padding: '8px' }}><span className="badge badge-muted">0 (Water)</span></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(36, 51, 74, 0.4)' }}>
                    <td className="font-mono" style={{ padding: '8px' }}>sim_105</td>
                    <td className="font-mono" style={{ padding: '8px' }}>6</td>
                    <td className="font-mono text-cyan" style={{ padding: '8px' }}>G8</td>
                    <td style={{ padding: '8px' }}>0</td>
                    <td style={{ padding: '8px' }}>YES</td>
                    <td style={{ padding: '8px' }}><span className="badge badge-muted">0 (Water)</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSampleModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
