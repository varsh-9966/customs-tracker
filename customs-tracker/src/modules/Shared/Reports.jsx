import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function Reports({ profile, initialStatusFilter = '' }) {
  const [shipments, setShipments] = useState([]);
  const [advStats, setAdvStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shipmentsData, advancedData] = await Promise.all([
        api.getShipments(),
        api.getAdvancedStats()
      ]);
      setShipments(shipmentsData);
      setAdvStats(advancedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredShipments = shipments.filter(s => {
    if (dateFilter.start && dateFilter.end) {
      const start = new Date(dateFilter.start);
      const end = new Date(dateFilter.end);
      end.setHours(23, 59, 59);
      const targetDate = new Date(s.created_at);
      if (targetDate < start || targetDate > end) return false;
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        (s.file_no && s.file_no.toLowerCase().includes(search)) ||
        (s.customers?.name && s.customers.name.toLowerCase().includes(search)) ||
        (s.be_no && s.be_no.toLowerCase().includes(search)) ||
        (s.handled_by_name && s.handled_by_name.toLowerCase().includes(search));
      if (!matchesSearch) return false;
    }
    if (statusFilter) {
      if (s.do_status !== statusFilter && s.clear_status !== statusFilter) return false;
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ['File No', 'Customer', 'ETA', 'Containers', 'Container Type', 'Clear Mode', 'BE No', 'Clear Status', 'DO Status', 'Handled By', 'Moved To Date', 'Billed Date', 'Progress', 'Entered By'];
    const rows = filteredShipments.map(s => [
      s.file_no || '',
      s.customers?.name || '',
      s.eta || '',
      s.containers || '',
      s.container_type || '',
      s.clear_mode || '',
      s.be_no || '',
      s.clear_status || '',
      s.do_status || '',
      s.handled_by_name || s.handled_by || '',
      s.moved_to_date || '',
      s.billed_date || '',
      s.progress || '',
      s.entered_by_profile?.full_name || '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'shipment_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => window.print();

  // Simple SVG Bar Chart Component
  const BarChart = ({ data }) => {
    if (!data || data.length === 0) return <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No data available</div>;
    const maxVal = Math.max(...data.map(d => d.value));
    return (
      <div style={{ height: '250px', display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '20px 0' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
               <div style={{ 
                  width: '30px', 
                  height: `${(d.value / maxVal) * 180}px`, 
                  background: 'linear-gradient(to top, #7c3aed, #a78bfa)', 
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 1s ease-out'
               }} title={`${d.name}: ${d.value}`} />
               <span style={{ position: 'absolute', top: '-20px', fontSize: '10px', fontWeight: 700, color: '#6d28d9' }}>{d.value}</span>
            </div>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
          </div>
        ))}
      </div>
    );
  };

  // Simple SVG Donut Chart Component
  const DonutChart = ({ data }) => {
    if (!data || data.length === 0) return <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No data available</div>;
    const total = data.reduce((acc, d) => acc + d.value, 0);
    let cumulativePercent = 0;
    const colors = ['#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <svg viewBox="0 0 32 32" style={{ width: '150px', height: '150px', transform: 'rotate(-90deg)', borderRadius: '50%' }}>
          {data.map((d, i) => {
            const percent = d.value / total;
            const dashArray = `${percent * 100} 100`;
            const dashOffset = -cumulativePercent * 100;
            cumulativePercent += percent;
            return (
              <circle key={i} r="16" cx="16" cy="16" fill="transparent"
                stroke={colors[i % colors.length]} strokeWidth="8"
                strokeDasharray={dashArray} strokeDashoffset={dashOffset}
              />
            );
          })}
          <circle r="10" cx="16" cy="16" fill="white" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors[i % colors.length] }} />
              <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>{d.name}: <strong>{d.value}</strong></span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
        .report-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 1.5rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .metric-card {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          border-left: 4px solid #7c3aed;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: pointer;
        }
        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
      `}</style>

      <div id="print-area" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem' }}>
        
        {/* Header & Filters */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, color: '#1e293b', fontWeight: 800, fontSize: '1.8rem' }}>Operational Reports</h2>
            <p style={{ color: '#64748b', marginTop: '0.25rem' }}>Professional logistics analytics & data tracking</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn" onClick={exportCSV} style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>📊 Export CSV</button>
            <button className="btn primary" onClick={printReport} style={{ background: '#7c3aed' }}>🖨️ Print Report</button>
          </div>
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div className="metric-card" onClick={() => setStatusFilter('')}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Total Shipments</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginTop: '0.5rem' }}>{loading ? '...' : shipments.length}</div>
          </div>
          <div className="metric-card" onClick={() => setStatusFilter('')} style={{ borderLeftColor: '#10b981' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Containers (Est. TEU)</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginTop: '0.5rem' }}>
              {loading ? '...' : advStats?.customerVolumes?.reduce((acc, c) => acc + c.value, 0) || 0}
            </div>
          </div>
          <div className="metric-card" onClick={() => setStatusFilter('Completed')} style={{ borderLeftColor: '#3b82f6' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Completed DOs</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginTop: '0.5rem' }}>
              {loading ? '...' : shipments.filter(s => s.do_status === 'Completed').length}
            </div>
          </div>
          <div className="metric-card" onClick={() => setStatusFilter('Assessment')} style={{ borderLeftColor: '#f59e0b' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>In Assessment</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginTop: '0.5rem' }}>
              {loading ? '...' : shipments.filter(s => s.clear_status === 'Assessment').length}
            </div>
          </div>
        </div>

        {/* Charts Row */}
        {!loading && advStats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
            <div className="report-card">
              <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1rem' }}>Top 10 Customers (Container Volume)</h4>
              <BarChart data={advStats.customerVolumes} />
            </div>
            <div className="report-card">
              <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1rem' }}>Clearance Mode Split</h4>
              <DonutChart data={advStats.clearanceModes} />
            </div>
          </div>
        )}

        {/* Table & Filtering */}
        <div className="report-card">
          <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="text" placeholder="Search shipments..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="table-input" style={{ width: '250px' }} />
            <input type="date" className="table-input" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} />
            <input type="date" className="table-input" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} />
            <select className="table-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: '180px' }}>
              <option value="">All Statuses</option>
              <option>Completed</option>
              <option>Pending</option>
              <option>Assessment</option>
              <option>Examination</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="staff-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>File No</th>
                  <th>Customer</th>
                  <th>ETA</th>
                  <th>Containers</th>
                  <th>BE No</th>
                  <th>Clear Status</th>
                  <th>DO Status</th>
                  <th>Handled By</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.file_no}</strong></td>
                    <td>{s.customers?.name || '—'}</td>
                    <td>{s.eta || '—'}</td>
                    <td>{s.containers || '—'}</td>
                    <td>{s.be_no || '—'}</td>
                    <td><span className={`status-badge ${(s.clear_status || '').toLowerCase().replace(' ', '')}`}>{s.clear_status || '—'}</span></td>
                    <td><span className={`status-badge ${(s.do_status || '').toLowerCase().replace(' ', '')}`}>{s.do_status || '—'}</span></td>
                    <td>{s.handled_by_name || s.handled_by || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ flexGrow: 1, background: '#f1f5f9', height: '6px', borderRadius: '3px', overflow: 'hidden', minWidth: '40px' }}>
                          <div style={{ width: s.progress || '0%', background: '#7c3aed', height: '100%' }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7c3aed' }}>{s.progress || '0%'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredShipments.length === 0 && (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
