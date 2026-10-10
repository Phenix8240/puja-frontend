const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  } catch {
    throw new Error('Cannot reach the server. Make sure it is running (npm run dev in the server folder).');
  }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status}).`);
  return body;
}

const json = (method, data) => ({ method, body: JSON.stringify(data) });

export const api = {
  list: () => request('/pandals'),
  create: (data) => request('/pandals', json('POST', data)),
  update: (id, data) => request(`/pandals/${encodeURIComponent(id)}`, json('PUT', data)),
  patch: (id, data) => request(`/pandals/${encodeURIComponent(id)}`, json('PATCH', data)),
  remove: (id) => request(`/pandals/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  bulk: (list) => request('/pandals/bulk', json('POST', list)),
};