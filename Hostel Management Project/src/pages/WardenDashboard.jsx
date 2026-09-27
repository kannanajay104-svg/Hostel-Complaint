import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { getNextPortalLabel, getPortalLabel } from "../utils/complaintPortalStatus.js"

const statsConfig = [
  { label: "Total Complaints", key: "total", tone: "primary" },
  { label: "Pending Complaints", key: "pending", tone: "warning" },
  { label: "In Progress", key: "inProgress", tone: "secondary" },
  { label: "Resolved", key: "resolved", tone: "success" },
]

const quickActions = [
  { label: "View Pending Complaints", icon: "P", action: "pendingView" },
  { label: "Extend Time Limit", icon: "X", action: "extend" },
  { label: "Update Complaint Status", icon: "T", action: "track" },
  { label: "View History", icon: "H", action: "history" },
  { label: "Escalate All", icon: "E", action: "escalate" },
]

const extendDayOptions = ["1 Day", "2 Days", "3 Days", "4 Days", "Other"]
const statusOptions = ["Pending", "In Progress", "Solved"]

const panelTitles = {
  new: "New Complaints",
  pendingView: "Pending Complaints",
  deadline: "Complaints Near Deadline",
  history: "Solved Complaint History",
}

const statusPanelTitles = {
  total: "All Complaints",
  pending: "Pending Complaints",
  inProgress: "In Progress Complaints",
  resolved: "Resolved Complaints",
}

const emptyPanelMessages = {
  total: {
    title: "No complaints found",
    description: "Complaints will appear here once fetched from the server.",
  },
  pending: {
    title: "No pending complaints",
    description: "Pending complaints will appear here once fetched from the server.",
  },
  inProgress: {
    title: "No in-progress complaints",
    description: "In-progress complaints will appear here once status is updated.",
  },
  resolved: {
    title: "No resolved complaints",
    description: "Resolved complaints will appear here once complaints are solved.",
  },
  new: {
    title: "No new complaints",
    description: "New complaints will appear here once fetched from the server.",
  },
  pendingView: {
    title: "No pending complaints",
    description: "Pending complaints will appear here once fetched from the server.",
  },
  deadline: {
    title: "No near-deadline complaints",
    description: "Near-deadline complaints will appear here once fetched from the server.",
  },
  history: {
    title: "No solved complaints",
    description: "Solved complaints will appear here in history.",
  },
}

