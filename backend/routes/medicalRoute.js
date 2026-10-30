const router = require("express").Router();
router.post("/", require("../controllers/medicalController").handleMedicalQuery);
module.exports = router;
