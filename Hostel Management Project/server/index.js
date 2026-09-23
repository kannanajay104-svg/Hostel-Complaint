import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
import User from './models/User.js'
import Complaint from './models/Complaint.js'
import { updateComplaintStatus } from './controllers/complaintController.js'

dotenv.config()

const app = express()
const PORT = 5000
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir)
}
const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://310624205007_db_user:vp1mIr9SvSvfq4K5@cluster0.mnasry1.mongodb.net/hostel_management?retryWrites=true&w=majority'

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-env'
const JWT_EXPIRES_IN = '7d'
const ESCALATION_CHECK_INTERVAL_MS = Number(process.env.ESCALATION_CHECK_INTERVAL_MS || 5 * 60 * 1000)

const allowedRoles = ['student', 'warden', 'manager', 'viceprincipal', 'principal']

const normalizeStatus = (statusValue) => String(statusValue || '').trim().toLowerCase()

const isResolvedStatus = (statusValue) => {
  const normalized = normalizeStatus(statusValue)
  return normalized === 'solved' || normalized === 'resolved'
}

const getUtcStartOfDay = (date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

const autoEscalateWardenComplaintsToManager = async () => {
  const todayUtcStart = getUtcStartOfDay(new Date())
  const escalatedAt = new Date()

  const dueComplaints = await Complaint.find({
    current_level: 'Warden',
    deadline_date: { $lte: todayUtcStart },
  })
    .select('_id status')
    .lean()

  const complaintIdsToEscalate = dueComplaints
    .filter((complaint) => !isResolvedStatus(complaint.status))
    .map((complaint) => complaint._id)

  if (complaintIdsToEscalate.length === 0) {
    return 0
  }

  const result = await Complaint.updateMany(
    { _id: { $in: complaintIdsToEscalate } },
    {
      $set: {
        current_level: 'Manager',
        escalated_to_manager_at: escalatedAt,
        updatedAt: new Date(),
      },
    }
  )

  return result.modifiedCount || 0
}

const getEscalationDueDate = (complaint, escalationField) => {
  const escalationStart = complaint?.[escalationField] || complaint?.deadline_date
  const parsedStart = new Date(escalationStart)
  if (Number.isNaN(parsedStart.getTime())) {
    return null
  }

  const timeLimitDaysValue = Number(complaint?.time_limit_days)
  const timeLimitDays = Number.isFinite(timeLimitDaysValue) && timeLimitDaysValue > 0 ? timeLimitDaysValue : 1
  const dueDate = getUtcStartOfDay(parsedStart)
  dueDate.setUTCDate(dueDate.getUTCDate() + timeLimitDays)
  return dueDate
}

const autoEscalateManagerComplaintsToVicePrincipal = async () => {
  const todayUtcStart = getUtcStartOfDay(new Date())
  const escalatedAt = new Date()

  const managerComplaints = await Complaint.find({
    current_level: 'Manager',
  })
    .select('_id status deadline_date time_limit_days escalated_to_manager_at')
    .lean()

  const complaintIdsToEscalate = managerComplaints
    .filter((complaint) => {
      if (isResolvedStatus(complaint.status)) {
        return false
      }
      const dueDate = getEscalationDueDate(complaint, 'escalated_to_manager_at')
      return Boolean(dueDate && dueDate <= todayUtcStart)
    })
    .map((complaint) => complaint._id)

  if (complaintIdsToEscalate.length === 0) {
    return 0
  }

  const result = await Complaint.updateMany(
    { _id: { $in: complaintIdsToEscalate } },
    {
      $set: {
        current_level: 'VicePrincipal',
        escalated_to_viceprincipal_at: escalatedAt,
        updatedAt: new Date(),
      },
    }
  )

  return result.modifiedCount || 0
}

const autoEscalateVicePrincipalComplaintsToPrincipal = async () => {
  const todayUtcStart = getUtcStartOfDay(new Date())
  const escalatedAt = new Date()

  const vicePrincipalComplaints = await Complaint.find({
    current_level: 'VicePrincipal',
  })
    .select('_id status deadline_date time_limit_days escalated_to_viceprincipal_at')
    .lean()

  const complaintIdsToEscalate = vicePrincipalComplaints
    .filter((complaint) => {
      if (isResolvedStatus(complaint.status)) {
        return false
      }
      const dueDate = getEscalationDueDate(complaint, 'escalated_to_viceprincipal_at')
      return Boolean(dueDate && dueDate <= todayUtcStart)
    })
    .map((complaint) => complaint._id)

  if (complaintIdsToEscalate.length === 0) {
    return 0
  }

  const result = await Complaint.updateMany(
    { _id: { $in: complaintIdsToEscalate } },
    {
      $set: {
        current_level: 'Principal',
        escalated_to_principal_at: escalatedAt,
        updatedAt: new Date(),
      },
    }
  )

  return result.modifiedCount || 0
}

const signToken = (user) =>
  jwt.sign(
    {
      userId: user._id.toString(),
      role: String(user.role || '').trim().toLowerCase(),
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Missing authorization token.' })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = {
      ...payload,
      id: payload.userId || payload.id,
      role: String(payload.role || '').trim().toLowerCase(),
    }
    return next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' })
  }
}

const buildUserResponse = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  roomNumber: user.roomNumber || '',
  block: user.block || '',
  floorNumber: user.floorNumber || '',
})

const requireRole = (role) => (req, res, next) => {
  const requiredRole = String(role || '').trim().toLowerCase()
  const currentRole = String(req.user?.role || '').trim().toLowerCase()
  if (!req.user || currentRole !== requiredRole) {
    return res.status(403).json({
      message: 'Access denied for this role.',
      role: currentRole || null,
    })
  }
  return next()
}

app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
app.use(express.json())
app.use('/uploads', express.static(uploadsDir))

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
      cb(null, `${Date.now()}-${safeName}`)
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only JPG and PNG images are allowed.'))
    }
  },
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' })
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, roomNumber, block, floorNumber, role } = req.body
    const normalizedRole = String(role || '').trim().toLowerCase()
    const isStudentRole = normalizedRole === 'student'

    if (!name || !email || !password || !normalizedRole) {
      return res.status(400).json({ message: 'Name, email, password, and role are required.' })
    }

    if (isStudentRole && (!roomNumber || !block || !floorNumber)) {
      return res.status(400).json({ message: 'Room number, block, and floor number are required for students.' })
    }

    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({ message: 'Invalid portal type.' })
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      role: normalizedRole,
      ...(isStudentRole ? { block } : {}),
    })
    if (existingUser) {
      return res.status(409).json({ message: 'Account already exists for this portal.' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = new User({
      name,
      email: email.toLowerCase(),
      password: passwordHash,
      role: normalizedRole,
      roomNumber: isStudentRole ? roomNumber : '',
      block: isStudentRole ? block : '',
      floorNumber: isStudentRole ? floorNumber : '',
    })

    await user.save()
    const token = signToken(user)
    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      role: user.role,
      name: user.name,
      user: buildUserResponse(user),
    })
  } catch (error) {
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role, block } = req.body
    const normalizedRole = String(role || '').trim().toLowerCase()
    const isStudentRole = normalizedRole === 'student'

    if (!email || !password || !normalizedRole) {
      return res.status(400).json({ message: 'Email, password, and role are required.' })
    }

    if (isStudentRole && !block) {
      return res.status(400).json({ message: 'Block is required for students.' })
    }

    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({ message: 'Invalid portal type.' })
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      role: normalizedRole,
      ...(isStudentRole ? { block } : {}),
    })

    console.log('Login email:', email)
    console.log('Found user:', user)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' })
    }

    const token = signToken(user)
    return res.json({
      success: true,
      token,
      role: user.role,
      user: buildUserResponse(user),
    })
  } catch (error) {
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Invalid token payload.' })
    }

    const user = await User.findById(req.user.id).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    return res.json({ user: buildUserResponse(user) })
  } catch (error) {
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Invalid token payload.' })
    }

    const { name, roomNumber, block, floorNumber } = req.body
    const updates = {
      ...(name ? { name } : {}),
      ...(roomNumber !== undefined ? { roomNumber } : {}),
      ...(block !== undefined ? { block } : {}),
      ...(floorNumber !== undefined ? { floorNumber } : {}),
    }

    console.log('Profile update request:', { userId: req.user.id, updates })

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    }).select('-password')

    if (!user) {
      console.error('User not found for profile update:', req.user.id)
      return res.status(404).json({ message: 'User not found.' })
    }

    console.log('Profile updated successfully:', { userId: user._id, user: buildUserResponse(user) })
    return res.json({ user: buildUserResponse(user) })
  } catch (error) {
    console.error('Profile update error:', error.message, error.stack)
    const message = error.message || 'Server error. Please try again.'
    return res.status(500).json({ message })
  }
})

app.post(
  '/complaints',
  authenticateToken,
  requireRole('student'),
  upload.single('image'),
  async (req, res) => {
  try {
    const {
      block,
      floor,
      room,
      complaint_title,
      description,
      time_limit_days,
    } = req.body

    const parsedTimeLimit = Number(time_limit_days)
    const hasTimeLimit = time_limit_days !== undefined && time_limit_days !== null && time_limit_days !== ""
    if (hasTimeLimit && (!Number.isFinite(parsedTimeLimit) || parsedTimeLimit < 1)) {
      return res.status(400).json({ message: 'Time limit must be at least 1 day.' })
    }
    const timeLimitDays = hasTimeLimit && Number.isFinite(parsedTimeLimit) ? parsedTimeLimit : 4

    if (!block || !floor || !complaint_title || !description) {
      return res.status(400).json({ message: 'Complaint details are required.' })
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Complaint image is required.' })
    }

    const createdDate = new Date()
    const deadlineDate = new Date(createdDate)
    deadlineDate.setDate(deadlineDate.getDate() + timeLimitDays)

    const complaint = new Complaint({
      student_id: req.user.id,
      block: String(block).trim(),
      floor: String(floor).trim(),
      room: room ? String(room).trim() : '',
      complaint_title: String(complaint_title).trim(),
      description: String(description).trim(),
      image_path: `/uploads/${req.file.filename}`,
      created_date: createdDate,
      time_limit_days: timeLimitDays,
      deadline_date: deadlineDate,
      status: 'Pending',
      current_level: 'Warden',
    })

    await complaint.save()

    return res.status(201).json({
      message: 'Complaint submitted successfully.',
      complaintId: complaint._id.toString(),
      timeLimitDays: complaint.time_limit_days,
    })
  } catch (error) {
    console.error('Complaint submission error:', error.message, error.stack)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.get('/complaints', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const complaints = await Complaint.find({ student_id: req.user.id })
      .sort({ created_date: -1 })
      .lean()

    const response = complaints.map((complaint) => ({
      id: complaint._id.toString(),
      title: complaint.complaint_title,
      complaint_title: complaint.complaint_title,
      description: complaint.description,
      current_level: complaint.current_level,
      block: complaint.block,
      floor: complaint.floor,
      room: complaint.room,
      room_no: complaint.room,
      image: complaint.image_path,
      image_path: complaint.image_path,
      status: complaint.status,
      submitted_date: complaint.created_date,
      deadline_date: complaint.deadline_date,
      time_limit_days: complaint.time_limit_days,
      created_date: complaint.created_date,
      escalated_to_manager_at: complaint.escalated_to_manager_at,
      escalated_to_viceprincipal_at: complaint.escalated_to_viceprincipal_at,
      escalated_to_principal_at: complaint.escalated_to_principal_at,
      updatedAt: complaint.updatedAt,
      solvedDate: complaint.solvedDate || complaint.solved_date,
      solved_date: complaint.solved_date,
    }))

    return res.json({ complaints: response })
  } catch (error) {
    console.error('Complaint fetch error:', error.message, error.stack)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.put('/api/complaints/:id/extend', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { extend_days } = req.body

    const parsedExtendDays = Number(extend_days)
    if (!Number.isFinite(parsedExtendDays) || !Number.isInteger(parsedExtendDays)) {
      return res.status(400).json({ message: 'Extend days must be a whole number.' })
    }
    if (parsedExtendDays < 1 || parsedExtendDays > 30) {
      return res.status(400).json({ message: 'Extend days must be between 1 and 30.' })
    }

    const complaint = await Complaint.findById(id)
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' })
    }

    const status = String(complaint.status || '').trim().toLowerCase()
    const currentLevel = String(complaint.current_level || '').trim().toLowerCase()

    if (req.user.role === 'student') {
      if (complaint.student_id.toString() !== req.user.id || status !== 'pending') {
        return res.status(403).json({ message: 'You cannot update this complaint.' })
      }
    } else if (req.user.role === 'warden') {
      if (status !== 'pending' || currentLevel !== 'warden') {
        return res.status(403).json({ message: 'You cannot update this complaint.' })
      }
    } else if (req.user.role === 'manager') {
      if (status !== 'pending' || currentLevel !== 'manager') {
        return res.status(403).json({ message: 'You cannot update this complaint.' })
      }
    } else if (req.user.role === 'viceprincipal') {
      if (status !== 'pending' || currentLevel !== 'viceprincipal') {
        return res.status(403).json({ message: 'You cannot update this complaint.' })
      }
    } else if (req.user.role === 'principal') {
      if (status !== 'pending' || currentLevel !== 'principal') {
        return res.status(403).json({ message: 'You cannot update this complaint.' })
      }
    } else {
      return res.status(403).json({ message: 'Access denied for this role.' })
    }

    const currentDeadline = complaint.deadline_date ? new Date(complaint.deadline_date) : null
    if (!currentDeadline || Number.isNaN(currentDeadline.getTime())) {
      return res.status(400).json({ message: 'Current deadline date is missing or invalid.' })
    }

    const newDeadline = new Date(currentDeadline)
    newDeadline.setUTCDate(newDeadline.getUTCDate() + parsedExtendDays)
    complaint.deadline_date = newDeadline
    await complaint.save()

    return res.json({
      message: 'Time limit extended successfully.',
      complaint: {
        id: complaint._id.toString(),
        deadline_date: complaint.deadline_date,
      },
    })
  } catch (error) {
    console.error('Deadline update error:', error.message, error.stack)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.put('/api/complaints/:id/status', authenticateToken, updateComplaintStatus)
app.put('/complaints/:id/status', authenticateToken, updateComplaintStatus)

app.get('/complaints/warden', authenticateToken, requireRole('warden'), async (req, res) => {
  try {
    await autoEscalateWardenComplaintsToManager()

    const complaints = await Complaint.find({ current_level: 'Warden' })
      .sort({ created_date: -1 })
      .populate('student_id', 'name')
      .lean()

    const response = complaints.map((complaint) => ({
      id: complaint._id.toString(),
      title: complaint.complaint_title,
      complaint_title: complaint.complaint_title,
      description: complaint.description,
      student: complaint.student_id?.name || 'Unknown',
      student_name: complaint.student_id?.name || 'Unknown',
      issue: complaint.complaint_title,
      block: complaint.block,
      floor: complaint.floor,
      room: complaint.room,
      room_no: complaint.room,
      deadline_date: complaint.deadline_date,
      submitted_date: complaint.created_date,
      created_date: complaint.created_date,
      updatedAt: complaint.updatedAt,
      status: complaint.status,
      solvedDate: complaint.solvedDate || complaint.solved_date,
      solved_date: complaint.solved_date,
      image: complaint.image_path,
      image_path: complaint.image_path,
    }))

    return res.json({ complaints: response })
  } catch (error) {
    console.error('Warden complaint fetch error:', error.message, error.stack)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.get('/api/complaints/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const complaint = await Complaint.findById(id).populate('student_id', 'name').lean()
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' })
    }

    const status = String(complaint.status || '').trim().toLowerCase()
    const currentLevel = String(complaint.current_level || '').trim().toLowerCase()

    if (req.user.role === 'student') {
      if (complaint.student_id?._id?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'You cannot access this complaint.' })
      }
    } else if (req.user.role === 'warden') {
      const warden = await User.findById(req.user.id).lean()
      if (!warden) {
        return res.status(404).json({ message: 'Warden profile not found.' })
      }

      const isAssignedBlock = !warden.block || complaint.block === warden.block
      if (!isAssignedBlock) {
        return res.status(403).json({ message: 'You cannot access this complaint.' })
      }
    } else if (req.user.role === 'manager') {
      const reachedManagerPortal = Boolean(complaint.escalated_to_manager_at) || currentLevel === 'manager'
      if (!reachedManagerPortal) {
        return res.status(403).json({ message: 'You cannot access this complaint.' })
      }
    } else if (req.user.role === 'viceprincipal') {
      const reachedVicePrincipalPortal = Boolean(complaint.escalated_to_viceprincipal_at) || currentLevel === 'viceprincipal'
      if (!reachedVicePrincipalPortal) {
        return res.status(403).json({ message: 'You cannot access this complaint.' })
      }
    } else if (req.user.role === 'principal') {
      const reachedPrincipalPortal = Boolean(complaint.escalated_to_principal_at) || currentLevel === 'principal'
      if (!reachedPrincipalPortal) {
        return res.status(403).json({ message: 'You cannot access this complaint.' })
      }
    } else {
      return res.status(403).json({ message: 'Access denied for this role.' })
    }

    return res.json({
      complaint: {
        id: complaint._id.toString(),
        title: complaint.complaint_title,
        complaint_title: complaint.complaint_title,
        description: complaint.description,
        student_name: complaint.student_id?.name || req.user?.name || 'Unknown',
        studentName: complaint.student_id?.name || req.user?.name || 'Unknown',
        student: complaint.student_id?.name || req.user?.name || 'Unknown',
        block: complaint.block,
        floor: complaint.floor,
        room: complaint.room,
        room_no: complaint.room,
        image: complaint.image_path,
        image_path: complaint.image_path,
        submitted_date: complaint.created_date,
        created_date: complaint.created_date,
        updatedAt: complaint.updatedAt,
        deadline_date: complaint.deadline_date,
        time_limit_days: complaint.time_limit_days,
        status: complaint.status,
        solvedDate: complaint.solvedDate || complaint.solved_date,
        solved_date: complaint.solved_date,
        current_level: complaint.current_level,
        escalated_to_manager_at: complaint.escalated_to_manager_at,
        escalated_to_viceprincipal_at: complaint.escalated_to_viceprincipal_at,
        escalated_to_principal_at: complaint.escalated_to_principal_at,
      },
    })
  } catch (error) {
    console.error('Complaint detail fetch error:', error.message, error.stack)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.get('/api/warden/complaints', authenticateToken, requireRole('warden'), async (req, res) => {
  try {
    const complaints = await Complaint.find({ current_level: 'Warden', status: 'Pending' })
      .sort({ created_date: -1 })
      .populate('student_id', 'name')
      .lean()

    const response = complaints.map((complaint) => ({
      id: complaint._id.toString(),
      title: complaint.complaint_title,
      student_name: complaint.student_id?.name || 'Unknown',
      studentName: complaint.student_id?.name || 'Unknown',
      student: complaint.student_id?.name || 'Unknown',
      issue: complaint.complaint_title,
      complaint_title: complaint.complaint_title,
      description: complaint.description,
      block: complaint.block,
      floor: complaint.floor,
      room: complaint.room,
      room_no: complaint.room,
      image: complaint.image_path,
      image_path: complaint.image_path,
      submitted_date: complaint.created_date,
      deadline_date: complaint.deadline_date,
      created_date: complaint.created_date,
      updatedAt: complaint.updatedAt,
      status: complaint.status,
      solvedDate: complaint.solvedDate || complaint.solved_date,
      solved_date: complaint.solved_date,
      current_level: complaint.current_level,
    }))

    return res.json({ complaints: response })
  } catch (error) {
    console.error('Warden complaint fetch error:', error.message, error.stack)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.get('/api/complaints', authenticateToken, requireRole('warden'), async (req, res) => {
  try {
    await autoEscalateWardenComplaintsToManager()

    const warden = await User.findById(req.user.id).lean()
    if (!warden) {
      return res.status(404).json({ message: 'Warden profile not found.' })
    }

    const query = {
      ...(warden.block ? { block: warden.block } : {}),
    }

    const complaints = await Complaint.find(query)
      .sort({ created_date: -1 })
      .populate('student_id', 'name')
      .lean()

    const response = complaints.map((complaint) => ({
      id: complaint._id.toString(),
      title: complaint.complaint_title,
      student_name: complaint.student_id?.name || 'Unknown',
      studentName: complaint.student_id?.name || 'Unknown',
      student: complaint.student_id?.name || 'Unknown',
      complaint_title: complaint.complaint_title,
      description: complaint.description,
      block: complaint.block,
      floor: complaint.floor,
      room: complaint.room,
      room_no: complaint.room,
      image: complaint.image_path,
      image_path: complaint.image_path,
      submitted_date: complaint.created_date,
      deadline_date: complaint.deadline_date,
      created_date: complaint.created_date,
      updatedAt: complaint.updatedAt,
      status: complaint.status,
      solvedDate: complaint.solvedDate || complaint.solved_date,
      solved_date: complaint.solved_date,
      current_level: complaint.current_level,
    }))

    return res.json({ complaints: response })
  } catch (error) {
    console.error('Warden complaint fetch error:', error.message, error.stack)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.get('/api/warden/complaints/all', authenticateToken, requireRole('warden'), async (req, res) => {
  try {
    await autoEscalateWardenComplaintsToManager()

    const warden = await User.findById(req.user.id).lean()
    if (!warden) {
      return res.status(404).json({ message: 'Warden profile not found.' })
    }

    const query = {
      ...(warden.block ? { block: warden.block } : {}),
    }

    const complaints = await Complaint.find(query)
      .sort({ created_date: -1 })
      .populate('student_id', 'name')
      .lean()

    const response = complaints.map((complaint) => ({
      id: complaint._id.toString(),
      title: complaint.complaint_title,
      student_name: complaint.student_id?.name || 'Unknown',
      studentName: complaint.student_id?.name || 'Unknown',
      student: complaint.student_id?.name || 'Unknown',
      complaint_title: complaint.complaint_title,
      description: complaint.description,
      block: complaint.block,
      floor: complaint.floor,
      room: complaint.room,
      room_no: complaint.room,
      image: complaint.image_path,
      image_path: complaint.image_path,
      submitted_date: complaint.created_date,
      deadline_date: complaint.deadline_date,
      created_date: complaint.created_date,
      updatedAt: complaint.updatedAt,
      status: complaint.status,
      solvedDate: complaint.solvedDate || complaint.solved_date,
      solved_date: complaint.solved_date,
      current_level: complaint.current_level,
    }))

    return res.json({ complaints: response })
  } catch (error) {
    console.error('Warden all complaint fetch error:', error.message, error.stack)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.get('/api/manager/complaints', authenticateToken, requireRole('manager'), async (req, res) => {
  try {
    await autoEscalateWardenComplaintsToManager()
    await autoEscalateManagerComplaintsToVicePrincipal()
    await autoEscalateVicePrincipalComplaintsToPrincipal()

    const complaints = await Complaint.find({
      $or: [
        { current_level: 'Manager' },
        { current_level: 'VicePrincipal', escalated_to_manager_at: { $ne: null } },
      ],
    })
      .sort({ created_date: -1 })
      .populate('student_id', 'name')
      .lean()

    const response = complaints.map((complaint) => ({
      id: complaint._id.toString(),
      title: complaint.complaint_title,
      complaint_title: complaint.complaint_title,
      issue: complaint.complaint_title,
      description: complaint.description,
      student: complaint.student_id?.name || 'Unknown',
      student_name: complaint.student_id?.name || 'Unknown',
      block: complaint.block,
      floor: complaint.floor,
      room: complaint.room,
      room_no: complaint.room,
      deadline: complaint.deadline_date,
      deadline_date: complaint.deadline_date,
      time_limit_days: complaint.time_limit_days,
      submitted_date: complaint.created_date,
      created_date: complaint.created_date,
      updatedAt: complaint.updatedAt,
      status: complaint.status,
      solvedDate: complaint.solvedDate || complaint.solved_date,
      solved_date: complaint.solved_date,
      image: complaint.image_path,
      image_path: complaint.image_path,
      current_level: complaint.current_level,
      escalated_to_manager_at: complaint.escalated_to_manager_at,
    }))

    return res.json({ complaints: response })
  } catch (error) {
    console.error('Manager complaint fetch error:', error.message, error.stack)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.get('/api/complaints/manager', authenticateToken, requireRole('manager'), async (req, res) => {
  try {
    await autoEscalateWardenComplaintsToManager()
    await autoEscalateManagerComplaintsToVicePrincipal()
    await autoEscalateVicePrincipalComplaintsToPrincipal()

    const complaints = await Complaint.find({
      $or: [
        { current_level: 'Manager' },
        { current_level: 'VicePrincipal', escalated_to_manager_at: { $ne: null } },
      ],
    })
      .sort({ created_date: -1 })
      .populate('student_id', 'name')
      .lean()

    const response = complaints.map((complaint) => ({
      id: complaint._id.toString(),
      title: complaint.complaint_title,
      complaint_title: complaint.complaint_title,
      issue: complaint.complaint_title,
      description: complaint.description,
      student: complaint.student_id?.name || 'Unknown',
      student_name: complaint.student_id?.name || 'Unknown',
      block: complaint.block,
      floor: complaint.floor,
      room: complaint.room,
      room_no: complaint.room,
      deadline: complaint.deadline_date,
      deadline_date: complaint.deadline_date,
      time_limit_days: complaint.time_limit_days,
      submitted_date: complaint.created_date,
      created_date: complaint.created_date,
      updatedAt: complaint.updatedAt,
      status: complaint.status,
      solvedDate: complaint.solvedDate || complaint.solved_date,
      solved_date: complaint.solved_date,
      image: complaint.image_path,
      image_path: complaint.image_path,
      current_level: complaint.current_level,
      escalated_to_manager_at: complaint.escalated_to_manager_at,
    }))

    return res.json({ complaints: response })
  } catch (error) {
    console.error('Manager complaint fetch error:', error.message, error.stack)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.get('/api/viceprincipal/complaints', authenticateToken, requireRole('viceprincipal'), async (req, res) => {
  try {
    await autoEscalateWardenComplaintsToManager()
    await autoEscalateManagerComplaintsToVicePrincipal()
    await autoEscalateVicePrincipalComplaintsToPrincipal()

    const complaints = await Complaint.find({
      $or: [
        { current_level: 'VicePrincipal' },
        { current_level: 'Principal', escalated_to_viceprincipal_at: { $ne: null } },
      ],
    })
      .sort({ created_date: -1 })
      .populate('student_id', 'name')
      .lean()

    const response = complaints.map((complaint) => ({
      id: complaint._id.toString(),
      title: complaint.complaint_title,
      complaint_title: complaint.complaint_title,
      issue: complaint.complaint_title,
      description: complaint.description,
      student: complaint.student_id?.name || 'Unknown',
      student_name: complaint.student_id?.name || 'Unknown',
      block: complaint.block,
      floor: complaint.floor,
      room: complaint.room,
      room_no: complaint.room,
      deadline: complaint.deadline_date,
      deadline_date: complaint.deadline_date,
      time_limit_days: complaint.time_limit_days,
      submitted_date: complaint.created_date,
      created_date: complaint.created_date,
      updatedAt: complaint.updatedAt,
      status: complaint.status,
      solvedDate: complaint.solvedDate || complaint.solved_date,
      solved_date: complaint.solved_date,
      image: complaint.image_path,
      image_path: complaint.image_path,
      current_level: complaint.current_level,
      escalated_to_manager_at: complaint.escalated_to_manager_at,
      escalated_to_viceprincipal_at: complaint.escalated_to_viceprincipal_at,
      escalated_to_principal_at: complaint.escalated_to_principal_at,
    }))

    return res.json({ complaints: response })
  } catch (error) {
    console.error('Vice principal complaint fetch error:', error.message, error.stack)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.get('/api/complaints/viceprincipal', authenticateToken, requireRole('viceprincipal'), async (req, res) => {
  try {
    await autoEscalateWardenComplaintsToManager()
    await autoEscalateManagerComplaintsToVicePrincipal()
    await autoEscalateVicePrincipalComplaintsToPrincipal()

    const complaints = await Complaint.find({
      $or: [
        { current_level: 'VicePrincipal' },
        { current_level: 'Principal', escalated_to_viceprincipal_at: { $ne: null } },
      ],
    })
      .sort({ created_date: -1 })
      .populate('student_id', 'name')
      .lean()

    const response = complaints.map((complaint) => ({
      id: complaint._id.toString(),
      title: complaint.complaint_title,
      complaint_title: complaint.complaint_title,
      issue: complaint.complaint_title,
      description: complaint.description,
      student: complaint.student_id?.name || 'Unknown',
      student_name: complaint.student_id?.name || 'Unknown',
      block: complaint.block,
      floor: complaint.floor,
      room: complaint.room,
      room_no: complaint.room,
      deadline: complaint.deadline_date,
      deadline_date: complaint.deadline_date,
      time_limit_days: complaint.time_limit_days,
      submitted_date: complaint.created_date,
      created_date: complaint.created_date,
      updatedAt: complaint.updatedAt,
      status: complaint.status,
      solvedDate: complaint.solvedDate || complaint.solved_date,
      solved_date: complaint.solved_date,
      image: complaint.image_path,
      image_path: complaint.image_path,
      current_level: complaint.current_level,
      escalated_to_manager_at: complaint.escalated_to_manager_at,
      escalated_to_viceprincipal_at: complaint.escalated_to_viceprincipal_at,
      escalated_to_principal_at: complaint.escalated_to_principal_at,
    }))

    return res.json({ complaints: response })
  } catch (error) {
    console.error('Vice principal complaint fetch error:', error.message, error.stack)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.get('/api/principal/complaints', authenticateToken, requireRole('principal'), async (req, res) => {
  try {
    await autoEscalateWardenComplaintsToManager()
    await autoEscalateManagerComplaintsToVicePrincipal()
    await autoEscalateVicePrincipalComplaintsToPrincipal()

    const complaints = await Complaint.find({ current_level: 'Principal' })
      .sort({ created_date: -1 })
      .populate('student_id', 'name')
      .lean()

    const response = complaints.map((complaint) => ({
      id: complaint._id.toString(),
      title: complaint.complaint_title,
      complaint_title: complaint.complaint_title,
      issue: complaint.complaint_title,
      description: complaint.description,
      student: complaint.student_id?.name || 'Unknown',
      student_name: complaint.student_id?.name || 'Unknown',
      block: complaint.block,
      floor: complaint.floor,
      room: complaint.room,
      room_no: complaint.room,
      deadline: complaint.deadline_date,
      deadline_date: complaint.deadline_date,
      time_limit_days: complaint.time_limit_days,
      submitted_date: complaint.created_date,
      created_date: complaint.created_date,
      updatedAt: complaint.updatedAt,
      status: complaint.status,
      solvedDate: complaint.solvedDate || complaint.solved_date,
      solved_date: complaint.solved_date,
      image: complaint.image_path,
      image_path: complaint.image_path,
      current_level: complaint.current_level,
      escalated_to_manager_at: complaint.escalated_to_manager_at,
      escalated_to_viceprincipal_at: complaint.escalated_to_viceprincipal_at,
      escalated_to_principal_at: complaint.escalated_to_principal_at,
    }))

    return res.json({ complaints: response })
  } catch (error) {
    console.error('Principal complaint fetch error:', error.message, error.stack)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.get('/api/complaints/principal', authenticateToken, requireRole('principal'), async (req, res) => {
  try {
    await autoEscalateWardenComplaintsToManager()
    await autoEscalateManagerComplaintsToVicePrincipal()
    await autoEscalateVicePrincipalComplaintsToPrincipal()

    const complaints = await Complaint.find({ current_level: 'Principal' })
      .sort({ created_date: -1 })
      .populate('student_id', 'name')
      .lean()

    const response = complaints.map((complaint) => ({
      id: complaint._id.toString(),
      title: complaint.complaint_title,
      complaint_title: complaint.complaint_title,
      issue: complaint.complaint_title,
      description: complaint.description,
      student: complaint.student_id?.name || 'Unknown',
      student_name: complaint.student_id?.name || 'Unknown',
      block: complaint.block,
      floor: complaint.floor,
      room: complaint.room,
      room_no: complaint.room,
      deadline: complaint.deadline_date,
      deadline_date: complaint.deadline_date,
      time_limit_days: complaint.time_limit_days,
      submitted_date: complaint.created_date,
      created_date: complaint.created_date,
      updatedAt: complaint.updatedAt,
      status: complaint.status,
      solvedDate: complaint.solvedDate || complaint.solved_date,
      solved_date: complaint.solved_date,
      image: complaint.image_path,
      image_path: complaint.image_path,
      current_level: complaint.current_level,
      escalated_to_manager_at: complaint.escalated_to_manager_at,
      escalated_to_viceprincipal_at: complaint.escalated_to_viceprincipal_at,
      escalated_to_principal_at: complaint.escalated_to_principal_at,
    }))

    return res.json({ complaints: response })
  } catch (error) {
    console.error('Principal complaint fetch error:', error.message, error.stack)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

app.get('/api/dashboard/student', authenticateToken, requireRole('student'), (req, res) => {
  return res.json({
    name: req.user.name,
    role: req.user.role,
    room: 'Room 101',
    block: 'Block A',
    stats: {
      total: 0,
      pending: 0,
      inProgress: 0,
      resolved: 0,
    },
  })
})

app.get('/api/dashboard/warden', authenticateToken, requireRole('warden'), (req, res) => {
  return res.json({ name: req.user.name, role: req.user.role })
})

app.get('/api/dashboard/manager', authenticateToken, requireRole('manager'), (req, res) => {
  return res.json({ name: req.user.name, role: req.user.role })
})

app.get('/api/dashboard/vice-principal', authenticateToken, requireRole('viceprincipal'), (req, res) => {
  return res.json({ name: req.user.name, role: req.user.role })
})

app.get('/api/dashboard/principal', authenticateToken, requireRole('principal'), (req, res) => {
  return res.json({ name: req.user.name, role: req.user.role })
})

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB Connected')

    try {
      const escalatedWardenCount = await autoEscalateWardenComplaintsToManager()
      const escalatedManagerCount = await autoEscalateManagerComplaintsToVicePrincipal()
      const escalatedVicePrincipalCount = await autoEscalateVicePrincipalComplaintsToPrincipal()
      if (escalatedWardenCount > 0) {
        console.log(`Auto escalation moved ${escalatedWardenCount} complaint(s) from Warden to Manager.`)
      }
      if (escalatedManagerCount > 0) {
        console.log(`Auto escalation moved ${escalatedManagerCount} complaint(s) from Manager to Vice Principal.`)
      }
      if (escalatedVicePrincipalCount > 0) {
        console.log(`Auto escalation moved ${escalatedVicePrincipalCount} complaint(s) from Vice Principal to Principal.`)
      }
    } catch (error) {
      console.error('Startup auto escalation failed:', error.message)
    }

    const escalationInterval = setInterval(async () => {
      try {
        const escalatedWardenCount = await autoEscalateWardenComplaintsToManager()
        const escalatedManagerCount = await autoEscalateManagerComplaintsToVicePrincipal()
        const escalatedVicePrincipalCount = await autoEscalateVicePrincipalComplaintsToPrincipal()
        if (escalatedWardenCount > 0) {
          console.log(`Auto escalation moved ${escalatedWardenCount} complaint(s) from Warden to Manager.`)
        }
        if (escalatedManagerCount > 0) {
          console.log(`Auto escalation moved ${escalatedManagerCount} complaint(s) from Manager to Vice Principal.`)
        }
        if (escalatedVicePrincipalCount > 0) {
          console.log(`Auto escalation moved ${escalatedVicePrincipalCount} complaint(s) from Vice Principal to Principal.`)
        }
      } catch (error) {
        console.error('Scheduled auto escalation failed:', error.message)
      }
    }, Math.max(60 * 1000, ESCALATION_CHECK_INTERVAL_MS))

    if (typeof escalationInterval.unref === 'function') {
      escalationInterval.unref()
    }

    const server = app.listen(PORT, () => {
      console.log(`Auth server running on port ${PORT}`)
    })

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the running server process and try again.`)
      } else {
        console.error('Server startup error:', error)
      }
      process.exit(1)
    })
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB Atlas', error)
    process.exit(1)
  })
