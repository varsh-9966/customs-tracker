import os

# supabaseClient.js
supabase_client = """import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
"""

# App.css
app_css = """* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Segoe UI, sans-serif; background: #f0f2f5; }
.container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
.card { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 1rem; }
.card.wide { max-width: 600px; }
h2 { text-align: center; color: #333; font-size: 1.5rem; }
h3 { color: #444; font-size: 1.1rem; margin-bottom: 0.5rem; }
input { padding: 0.75rem 1rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; outline: none; }
input:focus { border-color: #6366f1; }
.btn { padding: 0.75rem; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 600; }
.btn.primary { background: #6366f1; color: white; }
.btn.primary:hover { background: #4f46e5; }
.btn.logout { background: #ef4444; color: white; }
.btn.logout:hover { background: #dc2626; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.toggle { text-align: center; font-size: 0.9rem; color: #666; }
.link-btn { background: none; border: none; color: #6366f1; cursor: pointer; font-weight: 600; font-size: 0.9rem; }
.msg { text-align: center; font-size: 0.9rem; color: #555; padding: 0.5rem; background: #f9f9f9; border-radius: 6px; }
.user-info { background: #f9fafb; border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.user-info p { display: flex; justify-content: space-between; font-size: 0.9rem; color: #444; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
.user-info p:last-child { border-bottom: none; }
.user-info span { color: #888; }
.section { background: #f0f4ff; border-radius: 8px; padding: 1.2rem; display: flex; flex-direction: column; gap: 0.75rem; }
"""

# App.jsx
app_jsx = """import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [staffEmail, setStaffEmail] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [staffName, setStaffName] = useState('')
  const [staffMessage, setStaffMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id)
        else setProfile(null)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!error) {
      setProfile(data)
    } else {
      console.error('Error fetching profile:', error)
      setMessage('Profile fetch error: ' + error.message)
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage('Failed: ' + error.message)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setEmail('')
    setPassword('')
    setMessage('')
  }

  const handleFounderSignup = async () => {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'founder' } }
    })
    if (error) setMessage('Failed: ' + error.message)
    else setMessage('Founder account created! You can now login.')
    setLoading(false)
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
    if (error) setStaffMessage('Failed: ' + error.message)
    else {
      setStaffMessage('Staff account created successfully!')
      setStaffEmail('')
      setStaffPassword('')
      setStaffName('')
    }
  }

  if (user && profile?.role === 'founder') {
    return (
      <div className="container">
        <div className="card wide">
          <h2>Founder Dashboard</h2>
          <div className="user-info">
            <p><span>Name</span><strong>{profile.full_name}</strong></p>
            <p><span>Email</span><strong>{user.email}</strong></p>
            <p><span>Role</span><strong>{profile.role}</strong></p>
          </div>
          <div className="section">
            <h3>Create Staff Account</h3>
            <input type="text" placeholder="Staff Full Name" value={staffName} onChange={e => setStaffName(e.target.value)} />
            <input type="email" placeholder="Staff Email" value={staffEmail} onChange={e => setStaffEmail(e.target.value)} />
            <input type="password" placeholder="Staff Password" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} />
            <button className="btn primary" onClick={handleCreateStaff}>Create Staff Account</button>
            {staffMessage && <p className="msg">{staffMessage}</p>}
          </div>
          <button className="btn logout" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    )
  }

  if (user && profile?.role === 'staff') {
    return (
      <div className="container">
        <div className="card">
          <h2>Staff Portal</h2>
          <div className="user-info">
            <p><span>Name</span><strong>{profile.full_name}</strong></p>
            <p><span>Email</span><strong>{user.email}</strong></p>
            <p><span>Role</span><strong>{profile.role}</strong></p>
            <p><span>Last Sign In</span><strong>{new Date(user.last_sign_in_at).toLocaleString()}</strong></p>
          </div>
          <p className="msg">Shipment entry module coming soon...</p>
          <button className="btn logout" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="container">
        <div className="card">
          <h2>Authentication State</h2>
          <div className="user-info">
            <p><span>Email</span><strong>{user.email}</strong></p>
            <p><span>Profile Loaded</span><strong>{profile ? 'Yes' : 'No'}</strong></p>
            {profile && <p><span>Role</span><strong>{profile.role || 'No role'}</strong></p>}
          </div>
          <p className="msg">
            You are logged in, but your profile or role is missing. Make sure the "profiles" table exists and you have a valid role ("founder" or "staff").
          </p>
          {message && <p className="msg">{message}</p>}
          <button className="btn logout" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <h2>{isLogin ? 'Login' : 'Founder Signup'}</h2>
        {!isLogin && (
          <input type="text" placeholder="Your Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
        )}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        {isLogin ? (
          <button className="btn primary" onClick={handleLogin} disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
        ) : (
          <button className="btn primary" onClick={handleFounderSignup} disabled={loading}>{loading ? 'Creating...' : 'Create Founder Account'}</button>
        )}
        <p className="toggle">
          {isLogin ? 'No account yet?' : 'Already have an account?'}
          <button className="link-btn" onClick={() => { setIsLogin(!isLogin); setMessage('') }}>
            {isLogin ? ' Create Founder Account' : ' Login'}
          </button>
        </p>
        {message && <p className="msg">{message}</p>}
      </div>
    </div>
  )
}
"""

with open('src/supabaseClient.js', 'w') as f:
    f.write(supabase_client)
print('supabaseClient.js created!')

with open('src/App.css', 'w') as f:
    f.write(app_css)
print('App.css created!')

with open('src/App.jsx', 'w') as f:
    f.write(app_jsx)
print('App.jsx created!')