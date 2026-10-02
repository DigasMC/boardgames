import type { BggGameFile } from "@/types/database";

export const BGG_ENGLISH_LANGUAGE_ID = "2184";
export const RULE_FILES_UI_LIMIT = 8;

const RULE_BOOST =
  /\b(rule|rules|rulebook|ruleset|manual|almanac|règle|règles|reglas|regel|regolamento)\b/i;
const RULE_SUMMARY =
  /\b(summary|player\s*aid|quick\s*ref|reference|cheat\s*sheet|aide\s*de\s*jeu)\b/i;
const VARIANT_PENALTY =
  /\b(variant|house\s*rule|solo|fan[\s-]?made|mod|retheme|printable|box|insert|divider|organizer)\b/i;

function ruleScore(file: BggGameFile): number {
  const text = `${file.title} ${file.filename}`;
  let score = file.numpositive;

  if (RULE_BOOST.test(text)) score += 100;
  if (RULE_SUMMARY.test(text) && RULE_BOOST.test(text)) score += 20;

  if (VARIANT_PENALTY.test(text) && !RULE_BOOST.test(text)) {
    score -= 40;
  } else if (VARIANT_PENALTY.test(text)) {
    score -= 15;
  }

  if (file.languageid === BGG_ENGLISH_LANGUAGE_ID) {
    score += 25;
  } else if (file.language && /english/i.test(file.language)) {
    score += 25;
  }

  return score;
}

/** Rank files that look like rulebooks / rules summaries for UI display. */
export function rankRuleFiles(
  files: BggGameFile[],
  limit = RULE_FILES_UI_LIMIT
): BggGameFile[] {
  const ruleLike = files.filter((f) => {
    const text = `${f.title} ${f.filename}`;
    return RULE_BOOST.test(text) || RULE_SUMMARY.test(text);
  });

  const pool = ruleLike.length > 0 ? ruleLike : files;

  return [...pool]
    .sort((a, b) => {
      const scoreDiff = ruleScore(b) - ruleScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      const dateA = a.postdate ? Date.parse(a.postdate) : 0;
      const dateB = b.postdate ? Date.parse(b.postdate) : 0;
      return dateB - dateA;
    })
    .slice(0, limit);
}

export function bggFilesBrowseUrl(bggId: number): string {
  return `https://boardgamegeek.com/boardgame/${bggId}/files`;
}

export function bggFilePageUrl(file: Pick<BggGameFile, "href">): string {
  if (file.href.startsWith("http")) return file.href;
  return `https://boardgamegeek.com${file.href}`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
