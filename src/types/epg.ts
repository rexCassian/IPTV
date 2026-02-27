export interface Program {
    id: number;
    channelId: string;
    title: string;
    description: string;
    startTime: number; // Unix timestamp (seconds)
    endTime: number;
    category: string;
}

export interface EpgChannel {
    id: string;
    displayName: string;
    iconUrl: string;
}

export interface ChannelMatch {
    channelId: string;
    epgChannelId: string;
    score: number;
    auto: boolean;
}

export interface CurrentProgramInfo {
    program: Program;
    progress: number; // 0-1
    nextProgram: Program | null;
}
