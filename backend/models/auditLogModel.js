const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  resource: {
    type: String,
    required: true,
    index: true,
  },
  resourceId: {
    type: String,
  },
  details: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String,
  status: {
    type: String,
    enum: ["success", "failure", "error"],
    default: "success",
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });

auditLogSchema.statics.log = async function (data) {
  return this.create(data);
};

auditLogSchema.statics.getRecentLogs = function (limit = 100, filter = {}) {
  return this.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate("userId", "email")
    .lean();
};

module.exports = mongoose.model("AuditLog", auditLogSchema);
