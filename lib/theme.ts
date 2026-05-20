export type ThemeId =
  | "default"
  | "red"
  | "blue"
  | "yellow"
  | "green"
  | "gray"
  | "white"
  | "black"
  | "purple"
  | "pink"
  | "orange";

export type Theme = {
  id: ThemeId;
  label: string;
  primary: string;
};

export const THEMES: Theme[] = [
  { id: "default", label: "ローズ",   primary: "#E8837A" },
  { id: "red",     label: "レッド",   primary: "#E03030" },
  { id: "blue",    label: "ブルー",   primary: "#3070D0" },
  { id: "yellow",  label: "イエロー", primary: "#D0A800" },
  { id: "green",   label: "グリーン", primary: "#30A050" },
  { id: "gray",    label: "グレー",   primary: "#707070" },
  { id: "white",   label: "ホワイト", primary: "#909090" },
  { id: "black",   label: "ブラック", primary: "#202020" },
  { id: "purple",  label: "パープル", primary: "#8030C0" },
  { id: "pink",    label: "ピンク",   primary: "#E040A0" },
  { id: "orange",  label: "オレンジ", primary: "#E07020" },
];

export const DEFAULT_THEME_ID: ThemeId = "default";
export const THEME_STORAGE_KEY = "oshi-theme";
export const VALID_THEME_IDS: ThemeId[] = THEMES.map((t) => t.id);
