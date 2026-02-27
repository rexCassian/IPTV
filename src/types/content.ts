export type ContentType = 'live' | 'movie' | 'series';
export type MainTab = 'live' | 'movie' | 'series';

export interface SeriesInfo {
    showName: string;
    season: number;
    episode: number;
    episodeTitle?: string;
}

export interface SeriesGroup {
    showName: string;
    poster: string;
    seasons: Record<number, import('./channel').Channel[]>;
    totalEpisodes: number;
}
