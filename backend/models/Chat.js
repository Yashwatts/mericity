const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderModel'
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['User', 'Admin', 'Department']
  },
  senderName: {
    type: String,
    required: true
  },
  senderRole: {
    type: String,
    required: true,
    enum: ['user', 'admin', 'department']
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'userModel'
    },
    userModel: {
      type: String,
      enum: ['User', 'Admin', 'Department']
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  messageType: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number
  }]
});

const chatSchema = new mongoose.Schema({
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true
  },
  chatType: {
    type: String,
    enum: ['user-department', 'admin-department', 'user-admin'],
    required: true
  },
  participants: [{
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'participants.participantModel'
    },
    participantModel: {
      type: String,
      enum: ['User', 'Admin', 'Department']
    },
    participantName: String,
    participantRole: {
      type: String,
      enum: ['user', 'admin', 'department']
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastSeenAt: {
      type: Date,
      default: Date.now
    }
  }],
  messages: [messageSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
chatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for efficient queries
chatSchema.index({ complaintId: 1, chatType: 1 }, { unique: true }); // Ensure unique chat rooms per complaint and type
chatSchema.index({ 'participants.participantId': 1 });
chatSchema.index({ 'messages.timestamp': -1 });

module.exports = mongoose.model("Chat", chatSchema);