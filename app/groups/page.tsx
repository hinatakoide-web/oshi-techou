"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { groupStorage } from "@/lib/storage";
import type { OshiGroup } from "@/lib/types";

export default function GroupsPage() {
  const [groups, setGroups] = useState<OshiGroup[]>([]);
  const [inputName, setInputName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setGroups(groupStorage.getAll());
  }, []);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = inputName.trim();
    if (!name) { setError("グループ名を入力してください"); return; }
    if (groups.some((g) => g.name === name)) { setError("同じ名前のグループが既に存在します"); return; }
    const newGroup = groupStorage.add(name);
    setGroups([...groups, newGroup]);
    setInputName("");
    setError("");
  }

  function handleDelete(id: string) {
    groupStorage.remove(id);
    setGroups(groups.filter((g) => g.id !== id));
  }

  function startEdit(group: OshiGroup) {
    setEditingId(group.id);
    setEditName(group.name);
  }

  function handleEditSave(id: string) {
    const name = editName.trim();
    if (!name) return;
    groupStorage.update(id, name);
    setGroups(groups.map((g) => (g.id === id ? { ...g, name } : g)));
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[var(--c-primary)]">グループ管理</h2>

      {/* 追加フォーム */}
      <form
        onSubmit={handleAdd}
        className="bg-white rounded-2xl shadow-sm border border-[var(--c-border)] p-4 space-y-3"
      >
        <label className="block text-sm font-semibold text-[var(--c-fg)]">
          グループ名を追加
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputName}
            onChange={(e) => { setInputName(e.target.value); setError(""); }}
            placeholder="例：〇〇グループ"
            className="flex-1 border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent text-[var(--c-fg)] placeholder:text-[var(--c-primary-muted)]"
            maxLength={50}
          />
          <button
            type="submit"
            className="bg-[var(--c-primary)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--c-primary-dark)] transition-colors"
          >
            追加
          </button>
        </div>
        {error && <p className="text-[#A05040] text-xs">{error}</p>}
      </form>

      {/* グループ一覧 */}
      <section>
        <p className="text-xs text-[var(--c-text-sub)] mb-2">{groups.length}件のグループ</p>
        {groups.length === 0 ? (
          <div className="text-center py-10 text-[var(--c-text-sub)]">
            <p className="text-sm">グループがまだありません</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {groups.map((group) => (
              <li
                key={group.id}
                className="bg-white rounded-2xl shadow-sm border border-[var(--c-border)] px-4 py-3 flex items-center gap-3"
              >
                {editingId === group.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 border border-[var(--c-border)] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] text-[var(--c-fg)]"
                      maxLength={50}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditSave(group.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <button
                      onClick={() => handleEditSave(group.id)}
                      className="text-[var(--c-primary)] text-sm font-semibold px-2"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-[var(--c-text-sub)] text-sm px-2"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 font-semibold text-[var(--c-fg)]">{group.name}</span>
                    <button
                      onClick={() => startEdit(group)}
                      className="text-[var(--c-text-sub)] hover:text-[var(--c-primary)] transition-colors p-1"
                      aria-label="編集"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`「${group.name}」を削除しますか？`)) handleDelete(group.id); }}
                      className="text-[var(--c-text-sub)] hover:text-[#A05040] transition-colors p-1"
                      aria-label="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
