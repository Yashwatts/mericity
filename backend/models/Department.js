const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    departmentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    departmentType: {
      type: String,
      required: true,
      enum: [
        "Fire Department",
        "Police Department",
        "Water Department",
        "Road Department",
        "Health Department",
        "Electricity Department",
        "Municipal Corporation",
        "Other",
      ],
    },
    assignedCity: {
      type: String,
      required: true,
      trim: true,
    },
    assignedState: {
      type: String,
      required: true,
      trim: true,
    },
    assignedDistrict: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    contactNumber: {
      type: String,
      required: true,
      match: [/^\d{10}$/, "Please enter a valid 10-digit phone number"],
    },
    officeAddress: {
      type: String,
      required: true,
      trim: true,
    },
    headOfDepartment: {
      type: String,
      required: true,
      trim: true,
    },
    establishedYear: {
      type: Number,
      required: true,
      min: 1800,
      max: new Date().getFullYear(),
    },
    serviceAreas: [
      {
        type: String,
        trim: true,
      },
    ],
    role: {
      type: String,
      default: "department",
      enum: ["department", "admin"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
departmentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
departmentSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Hide sensitive data when converting to JSON
departmentSchema.methods.toJSON = function () {
  const department = this.toObject();
  delete department.password;
  return department;
};

// Static method to find department by ID
departmentSchema.statics.findByDepartmentId = function (departmentId) {
  return this.findOne({ departmentId, isActive: true });
};

module.exports = mongoose.model("Department", departmentSchema);
