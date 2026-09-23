import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

function StudentProfile() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [roomNumber, setRoomNumber] = useState("")
  const [block, setBlock] = useState("")
  const [floorNumber, setFloorNumber] = useState("")
  const [floorNumberOther, setFloorNumberOther] = useState("")
  const [role, setRole] = useState("")
  const [status, setStatus] = useState("")
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    const loadProfile = async () => {
      console.log("Profile mounted")
      const rawUser = localStorage.getItem("user") || localStorage.getItem("currentUser")
      const token = localStorage.getItem("authToken")
      if (!rawUser) {
        if (!token) {
          console.error("No user found in localStorage.")
          navigate("/", { replace: true })
          return
        }

        const response = await fetch("http://localhost:5000/api/profile", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
        const data = await response.json()
        console.log("Profile Response:", data)
        if (!response.ok || !data?.user) {
          setStatus("Unable to load profile. Please log in again.")
          return
        }

        localStorage.setItem("user", JSON.stringify(data.user))
        localStorage.setItem("currentUser", JSON.stringify(data.user))
        setName(data.user?.name || "")
        setEmail(data.user?.email || "")
        setRoomNumber(data.user?.roomNumber || "")
        setBlock(data.user?.block || "")
        setFloorNumber(data.user?.floorNumber || "")
        setRole(data.user?.role || "")
        return
      }

      try {
        const user = JSON.parse(rawUser)
        console.log("User from LocalStorage:", user)
        if (!user) {
          console.error("Parsed user is empty.")
          if (!token) {
            navigate("/", { replace: true })
          }
          return
        }
        setName(user?.name || "")
        setEmail(user?.email || "")
        setRoomNumber(user?.roomNumber || "")
        setBlock(user?.block || "")
        setFloorNumber(user?.floorNumber || "")
        setRole(user?.role || "")

        if (!user?.roomNumber || !user?.block) {
          const token = localStorage.getItem("authToken")
          const response = await fetch("http://localhost:5000/api/profile", {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          })
          const data = await response.json()
          console.log("Profile Response:", data)
          if (response.ok && data?.user) {
            localStorage.setItem("user", JSON.stringify(data.user))
            localStorage.setItem("currentUser", JSON.stringify(data.user))
            setName(data.user?.name || "")
            setEmail(data.user?.email || "")
            setRoomNumber(data.user?.roomNumber || "")
            setBlock(data.user?.block || "")
            setFloorNumber(data.user?.floorNumber || "")
            setRole(data.user?.role || "")
          }
        }
      } catch (error) {
        console.error("Failed to parse user.", error)
        if (!token) {
          navigate("/", { replace: true })
        } else {
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
    if (!roomNumber?.trim()) {
      errors.roomNumber = "Room number is required."
    }
    if (!block?.trim()) {
      errors.block = "Block is required."
    }
    if (!floorNumber?.trim()) {
      errors.floorNumber = "Floor number is required."
    }
    if (floorNumber === "Other" && !floorNumberOther?.trim()) {
      errors.floorNumber = "Please enter the custom floor number."
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
      const finalFloorNumber = floorNumber === "Other" ? floorNumberOther : floorNumber
      console.log("Saving profile with:", { name, roomNumber, block, floorNumber: finalFloorNumber })
      
      const response = await fetch("http://localhost:5000/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          roomNumber,
          block,
          floorNumber: finalFloorNumber,
        }),
      })

      const data = await response.json()
      console.log("Profile update response:", { status: response.status, data })
      
      if (!response.ok) {
        const errorMessage = data?.message || `Failed to update profile (HTTP ${response.status})`
        console.error("Profile update failed:", errorMessage)
        setStatus(errorMessage)
        setIsSaving(false)
        return
      }

      if (data?.user) {
        const updatedUser = data.user
        console.log("Profile update successful, updating localStorage:", updatedUser)
        localStorage.setItem("user", JSON.stringify(updatedUser))
        localStorage.setItem("currentUser", JSON.stringify(updatedUser))
        localStorage.setItem("authRoom", updatedUser.roomNumber)
        localStorage.setItem("authBlock", updatedUser.block)
        localStorage.setItem("authFloor", updatedUser.floorNumber)
        localStorage.setItem("authName", updatedUser.name)

        setName(updatedUser.name || "")
        setRoomNumber(updatedUser.roomNumber || "")
        setBlock(updatedUser.block || "")
        setFloorNumber(updatedUser.floorNumber || "")
        setFloorNumberOther("")
      }

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
    window.location.href = "/"
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-top">
          <Link className="profile-back" to="/student-dashboard">
            Back to Dashboard
          </Link>
          <div className="profile-header">
            <div className="profile-avatar" aria-hidden="true">
              {(name || "S").slice(0, 1).toUpperCase()}
            </div>
            <div className="profile-title">
              <h1>{name || "Student"}</h1>
              <span className="profile-badge">Student</span>
              <p className="profile-meta">
                Room {roomNumber || "--"} • Floor {floorNumber || "--"} • Block {block || "--"}
              </p>
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
              <span>Room Number</span>
              <input
                name="roomNumber"
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                readOnly={!isEditMode}
                className={isEditMode ? "" : "read-only"}
                required
              />
              {formErrors.roomNumber && isEditMode && <span className="field-error">{formErrors.roomNumber}</span>}
            </label>

            <label className="profile-field">
              <span>Block</span>
              <input
                name="block"
                type="text"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                readOnly={!isEditMode}
                className={isEditMode ? "" : "read-only"}
                required
              />
              {formErrors.block && isEditMode && <span className="field-error">{formErrors.block}</span>}
            </label>

            <label className="profile-field">
              <span>Floor Number</span>
              {!isEditMode ? (
                <input name="floorNumber" type="text" value={floorNumber} readOnly className="read-only" />
              ) : (
                <>
                  <select
                    name="floorNumber"
                    value={floorNumber}
                    onChange={(e) => {
                      setFloorNumber(e.target.value)
                      if (e.target.value !== "Other") {
                        setFloorNumberOther("")
                      }
                    }}
                    required
                  >
                    <option value="">Select floor</option>
                    <option value="Ground Floor">Ground Floor</option>
                    <option value="1st Floor">1st Floor</option>
                    <option value="2nd Floor">2nd Floor</option>
                    <option value="3rd Floor">3rd Floor</option>
                    <option value="Other">Other</option>
                  </select>
                  {floorNumber === "Other" && (
                    <input
                      name="floorNumberOther"
                      type="text"
                      value={floorNumberOther}
                      onChange={(e) => setFloorNumberOther(e.target.value)}
                      placeholder="e.g., 4th Floor, Basement, etc."
                      required
                      style={{ marginTop: "8px" }}
                    />
                  )}
                </>
              )}
              {formErrors.floorNumber && isEditMode && <span className="field-error">{formErrors.floorNumber}</span>}
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

export default StudentProfile
