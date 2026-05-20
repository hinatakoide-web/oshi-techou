import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export const runtime = "nodejs";

export type ScrapedConcert = {
  date: string;
  venue: string;
  time?: string;
  performance?: string;
};

export type ScrapeResult = {
  liveName: string;
  concerts: ScrapedConcert[];
  error?: string;
};

// ── ユーティリティ ───────────────────────────────

function toIsoDate(y: string, m: string, d: string): string {
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function classifyPerf(time?: string): string | undefined {
  if (!time) return undefined;
  const h = parseInt(time.split(":")[0]);
  if (isNaN(h)) return undefined;
  if (h >= 11 && h < 16) return "昼公演";
  if (h >= 16) return "夜公演";
  return undefined;
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[|｜]\s*.+$/, "")   // 「タイトル | サイト名」を除去
    .replace(/\s*[–—―]\s*.+$/, "")   // 「タイトル — サイト名」を除去
    .replace(/STARTO ENTERTAINMENT/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── 正規表現 ─────────────────────────────────────

// 日付: 2025/06/14, 2025-06-14, 2025.06.14, 2025年6月14日, 2025年6月14日(金) etc.
// 曜日カッコ [（(]曜日[）)] は日付の一部ではないため後置で無視する
const FULL_DATE_RE =
  /(\d{4})[\/\-\.年](\d{1,2})[\/\-\.月](\d{1,2})(?:日)?(?:[（(][月火水木金土日・祝][）)])?/;

// 開演時間: START / 開演 (OPEN/開場 より優先)
const START_TIME_RE = /(?:START|開演)\s*[：:\s]?\s*(\d{1,2})[：:](\d{2})/i;
// 開場時間: OPEN / 開場 (START がない場合のフォールバック)
const OPEN_TIME_RE = /(?:OPEN|開場|SHOW)\s*[：:\s]?\s*(\d{1,2})[：:](\d{2})/i;
// サフィックス形式: 19:00 START, 19:00開演
const START_SUFFIX_RE = /(\d{1,2})[：:](\d{2})\s*(?:START|開演)/i;
const OPEN_SUFFIX_RE = /(\d{1,2})[：:](\d{2})\s*(?:OPEN|開場)/i;
// 単独の時刻: 行全体が HH:MM
const TIME_ONLY_RE = /^(\d{1,2})[：:](\d{2})$/;

// 会場明示マーカー: 会場：〇〇, VENUE: 〇〇
const VENUE_MARKER_RE = /(?:会場|開催地|VENUE|場所)\s*[：:＝=]\s*(.+)/i;

// 会場名に含まれがちなキーワード
const VENUE_KEYWORD_RE =
  /ホール|ドーム|アリーナ|スタジアム|センター|劇場|ガーデン|コロシアム|テアトル|フォーラム|シアター|パレス|武道館|HALL|DOME|ARENA|STADIUM|GARDEN|PALACE|FORUM|THEATER|THEATRE|BUDOKAN/i;

// starto.jp 形式の [都道府県] ヘッダー
const BRACKET_PREFIX_RE = /^\[.+?\]\s*/;

// ── 時間抽出ヘルパー ──────────────────────────────

// START/開演 を OPEN/開場 より優先して抽出する
function extractTime(line: string): string | undefined {
  // 1. START/開演 プレフィックス
  let m = START_TIME_RE.exec(line);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  // 2. START/開演 サフィックス (19:00 START)
  m = START_SUFFIX_RE.exec(line);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  // 3. OPEN/開場 プレフィックス (フォールバック)
  m = OPEN_TIME_RE.exec(line);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  // 4. OPEN/開場 サフィックス
  m = OPEN_SUFFIX_RE.exec(line);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return undefined;
}

function extractTabTime(s: string): string | undefined {
  const t = s.trim();
  // 単独 HH:MM
  let m = TIME_ONLY_RE.exec(t);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  // START/開演 優先
  return extractTime(t);
}

// ── メインパーサー ────────────────────────────────

function parseContent(text: string): ScrapedConcert[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.length < 150);

  const results: ScrapedConcert[] = [];
  let currentVenue = "";
  let lastDate: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // URL行はスキップ
    if (/^https?:\/\//.test(line)) continue;

    // 1) 会場明示マーカー: 「会場：〇〇」
    const venueMarkerMatch = VENUE_MARKER_RE.exec(line);
    if (venueMarkerMatch) {
      currentVenue = venueMarkerMatch[1].trim();
      continue;
    }

    // 2) タブ区切り行: 日付\t時刻 (starto.jp 形式)
    if (line.includes("\t")) {
      const parts = line.split("\t").map((p) => p.trim());
      const dateMatch = FULL_DATE_RE.exec(parts[0]);
      if (dateMatch) {
        const date = toIsoDate(dateMatch[1], dateMatch[2], dateMatch[3]);
        lastDate = date;
        let time: string | undefined;
        for (let k = 1; k < parts.length; k++) {
          time = extractTabTime(parts[k]);
          if (time) break;
        }
        results.push({ date, venue: currentVenue, time, performance: classifyPerf(time) });
        continue;
      }

      // タブで区切られているが先頭が日付でない → 時刻のみ行の可能性
      const tabTime = extractTabTime(parts[0]) ?? extractTabTime(parts[1] ?? "");
      if (tabTime && lastDate) {
        results.push({ date: lastDate, venue: currentVenue, time: tabTime, performance: classifyPerf(tabTime) });
        continue;
      }
    }

    // 3) 時刻のみ行: 同日2公演目 (starto.jp の "HH:MM" のみ行)
    const timeOnlyMatch = TIME_ONLY_RE.exec(line);
    if (timeOnlyMatch && lastDate) {
      const time = `${timeOnlyMatch[1].padStart(2, "0")}:${timeOnlyMatch[2]}`;
      results.push({ date: lastDate, venue: currentVenue, time, performance: classifyPerf(time) });
      continue;
    }

    // 4) 日付を含む行
    const dateMatch = FULL_DATE_RE.exec(line);
    if (dateMatch) {
      const date = toIsoDate(dateMatch[1], dateMatch[2], dateMatch[3]);
      lastDate = date;
      let time = extractTime(line);
      let venue = currentVenue;

      // 後続行から時刻・会場を探す
      for (let j = i + 1; j < Math.min(i + 7, lines.length); j++) {
        const next = lines[j];
        if (FULL_DATE_RE.test(next) || next.includes("\t")) break;
        if (/^https?:\/\//.test(next)) continue;

        if (!time) {
          // START/開演 優先で時刻を取得、なければ単独 HH:MM も試みる
          const tm = extractTime(next) ?? (() => {
            const mo = TIME_ONLY_RE.exec(next);
            return mo ? `${mo[1].padStart(2, "0")}:${mo[2]}` : undefined;
          })();
          if (tm) { time = tm; continue; }
        }

        const vm = VENUE_MARKER_RE.exec(next);
        if (vm) { venue = vm[1].trim(); currentVenue = venue; break; }

        if (next.length >= 2 && next.length <= 80 && VENUE_KEYWORD_RE.test(next)) {
          venue = next;
          currentVenue = next; // 後続の日付にも引き継ぐ
        }
      }

      results.push({ date, venue, time, performance: classifyPerf(time) });
      continue;
    }

    // 5) 会場ヘッダー候補: [都道府県] 会場名 や 会場キーワード含む短い行
    const hasBracket = BRACKET_PREFIX_RE.test(line);
    const withoutBracket = line.replace(BRACKET_PREFIX_RE, "").trim();

    if (
      withoutBracket.length >= 2 &&
      withoutBracket.length <= 80 &&
      !/^https?:\/\//.test(withoutBracket) &&
      (VENUE_KEYWORD_RE.test(withoutBracket) || hasBracket)
    ) {
      currentVenue = withoutBracket;
    }
  }

  // 重複除去
  const seen = new Set<string>();
  return results.filter((c) => {
    const key = `${c.date}|${c.venue}|${c.time ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── POST ハンドラー ───────────────────────────────

export async function POST(req: NextRequest) {
  let url: string;
  try {
    ({ url } = await req.json());
  } catch {
    return NextResponse.json({ error: "リクエストが不正です", liveName: "", concerts: [] }, { status: 400 });
  }

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { error: "URLの形式が正しくありません", liveName: "", concerts: [] },
      { status: 400 }
    );
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    const pageTitle = await page.title();
    const bodyText: string = await page.evaluate(
      () => (document.body as HTMLElement).innerText
    );

    const liveName = cleanTitle(pageTitle);
    const concerts = parseContent(bodyText);

    return NextResponse.json({ liveName, concerts } satisfies ScrapeResult);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    return NextResponse.json(
      { error: `取得エラー: ${msg}`, liveName: "", concerts: [] } satisfies ScrapeResult,
      { status: 502 }
    );
  } finally {
    await browser?.close();
  }
}
