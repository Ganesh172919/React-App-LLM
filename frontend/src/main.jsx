/**
 * ============================================================================
 * MEDASSIST AI - FRONTEND CLIENT ROOT (main.jsx)
 * ============================================================================
 * Role:
 *   Initial React DOM client mounting point. Wraps the main `App` component
 *   in React StrictMode and the core application context providers:
 *   - AuthProvider: Manages global user authentication state and session checks.
 *   - SidebarProvider: Controls responsive navigation drawer visibility.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: FRONTEND COMPONENT MOUNTING TREE
 * ----------------------------------------------------------------------------
 * [index.html (#root)]
 *   │
 *   └── <StrictMode>
 *         │
 *         └── <AuthProvider> (User auth state & checkAuth)
 *               │
 *               └── <SidebarProvider> (sidebarOpen & toggle states)
 *                     │
 *                     └── <App /> (Routing, Chat Engine, Analytics)
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: CONTEXT PROVIDER HIERARCHY
 * ----------------------------------------------------------------------------
 *  DOM: document.getElementById('root')
 *                 │
 *                 ▼
 *  ┌────────────────────────────────────────────────────────┐
 *  │ <StrictMode>                                           │
 *  │   ┌──────────────────────────────────────────────────┐ │
 *  │   │ <AuthProvider>                                   │ │
 *  │   │   ┌────────────────────────────────────────────┐ │ │
 *  │   │   │ <SidebarProvider>                          │ │ │
 *  │   │   │   ┌──────────────────────────────────────┐ │ │ │
 *  │   │   │   │ <App />                              │ │ │ │
 *  │   │   │   └──────────────────────────────────────┘ │ │ │
 *  │   │   └────────────────────────────────────────────┘ │ │
 *  │   └──────────────────────────────────────────────────┘ │
 *  └────────────────────────────────────────────────────────┘
 * ============================================================================
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { SidebarProvider } from "./context/SidebarContext";
import { AuthProvider } from "./context/AuthContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <SidebarProvider>
        <App />
      </SidebarProvider>
    </AuthProvider>
  </StrictMode>
);
