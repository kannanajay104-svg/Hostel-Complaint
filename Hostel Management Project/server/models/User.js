import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['student', 'warden', 'manager', 'viceprincipal'],
    },
    roomNumber: {
      type: String,
      required: function requiredRoomNumber() {
        return this.role === 'student'
      },
      trim: true,
      default: '',
    },
    block: {
      type: String,
      required: function requiredBlock() {
        return this.role === 'student'
      },
      trim: true,
      default: '',
    },
    floorNumber: {
      type: String,
      required: function requiredFloorNumber() {
        return this.role === 'student'
      },
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
)

userSchema.index({ email: 1, role: 1, block: 1 }, { unique: true })

const User = mongoose.model('User', userSchema)

export default User
