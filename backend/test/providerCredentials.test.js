const { test } = require("node:test");
const assert = require("node:assert/strict");
const { seal, openWithMetadata } = require("../services/providerCredentials");

const key = (character) => character.repeat(64);

test("encrypted personal keys support a named active key and a legacy rotation path", (context) => {
  const names = ["USER_API_KEY_ENCRYPTION_KEY", "USER_API_KEY_ENCRYPTION_KEYS", "USER_API_KEY_ENCRYPTION_KEY_VERSION"];
  const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  context.after(() => { for (const name of names) original[name] === undefined ? delete process.env[name] : process.env[name] = original[name]; });
  process.env.USER_API_KEY_ENCRYPTION_KEY = key("a"); delete process.env.USER_API_KEY_ENCRYPTION_KEYS; delete process.env.USER_API_KEY_ENCRYPTION_KEY_VERSION;
  const legacy = seal("synthetic-personal-key-12345");
  assert.equal(legacy.keyVersion, "legacy");
  process.env.USER_API_KEY_ENCRYPTION_KEY = key("a");
  process.env.USER_API_KEY_ENCRYPTION_KEYS = "v2:" + key("b"); process.env.USER_API_KEY_ENCRYPTION_KEY_VERSION = "v2";
  const revealed = openWithMetadata(legacy);
  assert.equal(revealed.apiKey, "synthetic-personal-key-12345"); assert.equal(revealed.requiresRotation, true);
  const rotated = seal(revealed.apiKey);
  assert.equal(rotated.keyVersion, "v2"); assert.equal(openWithMetadata(rotated).requiresRotation, false);
});
