"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "ログインに失敗しました");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--c-fg)] tracking-wide">推し活手帳</h1>
          <p className="text-sm text-[var(--c-text-sub)] mt-1">ログインしてください</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-[var(--c-border)] p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-[var(--c-fg)] mb-1.5">
              ID
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => { setId(e.target.value); setError(""); }}
              placeholder="IDを入力"
              autoComplete="username"
              className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] text-[var(--c-fg)] placeholder:text-[var(--c-text-sub)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--c-fg)] mb-1.5">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="パスワードを入力"
              autoComplete="current-password"
              className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] text-[var(--c-fg)] placeholder:text-[var(--c-text-sub)]"
              required
            />
          </div>

          {error && (
            <p className="text-[#A05040] text-xs bg-[#FFF0ED] rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--c-primary)] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--c-primary-dark)] transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? "ログイン中…" : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}
