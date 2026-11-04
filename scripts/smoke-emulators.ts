/**
 * Quick end-to-end check of the Phase 2 wiring against running emulators:
 * seeded data, the rules as each role sees them, and a callable round trip.
 * Full rules coverage lives in tests/rules (phase 9).
 *
 *   npm run emulators   (in another terminal)
 *   npm run seed
 *   npx tsx scripts/smoke-emulators.ts
 */
import { initializeApp as initAdmin } from "firebase-admin/app";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithCustomToken, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { connectFirestoreEmulator, doc, getDoc, getDocs, collection, getFirestore, serverTimestamp, updateDoc, query, where } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { EMULATOR_HOSTS, EMULATOR_PROJECT_ID } from "@/lib/firebase/config";

process.env.FIREBASE_AUTH_EMULATOR_HOST = EMULATOR_HOSTS.auth;
const admin = initAdmin({ projectId: EMULATOR_PROJECT_ID }, "smoke-admin");

const app = initializeApp({ apiKey: "demo-key", projectId: EMULATOR_PROJECT_ID, authDomain: "demo-tapik.firebaseapp.com", appId: "demo-app" });
const auth = getAuth(app);
connectAuthEmulator(auth, `http://${EMULATOR_HOSTS.auth}`, { disableWarnings: true });
const db = getFirestore(app);
connectFirestoreEmulator(db, EMULATOR_HOSTS.firestore.host, EMULATOR_HOSTS.firestore.port);
const fns = getFunctions(app, "asia-southeast1");
connectFunctionsEmulator(fns, EMULATOR_HOSTS.functions.host, EMULATOR_HOSTS.functions.port);

let fails = 0;
async function expect(name: string, shouldSucceed: boolean, run: () => Promise<unknown>) {
  try {
    await run();
    console.log(shouldSucceed ? "PASS " : "FAIL ", name, shouldSucceed ? "" : "(was allowed)");
    if (!shouldSucceed) fails++;
  } catch (e) {
    const code = (e as { code?: string }).code ?? String(e);
    console.log(shouldSucceed ? "FAIL " : "PASS ", name, shouldSucceed ? `(${code})` : `(denied: ${code})`);
    if (shouldSucceed) fails++;
  }
}

