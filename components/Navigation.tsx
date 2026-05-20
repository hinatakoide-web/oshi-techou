"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, CreditCard, Ticket, Music } from "lucide-react";

const links = [
  { href: "/",        label: "ホーム",   Icon: Home },
  { href: "/groups",  label: "グループ", Icon: Users },
  { href: "/aliases", label: "名義",     Icon: CreditCard },
  { href: "/tickets", label: "チケット", Icon: Ticket },
  { href: "/concerts",label: "現場",     Icon: Music },
];

export default function Navigation() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[var(--c-border)] shadow-sm">
      <ul className="max-w-2xl mx-auto flex">
        {links.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center py-2 text-xs gap-1 transition-colors ${
                  active
                    ? "text-[var(--c-primary)] font-semibold"
                    : "text-[var(--c-text-sub)] hover:text-[var(--c-primary)]"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2 : 1.5} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
