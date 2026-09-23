import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

export default function PrincipalProfile() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("principal")
  const [status, setStatus] = useState("")
  const [hasLocalProfile, setHasLocalProfile] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem("authToken")
      const storedRole = localStorage.getItem("authRole")
      const rawUser = localStorage.getItem("user") || localStorage.getItem("currentUser")

      if (!token || storedRole !== "principal") {
        navigate("/", { replace: true })
        return
      }

      if (rawUser) {
        try {
          const user = JSON.parse(rawUser)
          if (user?.role !== "principal") {
            navigate("/", { replace: true })
            return
          }
          setName(user?.name || "")
          setEmail(user?.email || "")
          setRole(user?.role || "principal")
          setHasLocalProfile(Boolean(user?.name || user?.email))
        } catch (error) {
          setStatus("Unable to load profile. Please log in again.")
        }
      }

      try {
        const response = await fetch("http://localhost:5000/api/profile", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
        const data = await response.json()

        if (!response.ok || !data?.user) {
          if (!hasLocalProfile) {
            setStatus("Unable to load profile. Please log in again.")
          }
          return
        }

        if (data.user?.role !== "principal") {
          navigate("/", { replace: true })
          return
        }

        localStorage.setItem("user", JSON.stringify(data.user))
        localStorage.setItem("currentUser", JSON.stringify(data.user))
        localStorage.setItem("authName", data.user?.name || "")
        localStorage.setItem("authRole", data.user?.role || "principal")

        setName(data.user?.name || "")
        setEmail(data.user?.email || "")
        setRole(data.user?.role || "principal")
        setStatus("")
        setHasLocalProfile(true)
      } catch (error) {
        if (!hasLocalProfile) {
          setStatus("Unable to load profile. Please log in again.")
        }
      }
    }

    loadProfile()
  }, [navigate])

  const validateForm = () => {
    const errors = {}
    if (!name?.trim()) {
      errors.name = "Name is required."
    }
    return errors
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setStatus("")
    setFormErrors({})

    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsSaving(true)
    const token = localStorage.getItem("authToken")
    if (!token) {
      setStatus("Session expired. Please log in again.")
      setIsSaving(false)
      navigate("/", { replace: true })
      return
    }

    try {
      console.log("Saving principal profile with:", { name })
      const response = await fetch("http://localhost:5000/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      })
      const data = await response.json()
      console.log("Profile update response:", { status: response.status, data })

      if (!response.ok || !data?.user) {
        const errorMessage = data?.message || `Failed to update profile (HTTP ${response.status})`
        console.error("Profile update failed:", errorMessage)
        setStatus(errorMessage)
        setIsSaving(false)
        return
      }

      console.log("Profile update successful, updating localStorage:", data.user)
      localStorage.setItem("user", JSON.stringify(data.user))
      localStorage.setItem("currentUser", JSON.stringify(data.user))
      localStorage.setItem("authName", data.user?.name || name)

      setName(data.user?.name || "")
      setEmail(data.user?.email || "")
      setRole(data.user?.role || "principal")
      setStatus("Profile updated successfully.")
      setIsEditMode(false)
    } catch (error) {
      console.error("Save error:", error.message, error.stack)
      setStatus(`Error: ${error.message || "Unable to save profile. Please try again."}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditMode(false)
    setFormErrors({})
    setStatus("")
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("currentUser")
    localStorage.removeItem("authToken")
    localStorage.removeItem("authRole")
    localStorage.removeItem("authName")
    localStorage.removeItem("authEmail")
    localStorage.removeItem("authRoom")
    localStorage.removeItem("authBlock")
    navigate("/", { replace: true })
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-top">
          <Link className="profile-back" to="/principal-dashboard">
            Back to Dashboard
          </Link>
          <div className="profile-header">
            <div className="profile-avatar" aria-hidden="true">
              {(name || "P").slice(0, 1).toUpperCase()}
            </div>
            <div className="profile-title">
              <h1>{name || "Principal"}</h1>
              <span className="profile-badge">Principal</span>
              <p className="profile-meta">{email || "--"}</p>
            </div>
          </div>
        </div>

        <form className="profile-form" onSubmit={isEditMode ? handleSave : (e) => e.preventDefault()}>
          <div className="profile-grid">
            <label className="profile-field">
              <span>Full Name</span>
              <input
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                readOnly={!isEditMode}
                className={isEditMode ? "" : "read-only"}
                required
              />
              {formErrors.name && isEditMode && <span className="field-error">{formErrors.name}</span>}
            </label>

            <label className="profile-field">
              <span>Email</span>
              <input name="email" type="email" value={email} readOnly className="read-only" />
            </label>

            <label className="profile-field">
              <span>Role</span>
              <input name="role" type="text" value={role || "principal"} readOnly className="read-only" />
            </label>
          </div>

          <div className="profile-actions">
            {!isEditMode ? (
              <>
                <button type="button" className="profile-edit" onClick={() => setIsEditMode(true)}>
                  Edit Profile
                </button>
                <button type="button" className="profile-logout" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <button type="submit" className="profile-save" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" className="profile-cancel" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </button>
              </>
            )}
          </div>

          {status && (
            <p className={`profile-status ${status.includes("successfully") ? "success" : "error"}`} role="status">
              {status}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
