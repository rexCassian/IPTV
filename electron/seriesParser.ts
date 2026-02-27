export interface SeriesInfo {
    showName: string;
    season: number;
    episode: number;
    episodeTitle?: string;
}

/**
 * Try to parse a series episode name into structured info.
 * Returns null if the name doesn't look like a series episode.
 */
export function parseSeriesName(name: string): SeriesInfo | null {
    const n = name.trim();

    // Pattern 1: "ShowName S01E01" or "ShowName S01E01 - Title"
    const p1 = n.match(/^(.+?)\s+[Ss](\d{1,2})\s*[Ee](\d{1,2})(?:\s*[-–]\s*(.+))?$/);
    if (p1) return {
        showName: p1[1].trim(),
        season: parseInt(p1[2], 10),
        episode: parseInt(p1[3], 10),
        episodeTitle: p1[4]?.trim(),
    };

    // Pattern 2: "ShowName 1.Sezon 1.Bölüm"
    const p2 = n.match(/^(.+?)\s+(\d+)\.?\s*[Ss]ezon?\s+(\d+)\.?\s*[Bb][öo]l[üu]m?/i);
    if (p2) return {
        showName: p2[1].trim(),
        season: parseInt(p2[2], 10),
        episode: parseInt(p2[3], 10),
    };

    // Pattern 3: "ShowName Season 1 Episode 1"
    const p3 = n.match(/^(.+?)\s+[Ss]eason\s+(\d+)\s+[Ee]pisode\s+(\d+)/i);
    if (p3) return {
        showName: p3[1].trim(),
        season: parseInt(p3[2], 10),
        episode: parseInt(p3[3], 10),
    };

    return null;
}

export interface EpisodeChannel {
    id: string;
    name: string;
    url: string;
    logo: string;
    group: string;
    country: string;
    language: string;
    streamType: string;
    contentType: string;
    seriesInfo?: SeriesInfo;
}

export interface SeriesGroup {
    showName: string;
    poster: string;
    seasons: Record<number, EpisodeChannel[]>;
    totalEpisodes: number;
}

export function groupSeriesByShow(seriesChannels: EpisodeChannel[]): SeriesGroup[] {
    const showMap = new Map<string, SeriesGroup>();

    for (const ch of seriesChannels) {
        const info = parseSeriesName(ch.name);
        const key = info ? info.showName : ch.name;

        if (!showMap.has(key)) {
            showMap.set(key, {
                showName: key,
                poster: ch.logo || '',
                seasons: {},
                totalEpisodes: 0,
            });
        }

        const show = showMap.get(key)!;
        const season = info?.season ?? 1;

        if (!show.seasons[season]) show.seasons[season] = [];
        show.seasons[season].push({ ...ch, seriesInfo: info ?? undefined });
        show.totalEpisodes++;

        // Use first found logo as poster
        if (!show.poster && ch.logo) show.poster = ch.logo;
    }

    // Sort episodes within each season
    for (const show of showMap.values()) {
        for (const eps of Object.values(show.seasons)) {
            eps.sort((a, b) => {
                const ea = a.seriesInfo?.episode ?? 0;
                const eb = b.seriesInfo?.episode ?? 0;
                return ea - eb;
            });
        }
    }

    return Array.from(showMap.values()).sort((a, b) =>
        a.showName.localeCompare(b.showName, 'tr'),
    );
}
