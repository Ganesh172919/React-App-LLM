const Chat = require("../models/chatModel");
const { v4: uuidv4 } = require("uuid");

exports.saveChat = async (req, res) => {
  try {
    const { sessionId, isMedical = false, references = [], verification } = req.body;
    const prompt = typeof req.body.prompt === "string" ? req.body.prompt.trim() : "";
    const response = typeof req.body.response === "string" ? req.body.response.trim() : "";
    if (!prompt || !response) {
      return res
        .status(400)
        .json({ message: "Prompt and response are required" });
    }

    let chat;
    if (sessionId) {
      chat = await Chat.findOneAndUpdate(
        { sessionId, userId: req.user.id },
        {
          $push: {
            messages: { prompt, response, isMedical, references, verification },
          },
          $set: {
            updatedAt: Date.now(),
          },
        },
        { new: true, upsert: false }
      );

      if (!chat) {
        const newSessionId = uuidv4();
        chat = new Chat({
          sessionId: newSessionId,
          userId: req.user.id,
          title: prompt.slice(0, 30) || "New Chat",
          messages: [{ prompt, response, isMedical, references, verification }],
          isMedical,
        });
        await chat.save();
      }
    } else {
      const newSessionId = uuidv4();
      chat = new Chat({
        sessionId: newSessionId,
        userId: req.user.id,
        title: prompt.slice(0, 30) || "New Chat",
        messages: [{ prompt, response, isMedical, references, verification }],
        isMedical,
      });
      await chat.save();
    }

    if (req.app.locals.broadcastUpdate) {
      req.app.locals.broadcastUpdate({
        action: chat.sessionId === sessionId ? "UPDATE" : "NEW",
        chat: {
          id: chat.sessionId,
          sessionId: chat.sessionId,
          title: chat.title,
          isMedical: chat.isMedical,
          messages: chat.messages.flatMap((msg) => [
            {
              text: msg.prompt,
              isUser: true,
              timestamp: msg.timestamp,
              isMedical: msg.isMedical,
            },
            {
              text: msg.response,
              isUser: false,
              timestamp: msg.timestamp,
              isMedical: msg.isMedical,
              references: msg.references,
              verification: msg.verification,
            },
          ]),
          timestamp: chat.updatedAt,
        },
        sessionId: chat.sessionId,
        userId: chat.userId.toString(),
      }, req.user.id);
    }

    res.status(201).json({
      message: "Chat saved successfully",
      sessionId: chat.sessionId,
      isNew: chat.sessionId !== sessionId,
    });
  } catch (error) {
    console.error("Error saving chat:", error);
    res
      .status(500)
      .json({ message: "Error saving chat", error: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .lean();

    const formattedChats = chats.map((chat) => ({
      id: chat.sessionId,
      title: chat.title || chat.messages[0]?.prompt?.slice(0, 30) || "New Chat",
      messages: chat.messages.flatMap((msg) => [
        {
          text: msg.prompt,
          isUser: true,
          timestamp: msg.timestamp,
          isMedical: msg.isMedical,
        },
        {
          text: msg.response,
          isUser: false,
          timestamp: msg.timestamp,
          isMedical: msg.isMedical,
          references: msg.references,
          verification: msg.verification,
        },
      ]),
      timestamp: chat.updatedAt,
      isMedical: chat.isMedical,
    }));

    res.status(200).json(formattedChats);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res
      .status(500)
      .json({ message: "Error fetching chat history", error: error.message });
  }
};

exports.deleteChat = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }

    console.log(
      `Attempting to delete chat session: ${sessionId} for user: ${req.user.id}`
    );

    const chat = await Chat.findOne({
      sessionId: sessionId,
      userId: req.user.id,
    });

    if (!chat) {
      console.log(`Chat session not found or not owned by user: ${sessionId}`);
      return res.status(404).json({
        success: false,
        message: "Chat session not found or not owned by user",
      });
    }

    await Chat.deleteOne({ _id: chat._id });

    console.log(`Successfully deleted chat session: ${sessionId}`);

    if (req.app.locals.broadcastUpdate) {
      req.app.locals.broadcastUpdate({
        action: "DELETE",
        sessionId: sessionId,
        userId: req.user.id.toString(),
      }, req.user.id);
    }

    res.status(200).json({
      success: true,
      message: "Chat session deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete chat session",
      error: error.message,
    });
  }
};
