/**
 * ============================================================================
 * MEDASSIST AI - VITE BUNDLER CONFIGURATION (vite.config.js)
 * ============================================================================
 * Role:
 *   Build and development server configuration for Vite 6. Couples the React 19
 *   Babel/SWC transform plugin with the official Tailwind CSS 4 Vite plugin.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: VITE BUILD PIPELINE
 * ----------------------------------------------------------------------------
 * [vite.config.js]
 *   │
 *   ├── tailwindcss(): Tailwind CSS v4 JIT compilation & stylesheet extraction
 *   └── react(): Fast Refresh & JSX transpilation for React 19
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: ASSET TRANSFORMATION
 * ----------------------------------------------------------------------------
 *  Source (.jsx, .css) ──► [Tailwind Plugin] ──► [React Plugin] ──► Production Bundle
 * ============================================================================
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
});
