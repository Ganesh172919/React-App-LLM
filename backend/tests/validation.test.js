const { validate, validators, sanitizeInput, commonSchemas } = require("../middleware/validation");

describe("Validation Middleware", () => {
  describe("validators", () => {
    test("isEmail validates correctly", () => {
      expect(validators.isEmail("test@example.com")).toBe(true);
      expect(validators.isEmail("invalid")).toBe(false);
      expect(validators.isEmail("")).toBe(false);
    });

    test("isStrongPassword validates correctly", () => {
      expect(validators.isStrongPassword("Abcdef1g")).toBe(true);
      expect(validators.isStrongPassword("weak")).toBe(false);
      expect(validators.isStrongPassword("nouppercase1")).toBe(false);
      expect(validators.isStrongPassword("NOLOWERCASE1")).toBe(false);
      expect(validators.isStrongPassword("NoNumbers")).toBe(false);
    });

    test("isNotEmpty validates correctly", () => {
      expect(validators.isNotEmpty("hello")).toBe(true);
      expect(validators.isNotEmpty("")).toBe(false);
      expect(validators.isNotEmpty(null)).toBe(false);
      expect(validators.isNotEmpty(undefined)).toBe(false);
    });

    test("maxLength validates correctly", () => {
      expect(validators.maxLength("abc", 5)).toBe(true);
      expect(validators.maxLength("abcdef", 5)).toBe(false);
    });

    test("isIn validates correctly", () => {
      expect(validators.isIn("pro", ["free", "pro", "enterprise"])).toBe(true);
      expect(validators.isIn("ultra", ["free", "pro", "enterprise"])).toBe(false);
    });

    test("isUUID validates correctly", () => {
      expect(validators.isUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(validators.isUUID("not-a-uuid")).toBe(false);
    });

    test("isSafeString rejects dangerous patterns", () => {
      expect(validators.isSafeString("hello world")).toBe(true);
      expect(validators.isSafeString("<script>alert('xss')</script>")).toBe(false);
      expect(validators.isSafeString("javascript:void(0)")).toBe(false);
      expect(validators.isSafeString("eval(code)")).toBe(false);
    });
  });

  describe("sanitizeInput", () => {
    test("escapes HTML characters", () => {
      expect(sanitizeInput("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"
      );
    });

    test("returns non-string values unchanged", () => {
      expect(sanitizeInput(42)).toBe(42);
      expect(sanitizeInput(true)).toBe(true);
      expect(sanitizeInput(null)).toBe(null);
    });
  });

  describe("validate middleware", () => {
    test("passes for valid input", () => {
      const middleware = validate(commonSchemas.login);
      const req = { body: { email: "test@example.com", password: "password123" } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test("rejects missing required fields", () => {
      const middleware = validate(commonSchemas.login);
      const req = { body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test("rejects invalid email", () => {
      const middleware = validate(commonSchemas.login);
      const req = { body: { email: "notanemail", password: "password123" } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
