const User = require("../models/userModel");
const ProviderCredential = require("../models/providerCredentialModel");
const { seal } = require("../services/providerCredentials");
const { choices, listChoices } = require("../services/providerSelection");
const { keys, fail } = require("../services/validation");

const personalProviders = ["gemini", "groq", "together"];
const publicSettings = async (userId) => {
  const [user, credentials] = await Promise.all([
    User.findById(userId).select("providerChoice answerStyle audienceProfile usePastChats").lean(),
    ProviderCredential.find({ userId }).select("provider lastFour updatedAt").lean(),
  ]);
  if (!user) throw fail("Account not found.", 404, "NOT_FOUND");
  return {
    providerChoice: user.providerChoice || "deployment",
    answerStyle: user.answerStyle || "balanced",
    audienceProfile: user.audienceProfile || "general",
    usePastChats: Boolean(user.usePastChats),
    keyStorageAvailable: Boolean(process.env.USER_API_KEY_ENCRYPTION_KEY),
    personalKeys: credentials.map(({ provider, lastFour, updatedAt }) => ({ provider, lastFour, updatedAt })),
    providerChoices: listChoices(credentials),
  };
};
exports.getSettings = async (req, res, next) => { try { res.json(await publicSettings(req.user.id)); } catch (error) { next(error); } };
exports.updateSettings = async (req, res, next) => {
  try {
    keys(req.body, ["providerChoice", "answerStyle", "audienceProfile", "usePastChats"]);
    if (!Object.keys(req.body).length) throw fail("Choose a setting to update.");
    const update = {};
    if (req.body.providerChoice !== undefined) {
      if (!choices.includes(req.body.providerChoice)) throw fail("Choose a supported provider.");
      const current = await publicSettings(req.user.id);
      const available = current.providerChoices.find((item) => item.id === req.body.providerChoice)?.available;
      if (!available && req.body.providerChoice !== current.providerChoice) throw fail("This provider has no available key or model on this account.");
      update.providerChoice = req.body.providerChoice;
    }
    if (req.body.answerStyle !== undefined) {
      if (!["balanced", "brief", "detailed"].includes(req.body.answerStyle)) throw fail("Choose a supported answer style.");
      update.answerStyle = req.body.answerStyle;
    }
    if (req.body.audienceProfile !== undefined) {
      if (!["general", "student", "clinician"].includes(req.body.audienceProfile)) throw fail("Choose a supported audience profile.");
      update.audienceProfile = req.body.audienceProfile;
    }
    if (req.body.usePastChats !== undefined) {
      if (typeof req.body.usePastChats !== "boolean") throw fail("Past-chat memory must be on or off.");
      update.usePastChats = req.body.usePastChats;
    }
    await User.updateOne({ _id: req.user.id }, { $set: update });
    res.json(await publicSettings(req.user.id));
  } catch (error) { next(error); }
};
exports.saveKey = async (req, res, next) => {
  try {
    const provider = req.params.provider;
    if (!personalProviders.includes(provider)) throw fail("Choose a supported personal-key provider.");
    keys(req.body, ["apiKey"]);
    const sealed = seal(req.body.apiKey);
    await ProviderCredential.updateOne({ userId: req.user.id, provider }, { $set: sealed }, { upsert: true, runValidators: true });
    res.json(await publicSettings(req.user.id));
  } catch (error) { next(error); }
};
exports.deleteKey = async (req, res, next) => {
  try {
    const provider = req.params.provider;
    if (!personalProviders.includes(provider)) throw fail("Choose a supported personal-key provider.");
    await ProviderCredential.deleteOne({ userId: req.user.id, provider });
    await User.updateOne({ _id: req.user.id, providerChoice: "personal-" + provider }, { $set: { providerChoice: "deployment" } });
    res.json(await publicSettings(req.user.id));
  } catch (error) { next(error); }
};
