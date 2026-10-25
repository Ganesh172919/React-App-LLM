/**
 * ============================================================================
 * MEDASSIST AI - NAVIGATION HEADER COMPONENT (Header.jsx)
 * ============================================================================
 * Role:
 *   Top navigation banner providing logo branding, responsive navigation links,
 *   active route highlighting, and conditional authentication controls
 *   (Chat & Dashboard links + Logout button when signed in; Login & Register
 *   buttons when signed out).
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: HEADER NAVIGATION STATE
 * ----------------------------------------------------------------------------
 * [Header Component]
 *   │
 *   ├── Brand Logo ("MedAssist AI") ──► NavLink to "/"
 *   │
 *   ├── Authenticated State (user exists)
 *   │     ├── NavLink to "/chat"
 *   │     ├── NavLink to "/dashboard"
 *   │     └── Button "Logout" ──► Triggers AuthContext.logout()
 *   │
 *   └── Unauthenticated State (user is null)
 *         ├── NavLink to "/login"
 *         └── NavLink to "/register"
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: CONDITIONAL AUTHENTICATION VIEW
 * ----------------------------------------------------------------------------
 *  AuthContext.user
 *         │
 *    ┌────┴──────────────────────────┐
 *    ▼                               ▼
 *  [Authenticated]             [Unauthenticated]
 *    │                               │
 *    ├── [Chat]                      ├── [Login]
 *    ├── [Dashboard]                 └── [Register]
 *    └── [Logout]
 * ============================================================================
 */
import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

function Header() {
  const { user, logout } = useContext(AuthContext);

  const linkClass = ({ isActive }) =>
    `rounded-md px-3 py-2 text-sm font-medium transition ${
      isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <NavLink to="/" className="mr-2 flex items-center gap-2 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-blue-600 text-sm font-bold text-white">
              M
            </span>
            <span className="hidden font-semibold sm:inline">MedAssist AI</span>
          </NavLink>
          {user && (
            <>
              <NavLink to="/chat" className={linkClass}>
                Chat
              </NavLink>
              <NavLink to="/dashboard" className={linkClass}>
                Dashboard
              </NavLink>
            </>
          )}
        </div>
        <div>
          {user ? (
            <button
              onClick={logout}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-rose-500 hover:text-white"
            >
              Logout
            </button>
          ) : (
            <>
              <NavLink
                to="/login"
                className={linkClass}
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) =>
                  `${linkClass({ isActive })} ml-1 bg-blue-600 text-white hover:bg-blue-500`
                }
              >
                Register
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Header;
