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
  department: {
    type: String,
    trim: true,
  },
  complaintType: {
    type: String,
    trim: true,
    default: null,
  },
  timeLimit: {
    type: Number,
    min: 1,
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
  escalation_history: [
    {
      from: { type: String, trim: true },
      to: { type: String, trim: true },
      escalated_at: { type: Date, default: Date.now },
      escalatedAt: { type: Date, default: Date.now },
    },
  ],
}, {
  timestamps: { createdAt: false, updatedAt: true },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})

complaintSchema.virtual('assignedRole').get(function () {
  return this.current_level
})

complaintSchema.virtual('currentRole').get(function () {
  return this.current_level
})

complaintSchema.virtual('escalationLevel').get(function () {
  return this.current_level
})

complaintSchema.virtual('deadlineDate').get(function () {
  return this.deadline_date
})

complaintSchema.virtual('escalationHistory').get(function () {
  return this.escalation_history
})

const Complaint = mongoose.model('Complaint', complaintSchema)

export default Complaint
