const SESSION_LAST_ACTIVE_KEY = 'authLastActiveAt'
const SESSION_CLOSED_AT_KEY = 'authClosedAt'
const SESSION_LOGOUT_AT_KEY = 'authLogoutAt'
const SESSION_TIMEOUT_MINUTES = Number(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES || 30)
const SESSION_TIMEOUT_MS = Math.max(1, SESSION_TIMEOUT_MINUTES) * 60 * 1000

const AUTH_STORAGE_KEYS = [
  'authToken',
  'authRole',
  'authName',
  'authEmail',
  'authRoom',
  'authBlock',
  'authFloor',
  'user',
  'currentUser',
  SESSION_LAST_ACTIVE_KEY,
  SESSION_CLOSED_AT_KEY,
]

const parseJwtExpiryMs = (token) => {
  if (!token) {
    return null
  }

  try {
    const parts = token.split('.')
    if (parts.length < 2) {
      return null
    }

    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(window.atob(payloadBase64))
    if (!payload?.exp) {
      return null
    }

    return Number(payload.exp) * 1000
  } catch (error) {
    return null
  }
}

export const touchSession = () => {
  localStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(Date.now()))
}

export const startAuthSession = () => {
  const now = Date.now()
  localStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(now))
  localStorage.removeItem(SESSION_CLOSED_AT_KEY)
  localStorage.removeItem(SESSION_LOGOUT_AT_KEY)
}

export const clearAuthSession = () => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
  localStorage.setItem(SESSION_LOGOUT_AT_KEY, String(Date.now()))
}

export const markSessionClosed = () => {
  localStorage.setItem(SESSION_CLOSED_AT_KEY, String(Date.now()))
}

export const isSessionExpired = () => {
  const token = localStorage.getItem('authToken')
  if (!token) {
    return true
  }

  const now = Date.now()
  const lastActiveRaw = Number(localStorage.getItem(SESSION_LAST_ACTIVE_KEY) || 0)
  const closedAtRaw = Number(localStorage.getItem(SESSION_CLOSED_AT_KEY) || 0)
  const tokenExpiryMs = parseJwtExpiryMs(token)

  if (tokenExpiryMs && now >= tokenExpiryMs) {
    return true
  }

  if (lastActiveRaw > 0 && now - lastActiveRaw > SESSION_TIMEOUT_MS) {
    return true
  }

  if (closedAtRaw > 0 && now - closedAtRaw > SESSION_TIMEOUT_MS) {
    return true
  }

  return false
}

export const getLogoutSignalKey = () => SESSION_LOGOUT_AT_KEY
