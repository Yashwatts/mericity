const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: { type: String, enum: ["user", "admin"], required: true },
  text: { type: String },
  attachments: [String],
  createdAt: { type: Date, default: Date.now },
});

const CommentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ComplaintSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true },

  // Location fields
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String }, // reverse geocoded formatted address
    detailedAddress: { type: String }, // detailed street address with all components
    streetAddress: { type: String }, // street number, route, and building info
    premise: { type: String }, // building/premise name
    subpremise: { type: String }, // apartment/unit number
    establishment: { type: String }, // establishment name
    pointOfInterest: { type: String }, // nearby point of interest
    sublocality: { type: String }, // primary sublocality/neighborhood
    sublocality1: { type: String }, // sublocality level 1
    sublocality2: { type: String }, // sublocality level 2
    sublocality3: { type: String }, // sublocality level 3
    city: { type: String }, // assigned city
    state: { type: String }, // assigned state
    district: { type: String }, // district/administrative area level 2
    postalCode: { type: String }, // postal/zip code
    country: { type: String }, // country
  },

  // Admin assignment
  assignedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },

  // Department assignment (AI-based routing)
  assignedDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
  },
  
  // Store department detection info before assignment (for phone verification workflow)
  detectedDepartmentInfo: {
    detectedDepartment: { type: String }, // AI detected department type
    confidence: { type: Number }, // AI confidence score
    reasoning: { type: String }, // AI reasoning
    analysisMethod: { type: String }, // gemini-ai or fallback-keywords
    isFallback: { type: Boolean, default: false }, // whether fallback was used
  },
  
  // Legacy department routing (for backward compatibility)
  departmentRouting: {
    detectedDepartment: { type: String }, // AI detected department type
    confidence: { type: Number }, // AI confidence score
    reasoning: { type: String }, // AI reasoning
    analysisMethod: { type: String }, // gemini-ai or fallback-keywords
    isFallback: { type: Boolean, default: false }, // whether fallback was used
  },

  // Phone verification fields
  phoneVerificationStatus: {
    type: String,
    enum: ["pending", "phone_verified", "rejected_by_user", "verification_failed", "timeout", "failed", "error"],
    default: "pending"
  },
  phoneVerificationCallSid: { type: String }, // Twilio call SID
  phoneVerificationInitiatedAt: { type: Date },
  phoneVerificationAt: { type: Date },
  phoneVerificationInput: { type: String }, // User's DTMF input (1 or 2)
  phoneVerificationError: { type: String }, // Error message if verification fails
  callStatusUpdates: [{
    status: String,
    timestamp: Date,
    duration: String,
    data: mongoose.Schema.Types.Mixed
  }],

  // Auto-routing data (when complaint gets routed after verification)
  autoRoutingData: {
    detectedDepartment: { type: String },
    confidence: { type: Number },
    reasoning: { type: String },
    method: { type: String }
  },
  assignedAt: { type: Date }, // When complaint was assigned to department
  routingError: { type: String }, // Error if routing fails

  assignedCity: { type: String }, // for quick queries
  assignedState: { type: String },
  image: { type: String, required: true }, // store file URL/path - REQUIRED
  audio: { type: String }, // store audio file URL/path - OPTIONAL
  phone: { type: String, required: true }, // REQUIRED
  priority: { type: String, enum: ["High", "Medium", "Low"] }, // OPTIONAL
  reason: { type: String }, // OPTIONAL

  status: {
    type: String,
    enum: [
      "pending", "in_progress", "resolved", "rejected", 
      "pending_verification", "phone_verified", "rejected_by_user", 
      "verification_failed", "verification_timeout", "pending_manual_verification",
      "pending_assignment", "rejected_no_answer", "rejected_by_department"
    ],
    default: "pending_verification",
  },
  rejectionReason: { type: String }, // Reason for rejection when status is 'rejected'
  departmentComment: { type: String }, // Comments from department
  
  // Department Rejection Details
  departmentRejection: {
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    rejectedAt: { type: Date },
    reason: { type: String },
    additionalNotes: { type: String }
  },
  
  // Admin Actions on User
  adminActions: [{
    actionType: { type: String, enum: ['warning', 'blacklist'] },
    reason: { type: String },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    actionDate: { type: Date, default: Date.now },
    notes: { type: String }
  }],
  
  messages: [MessageSchema],

  // No-answer call tracking
  noAnswerCallStatus: { type: String }, // Twilio call status that indicated no answer ('no-answer', 'busy', 'failed')
  noAnswerTimestamp: { type: Date }, // When the no-answer status was received
  rejectedAt: { type: Date }, // When the complaint was rejected (for any reason)

  // Community features
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [CommentSchema],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ComplaintSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Complaint", ComplaintSchema);
