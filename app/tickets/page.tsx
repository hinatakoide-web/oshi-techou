"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Link as LinkIcon, PlusCircle, ChevronDown, ChevronUp } from "lucide-react";
import {
  groupStorage,
  aliasStorage,
  concertStorage,
  applicationStorage,
} from "@/lib/storage";
import type {
  OshiGroup,
  OshiAlias,
  OshiConcert,
  OshiApplication,
  ApplicationStatus,
} from "@/lib/types";
import type { ScrapeResult } from "@/app/api/scrape/route";

const STATUSES: ApplicationStatus[] = ["申込中", "当落待ち", "当選", "落選"];

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  申込中: "bg-[#E5EBF0] text-[#5A7A96]",
  当落待ち: "bg-[#F0EBD8] text-[#8A6030]",
  当選: "bg-[#E3EDE6] text-[#4A7A5A]",
  落選: "bg-[#EDE8E8] text-[var(--c-text-sub)]",
};

type Tab = "concerts" | "applications";

type ConcertForm = { name: string; date: string; venue: string; time: string; performance: string };
const emptyConcertForm: ConcertForm = { name: "", date: "", venue: "", time: "", performance: "" };

const PERFORMANCE_STYLE: Record<string, string> = {
  昼公演: "bg-[#F0EBD8] text-[#7A6030]",
  夜公演: "bg-[#E8E5F0] text-[#5A5080]",
};

type EditableConcert = {
  _id: string;
  date: string;
  venue: string;
  time: string;
  performance: string;
};
let _editId = 0;
const nextEditId = () => String(++_editId);
function makeEmpty(): EditableConcert {
  return { _id: nextEditId(), date: "", venue: "", time: "", performance: "" };
}

