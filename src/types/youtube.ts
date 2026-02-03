export interface VideoMetrics {
  videoId: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  thumbnailUrl: string;
}

export interface ChannelInfo {
  channelId: string;
  channelName: string;
  handle: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

export interface ChannelMetrics {
  channel: ChannelInfo;
  videos: VideoMetrics[];
  scrapedAt: string;
}

export interface YouTubeApiResponse {
  items: YouTubeVideoItem[];
  nextPageToken?: string;
}

export interface YouTubeVideoItem {
  id: string | { videoId: string };
  snippet: {
    title: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  contentDetails?: {
    duration: string;
  };
}

export interface YouTubeChannelItem {
  id: string;
  snippet: {
    title: string;
    customUrl?: string;
  };
  statistics: {
    subscriberCount: string;
    videoCount: string;
    viewCount: string;
  };
}

export interface ChannelConfig {
  name: string;
  channelId?: string;
  handle?: string;
}
