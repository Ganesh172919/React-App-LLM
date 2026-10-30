const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (message, status = 400, code = "INVALID_INPUT") => Object.assign(new Error(message), { status, code });
const id = (value, optional = false) => { if (optional && (value === null || value === undefined)) return null; if (typeof value !== "string" || !UUID.test(value)) throw fail("A valid UUID is required."); return value; };
const text = (value, name, max) => { if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw fail(name + " must contain 1 to " + max + " characters."); return value.trim(); };
const keys = (body, allowed) => { if (!body || Array.isArray(body) || typeof body !== "object" || Object.keys(body).some((key) => !allowed.includes(key))) throw fail("Unexpected request fields."); };
module.exports = { id, text, keys, fail };
