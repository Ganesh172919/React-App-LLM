import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

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
        let response = await fetch(
          `http://localhost:5000/api/auth/verify-email?token=${token}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok && response.status === 404) {
          response = await fetch(
            "http://localhost:5000/api/auth/verify-email",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ token }),
            }
          );
        }

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(
            data.message || "Email verified successfully! You can now log in."
          );
          setTimeout(() => {
            navigate("/login");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.message || "Verification failed. Please try again.");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage("An error occurred during verification. Please try again.");
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
