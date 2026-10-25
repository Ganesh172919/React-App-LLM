/**
 * ============================================================================
 * MEDASSIST AI - AUTHENTICATION REACT CONTEXT (AuthContext.jsx)
 * ============================================================================
 * Role:
 *   Supplies reactive user authentication state across all frontend components.
 *   Executes automatic session validation on application mount, maintains the
 *   current authenticated user state (`user`), and exposes `logout` and `checkAuth`
 *   functions.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: AUTH CONTEXT LIFECYCLE
 * ----------------------------------------------------------------------------
 * [AuthContext / AuthProvider]
 *   │
 *   ├── 1. Initial State (user = null)
 *   │
 *   ├── 2. Mount Effect (useEffect)
 *   │     └── Calls checkAuth() ──► GET /auth/check ──► setUser(data.user)
 *   │
 *   ├── 3. logout() Action
 *   │     ├── Calls POST /auth/logout
 *   │     └── Updates setUser(null) ──► Triggers redirect to /login
 *   │
 *   └── 4. Context Exposure: { user, setUser, logout, checkAuth }
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: SESSION INITIALIZATION & LOGOUT
 * ----------------------------------------------------------------------------
 *  Component Mount ──► checkAuth() ──► GET /api/auth/check
 *                                              │
 *                                     ┌────────┴────────┐
 *                                     ▼                 ▼
 *                                200 OK (User)     401/Error
 *                                     │                 │
 *                                     ▼                 ▼
 *                                setUser(user)     setUser(null)
 * ============================================================================
 */
import { useState, createContext, useEffect } from "react";
import { apiRequest } from "../lib/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  /**
   * Evaluates current session validity via GET /api/auth/check.
   * On success, updates user state; on failure, nullifies user state.
   */
  const checkAuth = async () => {
    try {
      const data = await apiRequest("/auth/check");
      setUser(data.user);
    } catch (error) {
      if (error.status !== 401) {
        console.error("Error checking authentication:", error);
      }
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Check authentication on initial load
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Terminates active session via POST /api/auth/logout and clears user context state.
   */
  const logout = async () => {
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
      });
      setUser(null);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, checkAuth, isAuthLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
