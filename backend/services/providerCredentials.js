const { randomBytes, createCipheriv, createDecipheriv } = require("crypto");
const { fail } = require("./validation");

const VERSION = /^[A-Za-z0-9._-]{1,32}$/;
const validKey = (value) => /^[0-9a-f]{64}$/i.test(value || "");
const keyRing = () => {
  const entries = new Map();
  const configured = String(process.env.USER_API_KEY_ENCRYPTION_KEYS || "").trim();
  if (configured) {
    for (const item of configured.split(",")) {
      const [version, raw] = item.split(":");
      if (!VERSION.test(version || "") || !validKey(raw) || entries.has(version)) throw fail("Personal API key storage is misconfigured.", 503, "KEY_STORAGE_UNAVAILABLE");
      entries.set(version, Buffer.from(raw, "hex"));
    }
  }
  if (process.env.USER_API_KEY_ENCRYPTION_KEY) {
    if (!validKey(process.env.USER_API_KEY_ENCRYPTION_KEY)) throw fail("Personal API key storage is misconfigured.", 503, "KEY_STORAGE_UNAVAILABLE");
    if (entries.has("legacy")) throw fail("Personal API key storage has duplicate legacy keys.", 503, "KEY_STORAGE_UNAVAILABLE");
    entries.set("legacy", Buffer.from(process.env.USER_API_KEY_ENCRYPTION_KEY, "hex"));
  }
  if (!entries.size) throw fail("Personal API keys are unavailable on this deployment.", 503, "KEY_STORAGE_UNAVAILABLE");
  return entries;
};
const activeKeyVersion = () => process.env.USER_API_KEY_ENCRYPTION_KEY_VERSION || (process.env.USER_API_KEY_ENCRYPTION_KEYS ? "" : "legacy");
const encryptionKey = (version = activeKeyVersion()) => {
  const entries = keyRing();
  if (!VERSION.test(version || "") || !entries.has(version)) throw fail("Personal API key storage is misconfigured.", 503, "KEY_STORAGE_UNAVAILABLE");
  return { version, key: entries.get(version) };
};
const seal = (apiKey) => {
  if (typeof apiKey !== "string" || apiKey.length < 12 || apiKey.length > 512 || /\s|[\x00-\x1f\x7f]/.test(apiKey)) throw fail("Enter a valid API key without spaces (12 to 512 characters).");
  const iv = randomBytes(12);
  const encryption = encryptionKey();
  const cipher = createCipheriv("aes-256-gcm", encryption.key, iv);
  const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return { keyVersion: encryption.version, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64"), lastFour: apiKey.slice(-4), updatedAt: new Date() };
};
const openWithMetadata = (record) => {
  try {
    const encryption = encryptionKey(record.keyVersion || "legacy");
    const decipher = createDecipheriv("aes-256-gcm", encryption.key, Buffer.from(record.iv, "base64"));
    decipher.setAuthTag(Buffer.from(record.tag, "base64"));
    const apiKey = Buffer.concat([decipher.update(Buffer.from(record.ciphertext, "base64")), decipher.final()]).toString("utf8");
    return { apiKey, keyVersion: encryption.version, requiresRotation: encryption.version !== activeKeyVersion() };
  } catch { throw fail("The saved API key could not be read. Remove it and add a new key.", 503, "KEY_UNAVAILABLE"); }
};
const open = (record) => openWithMetadata(record).apiKey;
const validateKeyConfiguration = () => { encryptionKey(); };
module.exports = { seal, open, openWithMetadata, activeKeyVersion, validateKeyConfiguration };
