import React from 'react';
import { BOARD_SIZE, COL_LABELS, ROW_LABELS, rowColToLabel } from '../types/constants.js';

export function Board({
  title,
  icon,
  subtitle,
  grid,
  isInteractive = false,
  selectedCell = null,
  onCellClick,
  onCellHover,
  previewCells = [],
  isPreviewValid = true,
  heatmap = null,
  showHeatmap = false
}) {
  return (
    <div className={`board-wrapper ${isInteractive ? 'interactive-target' : ''}`}>
      <div className="board-header">
        <div className="board-title">
          {icon}
          {title}
        </div>
        <div className="board-status font-mono">
          {subtitle}
        </div>
      </div>

      <div className="board-grid-container">
        {/* Column Headers A-J */}
        <div className="grid-col-headers">
          <div className="coord-header col-label"></div>
          {COL_LABELS.map(col => (
            <div key={col} className="coord-header col-label">{col}</div>
          ))}
        </div>

        {/* 10 Rows */}
        {Array.from({ length: BOARD_SIZE }).map((_, r) => (
          <div key={r} className="grid-row-with-header">
            <div className="coord-header">{ROW_LABELS[r]}</div>
            {Array.from({ length: BOARD_SIZE }).map((_, c) => {
              const cellObj = grid ? grid[r][c] : null;
              const isSelected = selectedCell && selectedCell.row === r && selectedCell.col === c;
              const isPreview = previewCells.some(p => p.row === r && p.col === c);
              const heatVal = heatmap && showHeatmap ? heatmap[r][c] : null;

              let cellClasses = ['board-cell'];

              if (cellObj) {
                if (cellObj.result === 'sunk') cellClasses.push('cell-sunk shot-fired');
                else if (cellObj.result === 'hit') cellClasses.push('cell-hit shot-fired');
                else if (cellObj.result === 'miss') cellClasses.push('cell-miss shot-fired');
                else if (cellObj.shipId) cellClasses.push('cell-ship');
              }

              if (isSelected) cellClasses.push('cell-selected');

              if (isPreview) {
                cellClasses.push(isPreviewValid ? 'cell-preview-valid' : 'cell-preview-invalid');
              }

              if (heatVal && heatVal > 0 && !cellObj?.shot) {
                cellClasses.push('has-heatmap');
              }

              return (
                <div
                  key={`${r}-${c}`}
                  className={cellClasses.join(' ')}
                  data-row={r}
                  data-col={c}
                  title={rowColToLabel(r, c)}
                  onClick={() => onCellClick && onCellClick(r, c)}
                  onMouseEnter={() => onCellHover && onCellHover(r, c)}
                >
                  {heatVal && heatVal > 0 && !cellObj?.shot && (
                    <span className="heatmap-badge">{Math.round(heatVal)}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

