export type ContentType = 'live' | 'movie' | 'series';

// ─── LIVE groups ────────────────────────────────────────────────
const LIVE_GROUPS = new Set([
    'TR BEIN SPORTS', 'TR BEIN SPORTS VIP', 'TR SPOR',
    'TR EXXEN SPORTS', 'TR SARAN SPORTS', 'TR TRT TABII SPORTS',
    'TR ULUSAL', 'TR ULUSAL UHD', 'TR HABER', 'TR BELGESEL',
    'TR MUZIK', 'TR COCUK', 'TR NEXTBOX MOVIE',
    'TR 7/24 SINEMA', 'TR 7/24 SINEMA (YERLI)', 'TR SiNEMA',
    'DE DAZN SPORT', 'DE SKY BUNDESLIGA', 'DE SKY SPORT',
    'DE SPORT', 'DE NATIONAL', 'DE MAGENTA', 'DE RTL+',
    'DE DOKUMENTAR', 'DE MUSIK', 'DE KINDER',
    'FR SPORT', 'FR DAZN', 'FR CINEMA', 'FR DIVERTISSEMENT',
    'FR DOCUMENTAIRE', 'FR MUSIQUE', 'FR NEWS', 'FR ENFANTS',
    'USA', 'USA | Sports', 'USA | Entertainment', 'USA | Movies',
    'USA | Documentary', 'USA | Kids', 'USA | Regionals',
    'WORLD SPORT', 'GOLF', 'U.K.', 'NETHERLANDS',
    'NETHERLANDS SPORT', 'NETHERLANDS MOVIES',
    'INDIA', 'PAKISTAN', 'SPAIN', 'SWEDEN', 'NORWAY',
    'FINLAND', 'DENMARK', 'CZECH', 'HUNGARY', 'ROMANIA',
    'POLAND', 'PORTUGAL', 'BULGARIA', 'GREECE', 'ITALY',
    'AUSTRIA', 'BELGIUM', 'SWITZERLAND', 'CANADA', 'MEXICO',
    'AUSTRALIA', 'UKRAINE', 'UZBEKISTAN', 'MACEDONIA',
    'MONTENEGRO', 'BOSNA HERSEK', 'ALBANIA', 'EX-YU', 'KIBRIS',
    'KURDISH', 'AZERBAIJAN', 'ARMENIA', 'AFGHANISTAN', 'AFRICA',
    'ISRAEL', 'KIDS VIP', 'FRENCH', 'ROMANIAN', 'RUSSIAN',
    'GERMAN', 'ITALIAN', 'BULGARIAN', 'MACEDONIAN',
    "Christian \u2717 \u0627\u0644\u0645\u0633\u064a\u062d\u064a\u0629",
    'INDIA', 'RUSSIA',
]);

// ─── SERIES groups ──────────────────────────────────────────────
const SERIES_GROUPS = new Set([
    '|TR| YERLi DiZiLER', '|TR| YABANCI DiZiLER',
    '|TR| NETFLIX', '|TR| DISNEY+', '|TR| APPLE TV',
    '|TR| EXXEN', '|TR| GAIN', '|TR| TOD',
    '|TR| MAX TV - HBO', '|TR| CBS - AMAZON',
    '|TR| TRT TABII', '|TR| SHOWTIME',
    '|TR| DINI DIZILER', '|TR| KOMEDI & TV SHOW',
    '|TR| BELGESEL DİZiLER', '|TR| ÇOCUK DİZİLERİ',
    '|EN| MULTI-LANG NETFLIX', '|EN| MULTI-LANG DISNEY+',
    '|EN| MULTI-LANG AMAZON PRIME', '|EN| MULTI-LANG APPLE TV',
    '|EN| MULTI-LANG ANIME', '|EN| HBO', '|EN| NEW RELEASE 2025',
    '|KR| MULTI-LANG KOREAN',
    '|DE| GERMAN SERIES', '|FR| FRENCH SERIES',
    '|US| ABC', '|US| AMC+', '|US| AMAZON', '|US| APPLE',
    '|US| GAIA', '|US| HALLMARK', '|US| MGM', '|US| NETFLIX',
    '|US| PARAMOUNT', '|US| SKY', '|US| TNT', '|US| VH1',
    '|US| SHOWTIME', '|US| NETWORK 10', '|US| NINE NETWORK',
]);

