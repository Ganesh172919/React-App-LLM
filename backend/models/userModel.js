const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "pro", "admin"],
    default: "user",
    index: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  verificationTokenExpiry: Date,
  resetToken: String,
  resetTokenExpiry: Date,
  profile: {
    displayName: String,
    avatar: String,
    bio: { type: String, maxlength: 500 },
    company: String,
    timezone: { type: String, default: "UTC" },
  },
  preferences: {
    theme: { type: String, enum: ["dark", "light", "system"], default: "dark" },
    language: { type: String, default: "en" },
    notifications: { type: Boolean, default: true },
    defaultModel: { type: String, default: "gemini-1.5-flash" },
  },
  lastLoginAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
