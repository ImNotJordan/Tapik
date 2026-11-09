/**
 * QR payments for template requests, against the emulators (fresh seed):
 *   npm run emulators   (another terminal)   then   npm run seed && npm run test:payments
 *
 * Rules (Firestore + Storage) for every role that matters, then the Functions:
 * the full happy path with emails #1–#3, reject + resubmit, decline after payment,
 * cancel rules, Undo (in time, too late, after the client acted), the client's own Undo,
 * one email per recipient per step, and an amount mismatch that's flagged but approvable.
 */
import assert from "node:assert/strict";

const P = "demo-tapik";
const FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`;
const AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
const FN = `http://127.0.0.1:5001/${P}/asia-southeast1`;
const ST = "http://127.0.0.1:9199/v0/b/tapik-ph-media/o";
const OWNER = { Authorization: "Bearer owner" };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64");

let fails = 0;
let passes = 0;
async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passes++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    fails++;
    console.log(`FAIL  ${name}\n      ${(e as Error).message.split("\n")[0]}`);
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until<T>(fn: () => Promise<T | null | undefined | false>, ms: number, label: string): Promise<T> {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const v = await fn();
    if (v) return v;
    await sleep(500);
  }
  throw new Error(`timed out waiting for ${label}`);
}

/* ------------------------------------------------------------ sign-in */

async function signIn(email: string, password: string): Promise<string> {
  const r = await fetch(`${AUTH}/accounts:signInWithPassword?key=fake`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  const j = (await r.json()) as { idToken?: string; error?: { message: string } };
  if (!j.idToken) throw new Error(`sign-in ${email}: ${j.error?.message}`);
  return j.idToken;
}
/** Seeded clients sign in by email link; the tests give them a password through the emulator's admin API. */
async function clientToken(clientId: string, email: string): Promise<string> {
  await fetch(`${AUTH}/projects/${P}/accounts:update`, { method: "POST", headers: { ...OWNER, "Content-Type": "application/json" }, body: JSON.stringify({ localId: `client_${clientId}`, password: "test-pass-123" }) });
  return signIn(email, "test-pass-123");
}

/* ---------------------------------------------------------- data access */

type Doc = { fields?: Record<string, { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean; nullValue?: null; mapValue?: { fields?: Doc["fields"] }; arrayValue?: { values?: { stringValue?: string }[] } }>; name?: string };
const get = async (path: string, token?: string) => fetch(`${FS}/${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : OWNER });
const doc = async (path: string): Promise<Doc | null> => {
  const r = await get(path);
  return r.ok ? ((await r.json()) as Doc) : null;
};
const str = (d: Doc | null, k: string) => d?.fields?.[k]?.stringValue;
const list = async (col: string): Promise<Doc[]> => (((await (await fetch(`${FS}/${col}?pageSize=500`, { headers: OWNER })).json()) as { documents?: Doc[] }).documents ?? []);
const unlocked = async (cardId: string) => ((await doc(`entitlements/${cardId}`))?.fields?.unlockedTemplateIds?.arrayValue?.values ?? []).map((v) => v.stringValue);
const mails = async (requestId: string, kind: string) => (await list("mail")).filter((m) => m.name!.split("/").pop()!.startsWith(`tr_${requestId}_${kind}_`));

async function call<T = Record<string, unknown>>(name: string, token: string, data: unknown): Promise<{ ok: true; data: T } | { ok: false; status: string; message: string }> {
  const r = await fetch(`${FN}/${name}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
  const j = (await r.json()) as { result?: T; error?: { status: string; message: string } };
  return j.error ? { ok: false, status: j.error.status, message: j.error.message } : { ok: true, data: j.result as T };
}
async function must<T>(p: Promise<{ ok: true; data: T } | { ok: false; status: string; message: string }>): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error(`${r.status}: ${r.message}`);
  return r.data;
}
async function refused(p: Promise<{ ok: boolean; status?: string; message?: string }>, status?: string) {
  const r = (await p) as { ok: boolean; status?: string; message?: string };
  assert.equal(r.ok, false, "expected the call to be refused");
  if (status) assert.equal(r.status, status, `expected ${status}, got ${r.status}: ${r.message}`);
}

