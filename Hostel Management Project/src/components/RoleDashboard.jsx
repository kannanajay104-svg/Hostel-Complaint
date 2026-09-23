import { Link } from 'react-router-dom'

function RoleDashboard({ title, roleLabel }) {
  return (
    <div className="dashboard-page simple-dashboard">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            H
          </span>
          <div>
            <div className="brand-title">HostelComplaint</div>
            <div className="brand-subtitle">{roleLabel} Portal</div>
          </div>
        </div>
        <nav className="top-nav">
          <Link to="#">Dashboard</Link>
          <Link to="#">Complaints</Link>
          <Link to="#">Reports</Link>
          <Link to="#">Profile</Link>
        </nav>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>{title}</h2>
        </div>
        <p className="muted">This dashboard is ready for role-specific widgets and reports.</p>
      </section>
    </div>
  )
}

export default RoleDashboard
