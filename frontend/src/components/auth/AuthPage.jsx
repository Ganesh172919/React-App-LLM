import { useContext, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { apiRequest, API_BASE_URL } from "../../lib/api";
const titles = { login: "Sign in", register: "Create an account", "forgot-password": "Forgot your password?", "reset-password": "Choose a new password", "verify-email": "Email verification", "verification-pending": "Verify your email" };
export default function AuthPage({ mode }) {
  const [params] = useSearchParams(); const navigate = useNavigate(); const { setUser } = useContext(AuthContext);
  const location = useLocation();
  const [email, setEmail] = useState(params.get("email") || ""); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("idle"); const [message, setMessage] = useState(location.state?.message || (params.get("oauth") === "failed" ? "Google sign-in was not completed. Try again or use your existing account." : "")); const [needsVerification, setNeedsVerification] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const token = params.get("token");
  useEffect(() => {
    if (!["login", "register"].includes(mode)) return;
    let active = true;
    apiRequest("/auth/providers").then((data) => { if (active) setGoogleAvailable(data.google === true); }).catch(() => {});
    return () => { active = false; };
  }, [mode]);
  useEffect(() => {
    if (mode !== "verify-email") return;
    let current = true;
    if (!token) { setStatus("error"); setMessage("This verification link is missing its token. Request another email."); return; }
    setStatus("pending"); setMessage("Checking your verification link...");
    apiRequest("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) })
      .then((data) => { if (current) { setStatus("success"); setMessage(data.message); } })
      .catch((error) => { if (current) { setStatus("error"); setMessage(error.message); } });
    return () => { current = false; };
  }, [mode, token]);
  const submit = async (event) => {
    event.preventDefault(); if (status === "pending") return;
    if (["register", "reset-password"].includes(mode) && password !== confirmation) { setStatus("error"); setMessage("The passwords do not match."); return; }
    setStatus("pending"); setMessage(""); setNeedsVerification(false);
    try {
      const endpoint = mode === "verification-pending" ? "resend-verification" : mode;
      const body = ["register", "login"].includes(mode) ? { email, password } : mode === "reset-password" ? { token, newPassword: password } : { email };
      const data = await apiRequest("/auth/" + endpoint, { method: "POST", body: JSON.stringify(body) });
      if (mode === "login") { setUser(data.user); navigate("/chat"); return; }
      if (mode === "register") { navigate("/verification-pending?email=" + encodeURIComponent(email), { state: { message: data.message } }); return; }
      setStatus("success"); setMessage(data.message);
    } catch (error) { setStatus("error"); setMessage(error.message + (error.retryAfter ? " Try again in " + error.retryAfter + " seconds." : "")); setNeedsVerification(Boolean(error.data?.needsVerification)); }
  };
  const showEmail = ["register", "login", "forgot-password", "verification-pending"].includes(mode);
  const showPassword = ["register", "login", "reset-password"].includes(mode);
  return <main className="page auth-page"><section className="card">
    <h1>{titles[mode]}</h1>
    {mode === "verification-pending" && <p>Check your inbox and spam folder. Verification links expire after 24 hours. If delivery failed, enter your email below to request another link.</p>}
    {mode === "register" && <p>Save your conversations and view your activity. Your email must be verified before you sign in.</p>}
    {mode === "forgot-password" && <p>Enter your email to request a reset link.</p>}
    {message && <div className={"notice " + (status === "error" ? "error" : "success")} role={status === "error" ? "alert" : "status"}>{message}</div>}
    {needsVerification && <Link to={"/verification-pending?email=" + encodeURIComponent(email)}>Resend verification email</Link>}
    {mode !== "verify-email" && <form onSubmit={submit}>
      {showEmail && <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} disabled={status === "pending"} /></label>}
      {showPassword && <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} disabled={status === "pending"} /><span className="muted small-text">At least 8 characters, up to 72 UTF-8 bytes.</span></label>}
      {mode === "register" && password.length > 0 && <p className="small-text muted password-meter" style={{ marginTop: "-12px", marginBottom: "14px" }}>Password strength: <strong>{password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? "Strong" : password.length >= 8 ? "Fair" : "Too short"}</strong></p>}
      {["register", "reset-password"].includes(mode) && <label>Confirm password<input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={status === "pending"} /></label>}
      <button className="button" type="submit" disabled={status === "pending" || (mode === "reset-password" && !token)}>{status === "pending" ? "Please wait..." : mode === "verification-pending" ? "Resend verification" : mode === "forgot-password" ? "Request reset link" : mode === "reset-password" ? "Update password" : titles[mode]}</button>
    </form>}
    {googleAvailable && <p><a className="button secondary" href={API_BASE_URL + "/auth/google"}>Continue with Google</a></p>}
    {mode === "reset-password" && !token && <p role="alert">This reset link is incomplete. <Link to="/forgot-password">Request a new link</Link>.</p>}
    <div className="auth-links">{mode !== "login" && <Link to="/login">Sign in</Link>}{mode !== "register" && <Link to="/register">Create account</Link>}{mode !== "forgot-password" && <Link to="/forgot-password">Forgot password</Link>}{mode === "verify-email" && <Link to="/verification-pending">Resend verification</Link>}</div>
  </section></main>;
}