/** Uploads the way the Firebase SDK does (multipart: metadata with the content type, then the bytes), so the rules see the type. */
function upload(path: string, token: string, body: Buffer = PNG, type = "image/png") {
  const b = `tapik${Math.random().toString(16).slice(2)}`;
  const CRLF = String.fromCharCode(13, 10);
  const head = [`--${b}`, "Content-Type: application/json; charset=utf-8", "", JSON.stringify({ name: path, contentType: type }), `--${b}`, `Content-Type: ${type}`, "", ""].join(CRLF);
  const parts = Buffer.concat([Buffer.from(head), body, Buffer.from(`${CRLF}--${b}--`)]);
  return fetch(`${ST}?name=${encodeURIComponent(path)}`, { method: "POST", headers: { Authorization: `Firebase ${token}`, "Content-Type": `multipart/related; boundary=${b}`, "X-Goog-Upload-Protocol": "multipart" }, body: new Uint8Array(parts) });
}
const download = (path: string, token: string) => fetch(`${ST}/${encodeURIComponent(path)}?alt=media`, { headers: { Authorization: `Firebase ${token}` } });

/* ------------------------------------------------------------------ run */

async function main() {
  const admin = await signIn("admin@tapik.ph", process.env.SEED_ADMIN_PASSWORD || "tapik-dev-admin");
  const joel = await clientToken("cl_joel", "joel@pasigfreight.ph");
  const lia = await clientToken("cl_lia", "lia@kapehan.ph");
  const carmela = await clientToken("cl_carmela", "carmela@tanocampo.ph");
  const adminCount = (await list("admins")).filter((a) => str(a, "email")).length;

  console.log("Firestore rules");
  await step("a client can't create a request directly", async () => {
    const r = await fetch(`${FS}/templateRequests?documentId=tr_fake`, { method: "POST", headers: { Authorization: `Bearer ${joel}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields: { clientId: { stringValue: "cl_joel" }, status: { stringValue: "approved" } } }) });
    assert.equal(r.status, 403);
  });
  await step("a client can't approve their own request or change its price", async () => {
    for (const fields of [{ status: { stringValue: "approved" } }, { price: { integerValue: "1" } }, { payment: { mapValue: { fields: { referenceNo: { stringValue: "X" } } } } }]) {
      const r = await fetch(`${FS}/templateRequests/tr_1?updateMask.fieldPaths=${Object.keys(fields)[0]}`, { method: "PATCH", headers: { Authorization: `Bearer ${joel}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
      assert.equal(r.status, 403, Object.keys(fields)[0]);
    }
  });
  await step("a client reads their own requests, not someone else's", async () => {
    assert.equal((await get("templateRequests/tr_1", joel)).status, 200);
    assert.equal((await get("templateRequests/tr_4", joel)).status, 403);
  });
  await step("payment settings: admins only; locks and unlocks: Functions only", async () => {
    assert.equal((await get("settings/payment", joel)).status, 403);
    assert.equal((await get("settings/payment", admin)).status, 200);
    const w = (path: string, t: string) => fetch(`${FS}/${path}`, { method: "PATCH", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields: { x: { stringValue: "y" } } }) });
    assert.equal((await w("settings/payment", admin)).status, 403, "admins write settings/payment through savePaymentSettings only");
    assert.equal((await w("templateRequestLocks/card_joel__folio", joel)).status, 403);
    assert.equal((await w("entitlements/card_joel", joel)).status, 403);
  });

  console.log("Storage rules");
  await step("a client uploads a receipt to their own folder only", async () => {
    assert.equal((await upload("paymentProofs/cl_joel/tr_x/a.png", joel)).status, 200);
    assert.equal((await upload("paymentProofs/cl_lia/tr_x/a.png", joel)).status, 403, "someone else's folder");
    assert.equal((await upload("paymentProofs/cl_joel/tr_x/a.png", joel)).status, 403, "overwrite");
    assert.equal((await upload("paymentProofs/cl_joel/tr_x/b.pdf", joel, Buffer.from("%PDF"), "application/pdf")).status, 403, "not an image");
  });
  await step("receipts: the owner and admins read them, other clients can't; nobody but admins reads the QR", async () => {
    assert.equal((await download("paymentProofs/cl_joel/tr_x/a.png", joel)).status, 200);
    assert.equal((await download("paymentProofs/cl_joel/tr_x/a.png", lia)).status, 403);
    assert.equal((await download("paymentProofs/cl_joel/tr_x/a.png", admin)).status, 200);
    assert.equal((await download("settings/payment/gotyme-qr.jpg", joel)).status, 403);
  });

  console.log("Functions");
  let rid = "";
  await step("request: created as pending_payment, a second tap returns the same request, email #1 to every admin", async () => {
    const a = await must(call<{ requestId: string; status: string; created: boolean }>("requestTemplate", joel, { cardId: "card_joel", templateId: "folio" }));
    assert.equal(a.status, "pending_payment");
    assert.equal(a.created, true);
    const b = await must(call<{ requestId: string; created: boolean }>("requestTemplate", joel, { cardId: "card_joel", templateId: "folio" }));
    assert.equal(b.requestId, a.requestId);
    assert.equal(b.created, false);
    rid = a.requestId;
    assert.equal(str(await doc(`templateRequestLocks/card_joel__folio`), "requestId"), rid);
    await until(async () => (await mails(rid, "requested")).length === adminCount, 15000, "email #1");
    const m = (await mails(rid, "requested"))[0];
    const text = m.fields!.message!.mapValue!.fields!.text!.stringValue!;
    assert.ok(!/2311|JORDAN|gotyme-qr/i.test(text), "email #1 carries no payment details");
  });
  await step("the QR goes to clients with an open request only", async () => {
    const q = await must(call<{ dataUrl: string; settings: { accountLast4: string } }>("getPaymentQr", joel, {}));
    assert.match(q.dataUrl, /^data:image\/jpeg;base64,/);
    assert.equal(q.settings.accountLast4, "2311");
    await refused(call("getPaymentQr", carmela, {}), "PERMISSION_DENIED");
  });
  await step("submit: bad reference, someone else's receipt path and a client approving are refused", async () => {
    await refused(call("submitTemplatePayment", joel, { requestId: rid, proofPath: `paymentProofs/cl_joel/${rid}/r.png`, referenceNo: "ab", amountPaid: 299, paidAt: new Date().toISOString() }));
    await refused(call("submitTemplatePayment", joel, { requestId: rid, proofPath: `paymentProofs/cl_lia/${rid}/r.png`, referenceNo: "GT12345678", amountPaid: 299, paidAt: new Date().toISOString() }));
    await refused(call("approveTemplateRequest", joel, { requestId: rid, expectedStatus: "payment_submitted" }));
  });
  await step("submit: a mismatched amount is accepted and flagged; email #2 to every admin", async () => {
    assert.equal((await upload(`paymentProofs/cl_joel/${rid}/r1.png`, joel)).status, 200);
    await must(call("submitTemplatePayment", joel, { requestId: rid, proofPath: `paymentProofs/cl_joel/${rid}/r1.png`, referenceNo: "gt12345678", amountPaid: 250, paidAt: new Date(Date.now() - 600_000).toISOString() }));
    const r = await doc(`templateRequests/${rid}`);
    assert.equal(str(r, "status"), "payment_submitted");
    assert.equal(r!.fields!.amountMismatch!.booleanValue, true);
    assert.equal(r!.fields!.payment!.mapValue!.fields!.referenceNo!.stringValue, "GT12345678");
    await until(async () => (await mails(rid, "payment")).length === adminCount, 15000, "email #2");
  });
  await step("cancel is refused once a payment is submitted", async () => {
    await refused(call("cancelTemplateRequest", joel, { requestId: rid }), "FAILED_PRECONDITION");
  });
  await step("approve with a stale expected status is refused (the client submitted in between)", async () => {
    await refused(call("approveTemplateRequest", admin, { requestId: rid, expectedStatus: "pending_payment", reason: "test" }), "FAILED_PRECONDITION");
  });
  await step("reject → payment_rejected with the note; email #4 to the client after the Undo window; Undo is then too late", async () => {
    await must(call("rejectTemplatePayment", admin, { requestId: rid, note: "Please send the ₱49 difference." }));
    assert.equal(str(await doc(`templateRequests/${rid}`), "status"), "payment_rejected");
    await until(async () => (await mails(rid, "rejected")).length === 1, 35000, "email #4");
    await refused(call("undoTemplateRequestAction", admin, { requestId: rid }), "FAILED_PRECONDITION");
  });
  await step("resubmit with the previous receipt → payment_submitted, attempt 2, a new email #2", async () => {
    await must(call("submitTemplatePayment", joel, { requestId: rid, proofPath: `paymentProofs/cl_joel/${rid}/r1.png`, referenceNo: "GT12345678", amountPaid: 299, paidAt: new Date().toISOString() }));
    const r = await doc(`templateRequests/${rid}`);
    assert.equal(r!.fields!.payment!.mapValue!.fields!.attempt!.integerValue, "2");
    await until(async () => (await mails(rid, "payment")).length === adminCount * 2, 15000, "email #2, attempt 2");
  });
  await step("approve → unlocked AND applied (card + live card look), notified, lock released; email #3 once", async () => {
    const before = await doc("cards/card_joel");
    const slug = str(before, "slug")!;
    await must(call("approveTemplateRequest", admin, { requestId: rid, expectedStatus: "payment_submitted" }));
    const card = await doc("cards/card_joel");
    assert.equal(str(card, "templateId"), "folio");
    assert.equal(card!.fields!.previousLook!.mapValue!.fields!.templateId!.stringValue, str(before, "templateId"));
    assert.ok((await unlocked("card_joel")).includes("folio"));
    const pub = await doc(`publicCards/${slug}`);
    if (pub) assert.equal(pub.fields!.bundle!.mapValue!.fields!.card!.mapValue!.fields!.templateId!.stringValue, "folio", "live card look");
    assert.equal(await doc("templateRequestLocks/card_joel__folio"), null);
    assert.ok((await list("notifications")).some((n) => str(n, "requestId") === rid && str(n, "kind") === "template_applied"));
    await until(async () => (await mails(rid, "approved")).length === 1, 35000, "email #3");
    await sleep(3000);
    assert.equal((await mails(rid, "approved")).length, 1, "exactly one email #3");
    assert.equal((await mails(rid, "requested")).length, adminCount, "no duplicate email #1");
  });
  await step("the client's Undo puts the previous template back; the unlock stays", async () => {
    const prev = (await doc("cards/card_joel"))!.fields!.previousLook!.mapValue!.fields!.templateId!.stringValue;
    await must(call("undoTemplateApply", joel, { cardId: "card_joel" }));
    const card = await doc("cards/card_joel");
    assert.equal(str(card, "templateId"), prev);
    assert.equal(card!.fields!.previousLook, undefined);
    assert.ok((await unlocked("card_joel")).includes("folio"));
  });

  let rid2 = "";
  await step("admin Undo right after approving: card, unlock, lock and notification all go back; no email to the client", async () => {
    const a = await must(call<{ requestId: string }>("requestTemplate", joel, { cardId: "card_joel", templateId: "split-hero" }));
    rid2 = a.requestId;
    assert.equal((await upload(`paymentProofs/cl_joel/${rid2}/r.png`, joel)).status, 200);
    await must(call("submitTemplatePayment", joel, { requestId: rid2, proofPath: `paymentProofs/cl_joel/${rid2}/r.png`, referenceNo: "GT99887766", amountPaid: 299, paidAt: new Date().toISOString() }));
    const before = str(await doc("cards/card_joel"), "templateId");
    await must(call("approveTemplateRequest", admin, { requestId: rid2, expectedStatus: "payment_submitted" }));
    assert.equal(str(await doc("cards/card_joel"), "templateId"), "split-hero");
    await must(call("undoTemplateRequestAction", admin, { requestId: rid2 }));
    assert.equal(str(await doc("cards/card_joel"), "templateId"), before);
    assert.ok(!(await unlocked("card_joel")).includes("split-hero"), "unlock taken back");
    assert.equal(str(await doc(`templateRequests/${rid2}`), "status"), "payment_submitted");
    assert.equal(str(await doc(`templateRequestLocks/card_joel__split-hero`), "requestId"), rid2);
    assert.ok(!(await list("notifications")).some((n) => str(n, "requestId") === rid2 && str(n, "kind") === "template_applied"));
    await sleep(22000);
    assert.equal((await mails(rid2, "approved")).length, 0, "the undone approval emailed the client");
    assert.ok(!(await unlocked("card_joel")).includes("split-hero"), "a late trigger brought the unlock back");
  });
  await step("decline after a payment: declined, lock released, email #5 with the refund line", async () => {
    await must(call("declineTemplateRequest", admin, { requestId: rid2, note: "Split Hero doesn't fit a freight card." }));
    assert.equal(str(await doc(`templateRequests/${rid2}`), "status"), "declined");
    assert.equal(await doc("templateRequestLocks/card_joel__split-hero"), null);
    const m = await until(async () => (await mails(rid2, "declined"))[0], 35000, "email #5");
    assert.match(m.fields!.message!.mapValue!.fields!.text!.stringValue!, /refund/);
  });
  await step("cancel works before paying, and the lock is released", async () => {
    const a = await must(call<{ requestId: string }>("requestTemplate", lia, { cardId: "card_lia", templateId: "mosaic" }));
    await must(call("cancelTemplateRequest", lia, { requestId: a.requestId }));
    assert.equal(str(await doc(`templateRequests/${a.requestId}`), "status"), "cancelled");
    assert.equal(await doc("templateRequestLocks/card_lia__mosaic"), null);
    await refused(call("cancelTemplateRequest", lia, { requestId: a.requestId }), "FAILED_PRECONDITION");
  });
  await step("emails never carry the QR, account digits or the receipt", async () => {
    for (const m of (await list("mail")).filter((x) => x.name!.split("/").pop()!.startsWith("tr_"))) {
      const f = m.fields!.message!.mapValue!.fields!;
      const all = `${f.text!.stringValue}${f.html!.stringValue}`;
      assert.ok(!/2311|gotyme-qr|paymentProofs|data:image/i.test(all), m.name!.split("/").pop());
    }
  });

  console.log(`\n${passes} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
