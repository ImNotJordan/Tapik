import "server-only";

/**
 * Firebase Admin SDK for server components, route handlers and server actions.
 * Never import this from a client component ("server-only" makes that a build error).
 */
import { applicationDefault, cert, getApps, initializeApp, type App, type Credential } from "firebase-admin/app";
import { getVercelOidcToken } from "@vercel/functions/oidc";
import { ExternalAccountClient } from "google-auth-library";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { EMULATOR_HOSTS, EMULATOR_PROJECT_ID, useEmulators } from "./config";

const APP_NAME = "tapik-admin";

/**
 * On Vercel: keyless. Vercel signs a short-lived OIDC token for this deployment;
 * Google's Workload Identity Federation exchanges it for an access token of the
 * tapik-web service account (only production deployments are trusted, DEPLOY.md).
 */
function vercelCredential(): Credential | null {
  const { GCP_PROJECT_NUMBER: num, GCP_WORKLOAD_IDENTITY_POOL_ID: pool, GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: provider, GCP_SERVICE_ACCOUNT_EMAIL: sa } = process.env;
  if (!process.env.VERCEL || !num || !pool || !provider || !sa) return null;
  const client = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//iam.googleapis.com/projects/${num}/locations/global/workloadIdentityPools/${pool}/providers/${provider}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${sa}:generateAccessToken`,
    subject_token_supplier: { getSubjectToken: () => getVercelOidcToken() },
  });
  if (!client) throw new Error("Couldn't set up Workload Identity Federation for Vercel. Check the GCP_* environment variables.");
  return {
    async getAccessToken() {
      const { token } = await client.getAccessToken();
      if (!token) throw new Error("Workload Identity Federation returned no access token.");
      const expiry = client.credentials.expiry_date ?? Date.now() + 3_000_000;
      return { access_token: token, expires_in: Math.max(60, Math.floor((expiry - Date.now()) / 1000)) };
    },
  };
}

/**
 * Credentials, in order: Vercel's keyless federation (above), a service account key in
 * FIREBASE_SERVICE_ACCOUNT_JSON, or Application Default Credentials (locally:
 * `gcloud auth application-default login`). The tapik-ph organization blocks
 * key creation, so the keyless paths are the normal ones.
 */
function credential() {
  const vercel = vercelCredential();
  if (vercel) return vercel;
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
