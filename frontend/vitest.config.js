import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()], test: { environment: "jsdom", include: ["src/test/**/*.test.{js,jsx}"], restoreMocks: true, pool: "threads", minWorkers: 1, maxWorkers: 1, testTimeout: 15000 } });
