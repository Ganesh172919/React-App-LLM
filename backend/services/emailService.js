// Import the Brevo (formerly Sendinblue) Transactional Email SDK library.
// Provides API client authentication and transactional email delivery mechanisms.
// Connects user account notifications with reliable third-party email transports.
const SibApiV3Sdk = require("sib-api-v3-sdk");

// Service class encapsulating transactional email delivery for authentication events.
// Dispatches email verification links and password recovery tokens via Brevo REST API.
// Validates credentials and constructs secure branded HTML messages with expiring URLs.
class EmailService {
  isConfigured() {
    const address = process.env.EMAIL_FROM_ADDRESS?.trim();
    return Boolean(process.env.BREVO_API_KEY?.trim() && address && !address.toLowerCase().endsWith("@example.com"));
  }

  // Transmits transactional email containing action URL and cryptographic token.
  // Validates presence of non-placeholder BREVO_API_KEY and valid sender addresses.
  // Dispatches transactional email through Brevo's TransactionalEmailsApi instance.
  async send(email, token, type) {
    if (!this.isConfigured()) throw new Error("Email is not configured");
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
    const api = new SibApiV3Sdk.TransactionalEmailsApi();
    const origin = (process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "");
    const reset = type === "reset";
    const url = origin + (reset ? "/reset-password?token=" : "/verify-email?token=") + encodeURIComponent(token);
    return api.sendTransacEmail({
      sender: { email: process.env.EMAIL_FROM_ADDRESS, name: process.env.EMAIL_FROM_NAME || "MedAssist AI" },
      to: [{ email }], subject: reset ? "Reset your MedAssist password" : "Verify your MedAssist email",
      htmlContent: '<div style="font-family:Arial,sans-serif;line-height:1.6"><h1>MedAssist AI</h1><p>' + (reset ? "A password reset was requested for your account." : "Verify your email to finish registration.") + '</p><p><a href="' + url + '">' + (reset ? "Reset password" : "Verify email") + "</a></p><p>This link expires in " + (reset ? "one hour" : "24 hours") + ". If you did not request it, ignore this email.</p></div>",
    });
  }

  // Helper method dispatching account verification email with 24-hour expiration link.
  // Formats verification target URL referencing the client-side verify-email view.
  // Invokes send method with type parameter set to "verify".
  sendVerificationEmail(email, token) { return this.send(email, token, "verify"); }

  // Helper method dispatching password reset email with 1-hour expiration link.
  // Formats password recovery target URL referencing the client-side reset-password view.
  // Invokes send method with type parameter set to "reset".
  sendPasswordResetEmail(email, token) { return this.send(email, token, "reset"); }
}

// Export singleton instance of EmailService for application-wide mail delivery.
// Injected into authController and server locals for account recovery and signups.
// Supports dependency injection override in automated integration test suites.
module.exports = new EmailService();
