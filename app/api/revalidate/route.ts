/**
 * POST /api/revalidate  { slugs: string[] }
 * Refreshes the public pages for these links right away (after publish,
 * unpublish or a link change). Allowed for a signed-in studio admin or client
 * (session cookie, same origin), or a caller with the REVALIDATE_SECRET header.
 */
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { cardTag } from "@/lib/services/public-cards";
import { getServerSession } from "@/lib/services/session.server";

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const bySecret = !!secret && req.headers.get("x-revalidate-secret") === secret;
  if (!bySecret) {
    const origin = req.headers.get("origin");
    if (!origin || new URL(origin).host !== req.nextUrl.host) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
    if (!(await getServerSession())) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { slugs?: unknown };
  const slugs = Array.isArray(body.slugs) ? body.slugs.filter((s): s is string => typeof s === "string" && /^[a-z0-9-]{1,80}$/.test(s)).slice(0, 5) : [];
  if (!slugs.length) return NextResponse.json({ error: "No links to refresh." }, { status: 400 });
  // expire: 0 → the next visit gets the fresh page, never the old one (unpublish must be immediate).
  for (const s of slugs) revalidateTag(cardTag(s), { expire: 0 });
  return NextResponse.json({ refreshed: slugs });
}
