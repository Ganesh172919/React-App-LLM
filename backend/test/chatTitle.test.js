const test = require("node:test");
const assert = require("node:assert/strict");
const { makeConversationTitle } = require("../controllers/chatController");

test("conversation titles omit pasted Markdown URLs and images", () => {
  assert.equal(makeConversationTitle("What are migraine triggers? [unreviewed](https://example.invalid/track) ![pixel](https://example.invalid/pixel)"), "What are migraine triggers? unreviewed");
  assert.equal(makeConversationTitle("https://example.invalid/only"), "New conversation");
  assert.ok(makeConversationTitle("a".repeat(100)).length <= 60);
});
