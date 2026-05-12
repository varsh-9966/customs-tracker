import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import Reports from '../../Shared/Reports'
import logoUrl from '../../../assets/logo.png'

export default function FounderDashboard({ user, profile, handleLogout, installApp }) {
  const [currentTab, setCurrentTab] = useState('analytics')
  const [stats, setStats] = useState({ shipments: 0, customers: 0, staff: 0, pending: 0, completed: 0 })
  const [loadingStats, setLoadingStats] = useState(true)
  const [recentShipments, setRecentShipments] = useState([])
  const [shipments, setShipments] = useState([])
  const [loadingShipments, setLoadingShipments] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [historyFilter, setHistoryFilter] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dashboardFilter, setDashboardFilter] = useState('all')
  const [reportStatusFilter, setReportStatusFilter] = useState('')

  // Staff Creation
  const [staffEmail, setStaffEmail] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [staffName, setStaffName] = useState('')
  const [staffMessage, setStaffMessage] = useState('')
  const [staffList, setStaffList] = useState([])
  const [loadingStaff, setLoadingStaff] = useState(false)

  useEffect(() => {
    if (currentTab === 'analytics') fetchStats()
    if (currentTab === 'staff') fetchStaffList()
    if (currentTab === 'tracker') fetchShipments()
  }, [currentTab, dashboardFilter, historyFilter])

  const fetchShipments = async () => {
    setLoadingShipments(true)
    try {
      const data = await api.getShipments(historyFilter)
      setShipments(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingShipments(false)
    }
  }

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const data = await api.getStats(dashboardFilter)
      setStats({
        shipments: data.total,
        customers: data.customers,
        staff: data.staff,
        pending: data.pending,
        completed: data.completed,
      })
      setRecentShipments(data.recent || [])
    } catch (err) {
      console.error('Stats error:', err)
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchStaffList = async () => {
    setLoadingStaff(true)
    try {
      const data = await api.getStaff()
      setStaffList(data || [])
    } catch (err) {
      console.error('Staff list error:', err)
    } finally {
      setLoadingStaff(false)
    }
  }

  const handleCreateStaff = async () => {
    setStaffMessage('')
    if (!staffEmail || !staffPassword || !staffName) { setStaffMessage('Please fill all fields.'); return }
    try {
      await api.createStaff({ full_name: staffName, email: staffEmail, password: staffPassword })
      setStaffMessage('Staff account created successfully!')
      setStaffEmail(''); setStaffPassword(''); setStaffName('')
      fetchStaffList()
    } catch (err) {
      setStaffMessage('Failed: ' + err.message)
    }
  }

  const handlePermissionChange = async (staffId, field, value) => {
    try {
      const staffMember = staffList.find(s => s.id === staffId);
      if (!staffMember) return;
      const updatedPermissions = {
        view_access: staffMember.view_access || false,
        enter_access: staffMember.enter_access || false,
        delete_access: staffMember.delete_access || false,
        edit_access: staffMember.edit_access || false,
        [field]: value
      };
      
      // Optimistic UI update
      setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, ...updatedPermissions } : s));
      
      await api.updateStaffPermissions(staffId, updatedPermissions);
    } catch (err) {
      console.error('Failed to update permission', err);
      fetchStaffList(); // Revert on failure
    }
  }

  const getStatusBadge = (status) => {
    if (!status) return <span className="status-badge default">—</span>
    const cls = status.toLowerCase().replace(' ', '')
    return <span className={`status-badge ${cls}`}>{status}</span>
  }

  return (
    <div className="dashboard-layout theme-purple">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="mobile-logo">
          <img src={logoUrl} alt="Logo" style={{height: '35px'}} />
          <span>Shipment Tracker</span>
        </div>
        <button className="hamburger-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src={logoUrl} alt="Logo" />
          <span>Shipment Tracker</span>
        </div>
        <div className="nav-links">
          <div className={`nav-item ${currentTab === 'analytics' ? 'active' : ''}`} onClick={() => setCurrentTab('analytics')}>
            📊 Analytics
          </div>
          <div className={`nav-item ${currentTab === 'tracker' ? 'active' : ''}`} onClick={() => setCurrentTab('tracker')}>
            📋 Tracker Board
          </div>
          <div className={`nav-item ${currentTab === 'reports' ? 'active' : ''}`} onClick={() => setCurrentTab('reports')}>
            📄 Reports
          </div>
          <div className={`nav-item ${currentTab === 'staff' ? 'active' : ''}`} onClick={() => setCurrentTab('staff')}>
            👥 Staff Management
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div className="nav-item" onClick={handleLogout}>
              🚪 Logout
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1.5px solid #f3f4f6' }}>
          <h2 style={{ textAlign: 'left', margin: 0, fontSize: '1.6rem', color: 'var(--text-dark)', fontWeight: 700 }}>
            {currentTab === 'analytics' && '📊 Operations Overview'}
            {currentTab === 'tracker' && '📋 Tracker Board'}
            {currentTab === 'reports' && '📄 Reports'}
            {currentTab === 'staff' && '👥 Staff Management'}
          </h2>
          <p style={{ color: 'var(--text-light)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            Admin Control Panel • <strong style={{ color: 'var(--purple-600)' }}>{profile.full_name}</strong>
          </p>
        </div>

        {/* ── ANALYTICS TAB ── */}
        {currentTab === 'analytics' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🎛️</span>
                <select className="table-select" value={dashboardFilter} onChange={e => setDashboardFilter(e.target.value)} style={{ width: '180px', borderRadius: '20px' }}>
                  <option value="all">All Time</option>
                  <option value="month">This Month</option>
                  <option value="week">This Week</option>
                </select>
              </div>
            </div>
            
            {/* Metric Tiles */}
            <div className="metrics-grid">
              <div className="metric-tile" onClick={() => { setReportStatusFilter(''); setCurrentTab('reports'); }} style={{ cursor: 'pointer' }}>
                <span className="metric-title">Total Shipments</span>
                <span className="metric-value">{loadingStats ? '…' : stats.shipments}</span>
              </div>
              <div className="metric-tile teal">
                <span className="metric-title">Active Customers</span>
                <span className="metric-value">{loadingStats ? '…' : stats.customers}</span>
              </div>
              <div className="metric-tile red" onClick={() => { setReportStatusFilter('Pending'); setCurrentTab('reports'); }} style={{ cursor: 'pointer', outline: 'none' }}>
                <span className="metric-title">DO Pending</span>
                <span className="metric-value">{loadingStats ? '…' : stats.pending}</span>
              </div>
              <div className="metric-tile amber" onClick={() => { setReportStatusFilter('Completed'); setCurrentTab('reports'); }} style={{ cursor: 'pointer' }}>
                <span className="metric-title">DO Completed</span>
                <span className="metric-value">{loadingStats ? '…' : stats.completed}</span>
              </div>
              <div className="metric-tile pink">
                <span className="metric-title">Staff Members</span>
                <span className="metric-value">{loadingStats ? '…' : stats.staff}</span>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="chart-container" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--purple-600)', marginBottom: '1.25rem', fontWeight: 700 }}>System Overview</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { label: 'Shipments', value: stats.shipments, max: 100, color: 'var(--purple-500)', bg: 'var(--purple-100)' },
                  { label: 'Customers', value: stats.customers, max: 50, color: 'var(--purple-400)', bg: 'var(--purple-100)' },
                  { label: 'DO Pending', value: stats.pending, max: stats.shipments || 1, color: '#f87171', bg: '#fee2e2' },
                  { label: 'Completed', value: stats.completed, max: stats.shipments || 1, color: '#34d399', bg: '#d1fae5' },
                ].map(bar => (
                  <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ width: '100px', fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.9rem' }}>{bar.label}</span>
                    <div style={{ flexGrow: 1, background: bar.bg, height: '20px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ width: `${Math.min((bar.value / bar.max) * 100, 100)}%`, background: bar.color, height: '100%', transition: 'width 1s ease-out', borderRadius: '10px' }} />
                    </div>
                    <span style={{ width: '36px', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem' }}>{bar.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Shipments Table */}
            <div className="chart-container" style={{ border: '1.5px solid var(--purple-200)' }}>
              <h3 style={{ color: 'var(--purple-600)', marginBottom: '1rem', fontWeight: 700 }}>📦 Recent Shipments</h3>
              {loadingStats ? (
                <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '2rem' }}>Loading…</p>
              ) : recentShipments.length === 0 ? (
                <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '2rem' }}>No shipments found.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr>
                        {['File No', 'Customer', 'ETA', 'Clear Status', 'DO Status', 'Progress', 'Entered By'].map(h => (
                          <th key={h} style={{ background: '#ede9fe', color: 'var(--purple-600)', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.4px', textTransform: 'uppercase', padding: '0.65rem 1rem', border: '1px solid #ddd6fe' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentShipments.map((s, i) => (
                        <tr key={s.id}>
                          {[
                            <strong>{s.file_no}</strong>,
                            s.customers?.name || '—',
                            s.eta || '—',
                            getStatusBadge(s.clear_status),
                            getStatusBadge(s.do_status),
                            s.progress ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ flexGrow: 1, background: '#ede9fe', height: '8px', borderRadius: '4px', overflow: 'hidden', minWidth: '50px' }}>
                                  <div style={{ width: s.progress, background: 'var(--purple-500)', height: '100%', borderRadius: '4px' }} />
                                </div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--purple-600)' }}>{s.progress}</span>
                              </div>
                            ) : '—',
                            <span style={{ color: 'var(--text-light)', fontSize: '0.82rem' }}>{s.entered_by_profile?.full_name || '—'}</span>
                          ].map((cell, ci) => (
                            <td key={ci} style={{ padding: '0.65rem 1rem', border: '1px solid #e5e7eb', background: i % 2 === 0 ? 'white' : '#faf8ff' }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STAFF MANAGEMENT TAB ── */}
        {currentTab === 'staff' && (
          <div>
            {/* Create Staff Form */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1.5px solid var(--purple-200)', boxShadow: '0 4px 20px rgba(124,58,237,0.07)', padding: '1.5rem', marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
              <h3 style={{ color: 'var(--purple-600)', marginBottom: '0.25rem', fontWeight: 700 }}>➕ Create New Staff Account</h3>
              <p style={{ color: 'var(--text-light)', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
                Staff accounts can access the Operations Tracker Board to manage shipments.
              </p>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ color: 'var(--purple-600)' }}>Full Name</label>
                <input type="text" placeholder="e.g. John Doe" value={staffName} onChange={e => setStaffName(e.target.value)} style={{ border: '1.5px solid var(--purple-200)' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ color: 'var(--purple-600)' }}>Login ID (Email)</label>
                  <input type="email" placeholder="staff@company.com" value={staffEmail} onChange={e => setStaffEmail(e.target.value)} style={{ border: '1.5px solid var(--purple-200)' }} />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ color: 'var(--purple-600)' }}>Password</label>
                  <input type="password" placeholder="••••••••" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} style={{ border: '1.5px solid var(--purple-200)' }} />
                </div>
              </div>

              <button
                className="btn primary"
                onClick={handleCreateStaff}
                style={{ background: 'linear-gradient(135deg, var(--purple-400), var(--purple-600))', boxShadow: '0 4px 15px rgba(124,58,237,0.3)', width: '100%' }}
              >
                Create Staff Account
              </button>

              {staffMessage && (
                <div className="msg" style={{ background: 'var(--purple-50)', color: 'var(--purple-600)', borderLeftColor: 'var(--purple-400)', marginTop: '1rem' }}>
                  {staffMessage}
                </div>
              )}
            </div>

            {/* Staff List Table */}
            <div className="chart-container" style={{ border: '1.5px solid var(--purple-200)', padding: '1.5rem' }}>
              <h3 style={{ color: 'var(--purple-600)', marginBottom: '1rem', fontWeight: 700 }}>👥 Current Staff Members</h3>
              {loadingStaff ? (
                <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '2rem' }}>Loading…</p>
              ) : staffList.length === 0 ? (
                <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '2rem' }}>No staff accounts found.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr>
                        {['#', 'Full Name', 'Date Added', 'Permissions'].map(h => (
                          <th key={h} style={{ background: '#ede9fe', color: 'var(--purple-600)', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.4px', textTransform: 'uppercase', padding: '0.65rem 1rem', border: '1px solid #ddd6fe' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.map((s, i) => (
                        <tr key={s.id}>
                          <td style={{ padding: '0.65rem 1rem', border: '1px solid #e5e7eb', color: 'var(--text-light)', fontWeight: 600, background: i % 2 === 0 ? 'white' : '#faf8ff' }}>{i + 1}</td>
                          <td style={{ padding: '0.65rem 1rem', border: '1px solid #e5e7eb', fontWeight: 600, background: i % 2 === 0 ? 'white' : '#faf8ff' }}>{s.full_name}</td>
                          <td style={{ padding: '0.65rem 1rem', border: '1px solid #e5e7eb', color: 'var(--text-light)', fontSize: '0.85rem', background: i % 2 === 0 ? 'white' : '#faf8ff' }}>
                            {new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', border: '1px solid #e5e7eb', background: i % 2 === 0 ? 'white' : '#faf8ff' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                <input type="checkbox" checked={s.view_access} onChange={(e) => handlePermissionChange(s.id, 'view_access', e.target.checked)} />
                                View
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                <input type="checkbox" checked={s.enter_access} onChange={(e) => handlePermissionChange(s.id, 'enter_access', e.target.checked)} />
                                Enter
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                <input type="checkbox" checked={s.edit_access} onChange={(e) => handlePermissionChange(s.id, 'edit_access', e.target.checked)} />
                                Edit
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                <input type="checkbox" checked={s.delete_access} onChange={(e) => handlePermissionChange(s.id, 'delete_access', e.target.checked)} />
                                Delete
                              </label>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REPORTS TAB ── */}
        {currentTab === 'reports' && (
          <Reports initialStatusFilter={reportStatusFilter} />
        )}

        {/* ── TRACKER TAB ── */}
        {currentTab === 'tracker' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="🔍 Search File No, Customer, BL No..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="table-input"
                style={{ width: '260px', borderRadius: '20px' }}
              />
              <span style={{ fontSize: '1.2rem' }}>🎛️</span>
              <select className="table-select" value={historyFilter} onChange={e => setHistoryFilter(e.target.value)} style={{ width: '200px', borderRadius: '20px' }}>
                <option value="">All Status (History)</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
                <option value="Assessment">Assessment</option>
                <option value="Examination">Examination</option>
              </select>
            </div>
            <div className="table-container" style={{ flexGrow: 1, minHeight: '500px', overflowY: 'auto' }}>
              <table className="staff-table" style={{ width: '100%', minWidth: '1500px' }}>
                <thead>
                  <tr>
                    <th colSpan="7" style={{ background: '#f0fdfa', color: '#0d9488', textAlign: 'center', borderRight: '2px solid #d1d5db' }}>BASIC INFO</th>
                    <th colSpan="2" style={{ background: '#ccfbf1', color: '#0d9488', textAlign: 'center', borderRight: '2px solid #d1d5db' }}>DOCUMENTS</th>
                    <th colSpan="7" style={{ background: '#99f6e4', color: '#0f766e', textAlign: 'center', borderRight: '2px solid #d1d5db' }}>CUSTOMS CLEARANCE</th>
                    <th colSpan="2" style={{ background: '#5eead4', color: '#0f766e', textAlign: 'center', borderRight: '2px solid #d1d5db' }}>DELIVERY ORDER</th>
                    <th colSpan="3" style={{ background: '#2dd4bf', color: 'white', textAlign: 'center', borderRight: '2px solid #d1d5db' }}>TRANSPORT</th>
                    <th colSpan="2" style={{ background: '#14b8a6', color: 'white', textAlign: 'center', borderRight: '2px solid #d1d5db' }}>BILLING</th>
                    <th colSpan="5" style={{ background: '#0d9488', color: 'white', textAlign: 'center' }}>COMPLETION & TRACKING</th>
                  </tr>
                  <tr>
                    <th>FILE NO</th><th>CUSTOMER</th><th>ETA</th><th>CONTAINERS</th><th>CONTAINER TYPE</th><th>QTY</th>
                    <th style={{ borderRight: '2px solid #d1d5db' }}>BL NO</th>
                    <th>DOCS RCVD</th><th style={{ borderRight: '2px solid #d1d5db' }}>DOCS DATE</th>
                    <th>CLEAR MODE</th><th>BE NO</th><th>BE DATE</th><th>BE FILED</th><th>CLEAR STATUS</th><th>STATUS DATE</th><th style={{ borderRight: '2px solid #d1d5db' }}>HANDLED BY</th>
                    <th>DO STATUS</th><th style={{ borderRight: '2px solid #d1d5db' }}>DO DATE</th>
                    <th>DELIVERY TYPE</th><th>TRANSPORT</th><th style={{ borderRight: '2px solid #d1d5db' }}>VEHICLE NO</th>
                    <th>MOVED TO DATE</th><th style={{ borderRight: '2px solid #d1d5db' }}>BILLED DATE</th>
                    <th>FACTORY DEL.</th><th>EMPTY RET.</th><th>PROGRESS</th><th>REMARKS</th><th>ENTERED BY</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingShipments && <tr><td colSpan="26" style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</td></tr>}
                  {!loadingShipments && shipments.filter(s => {
                    const search = searchTerm.toLowerCase();
                    const matchesSearch = (s.file_no && s.file_no.toLowerCase().includes(search)) ||
                      (s.customers?.name && s.customers.name.toLowerCase().includes(search)) ||
                      (s.bl_no && s.bl_no.toLowerCase().includes(search));
                    return matchesSearch;
                  }).map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.file_no}</strong></td>
                      <td>{s.customers?.name}</td>
                      <td>{s.eta}</td>
                      <td>{s.containers}</td>
                      <td>{s.container_type}</td>
                      <td>{s.qty}</td>
                      <td style={{ borderRight: '2px solid #d1d5db' }}>{s.bl_no}</td>
                      <td>{s.docs_received ? 'Yes' : (s.docs_received === false ? 'No' : '')}</td>
                      <td style={{ borderRight: '2px solid #d1d5db' }}>{s.docs_date}</td>
                      <td>{s.clear_mode}</td>
                      <td>{s.be_no}</td>
                      <td>{s.be_date}</td>
                      <td>{s.be_filed_date}</td>
                      <td>{s.clear_status}</td>
                      <td>{s.clear_status_date}</td>
                      <td style={{ borderRight: '2px solid #d1d5db' }}>{s.handled_by_name || s.handled_by}</td>
                      <td>{s.do_status}</td>
                      <td style={{ borderRight: '2px solid #d1d5db' }}>{s.do_date}</td>
                      <td>{s.delivery_type}</td>
                      <td>{s.transport_name}</td>
                      <td style={{ borderRight: '2px solid #d1d5db' }}>{s.vehicle_no}</td>
                      <td>{s.moved_to_date}</td>
                      <td style={{ borderRight: '2px solid #d1d5db' }}>{s.billed_date}</td>
                      <td>{s.factory_delivered}</td>
                      <td>{s.empty_returned}</td>
                      <td>{s.progress}</td>
                      <td>{s.remarks}</td>
                      <td style={{ color: 'var(--purple-600)', fontWeight: 600 }}>{s.entered_by_profile?.full_name || 'Founder'}</td>
                    </tr>
                  ))}
                  {!loadingShipments && shipments.length === 0 && (
                    <tr><td colSpan="26" style={{ textAlign: 'center', padding: '2rem' }}>No shipments found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
