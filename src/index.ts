import * as dotenv from 'dotenv';
import {
  YouTubeScraper,
  formatDuration,
  formatNumber
} from './services/youtubeScraper';
import { YOUTUBE_CHANNELS } from './config/channels';
import { ChannelMetrics } from './types/youtube';

dotenv.config();

function printChannelMetrics(metrics: ChannelMetrics): void {
  const { channel, videos } = metrics;

  console.log('\n' + '='.repeat(80));
  console.log(`CHANNEL: ${channel.channelName}`);
  console.log('='.repeat(80));
  console.log(`Handle: ${channel.handle}`);
  console.log(`Subscribers: ${formatNumber(channel.subscriberCount)}`);
  console.log(`Total Videos: ${formatNumber(channel.videoCount)}`);
  console.log(`Total Views: ${formatNumber(channel.viewCount)}`);
  console.log(`Scraped At: ${metrics.scrapedAt}`);
  console.log('-'.repeat(80));

  console.log(`\nRecent Videos (${videos.length} found):\n`);

  const tableData = videos.map((video, index) => ({
    '#': index + 1,
    Title: video.title.slice(0, 50) + (video.title.length > 50 ? '...' : ''),
    Views: formatNumber(video.viewCount),
    Likes: formatNumber(video.likeCount),
    Comments: formatNumber(video.commentCount),
    Duration: formatDuration(video.duration),
    Published: video.publishedAt.split('T')[0]
  }));

  console.table(tableData);

  // Calculate engagement summary
  const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);
  const totalLikes = videos.reduce((sum, v) => sum + v.likeCount, 0);
  const totalComments = videos.reduce((sum, v) => sum + v.commentCount, 0);
  const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;
  const avgLikes = videos.length > 0 ? Math.round(totalLikes / videos.length) : 0;
  const engagementRate =
    totalViews > 0 ? (((totalLikes + totalComments) / totalViews) * 100).toFixed(2) : '0';

  console.log('\nEngagement Summary:');
  console.log(`  Total Views: ${formatNumber(totalViews)}`);
  console.log(`  Total Likes: ${formatNumber(totalLikes)}`);
  console.log(`  Total Comments: ${formatNumber(totalComments)}`);
  console.log(`  Average Views per Video: ${formatNumber(avgViews)}`);
  console.log(`  Average Likes per Video: ${formatNumber(avgLikes)}`);
  console.log(`  Engagement Rate: ${engagementRate}%`);
}

function exportToJson(results: ChannelMetrics[]): string {
  return JSON.stringify(results, null, 2);
}

async function main(): Promise<void> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.error('Error: YOUTUBE_API_KEY environment variable is not set.');
    console.error('Please set your YouTube Data API key in .env file.');
    console.error('Get an API key from: https://console.cloud.google.com/apis/credentials');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const maxVideos = parseInt(args.find((a) => a.startsWith('--max='))?.split('=')[1] || '20', 10);
  const outputJson = args.includes('--json');

  console.log('YouTube Channel Metrics Scraper');
  console.log('================================');
  console.log(`Channels to scrape: ${YOUTUBE_CHANNELS.map((c) => c.name).join(', ')}`);
  console.log(`Max videos per channel: ${maxVideos}`);
  console.log('');

  try {
    const scraper = new YouTubeScraper(apiKey);
    const results = await scraper.scrapeMultipleChannels(YOUTUBE_CHANNELS, maxVideos);

    if (outputJson) {
      console.log(exportToJson(results));
    } else {
      for (const metrics of results) {
        printChannelMetrics(metrics);
      }
    }
  } catch (error) {
    console.error('Error during scraping:', error);
    process.exit(1);
  }
}

main();
