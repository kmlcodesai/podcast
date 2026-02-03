import axios from 'axios';
import {
  VideoMetrics,
  ChannelInfo,
  ChannelMetrics,
  YouTubeApiResponse,
  YouTubeVideoItem,
  YouTubeChannelItem,
  ChannelConfig
} from '../types/youtube';
import { YOUTUBE_API_BASE_URL } from '../config/channels';

export class YouTubeScraper {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('YouTube API key is required');
    }
    this.apiKey = apiKey;
  }

  async getChannelInfo(channelId: string): Promise<ChannelInfo> {
    const url = `${YOUTUBE_API_BASE_URL}/channels`;
    const response = await axios.get<{ items: YouTubeChannelItem[] }>(url, {
      params: {
        key: this.apiKey,
        id: channelId,
        part: 'snippet,statistics'
      }
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    const channel = response.data.items[0];
    return {
      channelId: channel.id,
      channelName: channel.snippet.title,
      handle: channel.snippet.customUrl || '',
      subscriberCount: parseInt(channel.statistics.subscriberCount, 10),
      videoCount: parseInt(channel.statistics.videoCount, 10),
      viewCount: parseInt(channel.statistics.viewCount, 10)
    };
  }

  async getChannelVideos(
    channelId: string,
    maxResults: number = 50
  ): Promise<VideoMetrics[]> {
    const videoIds = await this.fetchVideoIds(channelId, maxResults);
    if (videoIds.length === 0) {
      return [];
    }

    return this.fetchVideoDetails(videoIds);
  }

  private async fetchVideoIds(
    channelId: string,
    maxResults: number
  ): Promise<string[]> {
    const videoIds: string[] = [];
    let nextPageToken: string | undefined;

    while (videoIds.length < maxResults) {
      const url = `${YOUTUBE_API_BASE_URL}/search`;
      const response = await axios.get<YouTubeApiResponse>(url, {
        params: {
          key: this.apiKey,
          channelId: channelId,
          part: 'id',
          order: 'date',
          type: 'video',
          maxResults: Math.min(50, maxResults - videoIds.length),
          pageToken: nextPageToken
        }
      });

      for (const item of response.data.items) {
        const id = typeof item.id === 'string' ? item.id : item.id.videoId;
        if (id) {
          videoIds.push(id);
        }
      }

      nextPageToken = response.data.nextPageToken;
      if (!nextPageToken) {
        break;
      }
    }

    return videoIds;
  }

  private async fetchVideoDetails(videoIds: string[]): Promise<VideoMetrics[]> {
    const videos: VideoMetrics[] = [];
    const batchSize = 50;

    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);
      const url = `${YOUTUBE_API_BASE_URL}/videos`;
      const response = await axios.get<{ items: YouTubeVideoItem[] }>(url, {
        params: {
          key: this.apiKey,
          id: batch.join(','),
          part: 'snippet,statistics,contentDetails'
        }
      });

      for (const item of response.data.items) {
        videos.push({
          videoId: typeof item.id === 'string' ? item.id : item.id.videoId,
          title: item.snippet.title,
          publishedAt: item.snippet.publishedAt,
          viewCount: parseInt(item.statistics?.viewCount || '0', 10),
          likeCount: parseInt(item.statistics?.likeCount || '0', 10),
          commentCount: parseInt(item.statistics?.commentCount || '0', 10),
          duration: item.contentDetails?.duration || '',
          thumbnailUrl:
            item.snippet.thumbnails.high?.url ||
            item.snippet.thumbnails.medium?.url ||
            item.snippet.thumbnails.default.url
        });
      }
    }

    return videos;
  }

  async scrapeChannel(
    config: ChannelConfig,
    maxVideos: number = 50
  ): Promise<ChannelMetrics> {
    if (!config.channelId) {
      throw new Error(`Channel ID required for ${config.name}`);
    }

    console.log(`Scraping channel: ${config.name}...`);

    const channel = await this.getChannelInfo(config.channelId);
    const videos = await this.getChannelVideos(config.channelId, maxVideos);

    return {
      channel,
      videos,
      scrapedAt: new Date().toISOString()
    };
  }

  async scrapeMultipleChannels(
    configs: ChannelConfig[],
    maxVideosPerChannel: number = 50
  ): Promise<ChannelMetrics[]> {
    const results: ChannelMetrics[] = [];

    for (const config of configs) {
      try {
        const metrics = await this.scrapeChannel(config, maxVideosPerChannel);
        results.push(metrics);
      } catch (error) {
        console.error(`Error scraping ${config.name}:`, error);
      }
    }

    return results;
  }
}

export function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;

  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
