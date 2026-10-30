const router = require("express").Router();
router.post("/chat", require("../controllers/aiController").handleChat);
module.exports = router;
