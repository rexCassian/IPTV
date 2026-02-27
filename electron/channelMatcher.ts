import Fuse from 'fuse.js';

interface Channel {
    id: string;
    name: string;
    url: string;
    logo: string;
    group: string;
    country: string;
    language: string;
    streamType: string;
}

interface EpgChannel {
    id: string;
    displayName: string;
    iconUrl: string;
}

interface ChannelMatch {
    channelId: string;
    epgChannelId: string;
    score: number;
    auto: boolean;
}

export class ChannelMatcher {
    private matchCache = new Map<string, string>();

    match(channels: Channel[], epgChannels: EpgChannel[]): ChannelMatch[] {
        if (epgChannels.length === 0) return [];

        const matches: ChannelMatch[] = [];

        // Build fuse index over EPG channels
        const fuse = new Fuse(epgChannels, {
            keys: ['displayName', 'id'],
            threshold: 0.3,
            includeScore: true,
        });

        for (const channel of channels) {
            // Check cache first
            const cached = this.matchCache.get(channel.id);
            if (cached) {
                matches.push({
                    channelId: channel.id,
                    epgChannelId: cached,
                    score: 1,
                    auto: true,
                });
                continue;
            }

            // Try exact match on id first
            const exactMatch = epgChannels.find(
                (epg) => epg.id.toLowerCase() === channel.name.toLowerCase() ||
                    epg.displayName.toLowerCase() === channel.name.toLowerCase(),
            );

            if (exactMatch) {
                matches.push({
                    channelId: channel.id,
                    epgChannelId: exactMatch.id,
                    score: 1,
                    auto: true,
                });
                this.matchCache.set(channel.id, exactMatch.id);
                continue;
            }

            // Fuzzy match
            const results = fuse.search(channel.name);
            if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.3) {
                matches.push({
                    channelId: channel.id,
                    epgChannelId: results[0].item.id,
                    score: 1 - results[0].score,
                    auto: true,
                });
                this.matchCache.set(channel.id, results[0].item.id);
            }
        }

        return matches;
    }

    setManualMatch(channelId: string, epgChannelId: string): void {
        this.matchCache.set(channelId, epgChannelId);
    }

    removeMatch(channelId: string): void {
        this.matchCache.delete(channelId);
    }

    clearCache(): void {
        this.matchCache.clear();
    }
}
