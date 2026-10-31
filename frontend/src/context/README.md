# MedAssist AI — Frontend Context Architecture & Global State Manual

Developed by **J Ganesh kumar reddy**  
*Full-Stack Educational Health Assistance, Biomedical Evidence Grounding, & Machine Learning Research Platform*

---

## 1. Executive Context Architecture & Provider Hierarchy

The MedAssist AI global state layer (`frontend/src/context/`) provides centralized, reactive state management using React 19 Contexts. Rather than relying on heavyweight external state managers (e.g., Redux, MobX), the application utilizes decoupled, domain-scoped contexts to handle user authentication, session synchronization, and responsive navigation drawer controls.

```
========================================================================================================================
                          MEDASSIST AI — REACT CONTEXT HIERARCHY & STATE FLOW
========================================================================================================================

    [ main.jsx / App.jsx — Application Root ]
                 │
                 ▼
    ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
    │                                              AUTH PROVIDER (AuthContext.jsx)                                   │
    │  - Manages authenticated user state (`user`, `loading`, `isVerified`)                                         │
    │  - Coordinates single-device session synchronization via Web Locks single-flight refresh                       │
    │  - Actions: `signIn(credentials)`, `signUp(payload)`, `signOut()`, `refreshUser()`                             │
    │  - Consumed via custom hook: `useAuth()`                                                                       │
    └────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
    │                                            SIDEBAR PROVIDER (SidebarContext.jsx)                               │
    │  - Manages mobile drawer visibility and desktop sidebar collapse state (`isOpen`, `isMobile`)                  │
    │  - Automatically detects viewport resizes (matches 768px breakpoint)                                          │
    │  - Actions: `toggleSidebar()`, `closeSidebar()`, `openSidebar()`                                               │
    │  - Consumed via custom hook: `useSidebar()`                                                                    │
    └────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                 │
                 ▼
    [ CHILD VIEW TREE (ChatWorkspace, ClinicalCalculatorsModal, AISettings, AccountPage) ]
========================================================================================================================
```

---

## 2. Context Architecture Mindmap

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#0284c7', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#0369a1', 'lineColor': '#0284c7', 'secondaryColor': '#0d9488', 'tertiaryColor': '#6366f1' }}}%%
mindmap
  root((Frontend Contexts))
    ::icon(fa fa-project-diagram)
    (01 AuthContext.jsx)
      Global Auth State
        user profile & email
        isVerified status
        loading spinner gate
      Session Synchronization
        Web Locks token renewal
        Instant logout on 401 fail
        Single-device invalidation
      Exported Hook: useAuth()
    (02 SidebarContext.jsx)
      Responsive Drawer State
        isOpen boolean flag
        isMobile breakpoint match
      Navigation Controls
        toggleSidebar()
        closeSidebar() on route change
      Exported Hook: useSidebar()
    (03 Developer Extensibility)
      ThemeContext (Dark/Light)
      ClinicalSettingsContext
```

---

## 3. Context Specifications & Exported Hooks

### 3.1 `AuthContext.jsx` — User Session Manager
- **Exported Hook**: `useAuth()`
- **State Values**:
  - `user`: Authenticated user object (`{ id, email, isVerified }`) or `null`.
  - `loading`: Boolean indicating in-flight session initialization or token verification.
- **Methods**:
  - `signIn({ email, password })`: Posts credentials to `/api/auth/login`; updates state on success.
  - `signOut()`: Posts to `/api/auth/logout`, purges `sessionStorage`, and redirects to login view.
  - `refreshUser()`: Queries `/api/auth/check` to re-synchronize active user state.

### 3.2 `SidebarContext.jsx` — Responsive Navigation Manager
- **Exported Hook**: `useSidebar()`
- **State Values**:
  - `isOpen`: Boolean controlling sidebar visibility.
  - `isMobile`: Boolean indicating screen width $< 768\text{px}$.
- **Methods**:
  - `toggleSidebar()`: Inverts current open state.
  - `closeSidebar()`: Explicitly collapses drawer (e.g., when selecting a chat on mobile).

---

## 4. Developer Extensibility: Adding a Custom React Context

Follow this pattern to create a new domain context (e.g., `ThemeContext.jsx`):

```jsx
// frontend/src/context/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("medassist_theme") || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("medassist_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
```

---

## 5. Automated Verification Commands

All contexts and reactive UI state workflows are verified by Vitest component tests:

```powershell
# Run the complete frontend test suite (55 tests passing across 6 suites)
npm test --prefix frontend

# Verify context-driven UI rendering
npm test --prefix frontend -- ui.test.jsx
```
