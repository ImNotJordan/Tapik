/**
 * Grants the admin role: custom claim { role: "admin" } plus an admins/{uid} doc.
 * There is no public admin sign-up; this script is the only way in.
 *
 *   npx tsx scripts/make-admin.ts someone@company.ph              production (needs FIREBASE_SERVICE_ACCOUNT_JSON)
 *   npx tsx scripts/make-admin.ts someone@company.ph --emulator   local emulators (project demo-tapik)
 *   add --name "Full Name" to set the name shown in the studio
 *
 * The person must already have an email + password account: create it in
 * Firebase Console → Authentication → Users → Add user, then run this.
 * They sign out and back in (or wait up to an hour) for the claim to take effect.
 */
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { EMULATOR_HOSTS, EMULATOR_PROJECT_ID } from "@/lib/firebase/config";

const [email, ...rest] = process.argv.slice(2);
const emulator = rest.includes("--emulator");
const nameArg = rest.includes("--name") ? rest[rest.indexOf("--name") + 1]?.trim() : undefined;

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Usage: npx tsx scripts/make-admin.ts <email> [--emulator]");
  process.exit(1);
}

if (emulator) {
  process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_HOSTS.firestore.host}:${EMULATOR_HOSTS.firestore.port}`;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = EMULATOR_HOSTS.auth;
}

function app() {
  if (emulator) return initializeApp({ projectId: EMULATOR_PROJECT_ID });
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  // No key: your own Google sign-in (gcloud auth application-default login).
  if (!raw) return initializeApp({ credential: applicationDefault(), projectId: "tapik-ph" });
  const j = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  return initializeApp({ credential: cert({ projectId: j.project_id, clientEmail: j.client_email, privateKey: j.private_key }) });
}

async function main() {
  const a = app();
  const auth = getAuth(a);
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    console.error(`No account for ${email}. Create it first: Firebase Console → Authentication → Users → Add user (email + password).`);
    process.exit(1);
  }
  if (!user.providerData.some((p) => p.providerId === "password")) {
    console.error(`${email} has no password sign-in. Admins sign in with email + password.`);
    process.exit(1);
  }
  const claims = user.customClaims ?? {};
  if (claims.role === "client") {
    console.error(`${email} is a client account. Use a separate email for the admin.`);
    process.exit(1);
  }
  await auth.setCustomUserClaims(user.uid, { ...claims, role: "admin" });
  if (nameArg && nameArg !== user.displayName) await auth.updateUser(user.uid, { displayName: nameArg });
  await getFirestore(a).doc(`admins/${user.uid}`).set(
    { name: nameArg || user.displayName || email.split("@")[0], email, role: "admin", favoriteTemplates: [], updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  // Revoke so any open session picks up the new role at the next sign-in.
  await auth.revokeRefreshTokens(user.uid);
  console.log(`${email} is now an admin (uid ${user.uid}). They need to sign in again.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
