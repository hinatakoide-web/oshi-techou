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
  const adminId = process.env.ADMIN_ID;
  const adminPassword = process.env.ADMIN_PASSWORD;

  console.log("[login] ADMIN_ID set:", !!adminId, "/ ADMIN_PASSWORD set:", !!adminPassword);

  if (!adminId || !adminPassword) {
    console.error("[login] Environment variables are not configured");
    return NextResponse.json({ error: "サーバー設定エラーです" }, { status: 500 });
  }

  let id: string, password: string;
  try {
    ({ id, password } = await req.json());
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  console.log("[login] id match:", id === adminId, "/ password match:", password === adminPassword);

  if (!id || !password || id !== adminId || password !== adminPassword) {
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