async function main() {
  // Public, signed out
  await expect("public: get a published card by slug", true, async () => {
    const s = await getDoc(doc(db, "publicCards", "carmela-reyes-tan"));
    if (!s.exists()) throw new Error("missing snapshot");
  });
  await expect("public: list all public cards", false, () => getDocs(collection(db, "publicCards")));
  await expect("public: read a card draft", false, () => getDoc(doc(db, "cards", "card_carmela")));
  await expect("public: read pricing", false, () => getDoc(doc(db, "settings", "pricing")));

  // Admin
  await signInWithEmailAndPassword(auth, "admin@tapik.ph", process.env.SEED_ADMIN_PASSWORD || "tapik-dev-admin");
  await expect("admin: whoami callable says admin", true, async () => {
    const r = await httpsCallable<unknown, { role: string; region: string }>(fns, "whoami")({});
    if (r.data.role !== "admin" || r.data.region !== "asia-southeast1") throw new Error(JSON.stringify(r.data));
  });
  await expect("admin: list clients", true, () => getDocs(collection(db, "clients")));
  await expect("admin: read private settings", true, () => getDoc(doc(db, "settings", "private")));
  await expect("admin: read the mail queue", false, () => getDocs(collection(db, "mail")));
  await signOut(auth);

  // Client (Carmela). Clients sign in by email link; the emulator test uses a custom token.
  const token = await adminAuth(admin).createCustomToken("client_cl_carmela");
  await signInWithCustomToken(auth, token);
  await expect("client: read own card", true, () => getDoc(doc(db, "cards", "card_carmela")));
  await expect("client: read someone else's card", false, () => getDoc(doc(db, "cards", "card_lia")));
  await expect("client: query own requests", true, () => getDocs(query(collection(db, "templateRequests"), where("clientId", "==", "cl_carmela"))));
  await expect("client: query all requests", false, () => getDocs(collection(db, "templateRequests")));
  await expect("client: edit own card's quote", true, () =>
    updateDoc(doc(db, "cards", "card_carmela"), { quote: "Smoke test quote", updatedAt: serverTimestamp(), lastEditedBy: auth.currentUser!.uid }),
  );
  await expect("client: change own slug", false, () =>
    updateDoc(doc(db, "cards", "card_carmela"), { slug: "stolen", updatedAt: serverTimestamp(), lastEditedBy: auth.currentUser!.uid }),
  );
  await expect("client: switch own template directly", false, () =>
    updateDoc(doc(db, "cards", "card_carmela"), { templateId: "hyacinth-executive", updatedAt: serverTimestamp(), lastEditedBy: auth.currentUser!.uid }),
  );
  await expect("client: set custom colors", false, () =>
    updateDoc(doc(db, "cards", "card_carmela"), { themeId: "custom", updatedAt: serverTimestamp(), lastEditedBy: auth.currentUser!.uid }),
  );
  await expect("client: read own entitlements", true, () => getDoc(doc(db, "entitlements", "card_carmela")));
  await expect("client: read invites", false, () => getDocs(collection(db, "invites")));
  await expect("client: whoami callable says client", true, async () => {
    const r = await httpsCallable<unknown, { role: string }>(fns, "whoami")({});
    if (r.data.role !== "client") throw new Error(JSON.stringify(r.data));
  });
  await expect("client: setClientDisabled is admin-only", false, () => httpsCallable(fns, "setClientDisabled")({ clientId: "cl_lia", disabled: true }));
  await signOut(auth);

  // Disabling a client: their existing session stops verifying, and they can't sign in again.
  const liaUid = "client_cl_lia";
  const liaId = await (async () => {
    await signInWithCustomToken(auth, await adminAuth(admin).createCustomToken(liaUid));
    const t = await auth.currentUser!.getIdToken();
    await signOut(auth);
    return t;
  })();
  const liaCookie = await adminAuth(admin).createSessionCookie(liaId, { expiresIn: 3600_000 });
  await signInWithEmailAndPassword(auth, "admin@tapik.ph", process.env.SEED_ADMIN_PASSWORD || "tapik-dev-admin");
  await expect("admin: setClientDisabled rejects bad input", false, () => httpsCallable(fns, "setClientDisabled")({ clientId: "../x", disabled: "yes" }));
  await expect("admin: disable Lia", true, async () => {
    const r = await httpsCallable<unknown, { status: string }>(fns, "setClientDisabled")({ clientId: "cl_lia", disabled: true });
    if (r.data.status !== "disabled") throw new Error(JSON.stringify(r.data));
    if (!(await adminAuth(admin).getUser(liaUid)).disabled) throw new Error("auth user not disabled");
  });
  await expect("disabled client: existing session cookie no longer verifies", false, () => adminAuth(admin).verifySessionCookie(liaCookie, true));
  await expect("disabled client: can't sign in", false, async () => {
    const other = initializeApp({ apiKey: "demo-key", projectId: EMULATOR_PROJECT_ID, appId: "demo-app" }, "lia");
    const a2 = getAuth(other);
    connectAuthEmulator(a2, `http://${EMULATOR_HOSTS.auth}`, { disableWarnings: true });
    try {
      await signInWithCustomToken(a2, await adminAuth(admin).createCustomToken(liaUid));
    } finally {
      await deleteApp(other);
    }
  });
  await expect("admin: turn Lia back on", true, async () => {
    const r = await httpsCallable<unknown, { status: string }>(fns, "setClientDisabled")({ clientId: "cl_lia", disabled: false });
    if (r.data.status !== "active") throw new Error(JSON.stringify(r.data));
  });
  await signOut(auth);
  await deleteApp(app);

  console.log(fails ? `${fails} FAILED` : "ALL PASS");
  process.exit(fails ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
