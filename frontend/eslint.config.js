/**
 * ============================================================================
 * MEDASSIST AI - ESLINT FLAT CONFIGURATION (eslint.config.js)
 * ============================================================================
 * Role:
 *   Flat config ESLint 9 setup defining linting standards for React 19,
 *   React Hooks, and JSX transforms.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: LINTING RULESETS
 * ----------------------------------------------------------------------------
 * [eslint.config.js]
 *   │
 *   ├── Ignores: ["dist", "node_modules", "node_modules.broken"]
 *   ├── Language: ES2020, browser globals, JSX enabled
 *   └── Rules: Recommended JS, Recommended React, JSX Runtime, React Hooks
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: STATIC CODE ANALYSIS
 * ----------------------------------------------------------------------------
 *  Source Files (.js, .jsx) ──► Flat Rules Evaluation ──► 0 Errors / 0 Warnings
 * ============================================================================
 */
import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist", "node_modules", "node_modules.broken"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    settings: { react: { version: "18.3" } },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      "react/prop-types": "off",
      "react/jsx-no-target-blank": "off",
      "react-refresh/only-export-components": "off",
    },
  },
];
