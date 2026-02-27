import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { SidebarProvider } from "./context/SidebarContext";
import { AuthProvider } from "./context/AuthContext";
import { SubscriptionProvider } from "./context/SubscriptionContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <SubscriptionProvider>
        <SidebarProvider>
          <App />
        </SidebarProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </StrictMode>
);
