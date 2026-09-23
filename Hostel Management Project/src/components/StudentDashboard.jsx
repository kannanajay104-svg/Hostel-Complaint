import { useMemo } from 'react'
import { Link } from 'react-router-dom'

const statsConfig = [
  { label: 'Total Complaints', value: 0, tone: 'primary' },
  { label: 'Pending', value: 0, tone: 'warning' },
  { label: 'In Progress', value: 0, tone: 'secondary' },
  { label: 'Resolved', value: 0, tone: 'success' },
]

const quickActions = [
  { label: 'Submit Complaint', icon: '+', action: '/complaints/new' },
  { label: 'Track Complaints', icon: 'Q', action: '/complaints/track' },
  { label: 'View History', icon: 'H', action: '/complaints/history' },
  { label: 'Escalate All', icon: 'E', action: '/complaints/escalate' },
]

const getStoredProfile = () => ({
  name: localStorage.getItem('authName') || 'Student',
  block: localStorage.getItem('authBlock') || '',
  room: localStorage.getItem('authRoom') || '',
})

function StudentDashboard() {
  const profile = useMemo(() => getStoredProfile(), [])

  return (
    <div className="dashboard-page">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            H
          </span>
          <div>
            <div className="brand-title">HostelComplaint</div>
            <div className="brand-subtitle">Student Portal</div>
          </div>
        </div>
        <nav className="top-nav">
          <Link to="#">Dashboard</Link>
          <Link to="#">New Complaint</Link>
          <Link to="#">My Complaints</Link>
          <Link to="#">Track</Link>
          <Link to="#">Profile</Link>
        </nav>
        <div className="user-chip">
          <div className="avatar" aria-hidden="true">
            {profile.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="user-name">{profile.name}</div>
            <div className="user-role">Student</div>
          </div>
        </div>
      </header>

      <section className="welcome">
        <h1>Welcome, {profile.name}!</h1>
        <p>
          {profile.room || '--'}, {profile.block || '--'}
        </p>
      </section>

      <section className="stats-grid" aria-label="Complaint statistics">
        {statsConfig.map((stat) => (
          <article key={stat.label} className={`stat-card tone-${stat.tone}`}>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </article>
        ))}
      </section>

      <section className="panel" aria-label="Quick actions">
        <div className="panel-header">
          <h2>Quick Actions</h2>
        </div>
        <div className="quick-actions">
          {quickActions.map((action) => (
            <button key={action.label} type="button" className="quick-action">
              <span className="quick-icon" aria-hidden="true">
                {action.icon}
              </span>
              {action.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel" aria-label="Recent complaints">
        <div className="panel-header">
          <h2>Recent Complaints</h2>
          <button type="button" className="ghost-button">
            View All
          </button>
        </div>
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">
            []
          </div>
          <h3>No Complaints Yet</h3>
          <p>Submit your first complaint.</p>
        </div>
      </section>

      <footer className="dashboard-footer">
        <span>(c) 2024 Hostel Complaint Management System</span>
        <span>Support: 044-1234 5678 | support@hostelcomplaint.edu</span>
      </footer>
    </div>
  )
}

export default StudentDashboard
