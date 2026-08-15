import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Deployed to GitHub Pages at https://itsthemoon.github.io/dojo/
export default defineConfig({
  base: "/dojo/",
  plugins: [react()],
  test: {
    environment: "jsdom",
  },
});
