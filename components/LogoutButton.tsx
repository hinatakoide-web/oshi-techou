"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/login") return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-[var(--c-text-sub)] hover:text-[var(--c-fg)] transition-colors p-1 shrink-0"
      aria-label="ログアウト"
      title="ログアウト"
    >
      <LogOut className="w-4 h-4" />
    </button>
  );
}
