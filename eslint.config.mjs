import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Architecture boundary: UI → lib/services → Firebase. Components and routes never
  // import Firebase, the mock store or the old stub layer directly.
  {
    files: ["components/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["firebase", "firebase/*", "firebase-admin", "firebase-admin/*"], message: "Use a service in @/lib/services instead of importing Firebase in UI code." },
          { group: ["@/lib/firebase/*"], message: "Use a service in @/lib/services; lib/firebase is for the service layer only." },
          { group: ["@/lib/store/*", "@/lib/api", "@/lib/session"], message: "Import from @/lib/services/* (the service layer) instead." },
        ],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
    ".taste-skill/**",
    ".impeccable/**",
    "functions/lib/**",
    "functions/node_modules/**",
    ".emulator-data/**",
  ]),
]);

export default eslintConfig;
