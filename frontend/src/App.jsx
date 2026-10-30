import { useContext, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink, Link, useLocation } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import Home from "./components/home/Home";
import AuthPage from "./components/auth/AuthPage";
import ChatWorkspace from "./components/chat/ChatWorkspace";
import AnalyticsDashboard from "./components/dashboard/AnalyticsDashboard";
import AccountPage from "./components/auth/AccountPage";
function PagePosition() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
export default function App() {
  const { user, logout, isAuthLoading } = useContext(AuthContext);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem("medassist_theme");
      if (stored === "dark" || stored === "light") return stored;
      if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
      return "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("medassist_theme", theme);
    } catch {
      /* ignore storage write failures */
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };
  if (isAuthLoading) return <div className="page"><p role="status">Restoring your session...</p></div>;
  const protect = (element) => user ? element : <Navigate to="/login" replace />;
  return <BrowserRouter>
    <PagePosition />
    <header className="site-header"><nav aria-label="Main navigation">
      <Link className="brand" to="/"><span className="brand-mark" aria-hidden="true">M</span><span>MedAssist <span className="brand-ai">AI</span></span></Link>
      <div className="nav-links">{user ? <>
        <NavLink to="/chat">Chat</NavLink><NavLink to="/dashboard">Dashboard</NavLink><NavLink to="/account">Account</NavLink>
        <button className="button secondary small" onClick={async () => { try { await logout(); setError(""); } catch (err) { setError(err.message); } }}>Sign out</button>
      </> : <><NavLink to="/login">Sign in</NavLink><NavLink to="/register">Register</NavLink></>}
        <button type="button" className="theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
      </div>
    </nav></header>
    {error && <div className="page notice error" role="alert">{error}</div>}
    <Routes>
      <Route path="/" element={<Home />} />
      {["login", "register", "forgot-password", "reset-password", "verify-email", "verification-pending"].map((mode) => <Route key={mode} path={"/" + mode} element={<AuthPage key={mode} mode={mode} />} />)}
      <Route path="/chat" element={protect(<ChatWorkspace key={user?.id} />)} />
      <Route path="/dashboard" element={protect(<AnalyticsDashboard />)} />
      <Route path="/account" element={protect(<AccountPage />)} />
      <Route path="*" element={<main className="page"><h1>Page not found</h1><Link to="/">Return home</Link></main>} />
    </Routes>
    <footer className="site-footer">MedAssist AI · Educational information only · Discuss care decisions with a qualified clinician</footer>
  </BrowserRouter>;
}