const { logger } = require("../services/logger");

class ValidationError extends Error {
  constructor(message, field, value) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    this.value = value;
  }
}

const validators = {
  isEmail(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  isStrongPassword(value) {
    return (
      typeof value === "string" &&
      value.length >= 8 &&
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /[0-9]/.test(value)
    );
  },

  isNotEmpty(value) {
    return value !== undefined && value !== null && value !== "";
  },

  isString(value) {
    return typeof value === "string";
  },

  isNumber(value) {
    return typeof value === "number" && !isNaN(value);
  },

  isBoolean(value) {
    return typeof value === "boolean";
  },

  isArray(value) {
    return Array.isArray(value);
  },

  maxLength(value, max) {
    return typeof value === "string" && value.length <= max;
  },

  minLength(value, min) {
    return typeof value === "string" && value.length >= min;
  },

  isIn(value, allowedValues) {
    return allowedValues.includes(value);
  },

  isUUID(value) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  isMongoId(value) {
    return /^[0-9a-fA-F]{24}$/.test(value);
  },

  isSafeString(value) {
    if (typeof value !== "string") return false;
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /exec\s*\(/i,
    ];
    return !dangerousPatterns.some((p) => p.test(value));
  },
};

function sanitizeInput(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [source, fields] of Object.entries(schema)) {
      const data = req[source];
      if (!data && Object.keys(fields).length > 0) {
        errors.push({ source, message: `Missing ${source} data` });
        continue;
      }

      for (const [field, rules] of Object.entries(fields)) {
        const value = data?.[field];

        for (const rule of rules) {
          let isValid = true;
          let message = "";

          if (typeof rule === "string") {
            switch (rule) {
              case "required":
                isValid = validators.isNotEmpty(value);
                message = `${field} is required`;
                break;
              case "email":
                isValid = !value || validators.isEmail(value);
                message = `${field} must be a valid email`;
                break;
              case "string":
                isValid = !value || validators.isString(value);
                message = `${field} must be a string`;
                break;
              case "number":
                isValid = !value || validators.isNumber(value);
                message = `${field} must be a number`;
                break;
              case "boolean":
                isValid = value === undefined || validators.isBoolean(value);
                message = `${field} must be a boolean`;
                break;
              case "array":
                isValid = !value || validators.isArray(value);
                message = `${field} must be an array`;
                break;
              case "uuid":
                isValid = !value || validators.isUUID(value);
                message = `${field} must be a valid UUID`;
                break;
              case "mongoId":
                isValid = !value || validators.isMongoId(value);
                message = `${field} must be a valid ID`;
                break;
              case "safe":
                isValid = !value || validators.isSafeString(value);
                message = `${field} contains potentially unsafe content`;
                break;
              case "strongPassword":
                isValid = !value || validators.isStrongPassword(value);
                message = `${field} must be at least 8 characters with uppercase, lowercase, and number`;
                break;
            }
          } else if (typeof rule === "object") {
            if (rule.maxLength) {
              isValid = !value || validators.maxLength(value, rule.maxLength);
              message = `${field} must not exceed ${rule.maxLength} characters`;
            }
            if (rule.minLength) {
              isValid = !value || validators.minLength(value, rule.minLength);
              message = `${field} must be at least ${rule.minLength} characters`;
            }
            if (rule.in) {
              isValid = !value || validators.isIn(value, rule.in);
              message = `${field} must be one of: ${rule.in.join(", ")}`;
            }
            if (rule.custom) {
              isValid = rule.custom(value, data);
              message = rule.message || `${field} validation failed`;
            }
          }

          if (!isValid) {
            errors.push({ field, message, source });
          }
        }
      }
    }

    if (errors.length > 0) {
      logger.debug("Validation failed", {
        path: req.path,
        errors,
      });
      return res.status(400).json({
        error: "Validation failed",
        details: errors,
      });
    }

    next();
  };
}

const commonSchemas = {
  login: {
    body: {
      email: ["required", "email"],
      password: ["required", "string"],
    },
  },
  register: {
    body: {
      email: ["required", "email"],
      password: ["required", "string", { minLength: 6 }],
    },
  },
  saveChat: {
    body: {
      prompt: ["required", "string", "safe", { maxLength: 10000 }],
      response: ["required", "string"],
    },
  },
  deleteChat: {
    body: {
      sessionId: ["required", "string"],
    },
  },
  createApiKey: {
    body: {
      name: ["required", "string", "safe", { maxLength: 100 }],
    },
  },
  agentPlan: {
    body: {
      requirements: ["required", "string", "safe", { maxLength: 5000 }],
    },
  },
  subscriptionUpgrade: {
    body: {
      tier: ["required", "string", { in: ["pro", "enterprise"] }],
    },
  },
};

module.exports = {
  validate,
  validators,
  sanitizeInput,
  commonSchemas,
  ValidationError,
};
