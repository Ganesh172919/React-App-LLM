const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  exchangeId: { type: String, required: true },
  inputHash: { type: String, required: true },
  sessionId: { type: String, required: true },
  newConversation: Boolean,
  state: { type: String, enum: ["pending", "ready"], default: "pending" },
  result: mongoose.Schema.Types.Mixed,
  expiresAt: { type: Date, default: () => new Date(Date.now() + 86400000), expires: 0 },
}, { timestamps: true });
schema.index({ userId: 1, exchangeId: 1 }, { unique: true });
module.exports = mongoose.model("Generation", schema);
