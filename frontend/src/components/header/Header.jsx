import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

function Header() {
  const { user, logout } = useContext(AuthContext);

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? "bg-cyan-400/10 text-cyan-300" : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <NavLink to="/" className="mr-2 flex items-center gap-2 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-bold text-slate-950">
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
                  `${linkClass({ isActive })} ml-1 bg-cyan-500 text-slate-950 hover:bg-cyan-400 hover:text-slate-950`
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
