const router = require("express").Router();
const controller = require("../controllers/settingsController");
router.use((req, res, next) => req.method === "GET" ? next() : req.app.locals.settingsLimiter(req, res, next));
router.get("/", controller.getSettings);
router.patch("/", controller.updateSettings);
router.put("/keys/:provider", controller.saveKey);
router.delete("/keys/:provider", controller.deleteKey);
module.exports = router;
