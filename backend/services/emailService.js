const SibApiV3Sdk = require("sib-api-v3-sdk");
class EmailService {
  async send(email, token, type) {
    if (!process.env.BREVO_API_KEY || !process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_FROM_ADDRESS.endsWith("@example.com")) throw new Error("Email is not configured");
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
  sendVerificationEmail(email, token) { return this.send(email, token, "verify"); }
  sendPasswordResetEmail(email, token) { return this.send(email, token, "reset"); }
}
module.exports = new EmailService();
