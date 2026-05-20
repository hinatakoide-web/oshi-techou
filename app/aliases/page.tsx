"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, ChevronDown, ChevronUp, CreditCard } from "lucide-react";
import { groupStorage, aliasStorage, applicationStorage, concertStorage } from "@/lib/storage";
import type { OshiGroup, OshiAlias, OshiConcert } from "@/lib/types";

const MAX_ALIASES = 30;

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr);
  if (days < 0) {
    return (
      <span className="text-xs bg-[#F0DDD8] text-[#A05040] rounded-full px-2 py-0.5 font-semibold">
        期限切れ
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="text-xs bg-[#F0DDD8] text-[#A05040] rounded-full px-2 py-0.5 font-semibold">
        あと{days}日
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="text-xs bg-[#F0EBD8] text-[#8A6030] rounded-full px-2 py-0.5 font-semibold">
        あと{days}日
      </span>
    );
  }
  return (
    <span className="text-xs bg-[#E3EDE6] text-[#4A7A5A] rounded-full px-2 py-0.5">
      {dateStr}まで
    </span>
  );
}

function WinHistory({ aliasId }: { aliasId: string }) {
  const [concerts, setConcerts] = useState<OshiConcert[]>([]);

  useEffect(() => {
    const apps = applicationStorage.getByAlias(aliasId).filter((a) => a.status === "当選");
    const allConcerts = concertStorage.getAll();
    const won = apps
      .map((a) => allConcerts.find((c) => c.id === a.concert_id))
      .filter((c): c is OshiConcert => !!c)
      .sort((a, b) => a.date.localeCompare(b.date));
    setConcerts(won);
  }, [aliasId]);

  if (concerts.length === 0) {
    return <p className="text-xs text-[var(--c-text-sub)] mt-2">当選履歴なし</p>;
  }

  return (
    <ul className="mt-2 space-y-1">
      {concerts.map((c) => (
        <li key={c.id} className="text-xs text-[#4A7A5A] bg-[#E3EDE6] rounded-lg px-2 py-1 flex justify-between">
          <span className="font-medium">{c.name}</span>
          <span className="text-[#6A9A7A]">{c.date} {c.venue}</span>
        </li>
      ))}
    </ul>
  );
}

type FormState = { name: string; expires: string; owner_name: string; favorite_artist: string };
const emptyForm: FormState = { name: "", expires: "", owner_name: "", favorite_artist: "" };