// ─── MOVIE groups ───────────────────────────────────────────────
const MOVIE_GROUPS = new Set([
    '|TR| YERLi FiLM', '|TR| DUBLAJ', '|TR| DiNi FiLM',
    '|TR| AKSIYON', '|TR| KOMEDI', '|TR| GERiLiM - KORKU',
    '|TR| ANiMASYON', '|TR| WESTERN', '|TR| EN iYiLER',
    '|TR| YESiLCAM', '|TR| MULTI SUBTITLES',
    '|TR| VOD - 2020', '|TR| VOD - 2021', '|TR| VOD - 2022',
    '|TR| VOD - 2023', '|TR| VOD - 2024',
    '|TR| YENi FiLMLER (2025-2026)', '|TR| KLIP-KONSER',
    '|EN| (VOD)', '|EN| MULTI-SUB MOVIES', '|EN| MULTII-AUDIO',
    '|EN| TOP 500 IMDB (VOD)', '|EN| NEW RELEASES 2025 (VOD)',
    '|EN| NETFLIX ASIA - MULTISUB', '|EN| APPLE+ MULTISUB',
    '|EN| MUBI & HULU TV',
    '|DE| (VOD)', '|DE| 2023 (VOD)', '|DE| 2024 (VOD)',
    '|DE| IMDB Top 50 (VOD)', '|DE| NEW RELEASES (VOD)',
    '|DE| ANIMATION (VOD)', '|DE| NETFLIX (VOD)',
    '|FR| (VOD)', '|FR| 2024 (VOD)', '|FR| 2025 (VOD)',
    '|FR| TELEFILM', '|FR| HISTOIRE - DOCUMENTAIRES (VOD)',
    '|FR| NEW RELEASE 2025', '|FR| AMAZON PRIME', '|FR| NETFLIX',
    '|GR| (VOD)', '|GR| 2024 (VOD)', '|IT| (VOD)',
    '|NL| (VOD)', '|NL| 2024 (VOD)', '|PL| (VOD)',
    '|PL| 2024 (VOD)', '|PT| (VOD)', '|ES| (VOD)',
    '|AR| (VOD)', '|BG| (VOD)', '|CN| (VOD)',
    '|IR| (VOD)', '|IR| DUBBED', '|TH| (VOD)', '|EX-YU| (VOD)',
    '|US| ACTION (VOD)', '|US| ADVENTURE (VOD)',
    '|US| COMEDY (VOD)', '|US| FANTASY (VOD)',
    '|US| IN CINEMA (VOD)', '|US| NEW RELEASES (VOD)',
    'DE FILME', 'DE NEXTBOX MOVIE',
]);

export function classifyGroup(group: string): ContentType {
    const g = group.trim();

    // 1. Exact set match — O(1)
    if (SERIES_GROUPS.has(g)) return 'series';
    if (MOVIE_GROUPS.has(g)) return 'movie';
    if (LIVE_GROUPS.has(g)) return 'live';

    // 2. [AR] prefix → live (all Arab live channels)
    if (g.startsWith('[AR]')) return 'live';

    // 3. Regex fallback
    const upper = g.toUpperCase();
    if (upper.includes('(VOD)')) return 'movie';
    if (upper.includes('SERIES') || upper.includes('DİZİ') ||
        upper.includes('DIZI')) return 'series';
    if (upper.includes('FILM') || upper.includes('FİLM') ||
        upper.includes('MOVIE') || upper.includes('SINEMA') ||
        upper.includes('SiNEMA')) return 'movie';

    // 4. Unknown → live (safest default for unrecognized groups)
    return 'live';
}

/** Batch-classify an array of channels (called from worker thread) */
export function classifyAllChannels<T extends { group: string }>(
    channels: T[],
): (T & { contentType: ContentType })[] {
    return channels.map((ch) => ({ ...ch, contentType: classifyGroup(ch.group) }));
}
