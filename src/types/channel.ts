export interface Channel {
    id: string;
    name: string;
    url: string;
    logo: string;
    group: string;
    country: string;
    language: string;
    streamType: StreamType;
    contentType: 'live' | 'movie' | 'series';
}

export type StreamType = 'hls' | 'mpegts' | 'mp4' | 'unknown';

export interface ChannelGroup {
    name: string;
    channels: Channel[];
    count: number;
}

export interface ChannelCategory {
    name: string;
    groups: ChannelGroup[];
    count: number;
}

export interface ChannelFilter {
    search: string;
    group: string | null;
    country: string | null;
    favorites: boolean;
}

export interface ChannelsLoadedPayload {
    channels: Channel[];
    offset: number;
    total: number;
    done: boolean;
}
