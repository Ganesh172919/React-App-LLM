const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  provider: { type: String, enum: ["gemini", "groq", "together"], required: true },
  iv: { type: String, required: true, select: false },
  tag: { type: String, required: true, select: false },
  ciphertext: { type: String, required: true, select: false },
  lastFour: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});
schema.index({ userId: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model("ProviderCredential", schema);
