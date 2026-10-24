import { NextResponse, type NextRequest } from "next/server";

// Sends logged-out visitors to the login page, remembering where they were going
// (e.g. the "Review & confirm" link in a new-request email). The cookie signature
// is checked properly on the server by requireAdmin().
export function middleware(req: NextRequest) {
  if (!req.cookies.has("tbk_admin")) {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
