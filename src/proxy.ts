import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "sadaf_session";

/**
 * Optimistic auth redirect: no session cookie sends the visitor to the login page. The real check
 * (signature, expiry, active user) happens in the data access layer.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/login") return NextResponse.next();
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  if (!request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|jpg|jpeg|webp|txt)$).*)"],
};
