/**
 * api.js — Central API service for CustomsTracker frontend.
 *
 * HOW JWT AUTH WORKS (client side):
 * ──────────────────────────────────────────────────────────
 * 1. User logs in via supabase.auth.signInWithPassword()
 * 2. onAuthStateChange fires → token is cached in _token
 * 3. Every API call reads _token and attaches:
 *        Authorization: Bearer <_token>
 * 4. The FastAPI backend verifies this token on every request.
 * ──────────────────────────────────────────────────────────
 */

import { supabase } from './supabaseClient'

// Cache token at module level — updated by onAuthStateChange (fires on login/logout/refresh)
let _token = null

supabase.auth.onAuthStateChange((_event, session) => {
  _token = session?.access_token ?? null
})

// Also seed it immediately from stored session (handles page refresh)
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.access_token) _token = session.access_token
})

/** Returns cached JWT token, or falls back to getSession() if cache is empty. */
async function getToken() {
  if (_token) return _token
  // Fallback: re-read from storage (handles rare cold-start cases)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated.')
  _token = session.access_token
  return _token
}

/** Base fetch wrapper — attaches Authorization header automatically. */
async function request(path, options = {}) {
  const token = await getToken()
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed.')
  }
  return res.json()
}

// ── Stats ────────────────────────────────────────────────
export const api = {
  /** GET /api/stats — dashboard counts + recent shipments */
  getStats: () => request('/api/stats'),

  // ── Shipments ─────────────────────────────────────────
  /** GET /api/shipments — all shipments (with customer, transport, entered-by) */
  getShipments: () => request('/api/shipments'),

  /** POST /api/shipments — create a new shipment */
  createShipment: (body) =>
    request('/api/shipments', { method: 'POST', body: JSON.stringify(body) }),

  /** PATCH /api/shipments/:id — update a shipment */
  updateShipment: (id, body) =>
    request(`/api/shipments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  /** DELETE /api/shipments/:id — delete (founder only) */
  deleteShipment: (id) =>
    request(`/api/shipments/${id}`, { method: 'DELETE' }),

  // ── Customers ─────────────────────────────────────────
  /** GET /api/customers?search=xxx — customer autocomplete */
  searchCustomers: (search) =>
    request(`/api/customers?search=${encodeURIComponent(search)}`),

  // ── Staff ─────────────────────────────────────────────
  /** GET /api/staff — list staff (founder only) */
  getStaff: () => request('/api/staff'),

  /** POST /api/staff — create staff account (founder only) */
  createStaff: (body) =>
    request('/api/staff', { method: 'POST', body: JSON.stringify(body) }),
}
