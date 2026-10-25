/**
 * ============================================================================
 * MEDASSIST AI - TAILWIND CSS CONFIGURATION (tailwind.config.js)
 * ============================================================================
 * Role:
 *   Configures content scanning globs for utility class extraction across
 *   `index.html` and all JSX/JS source components.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: UTILITY SCANNING
 * ----------------------------------------------------------------------------
 * [tailwind.config.js]
 *   │
 *   └── Content Targets: ["./index.html", "./src/**\/*.{js,ts,jsx,tsx}"]
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: CLASS EXTRACTION
 * ----------------------------------------------------------------------------
 *  Source Components ──► Scan Content Globs ──► Generate Utility CSS Rules
 * ============================================================================
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
