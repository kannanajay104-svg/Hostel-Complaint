import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import {
  clearAuthSession,
  getLogoutSignalKey,
  isSessionExpired,
  markSessionClosed,
  touchSession,
} from "../utils/authSession.js"

const ProtectedRoute = ({ children, role }) => {
  const [, setRefreshTick] = useState(0)

  useEffect(() => {
    const handleActivity = () => {
      touchSession()
    }

    const handleStorage = (event) => {
      if (event.key === getLogoutSignalKey()) {
        setRefreshTick((prev) => prev + 1)
      }
    }

    const handleBeforeUnload = () => {
      markSessionClosed()
    }

    window.addEventListener("mousemove", handleActivity)
    window.addEventListener("keydown", handleActivity)
    window.addEventListener("click", handleActivity)
    window.addEventListener("scroll", handleActivity)
    window.addEventListener("storage", handleStorage)
    window.addEventListener("beforeunload", handleBeforeUnload)

    const intervalId = window.setInterval(() => {
      setRefreshTick((prev) => prev + 1)
    }, 60 * 1000)

    touchSession()

    return () => {
      window.removeEventListener("mousemove", handleActivity)
      window.removeEventListener("keydown", handleActivity)
      window.removeEventListener("click", handleActivity)
      window.removeEventListener("scroll", handleActivity)
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.clearInterval(intervalId)
    }
  }, [])

  const token = localStorage.getItem("authToken")
  const userRole = localStorage.getItem("authRole")
  const storedUser = localStorage.getItem("user") || localStorage.getItem("currentUser")

  if (token && isSessionExpired()) {
    clearAuthSession()
    return <Navigate to="/" replace />
  }

  console.log("ProtectedRoute check")
  console.log("Token:", token)
  console.log("Role:", userRole)

  if (!token || !storedUser) {
    return <Navigate to="/" replace />
  }

  if (role && userRole !== role) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
