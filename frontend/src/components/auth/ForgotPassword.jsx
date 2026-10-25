/**
 * ============================================================================
 * MEDASSIST AI - FORGOT PASSWORD VIEW (ForgotPassword.jsx)
 * ============================================================================
 * Role:
 *   Handles self-service password reset requests. Submits user email to
 *   `POST /api/auth/forgot-password`. Alerts the user that a recovery email
 *   was dispatched and redirects to `/login` after a 3-second delay.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: PASSWORD RECOVERY REQUEST
 * ----------------------------------------------------------------------------
 * [ForgotPassword Component]
 *   │
 *   ├── 1. Email Input Form
 *   ├── 2. Submission Handler (handleSubmit)
 *   │     ├── Calls apiRequest("/auth/forgot-password", { email })
 *   │     ├── Displays confirmation message
 *   │     └── Sets 3-second timer redirecting to /login
 *   └── 3. Navigation: Link back to /login
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: PASSWORD RESET DISPATCH
 * ----------------------------------------------------------------------------
 *  [User Enters Email] ──► apiRequest('/auth/forgot-password')
 *                                   │
 *                                   ▼
 *                      Display Confirmation Message
 *                                   │
 *                                   ▼ (after 3 seconds)
 *                             navigate('/login')
 * ============================================================================
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../lib/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage("Password reset email sent. Please check your inbox.");
      setEmail("");
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error) {
      setMessage(error.message || "Failed to send reset email");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-white text-center">
          Reset Password
        </h2>
        {message && (
          <div
            className={`mb-4 p-3 rounded ${
              message.includes("success") ? "bg-green-600" : "bg-red-600"
            } text-white text-center`}
          >
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 p-2 w-full bg-gray-700 text-white rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isSubmitting}
            />
          </div>
          <button
            type="submit"
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
        <div className="mt-4 text-center">
          <a href="/login" className="text-blue-500 hover:underline">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