export default function TicketsPage() {
  const [groups, setGroups] = useState<OshiGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [aliases, setAliases] = useState<OshiAlias[]>([]);
  const [concerts, setConcerts] = useState<OshiConcert[]>([]);
  const [applications, setApplications] = useState<OshiApplication[]>([]);
  const [tab, setTab] = useState<Tab>("concerts");

  // 手動入力フォーム
  const [concertForm, setConcertForm] = useState<ConcertForm>(emptyConcertForm);
  const [concertError, setConcertError] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [editConcertId, setEditConcertId] = useState<string | null>(null);
  const [editConcertForm, setEditConcertForm] = useState<ConcertForm>(emptyConcertForm);

  // URL スクレイピング
  const [showScrapeForm, setShowScrapeForm] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeError, setScrapeError] = useState("");
  const [scrapePhase, setScrapePhase] = useState<"idle" | "editing">("idle");
  const [editedLiveName, setEditedLiveName] = useState("");
  const [editedConcerts, setEditedConcerts] = useState<EditableConcert[]>([]);

  // 応募フォーム
  const [appConcertId, setAppConcertId] = useState("");
  const [appAliasId, setAppAliasId] = useState("");
  const [appError, setAppError] = useState("");

  useEffect(() => {
    const g = groupStorage.getAll();
    setGroups(g);
    if (g.length > 0) setSelectedGroupId(g[0].id);
  }, []);

  useEffect(() => {
    if (!selectedGroupId) return;
    setAliases(aliasStorage.getByGroup(selectedGroupId));
    setConcerts(concertStorage.getByGroup(selectedGroupId));
    setApplications(applicationStorage.getAll());
    setAppConcertId("");
    setAppAliasId("");
    setConcertError("");
    setAppError("");
    setEditConcertId(null);
    clearScrape();
  }, [selectedGroupId]);

  function clearScrape() {
    setScrapeUrl("");
    setScrapeError("");
    setScrapePhase("idle");
    setEditedLiveName("");
    setEditedConcerts([]);
    setShowScrapeForm(false);
  }

  // ---- スクレイピング ----
  async function handleScrape() {
    if (!scrapeUrl.trim()) return;
    setScrapeLoading(true);
    setScrapeError("");
    setScrapePhase("idle");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl.trim() }),
      });
      const data: ScrapeResult = await res.json();
      if (!res.ok || data.error) {
        setScrapeError(data.error ?? "取得に失敗しました");
        return;
      }
      setEditedLiveName(data.liveName ?? "");
      setEditedConcerts(
        data.concerts.length > 0
          ? data.concerts.map((c) => ({
              _id: nextEditId(),
              date: c.date ?? "",
              venue: c.venue ?? "",
              time: c.time ?? "",
              performance: c.performance ?? "",
            }))
          : [makeEmpty()]
      );
      setScrapePhase("editing");
    } catch {
      setScrapeError("ネットワークエラーが発生しました");
    } finally {
      setScrapeLoading(false);
    }
  }

  function updateEditedConcert(idx: number, field: keyof Omit<EditableConcert, "_id">, value: string) {
    setEditedConcerts((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }

  function updateEditedTime(idx: number, timeVal: string) {
    const h = parseInt(timeVal.split(":")[0]);
    const perf = !isNaN(h) ? (h >= 11 && h < 16 ? "昼公演" : h >= 16 ? "夜公演" : "") : "";
    setEditedConcerts((prev) => prev.map((c, i) => (i === idx ? { ...c, time: timeVal, performance: perf } : c)));
  }

  function removeEditedConcert(idx: number) {
    setEditedConcerts((prev) => prev.filter((_, i) => i !== idx));
  }

  function addEditedConcert() {
    setEditedConcerts((prev) => [...prev, makeEmpty()]);
  }

  function handleSaveEdited() {
    const name = editedLiveName.trim() || "（公演名未取得）";
    const added: OshiConcert[] = [];
    for (const c of editedConcerts) {
      if (!c.date) continue;
      const stored = concertStorage.add({
        group_id: selectedGroupId,
        name,
        date: c.date,
        venue: c.venue,
        time: c.time || undefined,
        performance: c.performance || undefined,
      });
      added.push(stored);
    }
    setConcerts((prev) => [...prev, ...added]);
    clearScrape();
  }

  // ---- 公演（手動）----
  function handleAddConcert(e: React.FormEvent) {
    e.preventDefault();
    const name = concertForm.name.trim();
    const venue = concertForm.venue.trim();
    if (!name) { setConcertError("公演名を入力してください"); return; }
    if (!concertForm.date) { setConcertError("日程を入力してください"); return; }
    if (!venue) { setConcertError("会場を入力してください"); return; }
    const added = concertStorage.add({
      group_id: selectedGroupId,
      name,
      date: concertForm.date,
      venue,
      time: concertForm.time || undefined,
      performance: concertForm.performance || undefined,
    });
    setConcerts((prev) => [...prev, added]);
    setConcertForm(emptyConcertForm);
    setConcertError("");
    setShowManualForm(false);
  }

  function handleDeleteConcert(id: string) {
    concertStorage.remove(id);
    applications.filter((a) => a.concert_id === id).forEach((a) => applicationStorage.remove(a.id));
    setConcerts((prev) => prev.filter((c) => c.id !== id));
    setApplications((prev) => prev.filter((a) => a.concert_id !== id));
  }

  function startEditConcert(c: OshiConcert) {
    setEditConcertId(c.id);
    setEditConcertForm({ name: c.name, date: c.date, venue: c.venue, time: c.time ?? "", performance: c.performance ?? "" });
  }

  function handleEditConcertSave(id: string) {
    const name = editConcertForm.name.trim();
    const venue = editConcertForm.venue.trim();
    if (!name || !editConcertForm.date || !venue) return;
    concertStorage.update(id, { name, date: editConcertForm.date, venue, time: editConcertForm.time || undefined, performance: editConcertForm.performance || undefined });
    setConcerts((prev) => prev.map((c) => c.id === id ? { ...c, name, date: editConcertForm.date, venue, time: editConcertForm.time || undefined, performance: editConcertForm.performance || undefined } : c));
    setEditConcertId(null);
  }

  // ---- 応募 ----
  function handleAddApplication(e: React.FormEvent) {
    e.preventDefault();
    if (!appConcertId) { setAppError("公演を選択してください"); return; }
    if (!appAliasId) { setAppError("名義を選択してください"); return; }
    if (applications.find((a) => a.concert_id === appConcertId && a.alias_id === appAliasId)) {
      setAppError("この名義×公演の応募は既に登録されています"); return;
    }
    const added = applicationStorage.add({ concert_id: appConcertId, alias_id: appAliasId, status: "申込中" });
    setApplications((prev) => [...prev, added]);
    setAppAliasId("");
    setAppError("");
  }

  function handleStatusChange(id: string, status: ApplicationStatus) {
    applicationStorage.update(id, { status });
    setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
  }

  function handleDeleteApp(id: string) {
    applicationStorage.remove(id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }

  const groupConcertIds = new Set(concerts.map((c) => c.id));
  const groupApplications = applications.filter((a) => groupConcertIds.has(a.concert_id));

  if (groups.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-[var(--c-text-sub)] text-sm">先にグループを登録してください</p>
        <a href="/groups" className="inline-block bg-[var(--c-primary)] text-white px-5 py-2 rounded-full text-sm font-semibold">グループ管理へ</a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-[var(--c-primary)]">チケット管理</h2>

      {/* グループ選択 */}
      <div className="flex gap-2 flex-wrap">
        {groups.map((g) => (
          <button key={g.id} onClick={() => setSelectedGroupId(g.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${selectedGroupId === g.id ? "bg-[#C9908A] text-white border-transparent" : "bg-[#F0E8E8] text-[#9A7B7B] border-[#EEE0DE]"}`}>
            {g.name}
          </button>
        ))}
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-[#EEE0DE] rounded-xl p-1">
        {(["concerts", "applications"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === t ? "bg-[#C9908A] text-white shadow-sm" : "bg-[#F0E8E8] text-[#9A7B7B]"}`}>
            {t === "concerts" ? `公演 (${concerts.length})` : `応募 (${groupApplications.length})`}
          </button>
        ))}
      </div>

      {/* ===== 公演タブ ===== */}
      {tab === "concerts" && (
        <div className="space-y-4">

          {/* URL スクレイピング */}
          <div className="bg-white rounded-2xl shadow-sm border border-[var(--c-border)] overflow-hidden">
            <button
              onClick={() => setShowScrapeForm(!showScrapeForm)}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-[var(--c-fg)] hover:bg-[var(--c-bg)] transition-colors"
            >
              <span className="flex items-center gap-1.5"><LinkIcon className="w-4 h-4" /> URLから公演情報を取得</span>
              <span className="text-[var(--c-text-sub)] text-xs flex items-center gap-0.5">
                {showScrapeForm ? <><ChevronUp className="w-3 h-3" /> 閉じる</> : <><ChevronDown className="w-3 h-3" /> 開く</>}
              </span>
            </button>

            {(showScrapeForm || scrapePhase === "editing") && (
              <div className="px-4 pb-4 space-y-3 border-t border-[var(--c-border)]">
                <div className="flex gap-2 pt-3">
                  <input
                    type="url"
                    value={scrapeUrl}
                    onChange={(e) => { setScrapeUrl(e.target.value); setScrapeError(""); }}
                    placeholder="https://starto.jp/s/p/live/..."
                    className="flex-1 border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
                  />
                  <button
                    type="button"
                    onClick={handleScrape}
                    disabled={scrapeLoading || !scrapeUrl.trim()}
                    className="bg-[var(--c-primary)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--c-primary-dark)] transition-colors disabled:opacity-40 whitespace-nowrap"
                  >
                    {scrapeLoading ? "取得中…" : "取得"}
                  </button>
                </div>
                {scrapeError && <p className="text-[#A05040] text-xs">{scrapeError}</p>}

                {/* 取得結果 - 編集フォーム */}
                {scrapePhase === "editing" && (
              <div className="space-y-3 border-t border-[var(--c-border)] pt-3">
                {editedConcerts.length === 0 && (
                  <p className="text-xs text-[#8A6030]">スケジュール情報が見つかりませんでした。以下に手動で入力してください。</p>
                )}

                {/* ライブ名 */}
                <div>
                  <label className="text-xs text-[var(--c-text-sub)] block mb-1">ライブ名</label>
                  <input
                    type="text"
                    value={editedLiveName}
                    onChange={(e) => setEditedLiveName(e.target.value)}
                    placeholder="公演名（例：〇〇 LIVE TOUR 2026）"
                    className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
                  />
                </div>

                {/* 公演リスト（編集可能） */}
                <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-0.5">
                  {editedConcerts.map((c, idx) => (
                    <div key={c._id} className="bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={c.date}
                          onChange={(e) => updateEditedConcert(idx, "date", e.target.value)}
                          className="flex-1 border border-[var(--c-border)] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
                        />
                        <button
                          onClick={() => removeEditedConcert(idx)}
                          className="text-[var(--c-text-sub)] hover:text-[#A05040] transition-colors p-1 shrink-0"
                          aria-label="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={c.venue}
                        onChange={(e) => updateEditedConcert(idx, "venue", e.target.value)}
                        placeholder="会場（未取得の場合は手動入力）"
                        className="w-full border border-[var(--c-border)] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="time"
                          value={c.time}
                          onChange={(e) => updateEditedTime(idx, e.target.value)}
                          className="border border-[var(--c-border)] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
                        />
                        <select
                          value={c.performance}
                          onChange={(e) => updateEditedConcert(idx, "performance", e.target.value)}
                          className="border border-[var(--c-border)] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] bg-white"
                        >
                          <option value="">未設定</option>
                          <option value="昼公演">昼公演</option>
                          <option value="夜公演">夜公演</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addEditedConcert}
                  className="w-full border border-dashed border-[var(--c-primary-muted)] text-[var(--c-text-sub)] rounded-xl py-2 text-sm hover:border-[var(--c-primary)] hover:text-[var(--c-primary)] transition-colors flex items-center justify-center gap-1"
                >
                  <PlusCircle className="w-4 h-4" /> 公演を追加
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdited}
                    disabled={editedConcerts.filter((c) => c.date).length === 0}
                    className="flex-1 bg-[var(--c-primary)] text-white py-2 rounded-xl text-sm font-semibold hover:bg-[var(--c-primary-dark)] transition-colors disabled:opacity-40"
                  >
                    {editedConcerts.filter((c) => c.date).length}件の公演を保存
                  </button>
                  <button onClick={clearScrape} className="text-[var(--c-text-sub)] text-sm px-3">
                    クリア
                  </button>
                </div>
              </div>
                )}
              </div>
            )}
          </div>

          {/* 手動入力フォーム */}
          <div className="bg-white rounded-2xl shadow-sm border border-[var(--c-border)] overflow-hidden">
            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-[var(--c-fg)] hover:bg-[var(--c-bg)] transition-colors"
            >
              <span className="flex items-center gap-1.5"><PlusCircle className="w-4 h-4" /> 手動で公演を追加</span>
              <span className="text-[var(--c-text-sub)] text-xs flex items-center gap-0.5">{showManualForm ? <><ChevronUp className="w-3 h-3" /> 閉じる</> : <><ChevronDown className="w-3 h-3" /> 開く</>}</span>
            </button>
            {showManualForm && (
              <form onSubmit={handleAddConcert} className="px-4 pb-4 space-y-3 border-t border-[var(--c-border)]">
                <div className="pt-3">
                  <input
                    type="text"
                    value={concertForm.name}
                    onChange={(e) => { setConcertForm({ ...concertForm, name: e.target.value }); setConcertError(""); }}
                    placeholder="公演名（例：〇〇 LIVE TOUR 2026）"
                    className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
                    maxLength={80}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-[var(--c-text-sub)] block mb-1">日程</label>
                    <input type="date" value={concertForm.date}
                      onChange={(e) => { setConcertForm({ ...concertForm, date: e.target.value }); setConcertError(""); }}
                      className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]" />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--c-text-sub)] block mb-1">会場</label>
                    <input type="text" value={concertForm.venue}
                      onChange={(e) => { setConcertForm({ ...concertForm, venue: e.target.value }); setConcertError(""); }}
                      placeholder="例：東京ドーム"
                      className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
                      maxLength={50} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-[var(--c-text-sub)] block mb-1">開演時間</label>
                    <input type="time" value={concertForm.time}
                      onChange={(e) => {
                        const t = e.target.value;
                        const h = parseInt(t.split(":")[0]);
                        const perf = !isNaN(h) ? (h >= 11 && h < 16 ? "昼公演" : h >= 16 ? "夜公演" : "") : "";
                        setConcertForm({ ...concertForm, time: t, performance: perf });
                      }}
                      className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]" />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--c-text-sub)] block mb-1">公演区分</label>
                    <select value={concertForm.performance}
                      onChange={(e) => setConcertForm({ ...concertForm, performance: e.target.value })}
                      className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] bg-white">
                      <option value="">未設定</option>
                      <option value="昼公演">昼公演</option>
                      <option value="夜公演">夜公演</option>
                    </select>
                  </div>
                </div>
                {concertError && <p className="text-[#A05040] text-xs">{concertError}</p>}
                <button type="submit" className="w-full bg-[var(--c-primary)] text-white py-2 rounded-xl text-sm font-semibold hover:bg-[var(--c-primary-dark)] transition-colors">
                  公演を追加
                </button>
              </form>
            )}
          </div>

          {/* 公演一覧 */}
          {concerts.length === 0 ? (
            <div className="text-center py-10 text-[var(--c-text-sub)]">
              <p className="text-sm">公演がまだありません</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {[...concerts].sort((a, b) => a.date.localeCompare(b.date)).map((concert) => {
                const appCount = applications.filter((a) => a.concert_id === concert.id).length;
                return (
                  <li key={concert.id} className="bg-white rounded-2xl shadow-sm border border-[var(--c-border)] px-4 py-3">
                    {editConcertId === concert.id ? (
                      <div className="space-y-2">
                        <input type="text" value={editConcertForm.name}
                          onChange={(e) => setEditConcertForm({ ...editConcertForm, name: e.target.value })}
                          className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
                          autoFocus />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" value={editConcertForm.date}
                            onChange={(e) => setEditConcertForm({ ...editConcertForm, date: e.target.value })}
                            className="border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]" />
                          <input type="text" value={editConcertForm.venue}
                            onChange={(e) => setEditConcertForm({ ...editConcertForm, venue: e.target.value })}
                            placeholder="会場"
                            className="border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="time" value={editConcertForm.time}
                            onChange={(e) => { const t = e.target.value; const h = parseInt(t.split(":")[0]); const perf = !isNaN(h) ? (h >= 11 && h < 16 ? "昼公演" : h >= 16 ? "夜公演" : "") : ""; setEditConcertForm({ ...editConcertForm, time: t, performance: perf }); }}
                            className="border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]" />
                          <select value={editConcertForm.performance}
                            onChange={(e) => setEditConcertForm({ ...editConcertForm, performance: e.target.value })}
                            className="border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] bg-white">
                            <option value="">未設定</option>
                            <option value="昼公演">昼公演</option>
                            <option value="夜公演">夜公演</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditConcertSave(concert.id)} className="bg-[var(--c-primary)] text-white px-3 py-1.5 rounded-lg text-sm font-semibold">保存</button>
                          <button onClick={() => setEditConcertId(null)} className="text-[var(--c-text-sub)] px-2 text-sm">取消</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-[var(--c-fg)] truncate">{concert.name}</p>
                            {concert.performance && (
                              <span className={`text-xs rounded-full px-2 py-0.5 font-semibold whitespace-nowrap ${PERFORMANCE_STYLE[concert.performance] ?? ""}`}>
                                {concert.performance}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--c-text-sub)] mt-0.5">
                            {concert.date}{concert.time ? ` 開演${concert.time}` : ""} ・ {concert.venue}
                          </p>
                          <p className="text-xs text-[var(--c-primary)] mt-1">応募 {appCount}件</p>
                        </div>
                        <button onClick={() => startEditConcert(concert)} className="text-[var(--c-text-sub)] hover:text-[var(--c-primary)] transition-colors p-1" aria-label="編集"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm(`「${concert.name}」を削除しますか？\n関連する応募も削除されます。`)) handleDeleteConcert(concert.id); }}
                          className="text-[var(--c-text-sub)] hover:text-[#A05040] transition-colors p-1" aria-label="削除"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ===== 応募タブ ===== */}
      {tab === "applications" && (
        <div className="space-y-4">
          {concerts.length === 0 || aliases.length === 0 ? (
            <div className="bg-[#FAF4EC] border border-[#E8D4A0] rounded-xl px-4 py-3 text-sm text-[#7A5820]">
              {concerts.length === 0 ? "先に「公演」タブで公演を追加してください" : "先に名義を登録してください"}
            </div>
          ) : (
            <form onSubmit={handleAddApplication} className="bg-white rounded-2xl shadow-sm border border-[var(--c-border)] p-4 space-y-3">
              <label className="block text-sm font-semibold text-[var(--c-fg)]">応募を登録</label>
              <div>
                <label className="text-xs text-[var(--c-text-sub)] block mb-1">公演</label>
                <select value={appConcertId} onChange={(e) => { setAppConcertId(e.target.value); setAppError(""); }}
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] bg-white">
                  <option value="">-- 公演を選択 --</option>
                  {[...concerts].sort((a, b) => a.date.localeCompare(b.date)).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.date}{c.time ? ` ${c.time}` : ""} {c.name}{c.performance ? `（${c.performance}）` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--c-text-sub)] block mb-1">名義</label>
                <select value={appAliasId} onChange={(e) => { setAppAliasId(e.target.value); setAppError(""); }}
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] bg-white">
                  <option value="">-- 名義を選択 --</option>
                  {aliases.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              {appError && <p className="text-[#A05040] text-xs">{appError}</p>}
              <button type="submit" className="w-full bg-[var(--c-primary)] text-white py-2 rounded-xl text-sm font-semibold hover:bg-[var(--c-primary-dark)] transition-colors">
                申込中で登録
              </button>
            </form>
          )}

          {/* 応募一覧 */}
          {concerts.length > 0 && (
            <div className="space-y-3">
              {[...concerts].sort((a, b) => a.date.localeCompare(b.date)).map((concert) => {
                const concertApps = groupApplications.filter((a) => a.concert_id === concert.id);
                if (concertApps.length === 0) return null;
                return (
                  <div key={concert.id} className="bg-white rounded-2xl shadow-sm border border-[var(--c-border)] overflow-hidden">
                    <div className="px-4 py-3 bg-[var(--c-bg)] border-b border-[var(--c-border)]">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[var(--c-fg)] text-sm">{concert.name}</p>
                        {concert.performance && (
                          <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${PERFORMANCE_STYLE[concert.performance] ?? ""}`}>
                            {concert.performance}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--c-text-sub)]">
                        {concert.date}{concert.time ? ` 開演${concert.time}` : ""} ・ {concert.venue}
                      </p>
                    </div>
                    <ul className="divide-y divide-[var(--c-border)]">
                      {concertApps.map((app) => {
                        const alias = aliases.find((a) => a.id === app.alias_id);
                        return (
                          <li key={app.id} className="px-4 py-3 flex items-center gap-3">
                            <span className="flex-1 text-sm text-[var(--c-fg)]">{alias?.name ?? "不明な名義"}</span>
                            <select value={app.status}
                              onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                              className={`text-xs font-semibold rounded-full px-2 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] cursor-pointer ${STATUS_STYLE[app.status]}`}>
                              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={() => { if (confirm("この応募を削除しますか？")) handleDeleteApp(app.id); }}
                              className="text-[var(--c-text-sub)] hover:text-[#A05040] transition-colors p-1" aria-label="削除"><Trash2 className="w-4 h-4" /></button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
              {groupApplications.length === 0 && (
                <div className="text-center py-10 text-[var(--c-text-sub)]">
                  <p className="text-sm">応募がまだありません</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