function WardenDashboard() {
  const navigate = useNavigate()
  const handleProfileClick = () => {
    navigate("/warden-profile")
  }
  const [profile, setProfile] = useState({ name: "", block: "" })
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  })
  const [complaints, setComplaints] = useState([])
  const [activeTab, setActiveTab] = useState("new")
  const [activeStatusFilter, setActiveStatusFilter] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [today, setToday] = useState(() => new Date())
  const [isExtendOpen, setIsExtendOpen] = useState(false)
  const [selectedExtendId, setSelectedExtendId] = useState("")
  const [extendDaysOption, setExtendDaysOption] = useState("1 Day")
  const [extendDaysOther, setExtendDaysOther] = useState("")
  const [selectedExtendDetails, setSelectedExtendDetails] = useState(null)
  const [isExtendLoading, setIsExtendLoading] = useState(false)
  const [extendError, setExtendError] = useState("")
  const [extendSuccess, setExtendSuccess] = useState("")
  const [isExtendSaving, setIsExtendSaving] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [statusComplaints, setStatusComplaints] = useState([])
  const [isStatusListLoading, setIsStatusListLoading] = useState(false)
  const [selectedStatusId, setSelectedStatusId] = useState("")
  const [selectedStatusDetails, setSelectedStatusDetails] = useState(null)
  const [isStatusDetailsLoading, setIsStatusDetailsLoading] = useState(false)
  const [statusUpdateValue, setStatusUpdateValue] = useState("Pending")
  const [statusError, setStatusError] = useState("")
  const [statusUpdateNotice, setStatusUpdateNotice] = useState("")
  const [isStatusSaving, setIsStatusSaving] = useState(false)
  const [isStatusImageOpen, setIsStatusImageOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [selectedHistoryComplaint, setSelectedHistoryComplaint] = useState(null)
  const [isHistoryImageOpen, setIsHistoryImageOpen] = useState(false)
  const [selectedHistoryImage, setSelectedHistoryImage] = useState(null)
  const [isUrgentModalOpen, setIsUrgentModalOpen] = useState(false)
  const [selectedUrgentComplaint, setSelectedUrgentComplaint] = useState(null)
  const [isUrgentImageOpen, setIsUrgentImageOpen] = useState(false)

  useEffect(() => {
    const rawUser = localStorage.getItem("user") || localStorage.getItem("currentUser")
    const role = localStorage.getItem("authRole")

    if (!rawUser || role !== "warden") {
      localStorage.removeItem("authToken")
      localStorage.removeItem("authRole")
      navigate("/", { replace: true })
      return
    }

    try {
      const user = JSON.parse(rawUser)
      setProfile({
        name: user?.name || "Warden",
        block: user?.block || "",
      })
    } catch (error) {
      localStorage.removeItem("authToken")
      localStorage.removeItem("authRole")
      navigate("/", { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    const handleStorageChange = () => {
      const rawUser = localStorage.getItem("user") || localStorage.getItem("currentUser")
      if (rawUser) {
        try {
          const user = JSON.parse(rawUser)
          setProfile({
            name: user?.name || "Warden",
            block: user?.block || "",
          })
          console.log("Dashboard profile refreshed from localStorage:", user)
        } catch (error) {
          console.error("Failed to parse updated user from localStorage:", error)
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  useEffect(() => {
    const intervalId = setInterval(() => {
      setToday(new Date())
    }, 1000 * 60 * 60)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (!statusUpdateNotice) {
      return undefined
    }

    const timeoutId = setTimeout(() => {
      setStatusUpdateNotice("")
    }, 2500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [statusUpdateNotice])

  const normalizeStatus = useCallback((statusValue) => {
    const status = String(statusValue || "").trim().toLowerCase()
    if (status === "in progress" || status === "in_progress" || status === "inprogress") {
      return "inProgress"
    }
    if (status === "resolved" || status === "solved") {
      return "resolved"
    }
    if (status === "pending") {
      return "pending"
    }
    return "unknown"
  }, [])

  const getStatusCounts = useCallback(
    (items) => {
      return items.reduce(
        (acc, complaint) => {
          const currentLevel = String(complaint?.current_level || "").trim().toLowerCase()
          const status = normalizeStatus(complaint?.status)
          if (status === "resolved") {
            acc.resolved += 1
            acc.total += 1
          } else if (currentLevel === "warden") {
            acc.total += 1
            if (status === "pending") {
              acc.pending += 1
            } else if (status === "inProgress") {
              acc.inProgress += 1
            }
          }
          return acc
        },
        { total: 0, pending: 0, inProgress: 0, resolved: 0 }
      )
    },
    [normalizeStatus]
  )

  const getSolvedStatusClassName = useCallback(
    (statusValue) => (normalizeStatus(statusValue) === "resolved" ? "solved-status-input" : ""),
    [normalizeStatus]
  )

  const isStatusUpdatable = useCallback(
    (complaint) => {
      const normalizedStatus = normalizeStatus(complaint?.status)
      return normalizedStatus === "pending" || normalizedStatus === "inProgress"
    },
    [normalizeStatus]
  )

  const formatDeadline = (deadlineDate) => {
    if (!deadlineDate) {
      return "--"
    }
    const parsedDate = new Date(deadlineDate)
    if (Number.isNaN(parsedDate.getTime())) {
      return "--"
    }
    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatSolvedDate = (solvedDate) => {
    if (!solvedDate) {
      return "Not Solved"
    }
    const parsedDate = new Date(solvedDate)
    if (Number.isNaN(parsedDate.getTime())) {
      return "Not Solved"
    }
    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getSolvedDateValue = (complaint) => {
    const solvedValue = complaint?.solvedDate || complaint?.solved_date
    if (solvedValue) {
      return solvedValue
    }
    const status = String(complaint?.status || "").trim().toLowerCase()
    if (status === "solved" || status === "resolved") {
      return complaint?.updatedAt || complaint?.created_date || null
    }
    return null
  }

  const getRemainingDays = (deadlineDate) => {
    if (!deadlineDate) {
      return null
    }
    const parsedDeadline = new Date(deadlineDate)
    if (Number.isNaN(parsedDeadline.getTime())) {
      return null
    }
    const currentUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    const deadlineUtc = Date.UTC(
      parsedDeadline.getUTCFullYear(),
      parsedDeadline.getUTCMonth(),
      parsedDeadline.getUTCDate()
    )
    const msPerDay = 1000 * 60 * 60 * 24
    return Math.round((deadlineUtc - currentUtc) / msPerDay)
  }

  const getOverduePortalMessage = (complaint, remainingDays) => {
    const currentPortal = getPortalLabel(complaint?.current_level || "Warden")
    const nextPortal = getNextPortalLabel(complaint?.current_level || "Warden")
    const overdueDays = Math.abs(remainingDays)
    return `Now in ${currentPortal} -> Moves to ${nextPortal} (${overdueDays} Day${overdueDays === 1 ? "" : "s"} Overdue)`
  }

  const getComplaintRemainingLabel = (complaint) => {
    const status = normalizeStatus(complaint?.status)
    if (status === "resolved") {
      return "Solved"
    }

    const remainingDays = getRemainingDays(complaint?.deadline_date)
    if (remainingDays === null) {
      return "--"
    }
    if (remainingDays > 0) {
      return `${remainingDays} Day${remainingDays === 1 ? "" : "s"} Remaining`
    }
    if (remainingDays === 0) {
      return "Last Day"
    }
    return getOverduePortalMessage(complaint, remainingDays)
  }

  const getUrgentRemainingLabel = (complaint) => {
    return getComplaintRemainingLabel(complaint)
  }

  const getImageSource = (imageValue) => {
    if (!imageValue) {
      return ""
    }
    const source = String(imageValue || "")
    if (source.startsWith("data:")) {
      return source
    }
    if (source.startsWith("http://") || source.startsWith("https://")) {
      return source
    }
    if (source.startsWith("/")) {
      return `http://localhost:5000${source}`
    }
    return `data:image/jpeg;base64,${source}`
  }

  const fetchWardenComplaints = useCallback(async (options = {}) => {
    const { silent = false } = options
    const authToken = localStorage.getItem("authToken")
    if (!authToken) {
      setLoadError("Missing auth token. Please log in again.")
      return
    }

    if (!silent) {
      setIsLoading(true)
    }
    setLoadError("")
    try {
      const response = await fetch("http://localhost:5000/api/complaints", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(errorPayload.message || response.statusText)
      }

      const data = await response.json()
      const items = Array.isArray(data.complaints) ? data.complaints : []
      console.log("Warden complaints:", items)
      setComplaints(items)
      setStats(getStatusCounts(items))
    } catch (error) {
      console.error(error?.response?.data || error?.message || error)
      setComplaints([])
      setLoadError("Unable to load complaints right now.")
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [getStatusCounts])

  const fetchStatusComplaints = useCallback(async () => {
    const authToken = localStorage.getItem("authToken")
    if (!authToken) {
      setStatusError("Missing auth token. Please log in again.")
      return
    }

    setIsStatusListLoading(true)
    setStatusError("")
    try {
      const response = await fetch("http://localhost:5000/api/complaints", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(errorPayload.message || response.statusText)
      }

      const data = await response.json()
      const items = Array.isArray(data.complaints) ? data.complaints : []
      console.log("Status complaints response:", items)
      const normalizedItems = items.map((complaint) => ({
        ...complaint,
        id: String(complaint?.id || complaint?._id || ""),
      }))
      setStatusComplaints(
        normalizedItems.filter((complaint) => complaint.id && isStatusUpdatable(complaint))
      )
    } catch (error) {
      console.error(error?.response?.data || error?.message || error)
      setStatusComplaints([])
      setStatusError("Unable to load complaints right now.")
    } finally {
      setIsStatusListLoading(false)
    }
  }, [isStatusUpdatable])

  useEffect(() => {
    fetchStatusComplaints()
  }, [fetchStatusComplaints])

  useEffect(() => {
    let isMounted = true
    if (!isMounted) {
      return undefined
    }

    fetchWardenComplaints()
    const intervalId = setInterval(() => {
      fetchWardenComplaints({ silent: true })
    }, 5000)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [fetchWardenComplaints])

  const handleQuickAction = (action) => {
    if (action === "new" || action === "pendingView" || action === "deadline" || action === "history") {
      setActiveTab(action)
      setActiveStatusFilter("")
      return
    }
    if (action === "track") {
      setStatusError("")
      setSelectedStatusId("")
      setSelectedStatusDetails(null)
      setStatusUpdateValue("Pending")
      setIsStatusOpen(true)
      fetchStatusComplaints()
    }
  }

  const handleEscalateAll = async () => {
    try {
      const authToken = localStorage.getItem("authToken")
      await fetch("http://localhost:5000/api/complaints/escalate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      })
      await fetchWardenComplaints()
    } catch (err) {
      console.error("Escalate all error:", err)
    }
  }

  const openHistoryModal = (complaint) => {
    setSelectedHistoryComplaint(complaint)
    setIsHistoryOpen(true)
  }

  const closeHistoryModal = () => {
    setIsHistoryOpen(false)
    setSelectedHistoryComplaint(null)
    setIsHistoryImageOpen(false)
    setSelectedHistoryImage(null)
  }

  const handleViewHistoryImage = (imageValue) => {
    if (!imageValue) {
      alert("No image uploaded.")
      return
    }
    setSelectedHistoryImage(imageValue)
    setIsHistoryImageOpen(true)
  }

  const handleCloseHistoryImage = () => {
    setIsHistoryImageOpen(false)
    setSelectedHistoryImage(null)
  }

  const openUrgentComplaintModal = (complaint) => {
    setSelectedUrgentComplaint(complaint)
    setIsUrgentModalOpen(true)
  }

  const closeUrgentComplaintModal = () => {
    setIsUrgentModalOpen(false)
    setSelectedUrgentComplaint(null)
    setIsUrgentImageOpen(false)
  }

  const handleOpenUrgentImage = () => {
    if (!selectedUrgentComplaint?.image_path && !selectedUrgentComplaint?.image) {
      return
    }
    setIsUrgentImageOpen(true)
  }

  const handleCloseUrgentImage = () => {
    setIsUrgentImageOpen(false)
  }

  const handleExtendTimeLimit = () => {
    setExtendError("")
    setExtendSuccess("")
    setSelectedExtendId("")
    setExtendDaysOption("1 Day")
    setExtendDaysOther("")
    setSelectedExtendDetails(null)
    setIsExtendOpen(true)
    fetchWardenComplaints()
  }

  const selectedStatusComplaint =
    selectedStatusDetails || statusComplaints.find((complaint) => complaint.id === selectedStatusId) || null

  useEffect(() => {
    if (!selectedStatusId || !isStatusOpen) {
      setSelectedStatusDetails(null)
      return
    }

    const authToken = localStorage.getItem("authToken")
    if (!authToken) {
      setStatusError("Missing auth token. Please log in again.")
      return
    }

    let isActive = true
    setIsStatusDetailsLoading(true)
    setStatusError("")

    fetch(`http://localhost:5000/api/complaints/${selectedStatusId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}))
          throw new Error(errorPayload.message || response.statusText)
        }
        return response.json()
      })
      .then((data) => {
        if (!isActive) {
          return
        }
        const complaint = data.complaint || null
        setSelectedStatusDetails(complaint)
        const resolvedStatus = statusOptions.find(
          (option) => option.toLowerCase() === String(complaint?.status || "").trim().toLowerCase()
        )
        setStatusUpdateValue(resolvedStatus || "Pending")
      })
      .catch((error) => {
        if (!isActive) {
          return
        }
        console.error(error?.response?.data || error?.message || error)
        setStatusError("Unable to load complaint details.")
        setSelectedStatusDetails(null)
      })
      .finally(() => {
        if (!isActive) {
          return
        }
        setIsStatusDetailsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [isStatusOpen, selectedStatusId])

  const closeStatusModalNow = () => {
    setIsStatusOpen(false)
    setStatusError("")
    setSelectedStatusId("")
    setSelectedStatusDetails(null)
    setStatusUpdateValue("Pending")
    setIsStatusDetailsLoading(false)
    setIsStatusSaving(false)
    setIsStatusImageOpen(false)
  }

  const handleCloseStatusModal = () => {
    closeStatusModalNow()
  }

  const handleOpenStatusImage = () => {
    if (selectedStatusComplaint?.image_path) {
      setIsStatusImageOpen(true)
    }
  }

  const handleCloseStatusImage = () => {
    setIsStatusImageOpen(false)
  }

  const handleUpdateComplaintStatus = async () => {
    if (!selectedStatusComplaint || !selectedStatusId) {
      return
    }

    const authToken = localStorage.getItem("authToken")
    if (!authToken) {
      setStatusError("Missing auth token. Please log in again.")
      return
    }

    if (!statusOptions.includes(statusUpdateValue)) {
      setStatusError("Please select a valid status.")
      return
    }

    setIsStatusSaving(true)
    setStatusError("")
    try {
      const response = await fetch(`http://localhost:5000/api/complaints/${selectedStatusId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: statusUpdateValue }),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(errorPayload.message || response.statusText)
      }

      const data = await response.json()
      console.log("Status update success response:", data)
      const updatedComplaint = data.complaint || null
      setSelectedStatusDetails(updatedComplaint)
      if (updatedComplaint?.id) {
        setComplaints((prev) => {
          const next = prev.map((complaint) =>
            complaint.id === updatedComplaint.id || complaint._id === updatedComplaint.id
              ? { ...complaint, ...updatedComplaint, id: updatedComplaint.id }
              : complaint
          )
          setStats(getStatusCounts(next))
          return next
        })
        setStatusComplaints((prev) =>
          prev
            .map((complaint) =>
              complaint.id === updatedComplaint.id || complaint._id === updatedComplaint.id
                ? { ...complaint, ...updatedComplaint, id: updatedComplaint.id }
                : complaint
            )
            .filter((complaint) => isStatusUpdatable(complaint))
        )
      }
      setStatusUpdateNotice("Status Updated Successfully ✅")
      closeStatusModalNow()

      try {
        await Promise.all([fetchStatusComplaints(), fetchWardenComplaints({ silent: true })])
      } catch (refreshError) {
        console.error("Post-update refresh warning:", refreshError)
      }
    } catch (error) {
      console.error(error?.response?.data || error?.message || error)
      setStatusError("Unable to update complaint status. Please try again.")
    } finally {
      setIsStatusSaving(false)
    }
  }

  const wardenActiveComplaints = complaints.filter((complaint) => {
    return String(complaint?.current_level || "").trim().toLowerCase() === "warden"
  })

  const pendingComplaints = wardenActiveComplaints.filter((complaint) => {
    return normalizeStatus(complaint?.status) === "pending"
  })

  const inProgressComplaints = wardenActiveComplaints.filter((complaint) => {
    return normalizeStatus(complaint?.status) === "inProgress"
  })

  const resolvedComplaints = complaints.filter((complaint) => {
    return normalizeStatus(complaint?.status) === "resolved"
  })

  const urgentComplaints = wardenActiveComplaints
    .filter((complaint) => {
      if (normalizeStatus(complaint?.status) === "resolved") {
        return false
      }
      const remainingDays = getRemainingDays(complaint?.deadline_date)
      return remainingDays !== null && remainingDays <= 2
    })
    .sort((a, b) => {
      const remainingA = getRemainingDays(a.deadline_date)
      const remainingB = getRemainingDays(b.deadline_date)
      if (remainingA === remainingB) {
        const dateA = new Date(a.created_date || 0).getTime()
        const dateB = new Date(b.created_date || 0).getTime()
        return dateB - dateA
      }
      return (remainingA ?? 99) - (remainingB ?? 99)
    })

  const movedPortalAlerts = complaints
    .filter((complaint) => {
      if (normalizeStatus(complaint?.status) === "resolved") {
        return false
      }
      const currentLevel = String(complaint?.current_level || "").trim().toLowerCase()
      return currentLevel === "manager" || currentLevel === "viceprincipal"
    })
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.created_date || 0).getTime()
      const dateB = new Date(b.updatedAt || b.created_date || 0).getTime()
      return dateB - dateA
    })

  const extendableComplaints = pendingComplaints

  const selectedExtendComplaint =
    selectedExtendDetails ||
    extendableComplaints.find((complaint) => complaint.id === selectedExtendId) ||
    null

  useEffect(() => {
    if (!selectedExtendId || !isExtendOpen) {
      setSelectedExtendDetails(null)
      return
    }

    const authToken = localStorage.getItem("authToken")
    if (!authToken) {
      setExtendError("Missing auth token. Please log in again.")
      return
    }

    let isActive = true
    setIsExtendLoading(true)
    setExtendError("")
    console.log("Selected complaint ID:", selectedExtendId)
    fetch(`http://localhost:5000/api/complaints/${selectedExtendId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}))
          throw new Error(errorPayload.message || response.statusText)
        }
        return response.json()
      })
      .then((data) => {
        if (!isActive) {
          return
        }
        setSelectedExtendDetails(data.complaint || null)
      })
      .catch((error) => {
        if (!isActive) {
          return
        }
        console.error(error?.response?.data || error?.message || error)
        setExtendError("Unable to load complaint details.")
        setSelectedExtendDetails(null)
      })
      .finally(() => {
        if (!isActive) {
          return
        }
        setIsExtendLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [isExtendOpen, selectedExtendId])

  const extendValidationMessage = (() => {
    if (!selectedExtendComplaint) {
      return ""
    }
    if (extendDaysOption !== "Other") {
      return ""
    }
    const trimmedValue = extendDaysOther.trim()
    if (!trimmedValue) {
      return "Please enter the number of days."
    }
    if (!/^[0-9]+$/.test(trimmedValue)) {
      return "Days must be a whole number."
    }
    const parsedValue = Number(trimmedValue)
    if (parsedValue < 1 || parsedValue > 30) {
      return "Days must be between 1 and 30."
    }
    return ""
  })()

  const getExtendDaysValue = () => {
    if (!selectedExtendComplaint) {
      return null
    }
    if (extendDaysOption === "Other") {
      const trimmedValue = extendDaysOther.trim()
      if (!/^[0-9]+$/.test(trimmedValue)) {
        return null
      }
      const parsedValue = Number(trimmedValue)
      if (parsedValue < 1 || parsedValue > 30) {
        return null
      }
      return parsedValue
    }
    return Number(extendDaysOption.split(" ")[0])
  }

  const canUpdateDeadline = Boolean(
    selectedExtendComplaint &&
      getExtendDaysValue() &&
      !extendValidationMessage &&
      !isExtendSaving &&
      !isExtendLoading &&
      String(selectedExtendComplaint?.status || "").trim().toLowerCase() === "pending"
  )

  const handleCloseExtendModal = () => {
    setIsExtendOpen(false)
    setExtendError("")
    setExtendSuccess("")
    setSelectedExtendId("")
    setExtendDaysOption("1 Day")
    setExtendDaysOther("")
    setSelectedExtendDetails(null)
    setIsExtendLoading(false)
  }

  const handleUpdateTimeLimit = async () => {
    const extendDays = getExtendDaysValue()
    if (!selectedExtendComplaint || !extendDays) {
      return
    }

    const authToken = localStorage.getItem("authToken")
    if (!authToken) {
      setExtendError("Missing auth token. Please log in again.")
      return
    }

    setIsExtendSaving(true)
    setExtendError("")
    setExtendSuccess("")
    try {
      const response = await fetch(
        `http://localhost:5000/api/complaints/${selectedExtendComplaint.id}/extend`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ extend_days: extendDays }),
        }
      )

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(errorPayload.message || response.statusText)
      }

      setExtendSuccess("Time limit extended successfully.")
      await fetchWardenComplaints()
      setTimeout(() => {
        handleCloseExtendModal()
      }, 1200)
    } catch (error) {
      console.error(error?.response?.data || error?.message || error)
      setExtendError("Unable to update time limit. Please try again.")
    } finally {
      setIsExtendSaving(false)
    }
  }

  const newComplaints = [...pendingComplaints].sort((a, b) => {
    const dateA = new Date(a.created_date || 0).getTime()
    const dateB = new Date(b.created_date || 0).getTime()
    return dateB - dateA
  })

  const nearDeadlineComplaints = [...pendingComplaints].sort((a, b) => {
    const remainingA = getRemainingDays(a.deadline_date)
    const remainingB = getRemainingDays(b.deadline_date)
    if (remainingA === null && remainingB === null) {
      return 0
    }
    if (remainingA === null) {
      return 1
    }
    if (remainingB === null) {
      return -1
    }
    return remainingA - remainingB
  })

  const showNewComplaints = activeTab === "new"
  const showPendingComplaints = activeTab === "pendingView"
  const showDeadlineComplaints = activeTab === "deadline"
  const showHistoryComplaints = activeTab === "history"
  const historyComplaints = complaints
    .filter((complaint) => normalizeStatus(complaint?.status) === "resolved")
    .sort((a, b) => {
      const dateA = new Date(getSolvedDateValue(a) || a.submitted_date || a.created_date || 0).getTime()
      const dateB = new Date(getSolvedDateValue(b) || b.submitted_date || b.created_date || 0).getTime()
      return dateB - dateA
    })
  const allComplaints = [
    ...wardenActiveComplaints.filter((complaint) => normalizeStatus(complaint?.status) !== "resolved"),
    ...resolvedComplaints,
  ].sort((a, b) => {
    const dateA = new Date(a.created_date || 0).getTime()
    const dateB = new Date(b.created_date || 0).getTime()
    return dateB - dateA
  })

  const inProgressSorted = [...inProgressComplaints].sort((a, b) => {
    const dateA = new Date(a.created_date || 0).getTime()
    const dateB = new Date(b.created_date || 0).getTime()
    return dateB - dateA
  })

  const resolvedSorted = [...resolvedComplaints].sort((a, b) => {
    const dateA = new Date(a.created_date || 0).getTime()
    const dateB = new Date(b.created_date || 0).getTime()
    return dateB - dateA
  })

  const filteredComplaintsByStatus = {
    total: allComplaints,
    pending: newComplaints,
    inProgress: inProgressSorted,
    resolved: resolvedSorted,
  }

  const isStatusFilteredView = Boolean(activeStatusFilter)
  const showStatusColumn = activeStatusFilter === "total"
  const panelTitle = isStatusFilteredView
    ? statusPanelTitles[activeStatusFilter] || statusPanelTitles.total
    : panelTitles[activeTab] || panelTitles.new
  const visibleComplaints = isStatusFilteredView
    ? filteredComplaintsByStatus[activeStatusFilter] || []
    : showNewComplaints
      ? newComplaints
      : showPendingComplaints
        ? newComplaints
      : showDeadlineComplaints
        ? nearDeadlineComplaints
        : []
  const hasVisibleComplaints = isStatusFilteredView
    ? visibleComplaints.length > 0
    : showHistoryComplaints
      ? historyComplaints.length > 0
      : visibleComplaints.length > 0
  const emptyMessageKey = isStatusFilteredView ? activeStatusFilter : activeTab
  const emptyMessage = emptyPanelMessages[emptyMessageKey] || emptyPanelMessages.total

  return (
    <div className="dashboard-page">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            H
          </span>
          <div>
            <div className="brand-title">HostelComplaint</div>
          </div>
        </div>
        <nav className="top-nav">
          <Link className="nav-button" to="/warden-dashboard">
            Dashboard
          </Link>
          <button
            type="button"
            className="nav-button"
            onClick={() => {
              setActiveTab("new")
              setActiveStatusFilter("")
            }}
          >
            New Complaints
          </button>
          <button
            type="button"
            className="nav-button"
            onClick={() => {
              setActiveTab("deadline")
              setActiveStatusFilter("")
            }}
          >
            Complaints Near Deadline
          </button>
          <button type="button" className="nav-button" onClick={handleProfileClick}>
            Profile
          </button>
        </nav>
        <div className="user-chip">
          <div
            className="avatar"
            onClick={handleProfileClick}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                handleProfileClick()
              }
            }}
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer" }}
          >
            {profile.name ? profile.name.slice(0, 1).toUpperCase() : "W"}
          </div>
          <div>
            <div className="user-name">{profile.name}</div>
            <div className="user-role">Warden</div>
          </div>
        </div>
      </header>

      <section className="welcome">
        <div className="welcome-row">
          <h1>Welcome, {profile.name}!</h1>
          {urgentComplaints.length > 0 && (
            <div className="welcome-urgent" role="alert" aria-live="assertive">
              {urgentComplaints.map((complaint, index) => {
                const complaintName = complaint.complaint_title || complaint.title || complaint.issue || "Untitled"
                const urgentLabel = getUrgentRemainingLabel(complaint)
                const isCritical = urgentLabel === "Last Day" || urgentLabel.includes("(Overdue)")
                return (
                  <button
                    key={complaint.id || complaint._id || `${complaintName}-${index}`}
                    type="button"
                    className="welcome-urgent-item"
                    onClick={() => openUrgentComplaintModal(complaint)}
                  >
                    {complaintName} -{" "}
                    <span className={isCritical ? "remaining-last-day" : ""}>
                      {urgentLabel}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          {movedPortalAlerts.length > 0 && (
            <div className="welcome-urgent" role="alert" aria-live="assertive">
              {movedPortalAlerts.map((complaint, index) => {
                const complaintName = complaint.complaint_title || complaint.title || complaint.issue || "Untitled"
                const currentLevel = String(complaint?.current_level || "").trim().toLowerCase()
                const movedPortalLabel =
                  currentLevel === "viceprincipal"
                    ? "Vice Principal"
                    : "Manager"
                return (
                  <button
                    key={`moved-${complaint.id || complaint._id || `${complaintName}-${index}`}`}
                    type="button"
                    className="welcome-urgent-item"
                    onClick={() => openUrgentComplaintModal(complaint)}
                  >
                    {complaintName} - This complaint was went to {movedPortalLabel} portal.
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {statusUpdateNotice && (
        <div className="status-banner success" role="status">
          {statusUpdateNotice}
        </div>
      )}

      <section className="stats-grid" aria-label="Complaint statistics">
        {statsConfig.map((stat) => (
          <button
            key={stat.label}
            type="button"
            className={`stat-card tone-${stat.tone}`}
            onClick={() => {
              setActiveStatusFilter(stat.key)
              setActiveTab("")
            }}
          >
            <div className="stat-value">{stats[stat.key]}</div>
            <div className="stat-label">{stat.label}</div>
          </button>
        ))}
      </section>

      <section className="panel" aria-label="Quick actions">
        <div className="panel-header">
          <h2>Quick Actions</h2>
        </div>
        <div
          className="quick-actions"
          style={{ display: "flex", gap: "15px", width: "100%", flexWrap: "nowrap" }}
        >
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="quick-action"
              style={{ flex: 1 }}
              onClick={() => {
                if (action.action === "escalate") {
                  handleEscalateAll()
                  return
                }
                if (action.action === "extend") {
                  handleExtendTimeLimit()
                  return
                }
                handleQuickAction(action.action)
              }}
            >
              <span className="quick-icon" aria-hidden="true">
                {action.icon}
              </span>
              {action.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel" aria-label="Complaint queue">
        <div className="panel-header">
          <h2>{panelTitle}</h2>
          <div className="tab-status">Showing {panelTitle}</div>
        </div>

        {loadError && (
          <div className="status-banner error" role="status">
            {loadError}
          </div>
        )}
        {isLoading ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              ...
            </div>
            <h3>Loading dashboard data</h3>
            <p>Please wait while we refresh the queue.</p>
          </div>
        ) : isStatusFilteredView || showNewComplaints || showPendingComplaints || showDeadlineComplaints ? (
          hasVisibleComplaints ? (
            <div className="table-wrap">
              <table className="complaints-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Student</th>
                    <th>Block / Floor / Room</th>
                    <th>Remaining Days</th>
                    <th>Submitted Date</th>
                    {showStatusColumn && <th>Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleComplaints.map((complaint) => (
                    <tr key={complaint.id}>
                      {(() => {
                        const remainingLabel = getComplaintRemainingLabel(complaint)
                        const isCritical = remainingLabel === "Last Day" || remainingLabel.includes("(Overdue)")
                        const isSolvedRemaining = remainingLabel === "Solved"

                        return (
                          <>
                      <td>{complaint.complaint_title || complaint.issue || "--"}</td>
                      <td>{complaint.student || "--"}</td>
                      <td>
                        {complaint.block || "--"}
                        {complaint.floor ? ` / ${complaint.floor}` : ""}
                        {complaint.room ? ` / ${complaint.room}` : ""}
                      </td>
                      <td>
                        <span className={isCritical ? "remaining-last-day" : isSolvedRemaining ? "remaining-solved" : ""}>
                          {remainingLabel}
                        </span>
                      </td>
                      <td>{formatDeadline(complaint.created_date)}</td>
                      {showStatusColumn && (
                        <td>
                          <span className={`table-status ${normalizeStatus(complaint.status)}`}>
                            {complaint.status || "--"}
                          </span>
                        </td>
                      )}
                          </>
                        )
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">
                []
              </div>
              <h3>{emptyMessage.title}</h3>
              <p>{emptyMessage.description}</p>
            </div>
          )
        ) : showHistoryComplaints ? (
          hasVisibleComplaints ? (
            <div className="history-list">
              {historyComplaints.map((complaint) => (
                <div
                  key={complaint.id || complaint._id}
                  className="history-card"
                  onClick={() => openHistoryModal(complaint)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      openHistoryModal(complaint)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <h4>
                    {complaint.title || complaint.complaint_title || complaint.issue || "Untitled Complaint"}
                  </h4>
                  <p>
                    <strong>Student:</strong> {complaint.studentName || complaint.student_name || complaint.student || "--"}
                  </p>
                  <p>
                    <strong>Submitted:</strong> {formatDeadline(complaint.submitted_date || complaint.created_date)}
                  </p>
                  <p>
                    <strong>Solved Date:</strong> {formatSolvedDate(getSolvedDateValue(complaint))}
                  </p>
                  <p>
                    <strong>Block:</strong> {complaint.block || "--"}
                  </p>
                  <p>
                    <strong>Floor:</strong> {complaint.floor || complaint.floor_no || "--"}
                  </p>
                  <p>
                    <strong>Room:</strong> {complaint.room_no || complaint.room || "--"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">
                []
              </div>
              <h3>{emptyMessage.title}</h3>
              <p>{emptyMessage.description}</p>
            </div>
          )
        ) : null}
      </section>

      <footer className="dashboard-footer">
        <span>(c) 2024 Hostel Complaint Management System</span>
        <span>Support: 044-1234 5678 | support@hostelcomplaint.edu</span>
      </footer>

      {isExtendOpen && (
        <div className="complaint-overlay" role="dialog" aria-modal="true">
          <div className="complaint-card extend-modal status-modal" onClick={(event) => event.stopPropagation()}>
            <div className="complaint-header">
              <div>
                <h2>Extend Time Limit</h2>
                <p>Update the deadline for a pending complaint.</p>
              </div>
              <button type="button" className="close-button" onClick={handleCloseExtendModal}>
                Close
              </button>
            </div>

            {extendError && (
              <div className="status-banner error" role="status">
                {extendError}
              </div>
            )}
            {extendSuccess && (
              <div className="status-banner success" role="status">
                {extendSuccess}
              </div>
            )}

            <div className="form-field">
              <label htmlFor="extendComplaint">Select Complaint</label>
              <select
                id="extendComplaint"
                value={selectedExtendId}
                onChange={(event) => {
                  setSelectedExtendId(event.target.value)
                  setExtendDaysOption("1 Day")
                  setExtendDaysOther("")
                  setSelectedExtendDetails(null)
                  setExtendError("")
                  setExtendSuccess("")
                }}
              >
                <option value="">Select a complaint</option>
                {extendableComplaints.map((complaint) => (
                  <option key={complaint.id} value={complaint.id}>
                    {complaint.complaint_title || complaint.issue || "Untitled"} - {formatDeadline(complaint.created_date)}
                  </option>
                ))}
              </select>
            </div>

            {selectedExtendComplaint && (
              <div className="form-grid">
                <div className="form-field">
                  <label>Complaint Title</label>
                  <input
                    type="text"
                    value={
                      selectedExtendComplaint.title ||
                      selectedExtendComplaint.complaint_title ||
                      selectedExtendComplaint.issue ||
                      ""
                    }
                    readOnly
                  />
                </div>
                <div className="form-field">
                  <label>Description</label>
                  <input type="text" value={selectedExtendComplaint.description || ""} readOnly />
                </div>
                <div className="form-field">
                  <label>Student Name</label>
                  <input
                    type="text"
                    value={
                      selectedExtendComplaint.studentName ||
                      selectedExtendComplaint.student ||
                      ""
                    }
                    readOnly
                  />
                </div>
                <div className="form-field">
                  <label>Block</label>
                  <input type="text" value={selectedExtendComplaint.block || ""} readOnly />
                </div>
                <div className="form-field">
                  <label>Floor</label>
                  <input type="text" value={selectedExtendComplaint.floor || ""} readOnly />
                </div>
                <div className="form-field">
                  <label>Room</label>
                  <input type="text" value={selectedExtendComplaint.room || ""} readOnly />
                </div>
                <div className="form-field">
                  <label>Submitted Date</label>
                  <input
                    type="text"
                    value={formatDeadline(selectedExtendComplaint.created_date)}
                    readOnly
                  />
                </div>
                <div className="form-field">
                  <label>Current Deadline Date</label>
                  <input
                    type="text"
                    value={formatDeadline(selectedExtendComplaint.deadline_date)}
                    readOnly
                  />
                </div>
                <div className="form-field">
                  <label>Current Status</label>
                  <input
                    type="text"
                    value={selectedExtendComplaint.status || ""}
                    className={getSolvedStatusClassName(selectedExtendComplaint.status)}
                    readOnly
                  />
                </div>
              </div>
            )}

            {isExtendLoading && (
              <div className="status-banner" role="status">
                Loading complaint details...
              </div>
            )}

            <div className="form-field">
              <label htmlFor="extendDays">Extend Time Limit By</label>
              <select
                id="extendDays"
                value={extendDaysOption}
                onChange={(event) => {
                  setExtendDaysOption(event.target.value)
                  setExtendDaysOther("")
                  setExtendError("")
                  setExtendSuccess("")
                }}
                disabled={!selectedExtendComplaint || isExtendLoading}
              >
                {extendDayOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {extendDaysOption === "Other" && (
                <div className="inline-input time-limit-input">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    step="1"
                    inputMode="numeric"
                    placeholder="Enter Number of Days"
                    value={extendDaysOther}
                    onChange={(event) => {
                      setExtendDaysOther(event.target.value)
                      setExtendError("")
                      setExtendSuccess("")
                    }}
                    disabled={!selectedExtendComplaint || isExtendLoading}
                    required
                  />
                </div>
              )}
              {extendValidationMessage && <span className="error-text">{extendValidationMessage}</span>}
            </div>

            <div
              className="modal-footer"
              style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}
            >
              <button type="button" className="ghost-button" onClick={handleCloseExtendModal}>
                Cancel
              </button>
              <button
                type="button"
                className="submit-button"
                onClick={handleUpdateTimeLimit}
                disabled={!canUpdateDeadline}
              >
                {isExtendSaving ? "Updating..." : "Update Time Limit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isStatusOpen && (
        <div className="complaint-overlay" role="dialog" aria-modal="true">
          <div className="complaint-card extend-modal status-modal" onClick={(event) => event.stopPropagation()}>
            <div className="complaint-header">
              <div>
                <h2>Update Complaint Status</h2>
                <p>Review assigned complaints and update their status.</p>
              </div>
              <button type="button" className="close-button" onClick={handleCloseStatusModal}>
                Close
              </button>
            </div>

            <div className="modal-body">

            {statusError && (
              <div className="status-banner error" role="status">
                {statusError}
              </div>
            )}

            <div className="form-field">
              <label htmlFor="statusComplaint">Select Complaint</label>
              <select
                id="statusComplaint"
                value={selectedStatusId}
                onChange={(event) => {
                  setSelectedStatusId(event.target.value)
                  setSelectedStatusDetails(null)
                  setStatusError("")
                }}
              >
                <option value="">Select a complaint</option>
                {statusComplaints.map((complaint) => (
                  <option key={complaint.id} value={complaint.id}>
                    {complaint.complaint_title || "Untitled"} - {formatDeadline(complaint.created_date)}
                  </option>
                ))}
              </select>
            </div>

            {isStatusListLoading && (
              <div className="status-banner" role="status">
                Loading complaints...
              </div>
            )}

            {selectedStatusComplaint && (
              <div className="form-grid">
                <div className="form-field">
                  <label>Complaint Title</label>
                  <input type="text" value={selectedStatusComplaint.complaint_title || ""} readOnly />
                </div>
                <div className="form-field">
                  <label>Description</label>
                  <input type="text" value={selectedStatusComplaint.description || ""} readOnly />
                </div>
                <div className="form-field">
                  <label>Block</label>
                  <input type="text" value={selectedStatusComplaint.block || ""} readOnly />
                </div>
                <div className="form-field">
                  <label>Room Number</label>
                  <input type="text" value={selectedStatusComplaint.room || ""} readOnly />
                </div>
                <div className="form-field">
                  <label>Current Status</label>
                  <input
                    type="text"
                    value={selectedStatusComplaint.status || ""}
                    className={getSolvedStatusClassName(selectedStatusComplaint.status)}
                    readOnly
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="statusValue">Status</label>
                  <select
                    id="statusValue"
                    value={statusUpdateValue}
                    onChange={(event) => {
                      setStatusUpdateValue(event.target.value)
                      setStatusError("")
                    }}
                    disabled={isStatusDetailsLoading || isStatusSaving}
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedStatusComplaint?.image_path && (
                  <div className="form-field">
                    <label>Complaint Image</label>
                    <button type="button" className="ghost-button" onClick={handleOpenStatusImage}>
                      View Image
                    </button>
                  </div>
                )}
              </div>
            )}

            {isStatusDetailsLoading && (
              <div className="status-banner" role="status">
                Loading complaint details...
              </div>
            )}

            <div
              className="modal-footer"
              style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}
            >
              <button type="button" className="ghost-button" onClick={handleCloseStatusModal}>
                Cancel
              </button>
              <button
                type="button"
                className="submit-button"
                onClick={handleUpdateComplaintStatus}
                disabled={!selectedStatusId || isStatusSaving || isStatusDetailsLoading}
              >
                {isStatusSaving ? "Updating..." : "Update"}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {isStatusImageOpen && selectedStatusComplaint?.image_path && (
        <div className="preview-overlay" role="dialog" aria-modal="true">
          <div className="preview-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="preview-close" onClick={handleCloseStatusImage}>
              Close
            </button>
            <img
              src={
                String(selectedStatusComplaint.image_path).startsWith("http")
                  ? selectedStatusComplaint.image_path
                  : `http://localhost:5000${selectedStatusComplaint.image_path}`
              }
              alt={selectedStatusComplaint.complaint_title || "Complaint"}
            />
          </div>
        </div>
      )}

      {isHistoryOpen && selectedHistoryComplaint && (
        <div className="complaint-overlay" role="dialog" aria-modal="true" onClick={closeHistoryModal}>
          <div className="complaint-card extend-modal status-modal" onClick={(event) => event.stopPropagation()}>
            <div className="complaint-header">
              <div>
                <h2>Complaint History Details</h2>
                <p>Solved complaint summary and full details.</p>
              </div>
              <button type="button" className="close-button" onClick={closeHistoryModal}>
                Close
              </button>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>Complaint Name</label>
                <input
                  type="text"
                  value={
                    selectedHistoryComplaint.title ||
                    selectedHistoryComplaint.complaint_title ||
                    selectedHistoryComplaint.issue ||
                    ""
                  }
                  readOnly
                />
              </div>
              <div className="form-field">
                <label>Student Name</label>
                <input
                  type="text"
                  value={
                    selectedHistoryComplaint.studentName ||
                    selectedHistoryComplaint.student_name ||
                    selectedHistoryComplaint.student ||
                    ""
                  }
                  readOnly
                />
              </div>
              <div className="form-field">
                <label>Submitted Date</label>
                <input
                  type="text"
                  value={formatDeadline(
                    selectedHistoryComplaint.submitted_date || selectedHistoryComplaint.created_date
                  )}
                  readOnly
                />
              </div>
              <div className="form-field">
                <label>Block Name</label>
                <input type="text" value={selectedHistoryComplaint.block || ""} readOnly />
              </div>
              <div className="form-field">
                <label>Floor No</label>
                <input
                  type="text"
                  value={selectedHistoryComplaint.floor || selectedHistoryComplaint.floor_no || ""}
                  readOnly
                />
              </div>
              <div className="form-field">
                <label>Room No</label>
                <input
                  type="text"
                  value={selectedHistoryComplaint.room_no || selectedHistoryComplaint.room || ""}
                  readOnly
                />
              </div>
              <div className="form-field">
                <label>Status</label>
                <input
                  type="text"
                  value={selectedHistoryComplaint.status || ""}
                  className={getSolvedStatusClassName(selectedHistoryComplaint.status)}
                  readOnly
                />
              </div>
              <div className="form-field">
                <label>Solved Date</label>
                <input
                  type="text"
                  value={formatSolvedDate(getSolvedDateValue(selectedHistoryComplaint))}
                  readOnly
                />
              </div>
              {(selectedHistoryComplaint.image || selectedHistoryComplaint.image_path) && (
                <div className="form-field">
                  <label>Image</label>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() =>
                      handleViewHistoryImage(
                        selectedHistoryComplaint.image || selectedHistoryComplaint.image_path
                      )
                    }
                  >
                    View Image
                  </button>
                </div>
              )}
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>Description</label>
                <input type="text" value={selectedHistoryComplaint.description || ""} readOnly />
              </div>
            </div>
          </div>
        </div>
      )}

      {isHistoryImageOpen && selectedHistoryImage && (
        <div className="preview-overlay" role="dialog" aria-modal="true">
          <div className="preview-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="preview-close" onClick={handleCloseHistoryImage}>
              Close
            </button>
            <img
              src={
                String(selectedHistoryImage || "").startsWith("data:")
                  ? selectedHistoryImage
                  : String(selectedHistoryImage || "").startsWith("http://") ||
                      String(selectedHistoryImage || "").startsWith("https://")
                    ? selectedHistoryImage
                    : String(selectedHistoryImage || "").startsWith("/")
                      ? `http://localhost:5000${selectedHistoryImage}`
                      : `data:image/jpeg;base64,${selectedHistoryImage}`
              }
              alt={selectedHistoryComplaint?.complaint_title || "Complaint"}
            />
          </div>
        </div>
      )}

      {isUrgentModalOpen && selectedUrgentComplaint && (
        <div className="complaint-overlay" role="dialog" aria-modal="true" onClick={closeUrgentComplaintModal}>
          <div className="complaint-card extend-modal status-modal" onClick={(event) => event.stopPropagation()}>
            <div className="complaint-header">
              <div>
                <h2>Urgent Complaint Details</h2>
                <p>Complaint is near deadline and needs immediate attention.</p>
              </div>
              <button type="button" className="close-button" onClick={closeUrgentComplaintModal}>
                Close
              </button>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>Complaint Name</label>
                <input
                  type="text"
                  value={
                    selectedUrgentComplaint.complaint_title ||
                    selectedUrgentComplaint.title ||
                    selectedUrgentComplaint.issue ||
                    ""
                  }
                  readOnly
                />
              </div>
              <div className="form-field">
                <label>Remaining Time</label>
                {(() => {
                  const urgentLabel = getUrgentRemainingLabel(selectedUrgentComplaint)
                  const isCritical = urgentLabel === "Last Day" || urgentLabel.includes("(Overdue)")

                  return (
                    <input
                      type="text"
                      value={urgentLabel}
                      className={isCritical ? "last-day-input" : ""}
                      readOnly
                    />
                  )
                })()}
              </div>
              <div className="form-field">
                <label>Student Name</label>
                <input
                  type="text"
                  value={
                    selectedUrgentComplaint.studentName ||
                    selectedUrgentComplaint.student_name ||
                    selectedUrgentComplaint.student ||
                    ""
                  }
                  readOnly
                />
              </div>
              <div className="form-field">
                <label>Status</label>
                <input
                  type="text"
                  value={selectedUrgentComplaint.status || ""}
                  className={getSolvedStatusClassName(selectedUrgentComplaint.status)}
                  readOnly
                />
              </div>
              <div className="form-field">
                <label>Submitted Date</label>
                <input
                  type="text"
                  value={formatDeadline(selectedUrgentComplaint.submitted_date || selectedUrgentComplaint.created_date)}
                  readOnly
                />
              </div>
              <div className="form-field">
                <label>Deadline Date</label>
                <input type="text" value={formatDeadline(selectedUrgentComplaint.deadline_date)} readOnly />
              </div>
              <div className="form-field">
                <label>Block</label>
                <input type="text" value={selectedUrgentComplaint.block || ""} readOnly />
              </div>
              <div className="form-field">
                <label>Floor / Room</label>
                <input
                  type="text"
                  value={`${selectedUrgentComplaint.floor || selectedUrgentComplaint.floor_no || "--"} / ${selectedUrgentComplaint.room || selectedUrgentComplaint.room_no || "--"}`}
                  readOnly
                />
              </div>
              {(selectedUrgentComplaint.image || selectedUrgentComplaint.image_path) && (
                <div className="form-field">
                  <label>Image</label>
                  <button type="button" className="ghost-button" onClick={handleOpenUrgentImage}>
                    View Image
                  </button>
                </div>
              )}
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>Description</label>
                <input type="text" value={selectedUrgentComplaint.description || ""} readOnly />
              </div>
            </div>
          </div>
        </div>
      )}

      {isUrgentImageOpen && selectedUrgentComplaint && (
        <div className="preview-overlay" role="dialog" aria-modal="true" onClick={handleCloseUrgentImage}>
          <div className="preview-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="preview-close" onClick={handleCloseUrgentImage}>
              Close
            </button>
            <img
              src={getImageSource(selectedUrgentComplaint.image_path || selectedUrgentComplaint.image)}
              alt={selectedUrgentComplaint.complaint_title || "Complaint"}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default WardenDashboard
