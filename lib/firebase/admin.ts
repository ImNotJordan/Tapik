import "server-only";

/**
 * Firebase Admin SDK for server components, route handlers and server actions.
 * Never import this from a client component ("server-only" makes that a build error).
 */
import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { EMULATOR_HOSTS, EMULATOR_PROJECT_ID, useEmulators } from "./config";

const APP_NAME = "tapik-admin";

/**
 * Credentials, in order: a service account key in FIREBASE_SERVICE_ACCOUNT_JSON, or
 * keyless Application Default Credentials (`gcloud auth application-default login`
 * locally; Workload Identity Federation on Vercel). The tapik-ph organization
 * blocks key creation, so keyless is the normal path.
 */
function credential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return applicationDefault();
  try {
    const json = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as { project_id: string; client_email: string; private_key: string };
    return cert({ projectId: json.project_id, clientEmail: json.client_email, privateKey: json.private_key });
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must be the base64 of the service account key JSON.");
  }
}

export function adminApp(): App {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;
  if (useEmulators) {
    // The Admin SDK finds the emulators through these variables.
    process.env.FIRESTORE_EMULATOR_HOST ??= `${EMULATOR_HOSTS.firestore.host}:${EMULATOR_HOSTS.firestore.port}`;
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= EMULATOR_HOSTS.auth;
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= `${EMULATOR_HOSTS.storage.host}:${EMULATOR_HOSTS.storage.port}`;
    return initializeApp({ projectId: EMULATOR_PROJECT_ID, storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tapik-ph-media" }, APP_NAME);
  }
  return initializeApp(
    { credential: credential(), projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET },
    APP_NAME,
  );
}

export const adminAuth = (): Auth => getAuth(adminApp());
export const adminDb = (): Firestore => getFirestore(adminApp());
export const adminStorage = (): Storage => getStorage(adminApp());
