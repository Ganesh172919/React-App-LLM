import { useState, createContext, useEffect, useCallback } from "react";
import { apiRequest } from "../lib/api";
import { writeTab } from "../lib/tabStorage";
export const AuthContext = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const checkAuth = useCallback(async () => {
    try { const data = await apiRequest("/auth/check"); setUser(data.user); }
    catch { setUser(null); } finally { setIsAuthLoading(false); }
  }, []);
  useEffect(() => {
    checkAuth();
    const ended = () => setUser(null);
    window.addEventListener("session-ended", ended);
    return () => window.removeEventListener("session-ended", ended);
  }, [checkAuth]);
  const logout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } finally {
      if (user?.id) {
        writeTab("medassist-draft-" + user.id, null);
        writeTab("medassist-draft-" + user.id + "-pending", null);
      }
      setUser(null);
    }
  };
  return <AuthContext.Provider value={{ user, setUser, checkAuth, logout, isAuthLoading }}>{children}</AuthContext.Provider>;
}
