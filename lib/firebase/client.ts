"use client";

/**
 * Browser Firebase SDK. Only lib/services imports this file; components never do.
 * Public card pages don't use the browser SDK at all (they're server-rendered from
 * the published snapshot), so none of this ships to people tapping a card.
 *
 * Everything is lazy and a singleton: the first call initializes, later calls reuse.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from "firebase/app-check";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, type Firestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { EMULATOR_HOSTS, FIREBASE_REGION, firebaseWebConfig, useEmulators } from "./config";

let app: FirebaseApp | undefined;
let appCheck: AppCheck | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let functions: Functions | undefined;

export function firebaseApp(): FirebaseApp {
  if (app) return app;
  app = getApps().length ? getApp() : initializeApp(firebaseWebConfig());
  startAppCheck(app);
  return app;
}

function startAppCheck(a: FirebaseApp) {
  if (appCheck || typeof window === "undefined") return;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
  if (useEmulators) {
    // Emulators don't enforce App Check; a debug token keeps the code path identical.
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  if (!siteKey) return; // Not configured yet (see DEPLOY.md). Functions enforce it once it is.
  appCheck = initializeAppCheck(a, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
}

export function firebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(firebaseApp());
  if (useEmulators) connectAuthEmulator(auth, `http://${EMULATOR_HOSTS.auth}`, { disableWarnings: true });
  return auth;
}

/** Firestore with an offline cache shared across tabs (admin and portal only). */
export function firestore(): Firestore {
  if (db) return db;
  const a = firebaseApp();
  try {
    db = initializeFirestore(a, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch {
    db = getFirestore(a); // already initialized (fast refresh)
  }
  if (useEmulators) {
    try {
      connectFirestoreEmulator(db, EMULATOR_HOSTS.firestore.host, EMULATOR_HOSTS.firestore.port);
    } catch {
      /* already connected */
    }
  }
  return db;
}

export function firebaseStorage(): FirebaseStorage {
  if (storage) return storage;
  storage = getStorage(firebaseApp());
  if (useEmulators) connectStorageEmulator(storage, EMULATOR_HOSTS.storage.host, EMULATOR_HOSTS.storage.port);
  return storage;
}

export function firebaseFunctions(): Functions {
  if (functions) return functions;
  functions = getFunctions(firebaseApp(), FIREBASE_REGION);
  if (useEmulators) connectFunctionsEmulator(functions, EMULATOR_HOSTS.functions.host, EMULATOR_HOSTS.functions.port);
  return functions;
}
