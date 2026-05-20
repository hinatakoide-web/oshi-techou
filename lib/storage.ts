import type { OshiGroup, OshiAlias, OshiConcert, OshiApplication } from "./types";

const KEYS = {
  groups: "oshi_groups",
  aliases: "oshi_aliases",
  concerts: "oshi_concerts",
  applications: "oshi_applications",
} as const;

function load<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
  return crypto.randomUUID();
}

// Groups
export const groupStorage = {
  getAll: (): OshiGroup[] => load<OshiGroup>(KEYS.groups),
  add: (name: string): OshiGroup => {
    const item: OshiGroup = { id: generateId(), name };
    const list = load<OshiGroup>(KEYS.groups);
    save(KEYS.groups, [...list, item]);
    return item;
  },
  remove: (id: string): void => {
    save(KEYS.groups, load<OshiGroup>(KEYS.groups).filter((g) => g.id !== id));
  },
  update: (id: string, name: string): void => {
    save(
      KEYS.groups,
      load<OshiGroup>(KEYS.groups).map((g) => (g.id === id ? { ...g, name } : g))
    );
  },
};

// Aliases
export const aliasStorage = {
  getAll: (): OshiAlias[] => load<OshiAlias>(KEYS.aliases),
  getByGroup: (group_id: string): OshiAlias[] =>
    load<OshiAlias>(KEYS.aliases).filter((a) => a.group_id === group_id),
  add: (data: Omit<OshiAlias, "id">): OshiAlias => {
    const item: OshiAlias = { id: generateId(), ...data };
    const list = load<OshiAlias>(KEYS.aliases);
    save(KEYS.aliases, [...list, item]);
    return item;
  },
  remove: (id: string): void => {
    save(KEYS.aliases, load<OshiAlias>(KEYS.aliases).filter((a) => a.id !== id));
  },
  update: (id: string, data: Partial<Omit<OshiAlias, "id">>): void => {
    save(
      KEYS.aliases,
      load<OshiAlias>(KEYS.aliases).map((a) => (a.id === id ? { ...a, ...data } : a))
    );
  },
};

// Concerts
export const concertStorage = {
  getAll: (): OshiConcert[] => load<OshiConcert>(KEYS.concerts),
  getByGroup: (group_id: string): OshiConcert[] =>
    load<OshiConcert>(KEYS.concerts).filter((c) => c.group_id === group_id),
  add: (data: Omit<OshiConcert, "id">): OshiConcert => {
    const item: OshiConcert = { id: generateId(), ...data };
    const list = load<OshiConcert>(KEYS.concerts);
    save(KEYS.concerts, [...list, item]);
    return item;
  },
  remove: (id: string): void => {
    save(KEYS.concerts, load<OshiConcert>(KEYS.concerts).filter((c) => c.id !== id));
  },
  update: (id: string, data: Partial<Omit<OshiConcert, "id">>): void => {
    save(
      KEYS.concerts,
      load<OshiConcert>(KEYS.concerts).map((c) => (c.id === id ? { ...c, ...data } : c))
    );
  },
};

// Applications
export const applicationStorage = {
  getAll: (): OshiApplication[] => load<OshiApplication>(KEYS.applications),
  getByAlias: (alias_id: string): OshiApplication[] =>
    load<OshiApplication>(KEYS.applications).filter((a) => a.alias_id === alias_id),
  getByConcert: (concert_id: string): OshiApplication[] =>
    load<OshiApplication>(KEYS.applications).filter((a) => a.concert_id === concert_id),
  add: (data: Omit<OshiApplication, "id">): OshiApplication => {
    const item: OshiApplication = { id: generateId(), ...data };
    const list = load<OshiApplication>(KEYS.applications);
    save(KEYS.applications, [...list, item]);
    return item;
  },
  remove: (id: string): void => {
    save(
      KEYS.applications,
      load<OshiApplication>(KEYS.applications).filter((a) => a.id !== id)
    );
  },
  update: (id: string, data: Partial<Omit<OshiApplication, "id">>): void => {
    save(
      KEYS.applications,
      load<OshiApplication>(KEYS.applications).map((a) =>
        a.id === id ? { ...a, ...data } : a
      )
    );
  },
};
