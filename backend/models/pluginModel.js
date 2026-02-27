const mongoose = require("mongoose");

const pluginSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true,
  },
  version: {
    type: String,
    required: true,
    default: "1.0.0",
  },
  description: {
    type: String,
    required: true,
    maxlength: 500,
  },
  author: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: String,
    email: String,
  },
  category: {
    type: String,
    enum: [
      "ai_enhancement",
      "data_processing",
      "integration",
      "analytics",
      "security",
      "productivity",
      "medical",
      "automation",
      "other",
    ],
    default: "other",
    index: true,
  },
  status: {
    type: String,
    enum: ["draft", "pending_review", "published", "suspended", "deprecated"],
    default: "draft",
    index: true,
  },
  config: {
    entryPoint: String,
    permissions: [String],
    hooks: [
      {
        event: String,
        handler: String,
      },
    ],
    settings: mongoose.Schema.Types.Mixed,
  },
  pricing: {
    type: {
      type: String,
      enum: ["free", "paid", "freemium"],
      default: "free",
    },
    price: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
  },
  stats: {
    installs: { type: Number, default: 0 },
    activeInstalls: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    totalApiCalls: { type: Number, default: 0 },
  },
  requiredTier: {
    type: String,
    enum: ["free", "pro", "enterprise"],
    default: "pro",
  },
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

pluginSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

pluginSchema.statics.findPublished = function (category = null) {
  const query = { status: "published" };
  if (category) query.category = category;
  return this.find(query).sort({ "stats.installs": -1 });
};

const pluginInstallSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  pluginId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plugin",
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["active", "disabled", "uninstalled"],
    default: "active",
  },
  settings: mongoose.Schema.Types.Mixed,
  installedAt: {
    type: Date,
    default: Date.now,
  },
});

pluginInstallSchema.index({ userId: 1, pluginId: 1 }, { unique: true });

const Plugin = mongoose.model("Plugin", pluginSchema);
const PluginInstall = mongoose.model("PluginInstall", pluginInstallSchema);

module.exports = { Plugin, PluginInstall };
