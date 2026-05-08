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

/** Returns JWT token from active session, handles auto-refresh via Supabase. */
async function getToken() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session?.access_token) throw new Error('Not authenticated.')
  return session.access_token
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
  getStats: (period) => request(`/api/stats${period ? `?period=${period}` : ''}`),
  /** GET /api/stats/advanced — aggregation for charts */
  getAdvancedStats: () => request('/api/stats/advanced'),

  // ── Shipments ─────────────────────────────────────────
  /** GET /api/shipments — all shipments (with customer, transport, entered-by) */
  getShipments: (status) => request(`/api/shipments${status ? `?status=${encodeURIComponent(status)}` : ''}`),

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

  /** PATCH /api/staff/:id/permissions — update staff permissions (founder only) */
  updateStaffPermissions: (id, body) =>
    request(`/api/staff/${id}/permissions`, { method: 'PATCH', body: JSON.stringify(body) }),
}
