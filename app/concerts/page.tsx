"use client";

import { useEffect, useState, useMemo } from "react";
import { CreditCard } from "lucide-react";
import {
  concertStorage,
  applicationStorage,
  aliasStorage,
  groupStorage,
} from "@/lib/storage";
import type { OshiConcert, OshiApplication, OshiAlias, OshiGroup } from "@/lib/types";

type EnrichedConcert = {
  concert: OshiConcert;
  aliases: OshiAlias[];
  group: OshiGroup | undefined;
};

function buildEnriched(
  wonApps: OshiApplication[],
  allConcerts: OshiConcert[],
  allAliases: OshiAlias[],
  allGroups: OshiGroup[]
): EnrichedConcert[] {
  const map = new Map<string, Set<string>>();
  for (const app of wonApps) {
    if (!map.has(app.concert_id)) map.set(app.concert_id, new Set());
    map.get(app.concert_id)!.add(app.alias_id);
  }
  return allConcerts
    .filter((c) => map.has(c.id))
    .map((concert) => ({
      concert,
      aliases: [...(map.get(concert.id) ?? [])].map(
        (aid) => allAliases.find((a) => a.id === aid)!
      ).filter(Boolean),
      group: allGroups.find((g) => g.id === concert.group_id),
    }))
    .sort((a, b) => a.concert.date.localeCompare(b.concert.date));
}

