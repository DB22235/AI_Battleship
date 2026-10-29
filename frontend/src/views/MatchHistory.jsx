import React, { useEffect, useState } from 'react';
import { LocalStorageProvider } from '../storage/storage.js';
import { BackendClient } from '../api/backend-client.js';

export function MatchHistory({ onBack, onPlayNewMatch }) {
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filterResult, setFilterResult] = useState('all');
  const [source, setSource] = useState('Loading backend…');

  useEffect(() => {
    BackendClient.getRecentMatches().then(rows => { setMatches(rows); setSource('Saved by local FastAPI backend'); })
      .catch(() => { setMatches(LocalStorageProvider.getHistory()); setSource('Backend offline · showing browser fallback history'); });
  }, []);
  const filtered = matches.filter(m => filterResult === 'all' || m.result === filterResult || (filterResult === 'victory' && m.won === true) || (filterResult === 'defeat' && m.won === false));

  const openDetail = async (match) => {
    const id = match.match_id || match.id;
    if (!id) return;
    try { setSelected(await BackendClient.getMatch(id)); }
    catch { setSelected({ match, fleet: [], aiEvents: [] }); }
  };

  return <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
      <div><button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 'var(--space-2)', padding: '6px 14px', fontSize: '13px' }}>← Back to Command Center</button>
        <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Match History</h1><p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{source}. Backend CSVs are stored in <code>model/data/</code>.</p></div>
      <button className="btn btn-primary" onClick={onPlayNewMatch}>Deploy Fleet →</button>
    </div>
    <div className="tabs" style={{ marginBottom: 'var(--space-4)' }}>
      {['all', 'victory', 'defeat'].map(filter => <button key={filter} className={`tab-btn ${filterResult === filter ? 'active' : ''}`} onClick={() => setFilterResult(filter)}>{filter === 'all' ? 'All Matches' : filter === 'victory' ? 'Victories' : 'Defeats'}</button>)}
    </div>
    <div className="card" style={{ padding: 0, overflowX: 'auto' }}>{filtered.length ? <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
      <thead><tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>{['Result', 'Difficulty', 'Turns', 'Hit rate', 'Completed', ''].map(label => <th key={label} style={{ padding: '12px 16px' }}>{label}</th>)}</tr></thead>
      <tbody>{filtered.map(m => { const result = m.result || (m.won ? 'victory' : 'defeat'); const id = m.match_id || m.id; return <tr key={id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <td style={{ padding: '12px 16px' }}><span className={`badge ${result === 'victory' ? 'badge-cyan' : 'badge-danger'}`}>{result.toUpperCase()}</span></td>
        <td style={{ padding: '12px 16px' }}>{(m.difficulty || 'unknown').toUpperCase()}</td><td style={{ padding: '12px 16px' }}>{m.turns}</td>
        <td style={{ padding: '12px 16px' }}>{Math.round(Number(m.hit_rate ?? (m.hitRate || 0) / 100) * 100)}%</td>
        <td style={{ padding: '12px 16px' }}>{new Date(m.completed_at || m.timestamp || '').toLocaleString()}</td><td style={{ padding: '12px 16px' }}><button className="btn btn-secondary" onClick={() => openDetail(m)}>Moves & learning</button></td>
      </tr>; })}</tbody></table> : <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>No saved matches yet. Complete a match while the backend is running.</div>}</div>
    {selected && <div className="card" style={{ marginTop: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><h2 style={{ fontSize: 18, fontWeight: 700 }}>Match details · {selected.match?.match_id || selected.match?.id}</h2><button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button></div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Your shots ({selected.match?.player_shots?.length || 0}) and AI actions ({selected.aiEvents?.filter(e => ['ai_shot', 'ai_sonar_scan'].includes(e.event_type)).length || 0}) are retained in backend CSVs.</p>
      <h3 style={{ marginTop: 16 }}>Player shots</h3><p className="font-mono" style={{ overflowWrap: 'anywhere' }}>{(selected.match?.player_shots || []).map(s => `${String.fromCharCode(65 + s.cell.col)}${s.cell.row + 1} ${s.result}`).join(' · ') || 'No shot detail available.'}</p>
      <h3 style={{ marginTop: 16 }}>AI actions</h3><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}><thead><tr><th>Action</th><th>Target / scan center</th><th>Outcome / count</th><th>Charge</th><th>Strategy</th><th>Observed shots</th><th>Profile layouts</th><th>Reason</th></tr></thead><tbody>{(selected.aiEvents || []).filter(e => ['ai_shot', 'ai_sonar_scan'].includes(e.event_type)).map((e, i) => <tr key={i}><td>{e.action || 'shot'}</td><td>{e.action === 'scan' ? `${String.fromCharCode(65 + Number(e.sonarCenterCol))}${Number(e.sonarCenterRow) + 1}` : e.targetCoordinate}</td><td>{e.action === 'scan' ? `${e.scanResultCount ?? e.sonarCount} unshot cells` : e.outcome}</td><td>{e.chargeBefore == null ? '—' : `${e.chargeBefore ? 'ready' : 'used'} → ${e.chargeAfter ? 'ready' : 'used'}`}</td><td>{e.strategy}</td><td>{e.shotsObserved}</td><td>{e.profileLayoutCount}</td><td>{e.decisionReason || e.explanation}</td></tr>)}</tbody></table></div>
      <h3 style={{ marginTop: 16 }}>Fleet layout captured after match</h3><p className="font-mono">{(selected.fleet || []).map(ship => { const cells = Array.isArray(ship.cells) ? ship.cells : JSON.parse(ship.cells || '[]'); return `${ship.ship_name}: ${cells.map(c => `${String.fromCharCode(65 + c.col)}${c.row + 1}`).join(', ')}`; }).join(' · ')}</p>
    </div>}
  </div>;
}
