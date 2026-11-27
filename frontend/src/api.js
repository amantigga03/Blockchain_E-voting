export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed. Please check if backend is running.');
  }
  return data;
}

export const api = {
  getStatus: () => request('/status'),
  getCandidates: () => request('/candidates'),
  getDemoVoters: () => request('/demo-voters'),

  // Voter JWT Auth
  voterLogin: (voterId, pin) =>
    request('/auth/login', { method: 'POST', body: { voterId, pin } }),
  voterRegister: (voterId, name, dob, pin) =>
    request('/auth/register', { method: 'POST', body: { voterId, name, dob, pin } }),

  // Vote (JWT Protected)
  castVote: (token, candidateId) =>
    request('/vote', { method: 'POST', token, body: { candidateId } }),

  // Results & Explorer
  getResults: () => request('/results'),
  getChain: () => request('/chain'),
  verifyReceipt: (txId) => request(`/receipt/${encodeURIComponent(txId)}`),
  simulateTamper: () => request('/chain/tamper', { method: 'POST' }),

  // Admin JWT Auth & Controls
  adminLogin: (pin) => request('/admin/login', { method: 'POST', body: { pin } }),
  addCandidate: (token, payload) =>
    request('/admin/candidates', { method: 'POST', token, body: payload }),
  deleteCandidate: (token, id) =>
    request(`/admin/candidates/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
  registerVoterAdmin: (token, payload) =>
    request('/admin/voters', { method: 'POST', token, body: payload }),
  updateStatus: (token, status) =>
    request('/admin/status', { method: 'POST', token, body: { status } }),
  switchTheme: (token, theme) =>
    request('/admin/theme', { method: 'POST', token, body: { theme } }),
  resetElection: (token) =>
    request('/admin/reset', { method: 'POST', token })
};
