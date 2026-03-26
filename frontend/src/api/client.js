const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}`
  : '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

export const api = {
  getTopics: () => request('/topics'),

  getCards: (topic = 'llm', limit = 10) =>
    request(`/cards?topic=${topic}&limit=${limit}`),

  saveCard: (id) =>
    request(`/cards/${id}/save`, { method: 'POST' }),

  ignoreCard: (id) =>
    request(`/cards/${id}/ignore`, { method: 'POST' }),

  unsaveCard: (id) =>
    request(`/cards/${id}/unsave`, { method: 'POST' }),

  getSaved: () => request('/saved'),

  ingest: (topic = 'llm') =>
    request(`/ingest?topic=${topic}`, { method: 'POST' }),
}
