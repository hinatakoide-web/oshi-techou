import { NextResponse } from "next/server";

async function computeToken(): Promise<string> {
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

export async function POST(req: Request) {
  let id: string, password: string;
  try {
    ({ id, password } = await req.json());
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  if (!id || !password || id !== process.env.ADMIN_ID || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "IDまたはパスワードが正しくありません" },
      { status: 401 }
    );
  }

  const token = await computeToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("oshi-auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7日間
  });
  return res;
}
