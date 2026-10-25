/**
 * ============================================================================
 * MEDASSIST AI - SIDEBAR TOGGLE REACT CONTEXT (SidebarContext.jsx)
 * ============================================================================
 * Role:
 *   Supplies responsive open/close state for the conversation history sidebar drawer
 *   across both mobile and desktop screen viewports.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: SIDEBAR VISIBILITY
 * ----------------------------------------------------------------------------
 * [SidebarContext / SidebarProvider]
 *   │
 *   ├── State: sidebarOpen (Boolean, default: false)
 *   ├── Dispatcher: setSidebarOpen(boolean)
 *   └── Consumer: Header / App / Sidebar Drawer
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: TOGGLE INTERACTION
 * ----------------------------------------------------------------------------
 *  Header Button [☰] ──► setSidebarOpen(!sidebarOpen) ──► Sidebar translate-x-0
 * ============================================================================
 */
import { useState, createContext } from "react";

export const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};
