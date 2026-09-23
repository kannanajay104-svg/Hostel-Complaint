import mongoose from 'mongoose'

const complaintSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  block: {
    type: String,
    required: true,
    trim: true,
  },
  floor: {
    type: String,
    required: true,
    trim: true,
  },
  room: {
    type: String,
    trim: true,
    default: '',
  },
  complaint_title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  image_path: {
    type: String,
    required: true,
    trim: true,
  },
  created_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  time_limit_days: {
    type: Number,
    required: true,
    default: 4,
    min: 1,
  },
  deadline_date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    required: true,
    default: 'Pending',
    trim: true,
  },
  solvedDate: {
    type: Date,
    default: null,
  },
  solved_date: {
    type: Date,
    default: null,
  },
  current_level: {
    type: String,
    required: true,
    default: 'Warden',
    trim: true,
  },
  escalated_to_manager_at: {
    type: Date,
    default: null,
  },
  escalated_to_viceprincipal_at: {
    type: Date,
    default: null,
  },
  escalated_to_principal_at: {
    type: Date,
    default: null,
  },
}, {
  timestamps: { createdAt: false, updatedAt: true },
})

const Complaint = mongoose.model('Complaint', complaintSchema)

export default Complaint
