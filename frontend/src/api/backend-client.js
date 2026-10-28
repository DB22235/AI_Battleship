const API_ROOT = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Backend request failed (${response.status})`);
  }
  return response.json();
}

export const BackendClient = {
  health: () => request('/health'),
  scoreAdaptive: (state, candidates) => request('/model/score', { method: 'POST', body: JSON.stringify({ state, candidates }) }),
  saveMatch: match => request('/matches', { method: 'POST', body: JSON.stringify(match) }),
  getProfile: () => request('/model/profile'),
  getRecentMatches: (limit = 30) => request(`/matches/recent?limit=${limit}`),
  getMatch: id => request(`/matches/${encodeURIComponent(id)}`),
  logUrl: name => `${API_ROOT}/logs/${encodeURIComponent(name)}`,
};
