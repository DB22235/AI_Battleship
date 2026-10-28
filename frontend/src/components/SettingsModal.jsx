import React, { useState } from 'react';
import { LocalStorageProvider } from '../storage/storage.js';
import { BackendClient } from '../api/backend-client.js';

export function SettingsModal({ onClose }) {
  const [settings, setSettings] = useState(LocalStorageProvider.getSettings());
  const [backendStatus, setBackendStatus] = useState('Not checked');

  const handleSave = () => {
    LocalStorageProvider.saveSettings(settings);
    onClose();
  };

  const handleReset = () => {
    if (window.confirm('Are you certain? This will delete all your local match history and resets progress.')) {
      LocalStorageProvider.resetAllLocalData();
      alert('All local prototype data has been cleared.');
      onClose();
      window.location.reload();
    }
  };

  const checkBackend = async () => {
    setBackendStatus('Checking…');
    try { await BackendClient.health(); setBackendStatus('Connected · local FastAPI backend'); }
    catch { setBackendStatus('Offline · start FastAPI using backend/README.md'); }
  };

  return (
    <div className="modal-backdrop" id="settings-modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div className="modal-title">Tactical Preferences & Storage</div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Reduced Motion</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Disable grid pulse crosshairs and animations</div>
            </div>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => setSettings({ ...settings, reducedMotion: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)' }}
            />
          </label>

          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Show Heatmap Indicators</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enable visual probability overlays in AI Intelligence</div>
            </div>
            <input
              type="checkbox"
              checked={settings.showHeatmap}
              onChange={(e) => setSettings({ ...settings, showHeatmap: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)' }}
            />
          </label>

          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Confirm Match Abandonment</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Prompt for confirmation before leaving active games</div>
            </div>
            <input
              type="checkbox"
              checked={settings.confirmExit}
              onChange={(e) => setSettings({ ...settings, confirmExit: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)' }}
            />
          </label>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: 'var(--space-2) 0' }} />

          <div style={{ background: 'rgba(69, 215, 232, 0.06)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '13px', marginBottom: '4px' }}>Local FastAPI Backend</div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)', lineHeight: 1.4 }}>Match history, AI shot decisions, and completed fleet layouts are stored as CSV files in this project’s <code>model/data/</code> folder.</p>
            <div aria-live="polite" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>{backendStatus}</div>
            <button className="btn btn-secondary" onClick={checkBackend} style={{ padding: '6px 12px', fontSize: '12px' }}>Check Backend</button>
          </div>

          <div style={{ background: 'rgba(255, 100, 124, 0.08)', border: '1px solid rgba(255, 100, 124, 0.3)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)' }}>
            <div style={{ fontWeight: 700, color: 'var(--status-hit)', fontSize: '13px', marginBottom: '4px' }}>Reset Browser-Local Progress</div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', lineHeight: 1.4 }}>
              Clear locally stored settings, progression, and fallback records. Backend CSV history remains in <code>model/data/</code>.
            </p>
            <button className="btn btn-danger" onClick={handleReset} style={{ padding: '6px 14px', fontSize: '12px' }}>
              Reset All Local Data
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handleSave}>Save Preferences</button>
        </div>
      </div>
    </div>
  );
}

