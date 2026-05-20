import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function expectedToken(): Promise<string> {
  const id = process.env.ADMIN_ID ?? "";
  const pw = process.env.ADMIN_PASSWORD ?? "";
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${id}:${pw}:oshi-techou`)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 認証不要のパス
  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("oshi-auth")?.value;
  if (!token || token !== (await expectedToken())) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
