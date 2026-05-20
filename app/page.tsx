"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Users } from "lucide-react";
import { groupStorage, aliasStorage } from "@/lib/storage";
import type { OshiAlias, OshiGroup } from "@/lib/types";

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function HomePage() {
  const [groups, setGroups] = useState<OshiGroup[]>([]);
  const [expiringAliases, setExpiringAliases] = useState<
    Array<{ alias: OshiAlias; groupName: string; days: number }>
  >([]);

  useEffect(() => {
    const g = groupStorage.getAll();
    setGroups(g);

    const aliases = aliasStorage.getAll();
    const expiring = aliases
      .map((alias) => {
        const days = daysUntil(alias.membership_expires_at);
        const group = g.find((gr) => gr.id === alias.group_id);
        return { alias, groupName: group?.name ?? "不明", days };
      })
      .filter(({ days }) => days <= 30 && days >= 0)
      .sort((a, b) => a.days - b.days);

    setExpiringAliases(expiring);
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-bold text-[var(--c-primary)] mb-3">推し活まとめ</h2>
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard Icon={Users} label="グループ数" value={groups.length} href="/groups" />
        </div>
      </section>

      {expiringAliases.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[#8A6030] mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> 会員期限まもなく
            <span className="bg-[#C4A060] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {expiringAliases.length}
            </span>
          </h2>
          <ul className="space-y-2">
            {expiringAliases.map(({ alias, groupName, days }) => (
              <li
                key={alias.id}
                className="bg-[#FAF4EC] border border-[#E8D4A0] rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-[#6A4820]">{alias.name}</p>
                  <p className="text-xs text-[#8A6030]">{groupName}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${days <= 7 ? "text-[#A05040]" : "text-[#8A6030]"}`}>
                    あと{days}日
                  </p>
                  <p className="text-xs text-[#B09060]">{alias.membership_expires_at}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {groups.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <p className="text-[var(--c-text-sub)]">まずはグループを登録しましょう</p>
          <Link
            href="/groups"
            className="inline-block bg-[var(--c-primary)] text-white px-6 py-2 rounded-full font-semibold text-sm mt-2"
          >
            グループを追加する
          </Link>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  Icon, label, value, href,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl shadow-sm border border-[var(--c-border)] p-4 flex flex-col items-center gap-1 hover:shadow-md transition-shadow"
    >
      <Icon className="w-7 h-7 text-[var(--c-primary)]" />
      <span className="text-2xl font-bold text-[var(--c-primary)]">{value}</span>
      <span className="text-xs text-[var(--c-text-sub)]">{label}</span>
    </Link>
  );
}
