export type OshiGroup = {
  id: string;
  name: string;
};

export type OshiAlias = {
  id: string;
  group_id: string;
  name: string;
  membership_expires_at: string; // ISO date string (YYYY-MM-DD)
  owner_name?: string;
  favorite_artist?: string;
};

export type OshiConcert = {
  id: string;
  group_id: string;
  name: string;
  date: string; // ISO date string (YYYY-MM-DD)
  venue: string;
  time?: string;        // HH:MM
  performance?: string; // 昼公演 | 夜公演
};

export type ApplicationStatus = "申込中" | "当落待ち" | "当選" | "落選";

export type OshiApplication = {
  id: string;
  alias_id: string;
  concert_id: string;
  status: ApplicationStatus;
};
