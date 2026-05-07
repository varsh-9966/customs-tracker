import { useState, useEffect, useRef } from 'react'
import { api } from '../../../services/api'

export default function StaffDashboard({ user, profile, handleLogout }) {
  const [currentTab, setCurrentTab] = useState('dashboard')
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, customers: 0 })
  const [loadingStats, setLoadingStats] = useState(true)
  const [recentShipments, setRecentShipments] = useState([])

  // New row state
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newRow, setNewRow] = useState({
    file_no: '', customerName: '', eta: '', containers: '', qty: '', bl_no: '',
    docs_received: '', docs_date: '', clear_mode: '', be_filed_date: '',
    clear_status: '', clear_status_date: '', do_status: '', do_date: '',
    delivery_type: '', transport_name: '', vehicle_no: '',
    factory_delivered: '', empty_returned: '', billed_date: '',
    progress: '', remarks: ''
  })

  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => { fetchShipments(); fetchStats() }, [])

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const data = await api.getStats()
      setStats({ total: data.total, pending: data.pending, completed: data.completed, customers: data.customers })
      setRecentShipments(data.recent || [])
    } catch (err) {
      console.error('Stats error:', err)
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchShipments = async () => {
    setLoading(true)
    try {
      const data = await api.getShipments()
      setShipments(data)
    } catch (err) {
      console.error(err)
      setMessage('Failed to load shipments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchCustomers = async () => {
      if (newRow.customerName.trim().length === 0) { setSuggestions([]); return }
      try {
        const data = await api.searchCustomers(newRow.customerName)
        setSuggestions(data || [])
      } catch { setSuggestions([]) }
    }
    const delay = setTimeout(() => { if (showSuggestions && isAdding) fetchCustomers() }, 300)
    return () => clearTimeout(delay)
  }, [newRow.customerName, showSuggestions, isAdding])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [wrapperRef])

  const handleSaveRow = async () => {
    if (!newRow.file_no || !newRow.customerName) { setMessage('File No and Customer Name are required.'); return }
    setSaving(true); setMessage('')
    try {
      const body = {
        file_no: newRow.file_no,
        customer_name: newRow.customerName,
        eta: newRow.eta || null,
        containers: newRow.containers || null,
        qty: newRow.qty || null,
        bl_no: newRow.bl_no || null,
        docs_received: newRow.docs_received === 'Yes' ? true : newRow.docs_received === 'No' ? false : null,
        docs_date: newRow.docs_date || null,
        clear_mode: newRow.clear_mode || null,
        be_filed_date: newRow.be_filed_date || null,
        clear_status: newRow.clear_status || null,
        clear_status_date: newRow.clear_status_date || null,
        do_status: newRow.do_status || null,
        do_date: newRow.do_date || null,
        delivery_type: newRow.delivery_type || null,
        factory_delivered: newRow.factory_delivered || null,
        empty_returned: newRow.empty_returned || null,
        billed_date: newRow.billed_date || null,
        progress: newRow.progress || null,
        remarks: newRow.remarks || null,
        transport_name: newRow.transport_name || null,
        vehicle_no: newRow.vehicle_no || null,
      }
      await api.createShipment(body)
      setMessage('Shipment added successfully!')
      setIsAdding(false)
      setNewRow({ file_no: '', customerName: '', eta: '', containers: '', qty: '', bl_no: '', docs_received: '', docs_date: '', clear_mode: '', be_filed_date: '', clear_status: '', clear_status_date: '', do_status: '', do_date: '', delivery_type: '', transport_name: '', vehicle_no: '', factory_delivered: '', empty_returned: '', billed_date: '', progress: '', remarks: '' })
      fetchShipments(); fetchStats()
    } catch (err) { console.error(err); setMessage(err.message) }
    finally { setSaving(false) }
  }

  const filteredShipments = shipments.filter(s => {
    const search = searchTerm.toLowerCase()
    return (
      (s.file_no && s.file_no.toLowerCase().includes(search)) ||
      (s.customers?.name && s.customers.name.toLowerCase().includes(search)) ||
      (s.bl_no && s.bl_no.toLowerCase().includes(search))
    )
  })

  const getStatusBadge = (status) => {
    if (!status) return <span className="status-badge default">—</span>
    const cls = status.toLowerCase().replace(' ', '')
    return <span className={`status-badge ${cls}`}>{status}</span>
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <span>🌍</span> CustomsTracker
        </div>
        <div className="nav-links">
          <div className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentTab('dashboard')}>
            📊 Dashboard
          </div>
          <div className={`nav-item ${currentTab === 'tracker' ? 'active' : ''}`} onClick={() => setCurrentTab('tracker')}>
            📋 Tracker Board
          </div>
          <div className="nav-item" style={{ marginTop: 'auto' }} onClick={handleLogout}>
            🚪 Logout
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1.5px solid #f3f4f6' }}>
          <div>
            <h2 style={{ textAlign: 'left', margin: 0, fontSize: '1.6rem', color: 'var(--text-dark)', fontWeight: 700 }}>
              {currentTab === 'dashboard' ? '📊 My Dashboard' : '📋 Tracker Board'}
            </h2>
            <p style={{ color: 'var(--text-light)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
              Welcome back, <strong style={{ color: 'var(--pink-600)' }}>{profile.full_name}</strong>
            </p>
          </div>
          {currentTab === 'tracker' && (
            <div className="filter-bar" style={{ margin: 0 }}>
              <input
                type="text"
                placeholder="🔍 Search File No or Customer..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="table-input"
                style={{ width: '260px', borderRadius: '20px' }}
              />
            </div>
          )}
        </div>

        {message && <div className="msg" style={{ marginBottom: '1rem' }}>{message}</div>}

        {/* ── DASHBOARD TAB ── */}
        {currentTab === 'dashboard' && (
          <div>
            {/* Stat Tiles */}
            <div className="staff-metrics-grid">
              <div className="staff-metric-tile">
                <div className="tile-icon">🚢</div>
                <div className="tile-label">Total Shipments</div>
                <div className="tile-value">{loadingStats ? '…' : stats.total}</div>
              </div>
              <div className="staff-metric-tile teal">
                <div className="tile-icon">✅</div>
                <div className="tile-label">DO Completed</div>
                <div className="tile-value">{loadingStats ? '…' : stats.completed}</div>
              </div>
              <div className="staff-metric-tile amber">
                <div className="tile-icon">⏳</div>
                <div className="tile-label">DO Pending</div>
                <div className="tile-value">{loadingStats ? '…' : stats.pending}</div>
              </div>
              <div className="staff-metric-tile red">
                <div className="tile-icon">🏭</div>
                <div className="tile-label">Active Customers</div>
                <div className="tile-value">{loadingStats ? '…' : stats.customers}</div>
              </div>
            </div>

            {/* Recent Shipments */}
            <div className="chart-container" style={{ border: '1.5px solid var(--pink-200)', borderRadius: 16, padding: '1.5rem' }}>
              <h3 style={{ color: 'var(--pink-600)', marginBottom: '1rem', fontSize: '1.05rem', fontWeight: 700 }}>
                📦 Recent Shipments
              </h3>
              {loadingStats ? (
                <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '2rem' }}>Loading…</p>
              ) : recentShipments.length === 0 ? (
                <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '2rem' }}>No shipments yet. Add one from the Tracker Board.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="recent-table">
                    <thead>
                      <tr>
                        <th>File No</th>
                        <th>Customer</th>
                        <th>ETA</th>
                        <th>Clear Status</th>
                        <th>DO Status</th>
                        <th>Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentShipments.map(s => (
                        <tr key={s.id}>
                          <td><strong>{s.file_no}</strong></td>
                          <td>{s.customers?.name || '—'}</td>
                          <td>{s.eta || '—'}</td>
                          <td>{getStatusBadge(s.clear_status)}</td>
                          <td>{getStatusBadge(s.do_status)}</td>
                          <td>
                            {s.progress ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ flexGrow: 1, background: '#fce7f3', height: '8px', borderRadius: '4px', overflow: 'hidden', minWidth: '60px' }}>
                                  <div style={{ width: s.progress, background: 'var(--pink-500)', height: '100%', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                                </div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--pink-600)' }}>{s.progress}</span>
                              </div>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                className="btn primary"
                style={{ borderRadius: '12px', padding: '0.8rem 1.8rem', fontSize: '0.95rem' }}
                onClick={() => { setCurrentTab('tracker'); setIsAdding(true) }}
              >
                ＋ Add New Shipment
              </button>
              <button
                className="btn"
                style={{ borderRadius: '12px', padding: '0.8rem 1.8rem', fontSize: '0.95rem', border: '1.5px solid var(--pink-300)', color: 'var(--pink-600)', background: 'white' }}
                onClick={() => setCurrentTab('tracker')}
              >
                📋 View All Shipments
              </button>
            </div>
          </div>
        )}

        {/* ── TRACKER BOARD TAB ── */}
        {currentTab === 'tracker' && (
          <>
            <div className="table-container" style={{ flexGrow: 1, height: '0' }}>
              <table className="staff-table">
                <thead>
                  <tr>
                    <th colSpan="6" style={{ background: '#f0fdfa', color: '#0d9488', textAlign: 'center', borderRight: '2px solid #d1d5db' }}>BASIC INFO</th>
                    <th colSpan="2" style={{ background: '#ccfbf1', color: '#0d9488', textAlign: 'center', borderRight: '2px solid #d1d5db' }}>DOCUMENTS</th>
                    <th colSpan="4" style={{ background: '#99f6e4', color: '#0f766e', textAlign: 'center', borderRight: '2px solid #d1d5db' }}>CUSTOMS CLEARANCE</th>
                    <th colSpan="2" style={{ background: '#5eead4', color: '#0f766e', textAlign: 'center', borderRight: '2px solid #d1d5db' }}>DELIVERY ORDER</th>
                    <th colSpan="3" style={{ background: '#2dd4bf', color: 'white', textAlign: 'center', borderRight: '2px solid #d1d5db' }}>TRANSPORT</th>
                    <th colSpan="6" style={{ background: '#14b8a6', color: 'white', textAlign: 'center' }}>COMPLETION & TRACKING</th>
                  </tr>
                  <tr>
                    <th>FILE NO</th><th>CUSTOMER</th><th>ETA</th><th>CONTAINERS</th><th>QTY</th>
                    <th style={{ borderRight: '2px solid #d1d5db' }}>BL NO</th>
                    <th>DOCS RCVD</th><th style={{ borderRight: '2px solid #d1d5db' }}>DOCS DATE</th>
                    <th>CLEAR MODE</th><th>BE FILED</th><th>CLEAR STATUS</th><th style={{ borderRight: '2px solid #d1d5db' }}>STATUS DATE</th>
                    <th>DO STATUS</th><th style={{ borderRight: '2px solid #d1d5db' }}>DO DATE</th>
                    <th>DELIVERY TYPE</th><th>TRANSPORT</th><th style={{ borderRight: '2px solid #d1d5db' }}>VEHICLE NO</th>
                    <th>FACTORY DEL.</th><th>EMPTY RET.</th><th>BILLED DATE</th><th>PROGRESS</th><th>REMARKS</th><th>ENTERED BY</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan="24" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>Loading data…</td></tr>}
                  {!loading && filteredShipments.length === 0 && !isAdding && (
                    <tr><td colSpan="24" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>No shipments found.</td></tr>
                  )}
                  {filteredShipments.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.file_no}</strong></td>
                      <td>{s.customers?.name}</td>
                      <td>{s.eta}</td>
                      <td>{s.containers}</td>
                      <td>{s.qty}</td>
                      <td style={{ borderRight: '2px solid #d1d5db' }}>{s.bl_no}</td>
                      <td>{s.docs_received ? 'Yes' : (s.docs_received === false ? 'No' : '')}</td>
                      <td style={{ borderRight: '2px solid #d1d5db' }}>{s.docs_date}</td>
                      <td>{s.clear_mode}</td>
                      <td>{s.be_filed_date}</td>
                      <td>{s.clear_status}</td>
                      <td style={{ borderRight: '2px solid #d1d5db' }}>{s.clear_status_date}</td>
                      <td>{s.do_status}</td>
                      <td style={{ borderRight: '2px solid #d1d5db' }}>{s.do_date}</td>
                      <td>{s.delivery_type}</td>
                      <td>{s.transport_name}</td>
                      <td style={{ borderRight: '2px solid #d1d5db' }}>{s.vehicle_no}</td>
                      <td>{s.factory_delivered}</td>
                      <td>{s.empty_returned}</td>
                      <td>{s.billed_date}</td>
                      <td>{s.progress}</td>
                      <td>{s.remarks}</td>
                      <td style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>{s.entered_by_profile?.full_name}</td>
                    </tr>
                  ))}
                  {isAdding && (
                    <tr style={{ background: '#f0fdfa' }}>
                      <td><input className="table-input" value={newRow.file_no} onChange={e => setNewRow({...newRow, file_no: e.target.value})} placeholder="File No *" /></td>
                      <td style={{ position: 'relative' }} ref={wrapperRef}>
                        <input className="table-input" value={newRow.customerName}
                          onChange={e => { setNewRow({...newRow, customerName: e.target.value}); setShowSuggestions(true) }}
                          onFocus={() => setShowSuggestions(true)} placeholder="Customer *" />
                        {showSuggestions && newRow.customerName.length > 0 && (
                          <div className="autocomplete-dropdown">
                            {suggestions.map(sg => (
                              <div key={sg.id} className="autocomplete-item" onClick={() => { setNewRow({...newRow, customerName: sg.name}); setShowSuggestions(false) }}>{sg.name}</div>
                            ))}
                            {suggestions.length === 0 && <div className="autocomplete-new">Will add as new</div>}
                          </div>
                        )}
                      </td>
                      <td><input type="date" className="table-input" value={newRow.eta} onChange={e => setNewRow({...newRow, eta: e.target.value})} /></td>
                      <td><input className="table-input" value={newRow.containers} onChange={e => setNewRow({...newRow, containers: e.target.value})} /></td>
                      <td><input className="table-input" value={newRow.qty} onChange={e => setNewRow({...newRow, qty: e.target.value})} /></td>
                      <td style={{ borderRight: '2px solid #d1d5db' }}><input className="table-input" value={newRow.bl_no} onChange={e => setNewRow({...newRow, bl_no: e.target.value})} /></td>
                      <td>
                        <select className="table-select" value={newRow.docs_received} onChange={e => setNewRow({...newRow, docs_received: e.target.value})}>
                          <option value=""></option><option value="Yes">Yes</option><option value="No">No</option>
                        </select>
                      </td>
                      <td style={{ borderRight: '2px solid #d1d5db' }}><input type="date" className="table-input" value={newRow.docs_date} onChange={e => setNewRow({...newRow, docs_date: e.target.value})} /></td>
                      <td>
                        <select className="table-select" value={newRow.clear_mode} onChange={e => setNewRow({...newRow, clear_mode: e.target.value})}>
                          <option value=""></option><option value="CFS">CFS</option><option value="Bonding">Bonding</option><option value="DPD">DPD</option>
                        </select>
                      </td>
                      <td><input type="date" className="table-input" value={newRow.be_filed_date} onChange={e => setNewRow({...newRow, be_filed_date: e.target.value})} /></td>
                      <td>
                        <select className="table-select" value={newRow.clear_status} onChange={e => setNewRow({...newRow, clear_status: e.target.value})}>
                          <option value=""></option><option value="Assessment">Assessment</option><option value="Examination">Examination</option><option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td style={{ borderRight: '2px solid #d1d5db' }}><input type="date" className="table-input" value={newRow.clear_status_date} onChange={e => setNewRow({...newRow, clear_status_date: e.target.value})} /></td>
                      <td>
                        <select className="table-select" value={newRow.do_status} onChange={e => setNewRow({...newRow, do_status: e.target.value})}>
                          <option value=""></option><option value="Pending">Pending</option><option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td style={{ borderRight: '2px solid #d1d5db' }}><input type="date" className="table-input" value={newRow.do_date} onChange={e => setNewRow({...newRow, do_date: e.target.value})} /></td>
                      <td>
                        <select className="table-select" value={newRow.delivery_type} onChange={e => setNewRow({...newRow, delivery_type: e.target.value})}>
                          <option value=""></option><option value="Direct Out">Direct Out</option><option value="Unloading">Unloading</option><option value="Bonding">Bonding</option>
                        </select>
                      </td>
                      <td><input className="table-input" value={newRow.transport_name} onChange={e => setNewRow({...newRow, transport_name: e.target.value})} placeholder="Transport" /></td>
                      <td style={{ borderRight: '2px solid #d1d5db' }}><input className="table-input" value={newRow.vehicle_no} onChange={e => setNewRow({...newRow, vehicle_no: e.target.value})} placeholder="Vehicle No" /></td>
                      <td><input type="date" className="table-input" value={newRow.factory_delivered} onChange={e => setNewRow({...newRow, factory_delivered: e.target.value})} /></td>
                      <td><input type="date" className="table-input" value={newRow.empty_returned} onChange={e => setNewRow({...newRow, empty_returned: e.target.value})} /></td>
                      <td><input type="date" className="table-input" value={newRow.billed_date} onChange={e => setNewRow({...newRow, billed_date: e.target.value})} /></td>
                      <td>
                        <select className="table-select" value={newRow.progress} onChange={e => setNewRow({...newRow, progress: e.target.value})}>
                          <option value=""></option><option value="10%">10%</option><option value="40%">40%</option><option value="60%">60%</option><option value="100%">100%</option>
                        </select>
                      </td>
                      <td><input className="table-input" value={newRow.remarks} onChange={e => setNewRow({...newRow, remarks: e.target.value})} /></td>
                      <td>
                        <button className="action-btn save" onClick={handleSaveRow} disabled={saving}>{saving ? 'Saving…' : '💾 Save'}</button>
                        <button className="action-btn" style={{ marginLeft: '4px', background: 'transparent' }} onClick={() => setIsAdding(false)}>✕</button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!isAdding && (
              <div className="fab-container">
                <button className="fab-btn" onClick={() => setIsAdding(true)} title="Add New Entry">+</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
