import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { getNextPortalLabel, getPortalLabel } from "../utils/complaintPortalStatus.js"

const quickActions = [
  { id: "submit", label: "Submit Complaint", icon: "+" },
  { id: "track", label: "Track Complaints", icon: "Q" },
  { id: "history", label: "View History", icon: "H" },
  { id: "escalate", label: "Escalate All", icon: "E" },
]

const blockOptions = ["A Block", "B Block", "C Block", "D Block"]
const floorOptions = ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "Other"]
const baseRoomOptions = ["101", "102", "103", "104", "105", "Bathroom", "Toilet", "Other"]
const departmentOptions = [
  "Plumbing",
  "Electrition",
  "Cleaning",
  "Food",
  "Others",
]

const plumbingComplaintTypeOptions = [
  "Water is not coming",
  "Any repair complaint",
]

const electritionComplaintTypeOptions = [
  "Current cut",
  "Any repair complaint",
]

const getTimeLimitInfo = (department, complaintType) => {
  if (!department) {
    return { days: null, label: "Select Department First" }
  }
  if (department === "Plumbing") {
    if (complaintType === "Water is not coming") return { days: 1, label: "1 Day" }
    if (complaintType === "Any repair complaint") return { days: 4, label: "4 Days" }
    return { days: null, label: "Select Complaint Type First" }
  }
  if (department === "Electrition") {
    if (complaintType === "Current cut") return { days: 1, label: "1 Day" }
    if (complaintType === "Any repair complaint") return { days: 2, label: "2 Days" }
    return { days: null, label: "Select Complaint Type First" }
  }
  if (department === "Cleaning") {
    return { days: 2, label: "2 Days" }
  }
  if (department === "Food") {
    return { days: 1, label: "1 Day" }
  }
  if (department === "Others") {
    return { days: 4, label: "4 Days" }
  }
  return { days: null, label: "Select Department First" }
}

const extendDayOptions = ["1 Day", "2 Days", "3 Days", "4 Days", "Other"]

const complaintPanelTitles = {
  "My Complaints": "My Complaints",
  Total: "Total Complaints",
  Pending: "Pending Complaints",
  "In Progress": "In Progress Complaints",
  Resolved: "Resolved Complaints",
  History: "Complaint History",
}

const buildRoomOptions = (roomNumber) => {
  const defaultRoom = roomNumber?.toString().trim()
  const roomList = [defaultRoom, ...baseRoomOptions].filter(Boolean)
  return [...new Set(roomList)]
}

const getDefaultFormData = (profile) => {
  const resolvedBlock = blockOptions.includes(profile.block) ? profile.block : "A Block"
  return {
    blockName: resolvedBlock,
    floorNumber: profile.floorNumber || "",
    floorOther: "",
    roomNumber: profile.roomNumber || "",
    roomOther: "",
    department: "",
    complaintType: "",
    complaintTitle: "",
    complaintDescription: "",
    imageFile: null,
  }
}

