import { useState, useEffect } from 'react'
import { supabase } from '../../../services/supabaseClient'

export default function FounderDashboard({ user, profile, handleLogout }) {
  const [currentTab, setCurrentTab] = useState('analytics') // 'analytics' or 'staff'
  const [stats, setStats] = useState({ shipments: 0, customers: 0, staff: 0, pending: 0 })
  const [loadingStats, setLoadingStats] = useState(true)

  // Staff Creation State
  const [staffEmail, setStaffEmail] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [staffName, setStaffName] = useState('')
  const [staffMessage, setStaffMessage] = useState('')

  useEffect(() => {
    if (currentTab === 'analytics') {
      fetchStats()
    }
  }, [currentTab])

  const fetchStats = async () => {
    setLoadingStats(true)
    
    // Using simple count queries
    const { count: shipmentsCount } = await supabase.from('shipments').select('*', { count: 'exact', head: true })
    const { count: customersCount } = await supabase.from('customers').select('*', { count: 'exact', head: true })
    const { count: staffCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'staff')
    
    // Count pending DO shipments as a useful metric
    const { count: pendingCount } = await supabase.from('shipments').select('*', { count: 'exact', head: true }).eq('do_status', 'Pending')

    setStats({
      shipments: shipmentsCount || 0,
      customers: customersCount || 0,
      staff: staffCount || 0,
      pending: pendingCount || 0
    })
    
    setLoadingStats(false)
  }

  const handleCreateStaff = async () => {
    setStaffMessage('')
    if (!staffEmail || !staffPassword || !staffName) {
      setStaffMessage('Please fill all fields.')
      return
    }
    const { error } = await supabase.auth.signUp({
      email: staffEmail,
      password: staffPassword,
      options: { data: { full_name: staffName, role: 'staff' } }
    })
    if (error) {
      setStaffMessage('Failed: ' + error.message)
    } else {
      setStaffMessage('Staff account created successfully!')
      setStaffEmail('')
      setStaffPassword('')
      setStaffName('')
      if (currentTab === 'analytics') fetchStats() // refresh staff count
    }
  }

  return (
    <div className="dashboard-layout theme-purple">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <span style={{ fontSize: '2rem' }}>🛡️</span> CustomsTracker
        </div>
        <div className="nav-links">
          <div 
            className={`nav-item ${currentTab === 'analytics' ? 'active' : ''}`} 
            onClick={() => setCurrentTab('analytics')}
          >
            📊 Dashboard Analytics
          </div>
          <div 
            className={`nav-item ${currentTab === 'staff' ? 'active' : ''}`} 
            onClick={() => setCurrentTab('staff')}
          >
            👥 Staff Management
          </div>
          
          <div className="nav-item" style={{ marginTop: 'auto' }} onClick={handleLogout}>
            🚪 Logout
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ textAlign: 'left', margin: 0, fontSize: '2rem', color: 'var(--text-dark)' }}>
              {currentTab === 'analytics' ? 'Operations Overview' : 'Staff Management'}
            </h2>
            <p style={{ color: 'var(--text-light)', fontSize: '1rem' }}>Admin Control Panel • {profile.full_name}</p>
          </div>
        </div>

        {currentTab === 'analytics' && (
          <div>
            <div className="metrics-grid">
              <div className="metric-tile">
                <span className="metric-title">Total Shipments</span>
                <span className="metric-value">{loadingStats ? '...' : stats.shipments}</span>
              </div>
              <div className="metric-tile">
                <span className="metric-title">Active Customers</span>
                <span className="metric-value">{loadingStats ? '...' : stats.customers}</span>
              </div>
              <div className="metric-tile">
                <span className="metric-title">Pending DO</span>
                <span className="metric-value" style={{ color: '#ef4444' }}>{loadingStats ? '...' : stats.pending}</span>
              </div>
              <div className="metric-tile">
                <span className="metric-title">Staff Members</span>
                <span className="metric-value" style={{ color: '#0d9488' }}>{loadingStats ? '...' : stats.staff}</span>
              </div>
            </div>

            <div className="chart-container">
              <h3 style={{ color: 'var(--purple-600)', marginBottom: '1rem' }}>System Utilization Overview</h3>
              <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>Visual representation of active records in the database.</p>
              
              {/* Simple CSS Chart representing data scale */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ width: '100px', fontWeight: 600, color: 'var(--text-dark)' }}>Shipments</span>
                  <div style={{ flexGrow: 1, background: 'var(--purple-100)', height: '24px', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min((stats.shipments / 100) * 100, 100)}%`, background: 'var(--purple-500)', height: '100%', transition: 'width 1s ease-out' }}></div>
                  </div>
                  <span style={{ width: '40px', textAlign: 'right', fontWeight: 600 }}>{stats.shipments}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ width: '100px', fontWeight: 600, color: 'var(--text-dark)' }}>Customers</span>
                  <div style={{ flexGrow: 1, background: 'var(--purple-100)', height: '24px', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min((stats.customers / 50) * 100, 100)}%`, background: 'var(--purple-400)', height: '100%', transition: 'width 1s ease-out' }}></div>
                  </div>
                  <span style={{ width: '40px', textAlign: 'right', fontWeight: 600 }}>{stats.customers}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'staff' && (
          <div className="card wide" style={{ margin: '0 auto', boxShadow: '0 10px 30px rgba(124, 58, 237, 0.08)', border: '1px solid var(--purple-200)' }}>
            <h3 style={{ color: 'var(--purple-600)', marginBottom: '0.5rem' }}>Create New Staff Account</h3>
            <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Staff accounts have access to the Operations Dashboard to enter shipments and transport logs.
            </p>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ color: 'var(--purple-600)' }}>Full Name</label>
              <input type="text" placeholder="e.g. John Doe" value={staffName} onChange={e => setStaffName(e.target.value)} style={{ border: '1px solid var(--purple-200)' }} />
            </div>
            
            <div className="dashboard-grid" style={{ marginTop: 0, marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label style={{ color: 'var(--purple-600)' }}>Login ID (Email)</label>
                <input type="email" placeholder="staff@company.com" value={staffEmail} onChange={e => setStaffEmail(e.target.value)} style={{ border: '1px solid var(--purple-200)' }} />
              </div>
              <div className="form-group">
                <label style={{ color: 'var(--purple-600)' }}>Password</label>
                <input type="password" placeholder="••••••••" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} style={{ border: '1px solid var(--purple-200)' }} />
              </div>
            </div>
            
            <button className="btn primary" onClick={handleCreateStaff} style={{ background: 'linear-gradient(135deg, var(--purple-400), var(--purple-600))', boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)' }}>
              Create Staff Account
            </button>
            
            {staffMessage && (
              <div className="msg" style={{ background: 'var(--purple-50)', color: 'var(--purple-600)', borderLeftColor: 'var(--purple-400)', marginTop: '1rem' }}>
                {staffMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
