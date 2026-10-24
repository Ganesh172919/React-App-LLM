const mongoose = require("mongoose");

const referenceSchema = new mongoose.Schema(
  {
    title: String,
    authors: [String],
    journal: String,
    pubdate: String,
    pmid: String,
    url: String,
  },
  { _id: false }
);

const verificationSchema = new mongoose.Schema(
  {
    status: String,
    provider: String,
    model: String,
    sourceCount: Number,
    grounded: Boolean,
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true,
    },
    response: {
      type: String,
      required: true,
    },
    isMedical: {
      type: Boolean,
      default: false,
    },
    references: [referenceSchema],
    verification: verificationSchema,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  messages: [messageSchema],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: "New Chat",
  },
  isMedical: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

chatSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  if (this.isModified("messages")) {
    this.isMedical = this.messages.some((msg) => msg.isMedical);
  }

  next();
});

module.exports = mongoose.model("Chat", chatSchema);
