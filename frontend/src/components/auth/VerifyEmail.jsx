/**
 * ============================================================================
 * MEDASSIST AI - EMAIL VERIFICATION VIEW (VerifyEmail.jsx)
 * ============================================================================
 * Role:
 *   Handles automatic email verification on link click. Extracts token from URL
 *   search params (`?token=...`), sends confirmation query to `/auth/verify-email`,
 *   renders spinner, success icon, or error state, and redirects to `/login`.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: EMAIL VERIFICATION
 * ----------------------------------------------------------------------------
 * [VerifyEmail Component]
 *   │
 *   ├── 1. Mount Effect (useEffect)
 *   │     ├── Reads ?token= from URL search params
 *   │     ├── If no token: sets status = "error"
 *   │     └── If token present: Calls GET /auth/verify-email?token=${token}
 *   │
 *   ├── 2. Success Path
 *   │     ├── Sets status = "success"
 *   │     └── Sets 3-second timer redirecting to /login
 *   │
 *   └── 3. Error Path
 *         ├── Sets status = "error"
 *         └── Offers "Register Again" and "Back to Login" actions
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: ASYNCHRONOUS VERIFICATION
 * ----------------------------------------------------------------------------
 *  Component Mount ──► Read ?token ──► GET /api/auth/verify-email
 *                                            │
 *                                   ┌────────┴────────┐
 *                                   ▼                 ▼
 *                                Success             Error
 *                                   │                 │
 *                                   ▼                 ▼
 *                           navigate('/login')  Show retry buttons
 * ============================================================================
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../lib/api";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link.");
        return;
      }

      try {
        const data = await apiRequest(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        setStatus("success");
        setMessage(data.message || "Email verified successfully! You can now log in.");
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage(error.message || "Verification failed. Please try again.");
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4 text-white">
          Email Verification
        </h2>

        <div className="mb-4">
          {status === "verifying" && (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          )}
          {status === "success" && (
            <div className="text-green-500 text-6xl mb-4">✓</div>
          )}
          {status === "error" && (
            <div className="text-red-500 text-6xl mb-4">×</div>
          )}
        </div>

        <p
          className={`text-lg mb-4 ${
            status === "success"
              ? "text-green-400"
              : status === "error"
                ? "text-red-400"
                : "text-gray-300"
          }`}
        >
          {message}
        </p>
        {status === "error" && (
          <div className="mt-4 space-y-2">
            <button
              onClick={() => navigate("/register")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition"
            >
              Register Again
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition"
            >
              Back to Login
            </button>
          </div>
        )}

        {status === "success" && (
          <p className="text-gray-400 text-sm">Redirecting to login page...</p>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
