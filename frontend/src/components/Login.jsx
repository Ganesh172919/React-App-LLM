/**
 * ============================================================================
 * MEDASSIST AI - LOGIN VIEW COMPONENT (Login.jsx)
 * ============================================================================
 * Role:
 *   Renders user sign-in form. Authenticates email and password credentials
 *   via `POST /api/auth/login`. Sets the global user state in `AuthContext`
 *   and redirects to `/chat` upon successful authentication. If the account
 *   is unverified, routes the user to verification assistance.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: LOGIN FORM & STATE HANDLING
 * ----------------------------------------------------------------------------
 * [Login Component]
 *   │
 *   ├── 1. Form Inputs: Email and Password
 *   ├── 2. Submission Handler (handleSubmit)
 *   │     ├── Calls apiRequest("/auth/login", { email, password })
 *   │     ├── On Success: setUser(data.user) ──► navigate("/chat")
 *   │     └── On Error:
 *   │           ├── If needsVerification: Displays warning & link to /verification-pending
 *   │           └── Default: Displays error message
 *   └── 3. Navigation Links: Forgot Password (/forgot-password), Register (/register)
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: LOGIN INTERACTION
 * ----------------------------------------------------------------------------
 *  [User Submits Credentials] ──► apiRequest('/auth/login')
 *                                         │
 *                             ┌───────────┴───────────┐
 *                             ▼                       ▼
 *                       200 OK (User)           Error Response
 *                             │                       │
 *                             ▼                       ▼
 *                        setUser()             (needsVerification?)
 *                        navigate('/chat')            │
 *                                            ┌────────┴────────┐
 *                                            ▼                 ▼
 *                                          [Yes]              [No]
 *                                            │                 │
 *                                            ▼                 ▼
 *                                     Verification Alert  Standard Alert
 * ============================================================================
 */
import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { apiRequest } from "../lib/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      navigate("/chat");
    } catch (error) {
      if (error.data?.needsVerification) {
        setError(
          <div>
            <p className="text-yellow-500 mb-2">{error.message}</p>
            <button
              type="button"
              onClick={() => navigate("/verification-pending")}
              className="text-blue-500 hover:underline text-sm"
            >
              Verification help
            </button>
          </div>
        );
      } else {
        setError(error.message || "Login failed");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-8">
        <h2 className="text-2xl font-bold mb-6 text-white text-center">
          Sign in to MedAssist
        </h2>
        <p className="-mt-4 mb-6 text-center text-sm text-slate-400">Continue to your saved medical Q&amp;A chats.</p>
        {error && (
          <div className="mb-4 text-center">
            {typeof error === "string" ? (
              <p className="text-red-500 text-sm">{error}</p>
            ) : (
              error
            )}
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
            Login
          </button>
        </form>
        <div className="mt-4 text-center text-gray-400">
          <Link to="/forgot-password" className="text-blue-500 hover:underline">
            Forgot Password?
          </Link>
        </div>
        <p className="mt-4 text-center text-gray-400">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-blue-500 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