function StudentDashboard() {
  const navigate = useNavigate()
  const handleProfileClick = () => {
    navigate("/student/profile")
  }
  const [profile, setProfile] = useState({ name: "", block: "", roomNumber: "", floorNumber: "" })
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 })
  const [complaints, setComplaints] = useState([])
  const [activeComplaintView, setActiveComplaintView] = useState(null)
  const [isComplaintsLoading, setIsComplaintsLoading] = useState(false)
  const [complaintsError, setComplaintsError] = useState("")
  const [today, setToday] = useState(() => new Date())
  const [submissionMessage, setSubmissionMessage] = useState("")
  const [isComplaintOpen, setIsComplaintOpen] = useState(false)
  const [isTrackOpen, setIsTrackOpen] = useState(false)
  const [selectedTrackId, setSelectedTrackId] = useState("")
  const [selectedTrackDetails, setSelectedTrackDetails] = useState(null)
  const [isTrackLoading, setIsTrackLoading] = useState(false)
  const [trackError, setTrackError] = useState("")
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [selectedHistoryComplaint, setSelectedHistoryComplaint] = useState(null)
  const [isExtendOpen, setIsExtendOpen] = useState(false)
  const [selectedExtendId, setSelectedExtendId] = useState("")
  const [extendDaysOption, setExtendDaysOption] = useState("1 Day")
  const [extendDaysOther, setExtendDaysOther] = useState("")
  const [selectedExtendDetails, setSelectedExtendDetails] = useState(null)
  const [isExtendLoading, setIsExtendLoading] = useState(false)
  const [extendError, setExtendError] = useState("")
  const [extendSuccess, setExtendSuccess] = useState("")
  const [isExtendSaving, setIsExtendSaving] = useState(false)
  const [formData, setFormData] = useState(() => getDefaultFormData({ block: "", roomNumber: "" }))
  const [formErrors, setFormErrors] = useState({})
  const [imagePreviewUrl, setImagePreviewUrl] = useState("")
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false)
  const calculatedTimeLimit = getTimeLimitInfo(formData.department, formData.complaintType)

  useEffect(() => {
    const rawUser = localStorage.getItem("user") || localStorage.getItem("currentUser")
    if (!rawUser) {
      localStorage.removeItem("authToken")
      localStorage.removeItem("authRole")
      navigate("/", { replace: true })
      return
    }
    try {
      const user = JSON.parse(rawUser)
      setProfile({
        name: user?.name || "",
        block: user?.block || "",
        roomNumber: user?.roomNumber || "",
        floorNumber: user?.floorNumber || "",
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
            name: user?.name || "",
            block: user?.block || "",
            roomNumber: user?.roomNumber || "",
            floorNumber: user?.floorNumber || "",
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
    if (!isComplaintOpen) {
      setFormData(getDefaultFormData(profile))
    }
  }, [profile, isComplaintOpen])

  useEffect(() => {
    if (isComplaintOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isComplaintOpen])

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [imagePreviewUrl])

  const handleExtendTimeLimit = () => {
    setExtendError("")
    setExtendSuccess("")
    setSelectedExtendId("")
    setExtendDaysOption("1 Day")
    setExtendDaysOther("")
    setSelectedExtendDetails(null)
    setIsExtendOpen(true)
    fetchComplaints()
  }

  const getStatusCounts = useCallback((items) => {
    return items.reduce(
      (acc, complaint) => {
        const status = String(complaint?.status || "").trim().toLowerCase()
        if (status === "pending") {
          acc.pending += 1
          acc.total += 1
        } else if (status === "resolved" || status === "solved") {
          acc.resolved += 1
        } else if (status === "in progress" || status === "in_progress" || status === "inprogress") {
          acc.inProgress += 1
          acc.total += 1
        } else {
          acc.total += 1
        }
        return acc
      },
      { total: 0, pending: 0, inProgress: 0, resolved: 0 }
    )
  }, [])

  const fetchComplaints = useCallback(async (options = {}) => {
    const { silent = false } = options
    const authToken = localStorage.getItem("authToken")
    if (!authToken) {
      setComplaintsError("Missing auth token. Please log in again.")
      return
    }

    if (!silent) {
      setIsComplaintsLoading(true)
    }
    setComplaintsError("")
    try {
      const response = await fetch("http://localhost:5000/complaints", {
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
      setComplaints(items)
      setStats(getStatusCounts(items))
    } catch (error) {
      console.error(error?.response?.data || error?.message || error)
      setComplaintsError("Unable to load complaints right now.")
    } finally {
      if (!silent) {
        setIsComplaintsLoading(false)
      }
    }
  }, [getStatusCounts])

  useEffect(() => {
    fetchComplaints()
    const intervalId = setInterval(() => {
      fetchComplaints({ silent: true })
    }, 5000)

    return () => {
      clearInterval(intervalId)
    }
  }, [fetchComplaints])

  const handleOpenComplaint = () => {
    setFormErrors({})
    setImagePreviewUrl("")
    setIsImagePreviewOpen(false)
    setFormData(getDefaultFormData(profile))
    setIsComplaintOpen(true)
  }

  const handleCloseComplaint = () => {
    setIsComplaintOpen(false)
    setIsImagePreviewOpen(false)
  }

  const handleOpenComplaintList = (view) => {
    setActiveComplaintView(view)
    if (complaints.length === 0) {
      fetchComplaints()
    }
  }

  const handleOpenMyComplaints = () => {
    setActiveComplaintView("My Complaints")
    setIsHistoryOpen(false)
    setSelectedHistoryComplaint(null)
    fetchComplaints()
  }

  const handleOpenTrackComplaints = () => {
    setTrackError("")
    setSelectedTrackId("")
    setSelectedTrackDetails(null)
    setShowImageModal(false)
    setSelectedImage(null)
    setIsTrackOpen(true)
    fetchComplaints()
  }

  const handleOpenHistoryList = () => {
    setActiveComplaintView("History")
    setIsHistoryOpen(false)
    setSelectedHistoryComplaint(null)
    fetchComplaints()
  }

  const handleCloseTrackComplaints = () => {
    setIsTrackOpen(false)
    setTrackError("")
    setSelectedTrackId("")
    setSelectedTrackDetails(null)
    setIsTrackLoading(false)
    setShowImageModal(false)
    setSelectedImage(null)
  }

  const handleViewImage = (imageValue) => {
    if (!imageValue) {
      alert("No image uploaded.")
      return
    }
    setSelectedImage(imageValue)
    setShowImageModal(true)
  }

  const handleOpenTrackImage = () => {
    const complaintImage =
      selectedTrackComplaint?.image ||
      selectedTrackComplaint?.imageUrl ||
      selectedTrackComplaint?.image_url ||
      selectedTrackComplaint?.image_path ||
      null
    handleViewImage(complaintImage)
  }

  const handleCloseTrackImage = () => {
    setShowImageModal(false)
  }

  const openHistoryModal = (complaint) => {
    setSelectedHistoryComplaint(complaint)
    setIsHistoryOpen(true)
  }

  const closeHistoryModal = () => {
    setIsHistoryOpen(false)
    setSelectedHistoryComplaint(null)
  }

  const handleCloseComplaintList = () => {
    setActiveComplaintView(null)
  }

  const handleFormChange = (field) => (event) => {
    const { value } = event.target
    setFormData((prev) => {
      if (field === "department") {
        return { ...prev, department: value, complaintType: "" }
      }
      if (field === "floorNumber" && value !== "Other") {
        return { ...prev, floorNumber: value, floorOther: "" }
      }
      if (field === "roomNumber" && value !== "Other") {
        return { ...prev, roomNumber: value, roomOther: "" }
      }
      return { ...prev, [field]: value }
    })
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }))
    }
    if (field === "department") {
      setFormErrors((prev) => ({ ...prev, department: "", complaintType: "" }))
    }
  }

  const handleImageChange = (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) {
      setFormData((prev) => ({ ...prev, imageFile: null }))
      setImagePreviewUrl("")
      setIsImagePreviewOpen(false)
      return
    }

    const validTypes = ["image/jpeg", "image/png", "image/jpg"]
    if (!validTypes.includes(file.type)) {
      setFormErrors((prev) => ({ ...prev, imageFile: "Please upload a JPG or PNG image." }))
      return
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }

    setFormErrors((prev) => ({ ...prev, imageFile: "" }))
    setFormData((prev) => ({ ...prev, imageFile: file }))
    setImagePreviewUrl(URL.createObjectURL(file))
    setIsImagePreviewOpen(false)
  }

  const handleOpenImagePreview = () => {
    if (imagePreviewUrl) {
      setIsImagePreviewOpen(true)
    }
  }

  const handleCloseImagePreview = () => {
    setIsImagePreviewOpen(false)
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.floorNumber) {
      errors.floorNumber = "Floor number is required."
    }

    if (formData.floorNumber === "Other" && !formData.floorOther.trim()) {
      errors.floorOther = "Please enter the floor number."
    }

    if (!formData.department) {
      errors.department = "Department is required."
    } else if (
      (formData.department === "Plumbing" || formData.department === "Electrition") &&
      !formData.complaintType
    ) {
      errors.complaintType = `${formData.department} complaint type is required.`
    }

    if (!formData.complaintTitle.trim()) {
      errors.complaintTitle = "Complaint title is required."
    }

    if (!formData.complaintDescription.trim()) {
      errors.complaintDescription = "Complaint description is required."
    }

    if (!formData.imageFile) {
      errors.imageFile = "Please upload an image."
    }

    if (formData.roomNumber === "Other" && !formData.roomOther.trim()) {
      errors.roomOther = "Please enter the room details."
    }

    return errors
  }

  const handleSubmitComplaint = async (event) => {
    event.preventDefault()
    const errors = validateForm()
    setFormErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    const timeLimitInfo = getTimeLimitInfo(formData.department, formData.complaintType)
    if (!timeLimitInfo.days) {
      return
    }

    const payload = {
      block: formData.blockName,
      floor: formData.floorNumber === "Other" ? formData.floorOther : formData.floorNumber,
      room: formData.roomNumber === "Other" ? formData.roomOther : formData.roomNumber,
      department: formData.department,
      ...(formData.complaintType ? { complaintType: formData.complaintType } : {}),
      timeLimit: timeLimitInfo.days,
      time_limit_days: timeLimitInfo.days,
      complaint_title: formData.complaintTitle.trim(),
      description: formData.complaintDescription.trim(),
    }

    const authToken = localStorage.getItem("authToken")
    if (!authToken) {
      console.error("Missing auth token. Please log in again.")
      return
    }

    try {
      const formPayload = new FormData()
      Object.entries(payload).forEach(([key, value]) => {
        formPayload.append(key, String(value ?? ""))
      })
      formPayload.append("image", formData.imageFile)

      const response = await fetch("http://localhost:5000/complaints", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formPayload,
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        console.error(errorPayload || response.statusText)
        return
      }

      console.log("Complaint submitted", payload)
      setSubmissionMessage("Complaint submitted successfully and sent to Warden.")
      await fetchComplaints()
      setIsComplaintOpen(false)
    } catch (error) {
      console.error(error?.response?.data || error?.message || error)
    }
  }

  const activeComplaints = useMemo(() => {
    if (activeComplaintView === "My Complaints") {
      return [...complaints].sort((a, b) => {
        const dateA = new Date(a.created_date || a.submitted_date || 0).getTime()
        const dateB = new Date(b.created_date || b.submitted_date || 0).getTime()
        return dateB - dateA
      })
    }
    if (activeComplaintView === "Total") {
      return complaints.filter((complaint) => String(complaint?.status || "").trim().toLowerCase() !== "solved")
    }
    if (activeComplaintView === "Pending") {
      return complaints.filter((complaint) => String(complaint?.status || "").trim() === "Pending")
    }
    if (activeComplaintView === "In Progress") {
      return complaints.filter((complaint) => String(complaint?.status || "").trim() === "In Progress")
    }
    if (activeComplaintView === "Resolved") {
      return complaints.filter(
        (complaint) => String(complaint?.status || "").trim().toLowerCase() === "solved"
      )
    }
    if (activeComplaintView === "History") {
      return complaints
        .filter((complaint) => String(complaint?.status || "").trim().toLowerCase() === "solved")
        .sort((a, b) => {
          const dateA = new Date(getSolvedDateValue(a) || 0).getTime()
          const dateB = new Date(getSolvedDateValue(b) || 0).getTime()
          return dateB - dateA
        })
    }
    return []
  }, [activeComplaintView, complaints])

  const selectedTrackComplaint = useMemo(() => {
    if (!selectedTrackId) {
      return null
    }

    return (
      selectedTrackDetails ||
      complaints.find((complaint) => String(complaint.id || complaint._id) === String(selectedTrackId)) ||
      null
    )
  }, [complaints, selectedTrackDetails, selectedTrackId])

  const complaintPanelTitle = activeComplaintView
    ? complaintPanelTitles[activeComplaintView] || "Recent Complaints"
    : "Recent Complaints"

  useEffect(() => {
    if (!isTrackOpen || !selectedTrackId) {
      setSelectedTrackDetails(null)
      return
    }

    const authToken = localStorage.getItem("authToken")
    if (!authToken) {
      setTrackError("Missing auth token. Please log in again.")
      return
    }

    let isActive = true
    setIsTrackLoading(true)
    setTrackError("")

    fetch(`http://localhost:5000/api/complaints/${selectedTrackId}`, {
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
        const baseComplaint = complaints.find(
          (complaint) => String(complaint.id || complaint._id) === String(selectedTrackId)
        )
        setSelectedTrackDetails({
          ...(baseComplaint || {}),
          ...(data.complaint || {}),
          id: String((data.complaint && data.complaint.id) || selectedTrackId),
        })
      })
      .catch((error) => {
        if (!isActive) {
          return
        }
        const baseComplaint = complaints.find(
          (complaint) => String(complaint.id || complaint._id) === String(selectedTrackId)
        )
        if (baseComplaint) {
          setSelectedTrackDetails(baseComplaint)
        } else {
          setTrackError("Unable to load complaint details.")
        }
        console.error(error?.response?.data || error?.message || error)
      })
      .finally(() => {
        if (!isActive) {
          return
        }
        setIsTrackLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [isTrackOpen, selectedTrackId])

  const formatSubmittedDate = (dateValue) => {
    if (!dateValue) {
      return "--"
    }
    const parsedDate = new Date(dateValue)
    if (Number.isNaN(parsedDate.getTime())) {
      return "--"
    }
    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatSolvedDate = (dateValue) => {
    if (!dateValue) {
      return "Not Solved"
    }
    const parsedDate = new Date(dateValue)
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

  const getRemainingDays = (complaint) => {
    if (!complaint) {
      return null
    }

    const msPerDay = 1000 * 60 * 60 * 24
    const currentUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    const currentLevel = String(complaint?.current_level || "").trim().toLowerCase()
    const timeLimitValue = Number(complaint?.time_limit_days)
    const timeLimitDays = Number.isFinite(timeLimitValue) && timeLimitValue > 0 ? timeLimitValue : null

    const calculateEscalationRemainingDays = (escalatedAtValue) => {
      if (!timeLimitDays || !escalatedAtValue) {
        return null
      }
      const escalatedAt = new Date(escalatedAtValue)
      if (Number.isNaN(escalatedAt.getTime())) {
        return null
      }

      const escalationUtc = Date.UTC(
        escalatedAt.getUTCFullYear(),
        escalatedAt.getUTCMonth(),
        escalatedAt.getUTCDate()
      )
      const deadlineUtc = escalationUtc + timeLimitDays * msPerDay
      return Math.round((deadlineUtc - currentUtc) / msPerDay)
    }

    if (currentLevel === "manager") {
      const managerDays = calculateEscalationRemainingDays(complaint?.escalated_to_manager_at)
      if (managerDays !== null) {
        return managerDays
      }
    }

    if (currentLevel === "viceprincipal") {
      const vicePrincipalDays = calculateEscalationRemainingDays(complaint?.escalated_to_viceprincipal_at)
      if (vicePrincipalDays !== null) {
        return vicePrincipalDays
      }
    }

    const parsedDeadline = new Date(complaint?.deadline_date)
    if (Number.isNaN(parsedDeadline.getTime())) {
      return null
    }
    const deadlineUtc = Date.UTC(
      parsedDeadline.getUTCFullYear(),
      parsedDeadline.getUTCMonth(),
      parsedDeadline.getUTCDate()
    )
    return Math.round((deadlineUtc - currentUtc) / msPerDay)
  }

  const extendableComplaints = useMemo(() => {
    return complaints.filter(
      (complaint) => String(complaint?.status || "").trim().toLowerCase() === "pending"
    )
  }, [complaints])

  const selectedExtendComplaint = useMemo(() => {
    if (!selectedExtendId) {
      return null
    }
    return (
      selectedExtendDetails ||
      extendableComplaints.find((complaint) => complaint.id === selectedExtendId) ||
      null
    )
  }, [extendableComplaints, selectedExtendDetails, selectedExtendId])

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

  const extendValidationMessage = useMemo(() => {
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
  }, [extendDaysOption, extendDaysOther, selectedExtendComplaint])

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
      await fetchComplaints()
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

  const getOverduePortalMessage = (complaint, remainingDays) => {
    const currentPortal = getPortalLabel(complaint?.current_level || "Warden")
    const nextPortal = getNextPortalLabel(complaint?.current_level || "Warden")
    const overdueDays = Math.abs(remainingDays)
    if (nextPortal === "Final Review") {
      return `${currentPortal.replace(" Portal", "")} - ${overdueDays} Day${overdueDays === 1 ? "" : "s"} Overdue`
    }
    return `Now in ${currentPortal} -> ${nextPortal} in ${overdueDays} Day${overdueDays === 1 ? "" : "s"} (Overdue)`
  }

  const getComplaintRemainingLabel = (complaint) => {
    const status = String(complaint?.status || "").trim().toLowerCase()
    if (status === "solved" || status === "resolved") {
      return "Solved"
    }

    const remainingDays = getRemainingDays(complaint)
    if (remainingDays === null) {
      return "--"
    }
    if (remainingDays > 0) {
      const currentLevel = String(complaint?.current_level || "").trim().toLowerCase()
      if (currentLevel && currentLevel !== "warden") {
        const portalName = getPortalLabel(complaint?.current_level).replace(" Portal", "")
        return `${portalName} - ${remainingDays} Day${remainingDays === 1 ? "" : "s"}`
      }
      return `${remainingDays} Day${remainingDays === 1 ? "" : "s"} Remaining`
    }
    if (remainingDays === 0) {
      return "Last Day"
    }
    return getOverduePortalMessage(complaint, remainingDays)
  }

  const getSolvedStatusClassName = (statusValue) => {
    const status = String(statusValue || "").trim().toLowerCase()
    return status === "solved" || status === "resolved" ? "solved-status-input" : ""
  }

  const getSolvedStatusTextClassName = (statusValue) => {
    const status = String(statusValue || "").trim().toLowerCase()
    return status === "solved" || status === "resolved" ? "solved-status-text" : ""
  }

  const getTrackRemainingDaysLabel = (complaint) => {
    return getComplaintRemainingLabel(complaint)
  }

  const roomOptions = buildRoomOptions(profile.roomNumber)

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
          <Link className="nav-button" to="/student-dashboard">Dashboard</Link>
          <button type="button" className="nav-button" onClick={handleOpenMyComplaints}>
            My Complaints
          </button>
          <button type="button" className="nav-button" onClick={handleExtendTimeLimit}>
            Extend Time Limit
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
          Block: {profile.block} | Floor: {profile.floorNumber} | Room: {profile.roomNumber}
        </p>
      </section>

      {submissionMessage && (
        <div className="status-banner success" role="status">
          {submissionMessage}
        </div>
      )}

      <section className="stats-grid" aria-label="Complaint statistics">
        {[
          { label: "Total Complaints", value: stats.total, tone: "primary", view: "Total" },
          { label: "Pending Complaints", value: stats.pending, tone: "warning", view: "Pending" },
          { label: "In Progress", value: stats.inProgress, tone: "secondary", view: "In Progress" },
          { label: "Resolved", value: stats.resolved, tone: "success", view: "Resolved" },
        ].map((stat) =>
          stat.view ? (
            <button
              key={stat.label}
              type="button"
              className={`stat-card tone-${stat.tone}`}
              onClick={() => handleOpenComplaintList(stat.view)}
            >
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </button>
          ) : (
            <article key={stat.label} className={`stat-card tone-${stat.tone}`}>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </article>
          )
        )}
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
              onClick={
                action.id === "submit"
                  ? handleOpenComplaint
                  : action.id === "track"
                    ? handleOpenTrackComplaints
                    : action.id === "history"
                      ? handleOpenHistoryList
                    : undefined
              }
            >
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
          <h2>{complaintPanelTitle}</h2>
          {activeComplaintView ? (
            <button type="button" className="ghost-button" onClick={handleCloseComplaintList}>
              Close
            </button>
          ) : (
            <button
              type="button"
              className="ghost-button"
              onClick={() => handleOpenComplaintList("Total")}
            >
              View All
            </button>
          )}
        </div>
        {activeComplaintView ? (
          <>
            {complaintsError && <div className="status-banner error">{complaintsError}</div>}
            {isComplaintsLoading ? (
              <div className="empty-state">
                <h3>Loading complaints...</h3>
              </div>
            ) : activeComplaintView === "History" || activeComplaintView === "My Complaints" ? (
              activeComplaints.length > 0 ? (
                <div className="history-list">
                  {activeComplaints.map((complaint) => (
                    <div
                      key={complaint.id}
                      className="history-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => openHistoryModal(complaint)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          openHistoryModal(complaint)
                        }
                      }}
                    >
                      <h4>{complaint.title || complaint.complaint_title || "Untitled Complaint"}</h4>
                      <p>
                        <strong>Submitted:</strong> {formatSubmittedDate(complaint.submitted_date || complaint.created_date)}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        <span className={getSolvedStatusTextClassName(complaint.status)}>{complaint.status || "--"}</span>
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
                  <h3>{activeComplaintView === "My Complaints" ? "No complaints found" : "No solved complaints yet"}</h3>
                  <p>
                    {activeComplaintView === "My Complaints"
                      ? "Your submitted complaints will appear here."
                      : "History will show solved complaints."}
                  </p>
                </div>
              )
            ) : activeComplaints.length > 0 ? (
              <div className="table-wrapper">
                <table className="complaints-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Remaining Days</th>
                      <th>Submitted Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeComplaints.map((complaint) => (
                      <tr key={complaint.id}>
                        {(() => {
                          const remainingLabel = getComplaintRemainingLabel(complaint)
                          const isCritical = remainingLabel === "Last Day" || remainingLabel.includes("(Overdue)")
                          const isSolvedRemaining = remainingLabel === "Solved"

                          return (
                            <>
                        <td>{complaint.complaint_title || "--"}</td>
                        <td>
                          <span className={getSolvedStatusTextClassName(complaint.status)}>{complaint.status || "--"}</span>
                        </td>
                        <td>
                          <span className={isCritical ? "remaining-last-day" : isSolvedRemaining ? "remaining-solved" : ""}>
                            {remainingLabel}
                          </span>
                        </td>
                        <td>{formatSubmittedDate(complaint.created_date)}</td>
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
                <h3>No complaints found</h3>
                <p>Submit a complaint to see it here.</p>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              []
            </div>
            <h3>No Complaints Yet</h3>
            <p>Submit your first complaint.</p>
          </div>
        )}
      </section>

      <footer className="dashboard-footer">
        <span>(c) 2024 Hostel Complaint Management System</span>
        <span>Support: 044-1234 5678 | support@hostelcomplaint.edu</span>
      </footer>

      {isExtendOpen && (
        <div className="complaint-overlay" role="dialog" aria-modal="true">
          <div className="complaint-card extend-modal" onClick={(event) => event.stopPropagation()}>
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
                    {complaint.complaint_title || "Untitled"} - {formatSubmittedDate(complaint.created_date)}
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
                      profile.name ||
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
                    value={formatSubmittedDate(selectedExtendComplaint.created_date)}
                    readOnly
                  />
                </div>
                <div className="form-field">
                  <label>Current Deadline Date</label>
                  <input
                    type="text"
                    value={formatSubmittedDate(selectedExtendComplaint.deadline_date)}
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

      {isComplaintOpen && (
        <div className="complaint-overlay" role="dialog" aria-modal="true">
          <div className="complaint-card submission-modal" onClick={(event) => event.stopPropagation()}>
            <div className="complaint-header">
              <div>
                <h2>Complaint Submission</h2>
                <p>Help us resolve issues quickly by sharing the details.</p>
              </div>
              <button type="button" className="close-button" onClick={handleCloseComplaint}>
                Close
              </button>
            </div>

            <form className="complaint-form" onSubmit={handleSubmitComplaint}>
              <div className="complaint-form-body">
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor="blockName">Block Name</label>
                    <select
                      id="blockName"
                      value={formData.blockName}
                      onChange={handleFormChange("blockName")}
                    >
                      {blockOptions.map((block) => (
                        <option key={block} value={block}>
                          {block}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="floorNumber">
                      Floor Number <span className="required-asterisk">*</span>
                    </label>
                    <select
                      id="floorNumber"
                      value={formData.floorNumber}
                      onChange={handleFormChange("floorNumber")}
                      required
                    >
                      <option value="">Select floor</option>
                      {floorOptions.map((floor) => (
                        <option key={floor} value={floor}>
                          {floor}
                        </option>
                      ))}
                    </select>
                    {formErrors.floorNumber && <span className="error-text">{formErrors.floorNumber}</span>}
                    {formData.floorNumber === "Other" && (
                      <div className="inline-input">
                        <input
                          type="text"
                          placeholder="Enter Floor Number"
                          value={formData.floorOther}
                          onChange={handleFormChange("floorOther")}
                          required
                        />
                        {formErrors.floorOther && <span className="error-text">{formErrors.floorOther}</span>}
                      </div>
                    )}
                  </div>

                  <div className="form-field">
                    <label htmlFor="roomNumber">Room Number</label>
                    <select
                      id="roomNumber"
                      value={formData.roomNumber}
                      onChange={handleFormChange("roomNumber")}
                    >
                      {!formData.roomNumber && <option value="">Select room</option>}
                      {roomOptions.map((room) => (
                        <option key={room} value={room}>
                          {room}
                        </option>
                      ))}
                    </select>
                    {formData.roomNumber === "Other" && (
                      <div className="inline-input">
                        <input
                          type="text"
                          placeholder="Enter Which Room"
                          value={formData.roomOther}
                          onChange={handleFormChange("roomOther")}
                          required
                        />
                        {formErrors.roomOther && <span className="error-text">{formErrors.roomOther}</span>}
                      </div>
                    )}
                  </div>

                  <div className="form-field">
                    <label htmlFor="department">
                      Department <span className="required-asterisk">*</span>
                    </label>
                    <select
                      id="department"
                      value={formData.department}
                      onChange={handleFormChange("department")}
                      required
                    >
                      <option value="">Select Department</option>
                      {departmentOptions.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                    {formErrors.department && <span className="error-text">{formErrors.department}</span>}
                  </div>

                  {(formData.department === "Plumbing" || formData.department === "Electrition") && (
                    <div className="form-field">
                      <label htmlFor="complaintType">
                        {formData.department === "Plumbing"
                          ? "Plumbing Complaint Type"
                          : "Electrition Complaint Type"}{" "}
                        <span className="required-asterisk">*</span>
                      </label>
                      <select
                        id="complaintType"
                        value={formData.complaintType}
                        onChange={handleFormChange("complaintType")}
                        required
                      >
                        <option value="">Select complaint type</option>
                        {(formData.department === "Plumbing"
                          ? plumbingComplaintTypeOptions
                          : electritionComplaintTypeOptions
                        ).map((typeOption) => (
                          <option key={typeOption} value={typeOption}>
                            {typeOption}
                          </option>
                        ))}
                      </select>
                      {formErrors.complaintType && (
                        <span className="error-text">{formErrors.complaintType}</span>
                      )}
                    </div>
                  )}

                  <div className="form-field">
                    <label htmlFor="timeLimit">Time Limit</label>
                    <input
                      id="timeLimit"
                      type="text"
                      value={calculatedTimeLimit.label}
                      readOnly
                      tabIndex={-1}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="complaintTitle">
                      Complaint Title <span className="required-asterisk">*</span>
                    </label>
                    <input
                      id="complaintTitle"
                      type="text"
                      placeholder="Enter complaint title"
                      value={formData.complaintTitle}
                      onChange={handleFormChange("complaintTitle")}
                      required
                    />
                    {formErrors.complaintTitle && (
                      <span className="error-text">{formErrors.complaintTitle}</span>
                    )}
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="complaintDescription">
                    Complaint Description <span className="required-asterisk">*</span>
                  </label>
                  <textarea
                    id="complaintDescription"
                    placeholder="Describe the issue in detail..."
                    rows={4}
                    value={formData.complaintDescription}
                    onChange={handleFormChange("complaintDescription")}
                    required
                  />
                  {formErrors.complaintDescription && (
                    <span className="error-text">{formErrors.complaintDescription}</span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="imageUpload">
                    Upload Image <span className="required-asterisk">*</span>
                  </label>
                  <div className="upload-row">
                    <label className="upload-button" htmlFor="imageUpload">
                      Choose Photo
                    </label>
                    <input
                      id="imageUpload"
                      className="upload-input"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={handleImageChange}
                      required
                    />
                    {imagePreviewUrl && (
                      <div className="upload-badge">
                        <span className="upload-check" aria-hidden="true">
                          ✓
                        </span>
                        Photo Uploaded
                        <button
                          type="button"
                          className="preview-button"
                          aria-label="Preview uploaded photo"
                          onClick={handleOpenImagePreview}
                        >
                          🖼
                        </button>
                      </div>
                    )}
                  </div>
                  {formErrors.imageFile && <span className="error-text">{formErrors.imageFile}</span>}
                </div>
              </div>

              <div className="complaint-form-footer">
                <button type="submit" className="submit-button">
                  Submit Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isImagePreviewOpen && (
        <div className="preview-overlay" role="dialog" aria-modal="true">
          <div className="preview-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="preview-close" onClick={handleCloseImagePreview}>
              Close
            </button>
            {imagePreviewUrl && <img src={imagePreviewUrl} alt="Uploaded complaint" />}
          </div>
        </div>
      )}

      {isTrackOpen && (
        <div className="complaint-overlay" role="dialog" aria-modal="true">
          <div className="complaint-card extend-modal status-modal" onClick={(event) => event.stopPropagation()}>
            <div className="complaint-header">
              <div>
                <h2>Track Complaints</h2>
                <p>View submitted complaint details and current status.</p>
              </div>
              <button type="button" className="close-button" onClick={handleCloseTrackComplaints}>
                Close
              </button>
            </div>

            <div className="modal-body">
              {trackError && (
                <div className="status-banner error" role="status">
                  {trackError}
                </div>
              )}
              <div className="form-field">
                <label htmlFor="trackComplaint">Select Submitted Complaint</label>
                <select
                  id="trackComplaint"
                  value={selectedTrackId}
                  onChange={(event) => {
                    setSelectedTrackId(event.target.value)
                    setSelectedTrackDetails(null)
                    setTrackError("")
                    setShowImageModal(false)
                    setSelectedImage(null)
                  }}
                >
                  <option value="">Select a complaint</option>
                  {complaints.map((complaint) => (
                    <option key={complaint.id} value={complaint.id}>
                      {complaint.complaint_title || "Untitled"} - {formatSubmittedDate(complaint.created_date)}
                    </option>
                  ))}
                </select>
              </div>

              {isTrackLoading && (
                <div className="status-banner" role="status">
                  Loading complaint details...
                </div>
              )}

              {selectedTrackComplaint && (
                <div className="form-grid">
                  <div className="form-field">
                    <label>Title</label>
                    <input
                      type="text"
                      value={selectedTrackComplaint.complaint_title || selectedTrackComplaint.title || ""}
                      readOnly
                    />
                  </div>
                  <div className="form-field">
                    <label>Description</label>
                    <input type="text" value={selectedTrackComplaint.description || ""} readOnly />
                  </div>
                  <div className="form-field">
                    <label>Category</label>
                    <input
                      type="text"
                      value={selectedTrackComplaint.category || selectedTrackComplaint.block || "--"}
                      readOnly
                    />
                  </div>
                  <div className="form-field">
                    <label>Submitted Date</label>
                    <input type="text" value={formatSubmittedDate(selectedTrackComplaint.created_date)} readOnly />
                  </div>
                  <div className="form-field">
                    <label>Remaining Days</label>
                    {(() => {
                      const remainingLabel = getTrackRemainingDaysLabel(selectedTrackComplaint)
                      const isCritical = remainingLabel === "Last Day" || remainingLabel.includes("(Overdue)")

                      return (
                        <input
                          type="text"
                          value={remainingLabel}
                          className={isCritical ? "last-day-input" : ""}
                          readOnly
                        />
                      )
                    })()}
                  </div>
                  <div className="form-field">
                    <label>Image</label>
                    <button type="button" className="ghost-button" onClick={handleOpenTrackImage}>
                      View Image
                    </button>
                  </div>
                  <div className="form-field">
                    <label>Status</label>
                    <input
                      type="text"
                      value={selectedTrackComplaint.status || "--"}
                      className={getSolvedStatusClassName(selectedTrackComplaint.status)}
                      readOnly
                    />
                  </div>
                </div>
              )}

              <div
                className="modal-footer"
                style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}
              >
                <button type="button" className="ghost-button" onClick={handleCloseTrackComplaints}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImageModal && (
        <div className="preview-overlay" role="dialog" aria-modal="true">
          <div className="preview-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="preview-close" onClick={handleCloseTrackImage}>
              Close
            </button>
            <img
              src={
                String(selectedImage || "").startsWith("data:")
                  ? selectedImage
                  : String(selectedImage || "").startsWith("http://") ||
                      String(selectedImage || "").startsWith("https://")
                    ? selectedImage
                    : String(selectedImage || "").startsWith("/")
                      ? `http://localhost:5000${selectedImage}`
                      : `data:image/jpeg;base64,${selectedImage}`
              }
              alt={selectedTrackComplaint?.complaint_title || "Complaint"}
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
                <p>View solved complaint details.</p>
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
                  value={selectedHistoryComplaint.title || selectedHistoryComplaint.complaint_title || ""}
                  readOnly
                />
              </div>
              <div className="form-field">
                <label>Description</label>
                <input type="text" value={selectedHistoryComplaint.description || ""} readOnly />
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
                <label>Submitted Date</label>
                <input
                  type="text"
                  value={formatSubmittedDate(
                    selectedHistoryComplaint.submitted_date || selectedHistoryComplaint.created_date
                  )}
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
              <div className="form-field">
                <label>Block</label>
                <input type="text" value={selectedHistoryComplaint.block || ""} readOnly />
              </div>
              <div className="form-field">
                <label>Floor</label>
                <input type="text" value={selectedHistoryComplaint.floor || selectedHistoryComplaint.floor_no || ""} readOnly />
              </div>
              <div className="form-field">
                <label>Room</label>
                <input type="text" value={selectedHistoryComplaint.room_no || selectedHistoryComplaint.room || ""} readOnly />
              </div>
              {(selectedHistoryComplaint.image || selectedHistoryComplaint.image_path) && (
                <div className="form-field">
                  <label>Image</label>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() =>
                      handleViewImage(selectedHistoryComplaint.image || selectedHistoryComplaint.image_path)
                    }
                  >
                    View Image
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentDashboard
