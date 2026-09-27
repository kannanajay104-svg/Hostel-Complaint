import Complaint from '../models/Complaint.js'
import User from '../models/User.js'

const ALLOWED_STATUS_VALUES = ['Pending', 'In Progress', 'Solved']

const resolveAllowedStatus = (statusValue) => {
  const normalizedStatus = String(statusValue || '').trim().toLowerCase()
  return ALLOWED_STATUS_VALUES.find((option) => option.toLowerCase() === normalizedStatus) || null
}

const isResolvedStatus = (statusValue) => {
  const normalized = String(statusValue || '').trim().toLowerCase()
  return normalized === 'solved' || normalized === 'resolved'
}

export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const role = String(req.user?.role || '').trim().toLowerCase()

    const nextStatus = resolveAllowedStatus(status)
    if (!nextStatus) {
      return res.status(400).json({
        message: 'Invalid status value.',
        allowed: ALLOWED_STATUS_VALUES,
      })
    }

    if (role !== 'warden' && role !== 'manager' && role !== 'viceprincipal') {
      return res.status(403).json({ message: 'Access denied for this role.' })
    }

    const actor = await User.findById(req.user.id).lean()
    if (!actor) {
      const profileName = role === 'manager' ? 'Manager' : role === 'viceprincipal' ? 'Vice principal' : 'Warden'
      return res.status(404).json({ message: `${profileName} profile not found.` })
    }

    const complaint = await Complaint.findById(id)
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' })
    }

    if (isResolvedStatus(complaint.status)) {
      return res.status(400).json({
        message: 'This complaint is already solved and is frozen. No further status changes are allowed.',
      })
    }

    if (role === 'warden') {
      if (actor.block && complaint.block && complaint.block !== actor.block) {
        return res.status(403).json({ message: 'You can update only complaints assigned to your block.' })
      }
    } else {
      const expectedLevel = role === 'manager' ? 'Manager' : 'VicePrincipal'
      if (String(complaint.current_level || '').trim().toLowerCase() !== expectedLevel.toLowerCase()) {
        return res.status(403).json({ message: 'You can update only complaints assigned to you.' })
      }
    }

    const solvedAt = nextStatus === 'Solved' ? new Date() : null
    complaint.status = nextStatus
    complaint.solvedDate = solvedAt
    complaint.solved_date = solvedAt
    complaint.updatedAt = new Date()
    await complaint.save()
    await complaint.populate('student_id', 'name')

    return res.json({
      message: 'Complaint status updated successfully.',
      complaint: {
        id: complaint._id.toString(),
        complaint_title: complaint.complaint_title,
        title: complaint.complaint_title,
        description: complaint.description,
        student_name: complaint.student_id?.name || 'Unknown',
        block: complaint.block,
        room: complaint.room,
        room_no: complaint.room,
        floor: complaint.floor,
        status: complaint.status,
        image_path: complaint.image_path,
        image: complaint.image_path,
        current_level: complaint.current_level,
        assignedRole: complaint.current_level,
        currentRole: complaint.current_level,
        escalationLevel: complaint.current_level,
        submitted_date: complaint.created_date,
        created_date: complaint.created_date,
        deadline_date: complaint.deadline_date,
        deadlineDate: complaint.deadline_date,
        escalated_to_manager_at: complaint.escalated_to_manager_at,
        escalated_to_viceprincipal_at: complaint.escalated_to_viceprincipal_at,
        escalated_to_principal_at: complaint.escalated_to_principal_at,
        escalation_history: complaint.escalation_history || [],
        escalationHistory: complaint.escalation_history || [],
        solvedDate: complaint.solvedDate || complaint.solved_date || null,
        solved_date: complaint.solved_date,
        updatedAt: complaint.updatedAt,
      },
    })
  } catch (error) {
    console.error('Complaint status update error:', error.message, error.stack)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
}
