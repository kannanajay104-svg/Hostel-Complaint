import "./App.css"
import { Routes, Route, Navigate } from "react-router-dom"
import AuthPage from "./components/AuthPage.jsx"
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import RoleDashboard from "./components/RoleDashboard.jsx"
import StudentDashboard from "./pages/StudentDashboard.jsx"
import StudentProfile from "./pages/StudentProfile.jsx"
import ManagerDashboard from "./pages/ManagerDashboard.jsx"
import ManagerProfile from "./pages/ManagerProfile.jsx"
import WardenDashboard from "./pages/WardenDashboard.jsx"
import WardenProfile from "./pages/WardenProfile.jsx"
import VicePrincipalDashboard from "./pages/VicePrincipalDashboard.jsx"
import VicePrincipalProfile from "./pages/VicePrincipalProfile.jsx"
import PrincipalDashboard from "./pages/PrincipalDashboard.jsx"
import PrincipalProfile from "./pages/PrincipalProfile.jsx"

function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />

      <Route
        path="/student-dashboard"
        element={
          <ProtectedRoute role="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/warden-dashboard"
        element={
          <ProtectedRoute role="warden">
            <WardenDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/warden-profile"
        element={
          <ProtectedRoute role="warden">
            <WardenProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager-dashboard"
        element={
          <ProtectedRoute role="manager">
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager-profile"
        element={
          <ProtectedRoute role="manager">
            <ManagerProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/viceprincipal-dashboard"
        element={
          <ProtectedRoute role="viceprincipal">
            <VicePrincipalDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/viceprincipal-profile"
        element={
          <ProtectedRoute role="viceprincipal">
            <VicePrincipalProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/vp-dashboard"
        element={
          <ProtectedRoute role="viceprincipal">
            <RoleDashboard title="Vice Principal Dashboard" roleLabel="Vice Principal" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/principal-dashboard"
        element={
          <ProtectedRoute role="principal">
            <PrincipalDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/principal-profile"
        element={
          <ProtectedRoute role="principal">
            <PrincipalProfile />
          </ProtectedRoute>
        }
      />

      <Route path="/student/profile" element={<StudentProfile />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
