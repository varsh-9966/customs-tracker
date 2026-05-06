import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../services/supabaseClient'

export default function StaffDashboard({ user, profile, handleLogout }) {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

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

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    fetchShipments()
  }, [])

  const fetchShipments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('shipments')
      .select(`
        *,
        customers(name),
        entered_by_profile:profiles!shipments_entered_by_fkey(full_name),
        transport_logs(transport_name, vehicle_no)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setMessage('Failed to load shipments.')
    } else {
      // Flatten transport logs into the shipment object for easy rendering
      const flatData = data?.map(s => ({
        ...s,
        transport_name: s.transport_logs?.[0]?.transport_name || '',
        vehicle_no: s.transport_logs?.[0]?.vehicle_no || ''
      })) || []
      setShipments(flatData)
    }
    setLoading(false)
  }

  // Handle Autocomplete
  useEffect(() => {
    const fetchCustomers = async () => {
      if (newRow.customerName.trim().length === 0) {
        setSuggestions([])
        return
      }
      const { data } = await supabase
        .from('customers')
        .select('id, name')
        .ilike('name', `%${newRow.customerName}%`)
        .limit(5)
      setSuggestions(data || [])
    }

    const delay = setTimeout(() => {
      if (showSuggestions && isAdding) fetchCustomers()
    }, 300)
    return () => clearTimeout(delay)
  }, [newRow.customerName, showSuggestions, isAdding])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [wrapperRef])

  const handleSaveRow = async () => {
    if (!newRow.file_no || !newRow.customerName) {
      setMessage('File No and Customer Name are required.')
      return
    }

    setSaving(true)
    setMessage('')
    try {
      // 1. Get or Create Customer
      let customerId = null
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .ilike('name', newRow.customerName.trim())
        .maybeSingle()

      if (existing) {
        customerId = existing.id
      } else {
        const { data: newCust, error: cErr } = await supabase
          .from('customers')
          .insert({ name: newRow.customerName.trim() })
          .select().single()
        if (cErr) throw cErr
        customerId = newCust.id
      }

      // 2. Insert Shipment
      const payload = { ...newRow }
      delete payload.customerName // not in schema
      const transportName = payload.transport_name
      const vehicleNo = payload.vehicle_no
      delete payload.transport_name // not in shipment schema
      delete payload.vehicle_no // not in shipment schema
      
      // Convert empty strings to null for dates
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [k, v === '' ? null : v])
      )
      
      if (cleanPayload.docs_received) {
        cleanPayload.docs_received = cleanPayload.docs_received.toLowerCase() === 'yes'
      }

      cleanPayload.customer_id = customerId
      cleanPayload.entered_by = profile.id

      const { data: newShipment, error: sErr } = await supabase
        .from('shipments')
        .insert(cleanPayload)
        .select().single()
        
      if (sErr) throw sErr

      // 3. Insert Transport Log if provided
      if (transportName || vehicleNo) {
        const { error: tErr } = await supabase.from('transport_logs').insert({
          shipment_id: newShipment.id,
          transport_name: transportName || null,
          vehicle_no: vehicleNo || null
        })
        if (tErr) throw tErr
      }

      setMessage('Shipment & Transport details added successfully!')
      setIsAdding(false)
      setNewRow({
        file_no: '', customerName: '', eta: '', containers: '', qty: '', bl_no: '',
        docs_received: '', docs_date: '', clear_mode: '', be_filed_date: '',
        clear_status: '', clear_status_date: '', do_status: '', do_date: '',
        delivery_type: '', transport_name: '', vehicle_no: '',
        factory_delivered: '', empty_returned: '', billed_date: '',
        progress: '', remarks: ''
      })
      fetchShipments()

    } catch (err) {
      console.error(err)
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredShipments = shipments.filter(s => {
    const search = searchTerm.toLowerCase()
    return (
      (s.file_no && s.file_no.toLowerCase().includes(search)) ||
      (s.customers?.name && s.customers.name.toLowerCase().includes(search)) ||
      (s.bl_no && s.bl_no.toLowerCase().includes(search))
    )
  })

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <span style={{ fontSize: '2rem' }}>🌍</span> CustomsTracker
        </div>
        <div className="nav-links">
          <div className="nav-item active">
            📋 Tracker Board
          </div>
          <div className="nav-item" style={{ marginTop: 'auto' }} onClick={handleLogout}>
            🚪 Logout
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ textAlign: 'left', margin: 0, fontSize: '2rem', color: 'var(--text-dark)' }}>Tracker Board</h2>
            <p style={{ color: 'var(--text-light)', fontSize: '1rem' }}>Welcome, {profile.full_name}</p>
          </div>
          <div className="filter-bar" style={{ margin: 0 }}>
            <input 
              type="text" 
              placeholder="🔍 Search File No or Customer..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="table-input"
              style={{ width: '300px', borderRadius: '20px' }}
            />
          </div>
        </div>

        {message && <div className="msg" style={{ marginBottom: '1rem' }}>{message}</div>}

        <div className="table-container" style={{ flexGrow: 1, height: '0', background: 'white' }}>
          <table className="staff-table">
            <thead>
              <tr>
                <th colSpan="6" style={{ background: '#f0fdfa', color: '#0d9488', textAlign: 'center', borderRight: '2px solid white' }}>BASIC INFO</th>
                <th colSpan="2" style={{ background: '#ccfbf1', color: '#0d9488', textAlign: 'center', borderRight: '2px solid white' }}>DOCUMENTS</th>
                <th colSpan="4" style={{ background: '#99f6e4', color: '#0f766e', textAlign: 'center', borderRight: '2px solid white' }}>CUSTOMS CLEARANCE</th>
                <th colSpan="2" style={{ background: '#5eead4', color: '#0f766e', textAlign: 'center', borderRight: '2px solid white' }}>DELIVERY ORDER</th>
                <th colSpan="3" style={{ background: '#2dd4bf', color: 'white', textAlign: 'center', borderRight: '2px solid white' }}>TRANSPORT DETAILS</th>
                <th colSpan="5" style={{ background: '#14b8a6', color: 'white', textAlign: 'center' }}>COMPLETION & TRACKING</th>
              </tr>
              <tr>
                <th>FILE NO</th>
                <th>CUSTOMER NAME</th>
                <th>ETA</th>
                <th>CONTAINERS</th>
                <th>QTY</th>
                <th style={{ borderRight: '2px solid var(--teal-50)' }}>BL NO</th>
                
                <th>DOCS RCVD (Y/N)</th>
                <th style={{ borderRight: '2px solid var(--teal-50)' }}>DOCS DATE</th>
                
                <th>CLEAR MODE</th>
                <th>BE FILED DATE</th>
                <th>CLEAR STATUS</th>
                <th style={{ borderRight: '2px solid var(--teal-50)' }}>STATUS DATE</th>

                <th>DO STATUS</th>
                <th style={{ borderRight: '2px solid var(--teal-50)' }}>DO DATE</th>

                <th>DELIVERY TYPE</th>
                <th>TRANSPORT NAME</th>
                <th style={{ borderRight: '2px solid var(--teal-50)' }}>VEHICLE NO</th>

                <th>FACTORY DELIVERED</th>
                <th>EMPTY RETURNED</th>
                <th>BILLED DATE</th>
                <th>PROGRESS</th>
                <th>REMARKS</th>
                <th>ENTERED BY</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="23" style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</td></tr>}
              {!loading && filteredShipments.length === 0 && !isAdding && (
                <tr><td colSpan="23" style={{ textAlign: 'center', padding: '2rem' }}>No shipments found.</td></tr>
              )}

              {filteredShipments.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.file_no}</strong></td>
                  <td>{s.customers?.name}</td>
                  <td>{s.eta}</td>
                  <td>{s.containers}</td>
                  <td>{s.qty}</td>
                  <td style={{ borderRight: '2px solid #f0fdfa' }}>{s.bl_no}</td>

                  <td>{s.docs_received ? 'Yes' : (s.docs_received === false ? 'No' : '')}</td>
                  <td style={{ borderRight: '2px solid #f0fdfa' }}>{s.docs_date}</td>

                  <td>{s.clear_mode}</td>
                  <td>{s.be_filed_date}</td>
                  <td>{s.clear_status}</td>
                  <td style={{ borderRight: '2px solid #f0fdfa' }}>{s.clear_status_date}</td>

                  <td>{s.do_status}</td>
                  <td style={{ borderRight: '2px solid #f0fdfa' }}>{s.do_date}</td>

                  <td>{s.delivery_type}</td>
                  <td>{s.transport_name}</td>
                  <td style={{ borderRight: '2px solid #f0fdfa' }}>{s.vehicle_no}</td>

                  <td>{s.factory_delivered}</td>
                  <td>{s.empty_returned}</td>
                  <td>{s.billed_date}</td>
                  <td>{s.progress}</td>
                  <td>{s.remarks}</td>
                  <td style={{ color: 'var(--text-light)' }}>{s.entered_by_profile?.full_name}</td>
                </tr>
              ))}

              {isAdding && (
                <tr style={{ background: '#f0fdfa' }}>
                  <td><input className="table-input" value={newRow.file_no} onChange={e => setNewRow({...newRow, file_no: e.target.value})} placeholder="File No *" /></td>
                  <td style={{ position: 'relative' }} ref={wrapperRef}>
                    <input 
                      className="table-input" 
                      value={newRow.customerName} 
                      onChange={e => { setNewRow({...newRow, customerName: e.target.value}); setShowSuggestions(true) }} 
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Customer Name *" 
                    />
                    {showSuggestions && newRow.customerName.length > 0 && (
                      <div className="autocomplete-dropdown">
                        {suggestions.map(sg => (
                          <div key={sg.id} className="autocomplete-item" onClick={() => { setNewRow({...newRow, customerName: sg.name}); setShowSuggestions(false) }}>
                            {sg.name}
                          </div>
                        ))}
                        {suggestions.length === 0 && <div className="autocomplete-new">Will add as new</div>}
                      </div>
                    )}
                  </td>
                  <td><input type="date" className="table-input" value={newRow.eta} onChange={e => setNewRow({...newRow, eta: e.target.value})} /></td>
                  <td><input className="table-input" value={newRow.containers} onChange={e => setNewRow({...newRow, containers: e.target.value})} /></td>
                  <td><input className="table-input" value={newRow.qty} onChange={e => setNewRow({...newRow, qty: e.target.value})} /></td>
                  <td style={{ borderRight: '2px solid #f0fdfa' }}><input className="table-input" value={newRow.bl_no} onChange={e => setNewRow({...newRow, bl_no: e.target.value})} /></td>

                  <td>
                    <select className="table-select" value={newRow.docs_received} onChange={e => setNewRow({...newRow, docs_received: e.target.value})}>
                      <option value=""></option><option value="Yes">Yes</option><option value="No">No</option>
                    </select>
                  </td>
                  <td style={{ borderRight: '2px solid #f0fdfa' }}><input type="date" className="table-input" value={newRow.docs_date} onChange={e => setNewRow({...newRow, docs_date: e.target.value})} /></td>

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
                  <td style={{ borderRight: '2px solid #f0fdfa' }}><input type="date" className="table-input" value={newRow.clear_status_date} onChange={e => setNewRow({...newRow, clear_status_date: e.target.value})} /></td>

                  <td>
                    <select className="table-select" value={newRow.do_status} onChange={e => setNewRow({...newRow, do_status: e.target.value})}>
                      <option value=""></option><option value="Pending">Pending</option><option value="Completed">Completed</option>
                    </select>
                  </td>
                  <td style={{ borderRight: '2px solid #f0fdfa' }}><input type="date" className="table-input" value={newRow.do_date} onChange={e => setNewRow({...newRow, do_date: e.target.value})} /></td>

                  <td>
                    <select className="table-select" value={newRow.delivery_type} onChange={e => setNewRow({...newRow, delivery_type: e.target.value})}>
                      <option value=""></option><option value="Direct Out">Direct Out</option><option value="Unloading">Unloading</option><option value="Bonding">Bonding</option>
                    </select>
                  </td>
                  <td><input className="table-input" value={newRow.transport_name} onChange={e => setNewRow({...newRow, transport_name: e.target.value})} placeholder="Transport Name" /></td>
                  <td style={{ borderRight: '2px solid #f0fdfa' }}><input className="table-input" value={newRow.vehicle_no} onChange={e => setNewRow({...newRow, vehicle_no: e.target.value})} placeholder="Vehicle No" /></td>

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
                    <button className="action-btn save" onClick={handleSaveRow} disabled={saving}>
                      {saving ? 'Saving...' : '💾 Save'}
                    </button>
                    <button className="action-btn" style={{ marginLeft: '4px', background: 'transparent' }} onClick={() => setIsAdding(false)}>
                      ✕
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Floating Action Button */}
        {!isAdding && (
          <div className="fab-container">
            <button className="fab-btn" onClick={() => setIsAdding(true)} title="Add New Entry">
              +
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
