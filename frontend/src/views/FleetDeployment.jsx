import React, { useState, useEffect } from 'react';
import { BOARD_SIZE, COL_LABELS, ROW_LABELS, FLEET_CONFIG, rowColToLabel } from '../types/constants.js';
import { RulesValidator } from '../engine/rules.js';

export function FleetDeployment({ difficulty, onLaunchMatch, onBack }) {
  const [placedShips, setPlacedShips] = useState([]);
  const [selectedShipIndex, setSelectedShipIndex] = useState(0);
  const [orientation, setOrientation] = useState('H');
  const [hoverCell, setHoverCell] = useState(null);

  const isAllShipsPlaced = placedShips.length === FLEET_CONFIG.length;
  const currentCfg = FLEET_CONFIG[selectedShipIndex];

  // Rotate on 'R' key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        setOrientation(prev => prev === 'H' ? 'V' : 'H');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getPlacedShipById = (id) => placedShips.find(s => s.id === id);

  const checkPlacement = (r, c) => {
    if (!currentCfg) return { valid: false };
    const otherShips = placedShips.filter(s => s.id !== currentCfg.id);
    return RulesValidator.isValidPlacement(r, c, currentCfg.length, orientation, otherShips);
  };

  const handleCellClick = (r, c) => {
    const check = checkPlacement(r, c);
    if (!check.valid) return;

    const updated = placedShips.filter(s => s.id !== currentCfg.id);
    updated.push({
      id: currentCfg.id,
      name: currentCfg.name,
      length: currentCfg.length,
      orientation,
      startRow: r,
      startCol: c,
      cells: check.cells,
      hits: 0,
      sunk: false,
    });
    setPlacedShips(updated);

    // Auto-advance to next unplaced ship
    const nextIdx = FLEET_CONFIG.findIndex(cfg => !updated.some(s => s.id === cfg.id));
    if (nextIdx !== -1) {
      setSelectedShipIndex(nextIdx);
    }
  };

  const previewCandidate = hoverCell && currentCfg
    ? RulesValidator.getShipCells(hoverCell.row, hoverCell.col, currentCfg.length, orientation)
    : [];

  const isPreviewValid = hoverCell ? checkPlacement(hoverCell.row, hoverCell.col).valid : true;
  const placementFeedback = hoverCell && currentCfg
    ? checkPlacement(hoverCell.row, hoverCell.col)
    : null;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 'var(--space-2)', padding: '6px 14px', fontSize: '13px' }}>
            ← Back to Difficulty
          </button>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' }}>Fleet Deployment Phase</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Position your naval assets. Opponent policy: <span className="badge badge-cyan">{difficulty.toUpperCase()}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setPlacedShips(RulesValidator.generateRandomFleet())}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Randomize Fleet
          </button>
          <button className="btn btn-secondary" onClick={() => setPlacedShips([])}>
            Clear Board
          </button>
          <button
            className="btn btn-primary"
            disabled={!isAllShipsPlaced}
            onClick={() => onLaunchMatch(placedShips)}
            style={{ padding: '10px 24px' }}
          >
            Launch Match ({placedShips.length}/5) →
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-6)', alignItems: 'start' }} className="deployment-grid-layout">
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Tactical Fleet</h3>
            <div className="tabs" style={{ width: 'auto' }}>
              <button className={`tab-btn ${orientation === 'H' ? 'active' : ''}`} onClick={() => setOrientation('H')}>H (Horiz)</button>
              <button className={`tab-btn ${orientation === 'V' ? 'active' : ''}`} onClick={() => setOrientation('V')}>V (Vert)</button>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
            Tip: Press <kbd style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)', color: 'var(--accent-cyan)' }}>R</kbd> to rotate orientation.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            {FLEET_CONFIG.map((cfg, idx) => {
              const placed = getPlacedShipById(cfg.id);
              const isSelected = selectedShipIndex === idx;

              return (
                <div
                  key={cfg.id}
                  className="ship-select-card"
                  onClick={() => setSelectedShipIndex(idx)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                    background: isSelected ? 'rgba(69, 215, 232, 0.08)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      {cfg.name} ({cfg.length})
                    </div>
                    <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
                      {Array.from({ length: cfg.length }).map((_, i) => (
                        <div key={i} style={{ width: '14px', height: '6px', borderRadius: '2px', background: placed ? 'var(--accent-blue)' : 'var(--border-subtle)' }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    {placed ? (
                      <span className="badge badge-cyan" style={{ fontSize: '10px' }}>PLACED</span>
                    ) : (
                      <span className="badge badge-muted" style={{ fontSize: '10px' }}>READY</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ minHeight: '40px', fontSize: '12px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            {isAllShipsPlaced ? (
              <span className="text-success" style={{ fontWeight: 600 }}>✓ All ships stationed legally. Ready for combat!</span>
            ) : placementFeedback ? (
              placementFeedback.valid ? (
                <span className="text-success">Valid coordinates for {currentCfg.name} ({rowColToLabel(hoverCell.row, hoverCell.col)})</span>
              ) : (
                <span className="text-danger">⚠ {placementFeedback.reason}</span>
              )
            ) : (
              'Click an unplaced ship, then hover over grid coordinates to position.'
            )}
          </div>
        </div>

        <div className="board-wrapper">
          <div className="board-header">
            <div className="board-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="m10 15 5-3-5-3v6z"/>
              </svg>
              Your Grid Coordinates (10×10)
            </div>
            <div className="board-status font-mono">
              {hoverCell ? `Target: ${rowColToLabel(hoverCell.row, hoverCell.col)}` : 'Hover to position'}
            </div>
          </div>

          <div className="board-grid-container">
            <div className="grid-col-headers">
              <div className="coord-header col-label"></div>
              {COL_LABELS.map(col => (
                <div key={col} className="coord-header col-label">{col}</div>
              ))}
            </div>

            {Array.from({ length: BOARD_SIZE }).map((_, r) => (
              <div key={r} className="grid-row-with-header">
                <div className="coord-header">{ROW_LABELS[r]}</div>
                {Array.from({ length: BOARD_SIZE }).map((_, c) => {
                  const isOccupied = placedShips.some(s => s.cells.some(cell => cell.row === r && cell.col === c));
                  const isPreview = previewCandidate.some(p => p.row === r && p.col === c);

                  let cellClasses = ['board-cell'];
                  if (isOccupied) cellClasses.push('cell-ship');
                  if (isPreview) {
                    cellClasses.push(isPreviewValid ? 'cell-preview-valid' : 'cell-preview-invalid');
                  }

                  return (
                    <div
                      key={c}
                      className={cellClasses.join(' ')}
                      data-row={r}
                      data-col={c}
                      onMouseEnter={() => setHoverCell({ row: r, col: c })}
                      onClick={() => handleCellClick(r, c)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

