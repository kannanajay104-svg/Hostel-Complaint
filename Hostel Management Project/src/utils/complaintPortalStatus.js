const portalOrder = ["warden", "manager", "viceprincipal"]

const portalLabels = {
  warden: "Warden Portal",
  manager: "Manager Portal",
  viceprincipal: "Vice Principal Portal",
}

const normalizePortalKey = (value) => {
  const normalized = String(value || "").trim().toLowerCase()

  if (normalized === "vice principal" || normalized === "vice-principal") {
    return "viceprincipal"
  }

  if (portalLabels[normalized]) {
    return normalized
  }

  return "warden"
}

export const getPortalLabel = (value) => portalLabels[normalizePortalKey(value)] || portalLabels.warden

export const getNextPortalLabel = (value) => {
  const currentIndex = portalOrder.indexOf(normalizePortalKey(value))
  if (currentIndex < 0 || currentIndex >= portalOrder.length - 1) {
    return "Final Review"
  }

  return portalLabels[portalOrder[currentIndex + 1]] || "Final Review"
}

export const formatPortalCountdownLabel = (remainingDays, nextPortalLabel) => {
  if (remainingDays === null || remainingDays === undefined) {
    return "--"
  }

  const dayCount = Math.abs(remainingDays)
  const dayLabel = dayCount === 1 ? "Day" : "Days"

  if (remainingDays < 0) {
    return `Overdue for ${nextPortalLabel} by ${dayCount} ${dayLabel}`
  }

  if (remainingDays === 0) {
    return `Moves to ${nextPortalLabel} today`
  }

  return `Moves to ${nextPortalLabel} in ${remainingDays} ${dayLabel}`
}

export const getPortalStatusDetails = ({ currentLevel, remainingDays, status }) => {
  const normalizedStatus = String(status || "").trim().toLowerCase()
  const isSolved = normalizedStatus === "solved" || normalizedStatus === "resolved"

  if (isSolved) {
    return {
      currentPortalLabel: "Solved",
      nextPortalLabel: "",
      statusLabel: "Solved",
      isSolved: true,
      isUrgent: false,
    }
  }

  const currentPortalLabel = `In ${getPortalLabel(currentLevel)}`
  const nextPortalLabel = getNextPortalLabel(currentLevel)
  const statusLabel = remainingDays === null || remainingDays === undefined
    ? currentPortalLabel
    : `${currentPortalLabel} - ${formatPortalCountdownLabel(remainingDays, nextPortalLabel)}`

  return {
    currentPortalLabel,
    nextPortalLabel,
    statusLabel,
    isSolved: false,
    isUrgent: remainingDays !== null && remainingDays !== undefined && remainingDays <= 1,
  }
}