/**
 * Proxy (Next 16's renamed middleware). An optimistic check only: no session
 * cookie on a studio or portal page → straight to the right sign-in screen.
 * The real check (verify the cookie, role, disabled clients) happens in the
 * server gates, components/auth/*-gate.tsx, via lib/services/session.server.ts.
 * Mock mode (NEXT_PUBLIC_DATA_SOURCE=mock) keeps the in-browser demo session.
 */
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "__session";
const PUBLIC_PATHS = ["/admin/sign-in", "/portal/sign-in"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const headers = new Headers(req.headers);
  headers.set("x-tapik-path", pathname + search);
  const pass = () => NextResponse.next({ request: { headers } });

  if (process.env.NEXT_PUBLIC_DATA_SOURCE !== "firebase") return pass();
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return pass();
  if (req.cookies.has(SESSION_COOKIE)) return pass();

  const signIn = req.nextUrl.clone();
  signIn.pathname = pathname.startsWith("/admin") ? "/admin/sign-in" : "/portal/sign-in";
  signIn.search = "";
  signIn.searchParams.set("next", pathname + search);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*"],
};
