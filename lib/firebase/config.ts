/**
 * Firebase settings shared by the browser and the server. Read from env vars;
 * nothing here is a secret (the web API key is restricted by referrer and App Check).
 * In emulator mode the project is always "demo-tapik", so local work can never
 * reach production data.
 */

export const EMULATOR_PROJECT_ID = "demo-tapik";

export const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "1";

/** Which backend the service layer talks to while the migration is in progress. */
export const dataSource: "mock" | "firebase" = process.env.NEXT_PUBLIC_DATA_SOURCE === "firebase" ? "firebase" : "mock";

export const FIREBASE_REGION = "asia-southeast1";

export const EMULATOR_HOSTS = {
  auth: "127.0.0.1:9099",
  firestore: { host: "127.0.0.1", port: 8080 },
  storage: { host: "127.0.0.1", port: 9199 },
  functions: { host: "127.0.0.1", port: 5001 },
} as const;

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

/**
 * NEXT_PUBLIC_* values must be read with literal property access so Next.js
 * inlines them into the browser bundle.
 */
export function firebaseWebConfig(): FirebaseWebConfig {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
  };
  if (useEmulators) {
    return { ...cfg, apiKey: cfg.apiKey || "demo-key", projectId: EMULATOR_PROJECT_ID, authDomain: `${EMULATOR_PROJECT_ID}.firebaseapp.com`, storageBucket: cfg.storageBucket || "tapik-ph-media", appId: cfg.appId || "demo-app" };
  }
  const missing = Object.entries(cfg).filter(([k, v]) => k !== "measurementId" && !v).map(([k]) => k);
  if (missing.length) throw new Error(`Firebase config is missing: ${missing.join(", ")}. See .env.example.`);
  return cfg;
}
