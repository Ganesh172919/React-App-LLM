import { useState, createContext, useEffect } from "react";
import { apiRequest } from "../lib/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Function to check if the user is authenticated
  const checkAuth = async () => {
    try {
      const data = await apiRequest("/auth/check");
      setUser(data.user);
    } catch (error) {
      console.error("Error checking authentication:", error);
      setUser(null);
    }
  };

  // Check authentication on initial load
  useEffect(() => {
    checkAuth();
  }, []);

  // Function to log out the user
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
    <AuthContext.Provider value={{ user, setUser, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