export default function AliasesPage() {
  const [groups, setGroups] = useState<OshiGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [aliases, setAliases] = useState<OshiAlias[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const g = groupStorage.getAll();
    setGroups(g);
    if (g.length > 0) setSelectedGroupId(g[0].id);
  }, []);

  useEffect(() => {
    if (!selectedGroupId) return;
    setAliases(aliasStorage.getByGroup(selectedGroupId));
    setEditingId(null);
    setExpandedId(null);
    setError("");
  }, [selectedGroupId]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const owner_name = form.owner_name.trim();
    if (!owner_name) { setError("名義人の名前を入力してください"); return; }
    if (!form.expires) { setError("会員期限を入力してください"); return; }
    if (aliases.length >= MAX_ALIASES) {
      setError(`1グループに登録できる名義は最大${MAX_ALIASES}件です`);
      return;
    }
    if (aliases.some((a) => a.name === owner_name)) {
      setError("同じ名前の名義が既に存在します");
      return;
    }
    const added = aliasStorage.add({
      group_id: selectedGroupId,
      name: owner_name,
      membership_expires_at: form.expires,
      owner_name,
      favorite_artist: form.favorite_artist.trim() || undefined,
    });
    setAliases([...aliases, added]);
    setForm(emptyForm);
    setError("");
  }

  function handleDelete(id: string) {
    aliasStorage.remove(id);
    setAliases(aliases.filter((a) => a.id !== id));
  }

  function startEdit(alias: OshiAlias) {
    setEditingId(alias.id);
    setEditForm({
      name: alias.owner_name ?? alias.name,
      expires: alias.membership_expires_at,
      owner_name: alias.owner_name ?? alias.name,
      favorite_artist: alias.favorite_artist ?? "",
    });
  }

  function handleEditSave(id: string) {
    const owner_name = editForm.owner_name.trim();
    if (!owner_name || !editForm.expires) return;
    const favorite_artist = editForm.favorite_artist.trim() || undefined;
    aliasStorage.update(id, { name: owner_name, membership_expires_at: editForm.expires, owner_name, favorite_artist });
    setAliases(
      aliases.map((a) =>
        a.id === id ? { ...a, name: owner_name, membership_expires_at: editForm.expires, owner_name, favorite_artist } : a
      )
    );
    setEditingId(null);
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-[var(--c-text-sub)] text-sm">先にグループを登録してください</p>
        <a href="/groups" className="inline-block bg-[var(--c-primary)] text-white px-5 py-2 rounded-full text-sm font-semibold">
          グループ管理へ
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[var(--c-primary)]">名義管理</h2>

      {/* グループ選択 */}
      <div className="flex gap-2 flex-wrap">
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedGroupId(g.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              selectedGroupId === g.id
                ? "bg-[#C9908A] text-white border-transparent"
                : "bg-[#F0E8E8] text-[#9A7B7B] border-[#EEE0DE]"
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* 追加フォーム */}
      <form
        onSubmit={handleAdd}
        className="bg-white rounded-2xl shadow-sm border border-[var(--c-border)] p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-[var(--c-fg)]">名義を追加</label>
          <span className={`text-xs font-semibold ${aliases.length >= MAX_ALIASES ? "text-[#A05040]" : "text-[var(--c-text-sub)]"}`}>
            {aliases.length} / {MAX_ALIASES}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[var(--c-text-sub)] block mb-1">名義人の名前</label>
            <input
              type="text"
              value={form.owner_name}
              onChange={(e) => { setForm({ ...form, owner_name: e.target.value }); setError(""); }}
              placeholder="例：山田太郎"
              className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
              maxLength={50}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--c-text-sub)] block mb-1">好きなアーティスト</label>
            <input
              type="text"
              value={form.favorite_artist}
              onChange={(e) => setForm({ ...form, favorite_artist: e.target.value })}
              placeholder="例：〇〇"
              className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
              maxLength={50}
            />
          </div>
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-[var(--c-text-sub)] block mb-1">会員期限</label>
            <input
              type="date"
              value={form.expires}
              onChange={(e) => { setForm({ ...form, expires: e.target.value }); setError(""); }}
              className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
            />
          </div>
          <button
            type="submit"
            disabled={aliases.length >= MAX_ALIASES}
            className="bg-[var(--c-primary)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--c-primary-dark)] transition-colors disabled:opacity-40"
          >
            追加
          </button>
        </div>
        {error && <p className="text-[#A05040] text-xs">{error}</p>}
      </form>

      {/* 名義一覧 */}
      <section>
        <p className="text-xs text-[var(--c-text-sub)] mb-2">{aliases.length}件の名義</p>
        {aliases.length === 0 ? (
          <div className="text-center py-10 text-[var(--c-text-sub)]">
            <p className="text-sm">名義がまだありません</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {aliases.map((alias) => (
              <li
                key={alias.id}
                className="bg-white rounded-2xl shadow-sm border border-[var(--c-border)] px-4 py-3"
              >
                {editingId === alias.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-[var(--c-text-sub)] block mb-1">名義人の名前</label>
                        <input
                          type="text"
                          value={editForm.owner_name}
                          onChange={(e) => setEditForm({ ...editForm, owner_name: e.target.value })}
                          placeholder="例：山田太郎"
                          className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
                          maxLength={50}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[var(--c-text-sub)] block mb-1">好きなアーティスト</label>
                        <input
                          type="text"
                          value={editForm.favorite_artist}
                          onChange={(e) => setEditForm({ ...editForm, favorite_artist: e.target.value })}
                          placeholder="例：〇〇"
                          className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
                          maxLength={50}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-[var(--c-text-sub)] block mb-1">会員期限</label>
                        <input
                          type="date"
                          value={editForm.expires}
                          onChange={(e) => setEditForm({ ...editForm, expires: e.target.value })}
                          className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
                        />
                      </div>
                      <button
                        onClick={() => handleEditSave(alias.id)}
                        className="bg-[var(--c-primary)] text-white px-3 py-2 rounded-xl text-sm font-semibold"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-[var(--c-text-sub)] px-2 py-2 text-sm"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 font-semibold text-[var(--c-fg)]">{alias.name}</span>
                      <ExpiryBadge dateStr={alias.membership_expires_at} />
                      <button
                        onClick={() => startEdit(alias)}
                        className="text-[var(--c-text-sub)] hover:text-[var(--c-primary)] transition-colors p-1"
                        aria-label="編集"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`「${alias.name}」を削除しますか？`)) handleDelete(alias.id);
                        }}
                        className="text-[var(--c-text-sub)] hover:text-[#A05040] transition-colors p-1"
                        aria-label="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {(alias.owner_name || alias.favorite_artist) && (
                      <p className="text-xs text-[var(--c-text-sub)] mt-1">
                        {alias.owner_name && `名義人：${alias.owner_name}`}
                        {alias.owner_name && alias.favorite_artist && " / "}
                        {alias.favorite_artist && `好きなアーティスト：${alias.favorite_artist}`}
                      </p>
                    )}

                    {/* 当選履歴トグル */}
                    <button
                      onClick={() => setExpandedId(expandedId === alias.id ? null : alias.id)}
                      className="mt-2 text-xs text-[var(--c-primary)] flex items-center gap-1 hover:underline"
                    >
                      {expandedId === alias.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      当選履歴
                    </button>
                    {expandedId === alias.id && <WinHistory aliasId={alias.id} />}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
