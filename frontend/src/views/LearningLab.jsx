import React, { useEffect, useState } from 'react';
import { BackendClient } from '../api/backend-client.js';

export function LearningLab({ onBack }) {
  const [profile, setProfile] = useState(null);
  const [recent, setRecent] = useState([]);
  const [status, setStatus] = useState('Connecting to local FastAPI backend…');
  useEffect(() => {
    Promise.all([BackendClient.getProfile(), BackendClient.getRecentMatches(8)])
      .then(([p, matches]) => { setProfile(p); setRecent(matches); setStatus('Connected · data stored in this project'); })
      .catch(() => setStatus('Backend offline · start the API to view persistent learning and CSV logs.'));
  }, []);

  const logNames = ['matches.csv', 'player_fleet_layouts.csv', 'adaptive_ai_learning_log.csv'];
  return <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
    <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 'var(--space-3)', padding: '6px 14px', fontSize: 13 }}>← Return to Command Center</button>
    <div style={{ marginBottom: 'var(--space-6)' }}><span className="badge badge-purple">Local API · Explainable policy</span><h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>AI Learning & Match Evidence</h1><p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Personal fleet profile is calculated by FastAPI from completed fleet deployments. No browser folder access or remote service is used.</p><p aria-live="polite" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{status}</p></div>
    {profile && <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Completed fleets observed</div><div className="font-mono" style={{ fontSize: 28, fontWeight: 800 }}>{profile.layoutCount}</div><p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Whole completed matches stored in project CSVs.</p></div>
        <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Personal profile blend</div><div className="font-mono" style={{ fontSize: 28, fontWeight: 800 }}>{Math.round(profile.profileWeight * 100)}%</div><p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Relative ranking blend weight; not a calibrated probability.</p></div>
        <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Synthetic MLP blend</div><div className="font-mono" style={{ fontSize: 28, fontWeight: 800 }}>0%</div><p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Full-game validation selected zero weight, so it is not used in gameplay targeting.</p></div>
      </div>
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}><h2 style={{ fontWeight: 700, fontSize: 18 }}>What the backend learns</h2><p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 13 }}>{profile.method} It counts which cells contain your deployed ship segments, then uses a smoothed prior to nudge Adaptive’s PDM candidate ranking after at least two completed fleets. Your firing coordinates are logged as match history, but they are not treated as evidence of ship placement.</p><p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>Personal profile policy evaluation: Not evaluated separately. The validated synthetic MLP result is not a claim that this personal profile improves performance.</p></div>
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}><h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>Most repeated fleet cells</h2><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{profile.topCells.filter(cell => cell.layouts > 0).slice(0, 15).map(cell => <span key={cell.coordinate} className="badge badge-cyan">{cell.coordinate} · {cell.layouts}/{profile.layoutCount} fleets</span>)}</div>{!profile.layoutCount && <p style={{ color: 'var(--text-muted)' }}>Insufficient data. Finish a game to add a layout.</p>}</div>
    </>}
    <div className="card" style={{ marginBottom: 'var(--space-5)' }}><h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>Project CSV logs</h2><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{logNames.map(name => <a key={name} className="btn btn-secondary" href={BackendClient.logUrl(name)} download>{name}</a>)}</div><p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10 }}>Files are written to <code>model/data/</code> by the backend. Each finished match records player shots, ship cells, AI choices, outcomes, observable-state summaries, and the profile update.</p></div>
    <div className="card"><h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>Recent saved matches</h2>{recent.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><thead><tr><th>Result</th><th>Difficulty</th><th>Shots</th><th>AI decisions</th><th>Completed</th></tr></thead><tbody>{recent.map(m => <tr key={m.match_id}><td>{m.result}</td><td>{m.difficulty}</td><td>{m.player_shots.length}</td><td>{m.ai_shot_count}</td><td>{new Date(m.completed_at).toLocaleString()}</td></tr>)}</tbody></table></div> : <p style={{ color: 'var(--text-muted)' }}>No completed matches saved yet.</p>}</div>
  </div>;
}
