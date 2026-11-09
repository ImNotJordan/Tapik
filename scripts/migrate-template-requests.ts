/**
 * One-off migration for QR payments (run once, after deploying the new Functions and rules):
 *   - open requests in the manual flow (pending / awaiting_payment) → pending_payment,
 *     so clients see the InstaPay QR and can pay right away;
 *   - one templateRequestLocks/{cardId}__{templateId} per open request (one open request
 *     per card and template). If a card has two open requests for the same template, the
 *     newest keeps the lock and the older one is cancelled.
 *
 *   npx tsx scripts/migrate-template-requests.ts --project tapik-ph            (dry run: prints what would change)
 *   npx tsx scripts/migrate-template-requests.ts --project tapik-ph --confirm  (writes)
 *
 * Uses Application Default Credentials (`gcloud auth application-default login`).
 * Turn QR payments on in Payment settings first; with them off, the manual flow stays.
 */
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { OPEN_REQUEST } from "@/lib/entitlements";
import { COL, SETTINGS } from "@/lib/firebase/model";

const args = process.argv.slice(2);
const project = args[args.indexOf("--project") + 1];
const write = args.includes("--confirm");
if (!args.includes("--project") || project !== "tapik-ph") {
  console.error("Usage: npx tsx scripts/migrate-template-requests.ts --project tapik-ph [--confirm]");
  process.exit(1);
}

const db = getFirestore(initializeApp({ projectId: project, credential: applicationDefault() }));

async function main() {
  const settings = (await db.doc(`${COL.settings}/${SETTINGS.payment}`).get()).data();
  const qrOn = !!settings?.enabled && !!settings?.qrStoragePath;
  if (!qrOn) console.log("QR payments are off (or no QR uploaded): requests keep the manual flow; only locks are added.");

  const open = (await db.collection(COL.templateRequests).get()).docs
    .filter((d) => OPEN_REQUEST.includes(d.get("status")))
    .sort((a, b) => String(b.get("requestedAt")).localeCompare(String(a.get("requestedAt"))));
  const seen = new Set<string>();
  const batch = db.batch();
  let moved = 0, locks = 0, cancelled = 0;
  for (const d of open) {
    const key = `${d.get("cardId")}__${d.get("templateId")}`;
    if (seen.has(key)) {
      cancelled++;
      console.log(`cancel duplicate ${d.id} (${key})`);
      batch.update(d.ref, { status: "cancelled", resolvedAt: new Date().toISOString(), adminNote: "Closed as a duplicate when QR payments started.", updatedAt: new Date() });
      continue;
    }
    seen.add(key);
    batch.set(db.collection(COL.templateRequestLocks).doc(key), { requestId: d.id, createdAt: new Date() });
    locks++;
    if (qrOn && ["pending", "awaiting_payment"].includes(d.get("status"))) {
      moved++;
      console.log(`${d.id}: ${d.get("status")} → pending_payment`);
      batch.update(d.ref, { status: "pending_payment", updatedAt: new Date() });
    }
  }
  console.log(`${open.length} open requests: ${moved} to pending_payment, ${locks} locks, ${cancelled} duplicates cancelled.`);
  if (!write) return console.log("Dry run. Add --confirm to write.");
  await batch.commit();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
