/**
 * Decode HTML character entities commonly found in BoardGameGeek text.
 * Covers numeric refs plus HTML4 Latin-1 and common typography names.
 */

const NAMED_ENTITIES: Record<string, string> = {
  // XML / HTML essentials
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",

  // Typography
  ndash: "\u2013",
  mdash: "\u2014",
  lsquo: "\u2018",
  rsquo: "\u2019",
  sbquo: "\u201A",
  ldquo: "\u201C",
  rdquo: "\u201D",
  bdquo: "\u201E",
  hellip: "\u2026",
  bull: "\u2022",
  trade: "\u2122",
  copy: "\u00A9",
  reg: "\u00AE",
  deg: "\u00B0",
  plusmn: "\u00B1",
  times: "\u00D7",
  divide: "\u00F7",
  frac12: "\u00BD",
  frac14: "\u00BC",
  frac34: "\u00BE",
  laquo: "\u00AB",
  raquo: "\u00BB",
  iexcl: "\u00A1",
  iquest: "\u00BF",
  cent: "\u00A2",
  pound: "\u00A3",
  euro: "\u20AC",
  yen: "\u00A5",
  sect: "\u00A7",
  para: "\u00B6",
  middot: "\u00B7",
  cedil: "\u00B8",

  // Latin-1 Supplement (accented letters BGG often uses)
  Agrave: "\u00C0",
  Aacute: "\u00C1",
  Acirc: "\u00C2",
  Atilde: "\u00C3",
  Auml: "\u00C4",
  Aring: "\u00C5",
  AElig: "\u00C6",
  Ccedil: "\u00C7",
  Egrave: "\u00C8",
  Eacute: "\u00C9",
  Ecirc: "\u00CA",
  Euml: "\u00CB",
  Igrave: "\u00CC",
  Iacute: "\u00CD",
  Icirc: "\u00CE",
  Iuml: "\u00CF",
  ETH: "\u00D0",
  Ntilde: "\u00D1",
  Ograve: "\u00D2",
  Oacute: "\u00D3",
  Ocirc: "\u00D4",
  Otilde: "\u00D5",
  Ouml: "\u00D6",
  Oslash: "\u00D8",
  Ugrave: "\u00D9",
  Uacute: "\u00DA",
  Ucirc: "\u00DB",
  Uuml: "\u00DC",
  Yacute: "\u00DD",
  THORN: "\u00DE",
  szlig: "\u00DF",
  agrave: "\u00E0",
  aacute: "\u00E1",
  acirc: "\u00E2",
  atilde: "\u00E3",
  auml: "\u00E4",
  aring: "\u00E5",
  aelig: "\u00E6",
  ccedil: "\u00E7",
  egrave: "\u00E8",
  eacute: "\u00E9",
  ecirc: "\u00EA",
  euml: "\u00EB",
  igrave: "\u00EC",
  iacute: "\u00ED",
  icirc: "\u00EE",
  iuml: "\u00EF",
  eth: "\u00F0",
  ntilde: "\u00F1",
  ograve: "\u00F2",
  oacute: "\u00F3",
  ocirc: "\u00F4",
  otilde: "\u00F5",
  ouml: "\u00F6",
  oslash: "\u00F8",
  ugrave: "\u00F9",
  uacute: "\u00FA",
  ucirc: "\u00FB",
  uuml: "\u00FC",
  yacute: "\u00FD",
  thorn: "\u00FE",
  yuml: "\u00FF",
  OElig: "\u0152",
  oelig: "\u0153",
  Scaron: "\u0160",
  scaron: "\u0161",
  Yuml: "\u0178",
};

function decodeEntity(entity: string, named: string | undefined, decimal: string | undefined, hex: string | undefined): string {
  if (named) {
    return NAMED_ENTITIES[named] ?? entity;
  }
  if (decimal) {
    const code = Number(decimal);
    if (Number.isFinite(code) && code >= 0 && code <= 0x10ffff) {
      try {
        return String.fromCodePoint(code);
      } catch {
        return entity;
      }
    }
    return entity;
  }
  if (hex) {
    const code = parseInt(hex, 16);
    if (Number.isFinite(code) && code >= 0 && code <= 0x10ffff) {
      try {
        return String.fromCodePoint(code);
      } catch {
        return entity;
      }
    }
    return entity;
  }
  return entity;
}

export function decodeHtmlEntities(text: string): string {
  if (!text.includes("&")) return text;
  return text.replace(
    /&(?:([a-zA-Z][a-zA-Z0-9]+)|#(\d+)|#x([0-9a-fA-F]+));/g,
    (entity, named: string | undefined, decimal: string | undefined, hex: string | undefined) =>
      decodeEntity(entity, named, decimal, hex)
  );
}

export function normalizeGameText<T extends { name: string; description?: string | null }>(
  game: T
): T {
  return {
    ...game,
    name: decodeHtmlEntities(game.name),
    description:
      game.description != null ? decodeHtmlEntities(game.description) : game.description,
  };
}
