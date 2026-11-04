/**
 * POST /api/session   { idToken, expect? }  → sets the httpOnly session cookie
 * DELETE /api/session                         → clears it
 * Same-origin only. The ID token in the body is the proof of sign-in, so a
 * forged cross-site request can't create a session.
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, createSession } from "@/lib/services/session.server";

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}

const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  let body: { idToken?: unknown; expect?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Sign-in didn't complete. Try again." }, { status: 400 });
  }
  const expect = body.expect === "admin" || body.expect === "client" ? body.expect : undefined;
  const r = await createSession(body.idToken, expect);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const res = NextResponse.json({ role: r.role });
  res.cookies.set(SESSION_COOKIE, r.cookie, { ...cookieOptions, maxAge: r.maxAgeSeconds });
  return res;
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
