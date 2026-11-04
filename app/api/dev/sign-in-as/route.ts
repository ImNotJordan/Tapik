/** Emulators + development only: custom token for a seeded user (RoleSwitcher). 404 everywhere else. */
import { NextResponse, type NextRequest } from "next/server";
import { devCustomToken } from "@/lib/services/session.server";

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || new URL(origin).host !== req.nextUrl.host) return new NextResponse(null, { status: 404 });
  const { uid } = (await req.json().catch(() => ({}))) as { uid?: unknown };
  const token = await devCustomToken(uid);
  if (!token) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ token });
}
