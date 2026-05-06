import { useState, useEffect } from 'react'
import { supabase } from './services/supabaseClient'
import StaffDashboard from './modules/Staff/pages/StaffDashboard'
import FounderDashboard from './modules/Founder/pages/FounderDashboard'
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

  if (user && profile?.role === 'founder') {
    return <FounderDashboard user={user} profile={profile} handleLogout={handleLogout} />
  }

  if (user && profile?.role === 'staff') {
    return <StaffDashboard user={user} profile={profile} handleLogout={handleLogout} />
  }

  if (user) {
    return (
      <div className="container">
        <div className="card">
          <h2>Authentication State</h2>
          <div className="user-info">
            <p><span>Email</span><strong>{user.email}</strong></p>
            <p><span>User ID</span><strong style={{fontSize: '0.8rem'}}>{user.id}</strong></p>
            <p><span>Profile Loaded</span><strong>{profile ? 'Yes' : 'No'}</strong></p>
            {profile && <p><span>Role</span><strong>{profile.role || 'No role'}</strong></p>}
          </div>
          <button className="btn primary" onClick={() => fetchProfile(user.id)}>Retry Profile Fetch</button>
          <p className="msg">
            You are logged in, but your profile or role is missing. Make sure the "profiles" table exists and you have a valid role ("founder" or "staff").
          </p>
          {message && <p className="msg" style={{color: 'red', fontWeight: 'bold', border: '1px solid red'}}>{message}</p>}
          <button className="btn logout" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">🌍</div>
          <h2>CustomsTracker</h2>
          <p>{isLogin ? 'Sign in to access your portal' : 'Register your founder account'}</p>
        </div>

        <div className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" placeholder="Enter your full name" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label>Login ID (Email)</label>
            <input type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          
          {isLogin ? (
            <button className="btn primary login-btn" onClick={handleLogin} disabled={loading}>{loading ? 'Authenticating...' : 'Secure Login'}</button>
          ) : (
            <button className="btn primary login-btn" onClick={handleFounderSignup} disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
          )}
          
          <div className="toggle-wrapper">
            <p className="toggle">
              {isLogin ? 'Need an admin account?' : 'Already have access?'}
              <button className="link-btn" onClick={() => { setIsLogin(!isLogin); setMessage('') }}>
                {isLogin ? ' Register as Founder' : ' Sign In here'}
              </button>
            </p>
          </div>
          
          {message && <div className="error-badge">{message}</div>}
        </div>
      </div>
    </div>
  )
}
