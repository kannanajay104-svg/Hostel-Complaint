import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearAuthSession, isSessionExpired, startAuthSession } from '../utils/authSession.js'

const DEFAULT_BLOCK = ''
const CREATE_ROLE_MAP = {
  student: 'student',
  warden: 'warden',
  manager: 'manager',
  viceprincipal: 'viceprincipal',
  principal: 'principal',
}
const LOGIN_ROLE_MAP = {
  student: 'student',
  warden: 'warden',
  manager: 'manager',
  viceprincipal: 'viceprincipal',
  principal: 'principal',
}
const STUDENT_DASHBOARD = '/student-dashboard'
const ROLE_REDIRECTS = {
  student: '/student-dashboard',
  warden: '/warden-dashboard',
  manager: '/manager-dashboard',
  viceprincipal: '/viceprincipal-dashboard',
  principal: '/principal-dashboard',
}

function AuthPage() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('landing')
  const [activeRole, setActiveRole] = useState('student')
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    block: DEFAULT_BLOCK,
    remember: true,
  })
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    portalType: 'student',
    roomNumber: '',
    block: DEFAULT_BLOCK,
    floorNumber: '',
    floorNumberOther: '',
  })
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [showCreateConfirm, setShowCreateConfirm] = useState(false)
  const [loginStatus, setLoginStatus] = useState('')
  const [createStatus, setCreateStatus] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const role = localStorage.getItem('authRole')
    const storedUser = localStorage.getItem('user')
    if (token && isSessionExpired()) {
      clearAuthSession()
      return
    }

    if (token && role && storedUser) {
      const redirectPath = ROLE_REDIRECTS[role]
      if (redirectPath) {
        navigate(redirectPath, { replace: true })
      }
    }
  }, [navigate])

  const storeAuth = ({ token, role, name, roomNumber, block, floorNumber, email }) => {
    if (token) {
      localStorage.setItem('authToken', token)
    }
    if (role) {
      localStorage.setItem('authRole', role)
    }
    if (name) {
      localStorage.setItem('authName', name)
    }
    if (email) {
      localStorage.setItem('authEmail', email)
    }
    if (roomNumber) {
      localStorage.setItem('authRoom', roomNumber)
    }
    if (block) {
      localStorage.setItem('authBlock', block)
    }
    if (floorNumber) {
      localStorage.setItem('authFloor', floorNumber)
    }
  }

  const isLanding = activeView === 'landing'
  const isLogin = activeView === 'login'
  const showHostelBlock = activeRole === 'student'

  const handleLoginChange = (event) => {
    const { name, value, type, checked } = event.target
    setLoginForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleCreateChange = (event) => {
    const { name, value } = event.target
    setCreateForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoginStatus('')
    const { email, password } = loginForm
    if (!email || !password) {
      setLoginStatus('Email and password are required.')
      return
    }
    const role = (LOGIN_ROLE_MAP[activeRole] || activeRole || '').toString().trim().toLowerCase()
    const block = loginForm.block
    console.log('Login Data:', { email, password, role, block })
    if (role === 'student' && !block) {
      setLoginStatus('Block is required.')
      return
    }
    try {
      const payload = {
        email,
        password,
        role,
        ...(role === 'student' ? { block } : {}),
      }
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      console.log('Login Response:', data)
      if (!response.ok) {
        console.log('Login error response:', data)
        setLoginStatus(data?.message || 'Login failed.')
        return
      }

      const resolvedRole = (data?.user?.role || data?.role || role || activeRole || '')
        .toString()
        .trim()
        .toLowerCase()
      if (!resolvedRole) {
        setLoginStatus('Unable to determine account role. Please try again.')
        return
      }
      console.log('Resolved role:', resolvedRole)

      localStorage.setItem('authToken', data?.token || '')
      localStorage.setItem('authRole', resolvedRole)
      localStorage.setItem('user', JSON.stringify(data?.user || {}))
      localStorage.setItem('currentUser', JSON.stringify(data?.user || {}))
      startAuthSession()
      console.log('User from LocalStorage:', JSON.parse(localStorage.getItem('user') || 'null'))

      storeAuth({
        token: data?.token,
        role: resolvedRole,
        name: data?.user?.name || data?.name,
        email: data?.user?.email || data?.email || email,
        roomNumber: data?.user?.roomNumber,
        block: data?.user?.block,
      })

      const redirectPath = ROLE_REDIRECTS[resolvedRole]
      if (!redirectPath) {
        setLoginStatus('Role not supported for dashboard access.')
        return
      }
      navigate(redirectPath)
    } catch (error) {
      setLoginStatus('Unable to reach the server. Please try again.')
    }
  }

  const handleCreateAccount = async (event) => {
    event.preventDefault()
    setCreateStatus('')

    const { fullName, email, password, confirmPassword, portalType, roomNumber, block, floorNumber, floorNumberOther } = createForm
    const isStudentPortal = portalType === 'student'
    if (!fullName || !email || !password || !confirmPassword) {
      setCreateStatus('Full name, email, and passwords are required.')
      return
    }

    if (isStudentPortal && (!roomNumber || !block || !floorNumber)) {
      setCreateStatus('Room number, hostel block, and floor number are required for students.')
      return
    }

    if (isStudentPortal && floorNumber === 'Other' && !floorNumberOther?.trim()) {
      setCreateStatus('Please enter the custom floor number.')
      return
    }

    if (password !== confirmPassword) {
      setCreateStatus('Passwords do not match.')
      return
    }

    const finalFloorNumber = floorNumber === 'Other' ? floorNumberOther : floorNumber
    const role = (CREATE_ROLE_MAP[portalType] || portalType || '').toString().trim().toLowerCase()
    const payload = {
      name: fullName,
      email,
      password,
      role,
      ...(isStudentPortal ? { roomNumber, block, floorNumber: finalFloorNumber } : {}),
    }
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      console.log('Register Response:', data)
      if (!response.ok) {
        setCreateStatus(data?.message || 'Registration failed.')
        return
      }

      if (data?.token) {
        localStorage.setItem('authToken', data.token)
      }
      if (data?.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('currentUser', JSON.stringify(data.user))
      }

      const resolvedRole = (data?.user?.role || data?.role || role || '')
        .toString()
        .trim()
        .toLowerCase()
      if (!resolvedRole) {
        setCreateStatus('Unable to determine account role. Please try again.')
        return
      }
      console.log('Resolved role:', resolvedRole)
      localStorage.setItem('authRole', resolvedRole)
      startAuthSession()

      storeAuth({
        token: data?.token,
        role: resolvedRole,
        name: data?.user?.name || data?.name || fullName,
        email: data?.user?.email || data?.email || email,
        roomNumber: isStudentPortal ? data?.user?.roomNumber || roomNumber : undefined,
        block: isStudentPortal ? data?.user?.block || block : undefined,
        floorNumber: isStudentPortal ? data?.user?.floorNumber || finalFloorNumber : undefined,
      })

      const redirectPath = ROLE_REDIRECTS[resolvedRole]
      if (!redirectPath) {
        setCreateStatus('Role not supported for dashboard access.')
        return
      }
      navigate(redirectPath)
    } catch (error) {
      setCreateStatus('Unable to reach the server. Please try again.')
    }
  }

  const handleBack = () => {
    setCreateStatus('')
    setLoginStatus('')
    setActiveView('landing')
  }

  return (
    <main className="auth-page">
      {isLanding ? (
        <header className="landing-header">
          <h1>
            <span className="title-icon" aria-hidden="true">
              <svg viewBox="0 0 64 64" role="img" focusable="false">
                <path
                  d="M10 54h44M16 54V14l16-6 16 6v40M26 54V34h12v20M22 24h6M36 24h6M22 30h6M36 30h6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            HostelComplaint
          </h1>
          <h2>விரைவான புகார் மேலாண்மை</h2>
          <h2>Fast Complaint Management System</h2>
          <p>Submit, track, and resolve hostel issues with confidence.</p>
        </header>
      ) : (
        <header className="auth-header">
          <button type="button" className="back-button" onClick={handleBack}>
            <span className="back-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false" role="img">
                <path
                  d="M15 6l-6 6 6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Back
          </button>
          <div className="auth-title">
            <h1>
              <span className="title-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64" role="img" focusable="false">
                  <path
                    d="M10 54h44M16 54V14l16-6 16 6v40M26 54V34h12v20M22 24h6M36 24h6M22 30h6M36 30h6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {isLogin ? 'Login to Your Account' : 'Create Your Account'}
            </h1>
            <p>
              {isLogin
                ? 'Access your dashboard to manage complaints'
                : 'Create a new account to start managing complaints'}
            </p>
          </div>
        </header>
      )}

      {isLanding && (
        <>
          <section className="feature-section" aria-label="Key features">
            <div className="feature-grid">
              <article className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 64 64" role="img" focusable="false">
                    <path
                      d="M18 40c0-8 6-14 14-14h8c10 0 18 8 18 18v2H24c-4 0-6-2-6-6zm0 0c0-6-4-10-10-10-4 0-8 2-10 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3>Submit Complaints Easily</h3>
                <p>Report issues with photo evidence and track resolution progress.</p>
              </article>
              <article className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 64 64" role="img" focusable="false">
                    <path
                      d="M10 46V18m0 28h44M18 36l10-8 10 6 12-14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3>Auto Escalation System</h3>
                <p>Complaints automatically escalate to higher authorities if not resolved.</p>
              </article>
              <article className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 64 64" role="img" focusable="false">
                    <path
                      d="M32 10c-8 0-14 6-14 14v10l-4 6h36l-4-6V24c0-8-6-14-14-14zm0 38a6 6 0 0 0 6-6H26a6 6 0 0 0 6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3>Real-time Updates</h3>
                <p>Get instant notifications about your complaint status.</p>
              </article>
            </div>
          </section>

          <section className="landing-actions" aria-label="Account actions">
            <button
              type="button"
              className="primary-button action-button"
              onClick={() => setActiveView('signup')}
            >
              <span className="primary-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false" role="img">
                  <path
                    d="M12 12a4 4 0 1 1 4-4 4 4 0 0 1-4 4z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 20a8 8 0 0 1 12-4M17 12h5M19.5 9.5v5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Create New Account
            </button>
            <button
              type="button"
              className="secondary-button action-button"
              onClick={() => setActiveView('login')}
            >
              <span className="primary-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false" role="img">
                  <path
                    d="M9 12h10M14 8l4 4-4 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 4h6a2 2 0 0 1 2 2v3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 18v3a2 2 0 0 1-2 2H4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Login to Account
            </button>
          </section>

          <section className="demo-section" aria-label="Demo accounts">
            <h3>Demo Accounts (for testing):</h3>
            <div className="demo-actions">
              <button type="button">Student Demo</button>
              <button type="button">Warden Demo</button>
              <button type="button">Admin Demo</button>
            </div>
          </section>

          <section className="contact-section" aria-label="Support contacts">
            <p>
              <span className="contact-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64" role="img" focusable="false">
                  <path
                    d="M22 10c-6 0-10 4-10 10 0 18 14 32 32 32 6 0 10-4 10-10v-2l-12-4-6 6c-6-3-11-8-14-14l6-6-4-12h-2z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Emergency: 044-1234 5678
            </p>
            <p>
              <span className="contact-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64" role="img" focusable="false">
                  <path d="M10 16h44v32H10z" fill="none" stroke="currentColor" strokeWidth="3" />
                  <path
                    d="M12 18l20 16 20-16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              support@hostelcomplaint.edu
            </p>
          </section>
        </>
      )}

      {!isLanding && (
        <section className="auth-card" aria-labelledby="auth-card-title">
          <h2 id="auth-card-title" className="sr-only">
            {isLogin ? 'Login' : 'Create Account'}
          </h2>

        {isLogin && (
          <>
            <div className="role-tabs" role="tablist" aria-label="Account role">
              <button
                type="button"
                className={`role-tab ${activeRole === 'student' ? 'is-active' : ''}`}
                onClick={() => setActiveRole('student')}
                role="tab"
                aria-selected={activeRole === 'student'}
              >
                <span className="tab-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" role="img">
                    <path
                      d="M3 7l9-4 9 4-9 4-9-4zm3 6v4c0 2 3 4 6 4s6-2 6-4v-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Student
              </button>
              <button
                type="button"
                className={`role-tab ${activeRole === 'warden' ? 'is-active' : ''}`}
                onClick={() => setActiveRole('warden')}
                role="tab"
                aria-selected={activeRole === 'warden'}
              >
                <span className="tab-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" role="img">
                    <path
                      d="M8 14a4 4 0 1 1 4-4 4 4 0 0 1-4 4zm8 1.5a3.5 3.5 0 1 1 3.5-3.5 3.5 3.5 0 0 1-3.5 3.5z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3 20a6 6 0 0 1 10.5-3.5M13 20a5 5 0 0 1 8-2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Warden
              </button>
              <button
                type="button"
                className={`role-tab ${activeRole === 'manager' ? 'is-active' : ''}`}
                onClick={() => setActiveRole('manager')}
                role="tab"
                aria-selected={activeRole === 'manager'}
              >
                <span className="tab-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" role="img">
                    <path
                      d="M12 12a4 4 0 1 1 4-4 4 4 0 0 1-4 4z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 20a8 8 0 0 1 16 0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Manager
              </button>
              <button
                type="button"
                className={`role-tab ${activeRole === 'viceprincipal' ? 'is-active' : ''}`}
                onClick={() => setActiveRole('viceprincipal')}
                role="tab"
                aria-selected={activeRole === 'viceprincipal'}
              >
                <span className="tab-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" role="img">
                    <path
                      d="M6 8h12M6 12h12M6 16h12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 4h16v16H4z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Vice Principal
              </button>
              <button
                type="button"
                className={`role-tab ${activeRole === 'principal' ? 'is-active' : ''}`}
                onClick={() => setActiveRole('principal')}
                role="tab"
                aria-selected={activeRole === 'principal'}
              >
                <span className="tab-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" role="img">
                    <path
                      d="M12 3l8 4v5c0 5-4 8-8 9-4-1-8-4-8-9V7l8-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 12l2 2 4-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Principal
              </button>
            </div>

            <form className="auth-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="loginEmail">Email *</label>
                <div className="input-with-icon">
                  <span className="input-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false" role="img">
                      <path
                        d="M12 12a4 4 0 1 1 4-4 4 4 0 0 1-4 4z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4 20a8 8 0 0 1 16 0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <input
                    id="loginEmail"
                    name="email"
                    type="email"
                    value={loginForm.email}
                    onChange={handleLoginChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="loginPassword">Password *</label>
                <div className="input-with-icon">
                  <span className="input-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false" role="img">
                      <path
                        d="M7 11V8a5 5 0 0 1 10 0v3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <rect
                        x="5"
                        y="11"
                        width="14"
                        height="9"
                        rx="2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </span>
                  <input
                    id="loginPassword"
                    name="password"
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="icon-toggle"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="toggle-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false" role="img">
                        <path
                          d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>

              {showHostelBlock && (
                <div className="form-group">
                  <label htmlFor="loginBlock">Hostel Block</label>
                  <div className="input-with-icon">
                    <span className="input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false" role="img">
                        <path
                          d="M4 20h16M6 20V8l6-4 6 4v12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9 12h2M13 12h2M9 16h2M13 16h2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <select
                      id="loginBlock"
                      name="block"
                      value={loginForm.block}
                      onChange={handleLoginChange}
                    >
                      <option value="Block A">Block A</option>
                      <option value="Block B">Block B</option>
                      <option value="Block C">Block C</option>
                      <option value="Block D">Block D</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="form-meta">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={loginForm.remember}
                    onChange={handleLoginChange}
                  />
                  Remember me
                </label>
                <button type="button" className="link-button">
                  Forgot Password?
                </button>
              </div>

              <button type="submit" className="primary-button">
                <span className="primary-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" role="img">
                    <path
                      d="M5 12h12M13 6l6 6-6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Login
              </button>

              <p className="auth-footer">
                Don't have an account?{' '}
                <button type="button" className="link-button" onClick={() => setActiveView('signup')}>
                  Sign up here
                </button>
              </p>

              {loginStatus && (
                <p className="form-status" role="status">
                  {loginStatus}
                </p>
              )}
            </form>
          </>
        )}

        {activeView === 'signup' && (
          <form className="auth-form" onSubmit={handleCreateAccount}>
            <div className="form-group">
              <label htmlFor="createName">Full Name *</label>
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" role="img">
                    <path
                      d="M12 12a4 4 0 1 1 4-4 4 4 0 0 1-4 4z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 20a8 8 0 0 1 16 0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  id="createName"
                  name="fullName"
                  type="text"
                  value={createForm.fullName}
                  onChange={handleCreateChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="createEmail">Email *</label>
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" role="img">
                    <path
                      d="M4 6h16v12H4z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 7l8 6 8-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  id="createEmail"
                  name="email"
                  type="email"
                  value={createForm.email}
                  onChange={handleCreateChange}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="createPassword">Password *</label>
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" role="img">
                    <path
                      d="M7 11V8a5 5 0 0 1 10 0v3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <rect
                      x="5"
                      y="11"
                      width="14"
                      height="9"
                      rx="2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </span>
                <input
                  id="createPassword"
                  name="password"
                  type={showCreatePassword ? 'text' : 'password'}
                  value={createForm.password}
                  onChange={handleCreateChange}
                  placeholder="Create a password"
                  required
                />
                <button
                  type="button"
                  className="icon-toggle"
                  onClick={() => setShowCreatePassword((prev) => !prev)}
                  aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
                >
                  <span className="toggle-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false" role="img">
                      <path
                        d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="createConfirm">Confirm Password *</label>
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" role="img">
                    <path
                      d="M7 11V8a5 5 0 0 1 10 0v3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <rect
                      x="5"
                      y="11"
                      width="14"
                      height="9"
                      rx="2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </span>
                <input
                  id="createConfirm"
                  name="confirmPassword"
                  type={showCreateConfirm ? 'text' : 'password'}
                  value={createForm.confirmPassword}
                  onChange={handleCreateChange}
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  className="icon-toggle"
                  onClick={() => setShowCreateConfirm((prev) => !prev)}
                  aria-label={showCreateConfirm ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  <span className="toggle-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false" role="img">
                      <path
                        d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="createPortal">Portal Type</label>
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" role="img">
                    <path
                      d="M5 21V8l7-4 7 4v13"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 21V13h6v8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <select
                  id="createPortal"
                  name="portalType"
                  value={createForm.portalType}
                  onChange={handleCreateChange}
                >
                  <option value="student">student</option>
                  <option value="warden">warden</option>
                  <option value="manager">manager</option>
                  <option value="viceprincipal">viceprincipal</option>
                  <option value="principal">principal</option>
                </select>
              </div>
            </div>

            {createForm.portalType === "student" && (
              <>
                <div className="form-group">
                  <label htmlFor="createRoom">Room Number</label>
                  <div className="input-with-icon">
                    <span className="input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false" role="img">
                        <path
                          d="M4 20h16M6 20V8l6-4 6 4v12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9 12h2M13 12h2M9 16h2M13 16h2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <input
                      id="createRoom"
                      name="roomNumber"
                      type="text"
                      value={createForm.roomNumber}
                      onChange={handleCreateChange}
                      placeholder="Enter your room number"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="createBlock">Hostel Block</label>
                  <div className="input-with-icon">
                    <span className="input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false" role="img">
                        <path
                          d="M4 20h16M6 20V8l6-4 6 4v12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9 12h2M13 12h2M9 16h2M13 16h2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <select
                      id="createBlock"
                      name="block"
                      value={createForm.block}
                      onChange={handleCreateChange}
                      required
                    >
                      <option value="Block A">Block A</option>
                      <option value="Block B">Block B</option>
                      <option value="Block C">Block C</option>
                      <option value="Block D">Block D</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="createFloor">Floor Number</label>
                  <div className="input-with-icon">
                    <span className="input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false" role="img">
                        <path
                          d="M4 20h16M4 16h16M4 12h16M4 8h16M4 4h16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <select
                      id="createFloor"
                      name="floorNumber"
                      value={createForm.floorNumber}
                      onChange={handleCreateChange}
                      required
                    >
                      <option value="">Select floor</option>
                      <option value="Ground Floor">Ground Floor</option>
                      <option value="1st Floor">1st Floor</option>
                      <option value="2nd Floor">2nd Floor</option>
                      <option value="3rd Floor">3rd Floor</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                {createForm.floorNumber === 'Other' && (
                  <div className="form-group">
                    <label htmlFor="createFloorOther">Enter Floor Number</label>
                    <div className="input-with-icon">
                      <span className="input-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false" role="img">
                          <path
                            d="M12 4v16M4 12h16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <input
                        id="createFloorOther"
                        name="floorNumberOther"
                        type="text"
                        value={createForm.floorNumberOther}
                        onChange={handleCreateChange}
                        placeholder="e.g., 4th Floor, Basement, etc."
                        required
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <button type="submit" className="primary-button">
              <span className="primary-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false" role="img">
                  <path
                    d="M5 12h12M13 6l6 6-6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Create Account
            </button>

            <p className="auth-footer">
              Already have an account?{' '}
              <button type="button" className="link-button" onClick={() => setActiveView('login')}>
                Login here
              </button>
            </p>

            {createStatus && (
              <p className="form-status" role="status">
                {createStatus}
              </p>
            )}
          </form>
        )}
        </section>
      )}
    </main>
  )
}

export default AuthPage
