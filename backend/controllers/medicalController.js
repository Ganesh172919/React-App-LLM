const { handleChat } = require("./aiController");
exports.handleMedicalQuery = (req, res, next) => { req.forceMedical = true; return handleChat(req, res, next); };
