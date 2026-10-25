/**
 * ============================================================================
 * MEDASSIST AI - REGISTRATION VIEW COMPONENT (Register.jsx)
 * ============================================================================
 * Role:
 *   Handles new user account registration. Submits email and password to
 *   `POST /api/auth/register`. On successful creation, redirects user to
 *   `/verification-pending` to prompt email confirmation.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: REGISTRATION PROCESS
 * ----------------------------------------------------------------------------
 * [Register Component]
 *   │
 *   ├── 1. Inputs: Email and Password (min 8 chars)
 *   ├── 2. Submission Handler (handleSubmit)
 *   │     ├── Calls apiRequest("/auth/register", { email, password })
 *   │     ├── On Success: navigate("/verification-pending")
 *   │     └── On Error: Displays error message
 *   └── 3. Navigation: Link to Login (/login)
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: REGISTRATION LIFECYCLE
 * ----------------------------------------------------------------------------
 *  [User Submits Form] ──► apiRequest('/auth/register')
 *                                 │
 *                        ┌────────┴────────┐
 *                        ▼                 ▼
 *                   201 Created          Error
 *                        │                 │
 *                        ▼                 ▼
 *            navigate('/verification-  Show error text
 *                      pending')
 * ============================================================================
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      navigate("/verification-pending");
    } catch (error) {
      setError(error.message || "Registration failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-8">
        <h2 className="text-2xl font-bold mb-6 text-white text-center">
          Create your account
        </h2>
        <p className="-mt-4 mb-6 text-center text-sm text-slate-400">Save chats and view your activity dashboard.</p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
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
              className="mt-1 w-full rounded-md border border-slate-600 bg-slate-800 p-2.5 text-white outline-none focus:border-blue-500"
              required
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-600 bg-slate-800 p-2.5 text-white outline-none focus:border-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition"
          >
            Register
          </button>
        </form>
        <p className="mt-4 text-center text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-500 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
