/**
 * ============================================================================
 * MEDASSIST AI - RESET PASSWORD VIEW (ResetPassword.jsx)
 * ============================================================================
 * Role:
 *   Handles password updates using tokenized recovery links. Reads `token`
 *   from URL search parameters, validates password match and minimum length
 *   (8 characters), and posts new credentials to `POST /api/auth/reset-password`.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: PASSWORD RESET FORM & VALIDATION
 * ----------------------------------------------------------------------------
 * [ResetPassword Component]
 *   │
 *   ├── 1. URL Query Extraction
 *   │     └── Reads token from URL (?token=...)
 *   │     └── If missing: Renders invalid link view with link to /forgot-password
 *   │
 *   ├── 2. Form Inputs: New Password and Confirm Password (minLength: 8)
 *   │
 *   ├── 3. Submission Handler (handleSubmit)
 *   │     ├── Verifies newPassword === confirmPassword
 *   │     ├── Calls apiRequest("/auth/reset-password", { token, newPassword })
 *   │     ├── Displays success message
 *   │     └── Sets 2-second timeout to redirect to /login
 *   │
 *   └── 4. Error Boundary: Displays failure reason if token expired
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: PASSWORD RESET SUBMISSION
 * ----------------------------------------------------------------------------
 *  [User Enters New Password] ──► (newPassword === confirmPassword?)
 *                                             │
 *                                ┌────────────┴────────────┐
 *                                ▼                         ▼
 *                             [True]                    [False]
 *                                │                         │
 *                                ▼                         ▼
 *                 POST /api/auth/reset-password      "Passwords do not match"
 *                                │
 *                       ┌────────┴────────┐
 *                       ▼                 ▼
 *                  200 Success          Error
 *                       │                 │
 *                       ▼                 ▼
 *               navigate('/login')   Display Error
 * ============================================================================
 */
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../lib/api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      });
      setMessage("Password reset successfully");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      setMessage(error.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md text-center">
          <p className="text-red-500">
            Invalid reset link. Please request a new one.
          </p>
          <button
            onClick={() => navigate("/forgot-password")}
            className="mt-4 text-blue-500 hover:underline"
          >
            Request New Reset Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-white text-center">
          Set New Password
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
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-300"
            >
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 p-2 w-full bg-gray-700 text-white rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isSubmitting}
              minLength={8}
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-300"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 p-2 w-full bg-gray-700 text-white rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isSubmitting}
              minLength={8}
            />
          </div>
          <button
            type="submit"
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