// ---- Calendar ----
function Calendar({
  year,
  month,
  markedDates,
  onSelectDate,
  selectedDate,
}: {
  year: number;
  month: number; // 0-indexed
  markedDates: Set<string>;
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
}) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const DOW = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[var(--c-border)] overflow-hidden">
      <div className="grid grid-cols-7">
        {DOW.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-semibold py-2 ${
              i === 0 ? "text-[#A05040]" : i === 6 ? "text-[#5A7A96]" : "text-[var(--c-text-sub)]"
            }`}
          >
            {d}
          </div>
        ))}
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="p-2" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isMarked = markedDates.has(dateStr);
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const isSun = idx % 7 === 0;
          const isSat = idx % 7 === 6;
          return (
            <button
              key={dateStr}
              onClick={() => isMarked && onSelectDate(isSelected ? "" : dateStr)}
              className={`relative flex flex-col items-center py-1.5 text-sm transition-colors ${
                isMarked ? "cursor-pointer" : "cursor-default"
              } ${isSelected ? "bg-[var(--c-primary-light)]" : ""}`}
            >
              <span
                className={`w-7 h-7 flex items-center justify-center rounded-full text-sm
                  ${isToday ? "bg-[var(--c-primary)] text-white font-bold" : ""}
                  ${!isToday && isSun ? "text-[#A05040]" : ""}
                  ${!isToday && isSat ? "text-[#5A7A96]" : ""}
                  ${!isToday && !isSun && !isSat ? "text-[var(--c-fg)]" : ""}
                `}
              >
                {day}
              </span>
              {isMarked && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-primary)] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ConcertsPage() {
  const [enriched, setEnriched] = useState<EnrichedConcert[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    const apps = applicationStorage.getAll().filter((a) => a.status === "当選");
    const concerts = concertStorage.getAll();
    const aliases = aliasStorage.getAll();
    const groups = groupStorage.getAll();
    setEnriched(buildEnriched(apps, concerts, aliases, groups));
  }, []);

  const markedDates = useMemo(
    () => new Set(enriched.map((e) => e.concert.date)),
    [enriched]
  );

  const selectedConcerts = useMemo(() => {
    if (!selectedDate) return [];
    return enriched.filter((e) => e.concert.date === selectedDate);
  }, [enriched, selectedDate]);

  const upcomingConcerts = enriched.filter((e) => e.concert.date >= today);
  const pastConcerts = [...enriched]
    .filter((e) => e.concert.date < today)
    .reverse(); // 新しい順

  function prevMonth() {
    if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11); }
    else setCalMonth(calMonth - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0); }
    else setCalMonth(calMonth + 1);
    setSelectedDate(null);
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-[var(--c-primary)]">現場管理</h2>

      {enriched.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-[var(--c-text-sub)] text-sm">当選したチケットがありません</p>
          <a
            href="/tickets"
            className="inline-block bg-[var(--c-primary)] text-white px-5 py-2 rounded-full text-sm font-semibold"
          >
            チケット管理へ
          </a>
        </div>
      ) : (
        <>
          {/* カレンダー */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={prevMonth}
                className="text-[var(--c-primary)] px-3 py-1 rounded-lg hover:bg-[var(--c-bg)] transition-colors text-lg"
              >
                ‹
              </button>
              <h3 className="font-bold text-[var(--c-fg)]">
                {calYear}年{calMonth + 1}月
              </h3>
              <button
                onClick={nextMonth}
                className="text-[var(--c-primary)] px-3 py-1 rounded-lg hover:bg-[var(--c-bg)] transition-colors text-lg"
              >
                ›
              </button>
            </div>
            <Calendar
              year={calYear}
              month={calMonth}
              markedDates={markedDates}
              onSelectDate={setSelectedDate}
              selectedDate={selectedDate}
            />
            <p className="text-xs text-[var(--c-text-sub)] text-center">
              ● のある日付をタップすると詳細が表示されます
            </p>

            {/* 日付選択時の詳細 */}
            {selectedDate && selectedConcerts.length > 0 && (
              <div className="space-y-2">
                {selectedConcerts.map(({ concert, aliases, group }) => (
                  <div
                    key={concert.id}
                    className="bg-[var(--c-primary-light)] border border-[var(--c-border)] rounded-xl px-4 py-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-[var(--c-primary-dark)]">{concert.name}</p>
                        <p className="text-xs text-[var(--c-text-sub)] mt-0.5">
                          {concert.date} ・ {concert.venue}
                        </p>
                        {group && (
                          <p className="text-xs text-[var(--c-text-sub)] mt-0.5">{group.name}</p>
                        )}
                      </div>
                      <span className="text-xs bg-[#E3EDE6] text-[#4A7A5A] rounded-full px-2 py-0.5 font-semibold whitespace-nowrap">
                        当選
                      </span>
                    </div>
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {aliases.map((a) => (
                        <span
                          key={a.id}
                          className="text-xs bg-white text-[var(--c-primary)] rounded-full px-2 py-0.5 border border-[var(--c-border)] flex items-center gap-1"
                        >
                          <CreditCard className="w-3 h-3" /> {a.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 参戦履歴 */}
          <section className="space-y-3">
            <h3 className="font-bold text-[var(--c-fg)]">参戦履歴</h3>
            <div className="flex gap-1 bg-[#EEE0DE] rounded-xl p-1">
              {(["upcoming", "past"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    tab === t
                      ? "bg-[#C9908A] text-white shadow-sm"
                      : "bg-[#F0E8E8] text-[#9A7B7B]"
                  }`}
                >
                  {t === "upcoming"
                    ? `これから (${upcomingConcerts.length})`
                    : `参戦済み (${pastConcerts.length})`}
                </button>
              ))}
            </div>

            {tab === "upcoming" && (
              <ConcertList concerts={upcomingConcerts} empty="予定している現場はありません" />
            )}
            {tab === "past" && (
              <ConcertList concerts={pastConcerts} empty="参戦済みの現場はありません" />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ConcertList({
  concerts,
  empty,
}: {
  concerts: EnrichedConcert[];
  empty: string;
}) {
  const today = new Date().toISOString().slice(0, 10);

  if (concerts.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--c-text-sub)] text-sm">{empty}</div>
    );
  }

  return (
    <ul className="space-y-2">
      {concerts.map(({ concert, aliases, group }) => {
        const isPast = concert.date < today;
        return (
          <li
            key={concert.id}
            className={`rounded-2xl shadow-sm border px-4 py-3 ${
              isPast
                ? "bg-[var(--c-bg)] border-[var(--c-border)]"
                : "bg-white border-[var(--c-border)]"
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${isPast ? "text-[var(--c-text-sub)]" : "text-[var(--c-fg)]"}`}>
                  {concert.name}
                </p>
                <p className="text-xs text-[var(--c-text-sub)] mt-0.5">
                  {concert.date} ・ {concert.venue}
                </p>
                {group && (
                  <p className="text-xs text-[var(--c-text-sub)] mt-0.5">✨ {group.name}</p>
                )}
                <div className="mt-1.5 flex gap-1 flex-wrap">
                  {aliases.map((a) => (
                    <span
                      key={a.id}
                      className="text-xs bg-[var(--c-bg)] text-[var(--c-primary)] rounded-full px-2 py-0.5 border border-[var(--c-border)] flex items-center gap-1"
                    >
                      <CreditCard className="w-3 h-3" /> {a.name}
                    </span>
                  ))}
                </div>
              </div>
              {!isPast && (() => {
                const days = Math.ceil(
                  (new Date(concert.date).getTime() - new Date().setHours(0,0,0,0)) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <span className={`text-xs font-bold whitespace-nowrap rounded-full px-2 py-0.5 ${
                    days === 0
                      ? "bg-[var(--c-primary)] text-white"
                      : days <= 7
                      ? "bg-[#F0DDD8] text-[#A05040]"
                      : "bg-[var(--c-bg)] text-[var(--c-primary)]"
                  }`}>
                    {days === 0 ? "今日！" : `あと${days}日`}
                  </span>
                );
              })()}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
