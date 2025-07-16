/**
 * Mock Twitter Data Generator
 * Generates realistic tweet data for testing without API calls
 */

import { TwitterAPIResponse } from '../types/twitter';
import { TwitterAPITweet, TwitterAPIUser } from '../types/twitter-api.types';

export class MockTwitterDataGenerator {
  private sampleHashtags = [
    'justdoit', 'nike', 'swoosh', 'motivation', 'fitness', 
    'running', 'sports', 'athlete', 'training', 'workout'
  ];

  private sampleMentions = [
    'nike', 'justdoit', 'nikewomen', 'nikerunning', 'niketraining',
    'swooshlife', 'nikesportswear', 'nikefootball', 'nikebasketball'
  ];

  private sampleUsers: TwitterAPIUser[] = [
    {
      id: '12345',
      username: 'fitness_influencer',
      name: 'Fitness Motivation',
      verified: true,
      public_metrics: { followers_count: 150000, following_count: 2000, tweet_count: 5000, listed_count: 500 },
      description: 'Fitness coach and motivation speaker 💪',
      location: 'Los Angeles, CA',
      profile_image_url: 'https://example.com/avatar1.jpg'
    },
    {
      id: '67890',
      username: 'running_athlete',
      name: 'Marathon Runner',
      verified: false,
      public_metrics: { followers_count: 25000, following_count: 1000, tweet_count: 3000, listed_count: 100 },
      description: 'Professional marathon runner 🏃‍♀️',
      location: 'New York, NY',
      profile_image_url: 'https://example.com/avatar2.jpg'
    },
    {
      id: '13579',
      username: 'sports_blogger',
      name: 'Sports News Today',
      verified: true,
      public_metrics: { followers_count: 500000, following_count: 5000, tweet_count: 15000, listed_count: 2000 },
      description: 'Breaking sports news and analysis 📺',
      location: 'Chicago, IL',
      profile_image_url: 'https://example.com/avatar3.jpg'
    },
    {
      id: '24680',
      username: 'nike_fan_2024',
      name: 'Nike Enthusiast',
      verified: false,
      public_metrics: { followers_count: 5000, following_count: 800, tweet_count: 1200, listed_count: 50 },
      description: 'Nike collector and sneaker enthusiast 👟',
      location: 'Portland, OR',
      profile_image_url: 'https://example.com/avatar4.jpg'
    }
  ];

  private motivationalPhrases = [
    'Just Do It! Nothing is impossible when you believe in yourself',
    'Push your limits and discover what you\'re truly capable of',
    'Every champion was once a beginner who refused to give up',
    'The only bad workout is the one that didn\'t happen',
    'Success isn\'t given, it\'s earned through hard work and dedication',
    'Your only limit is the one you set for yourself',
    'Champions train, losers complain. What are you doing today?',
    'The pain you feel today will be the strength you feel tomorrow',
    'Greatness isn\'t achieved overnight, it\'s built day by day',
    'Don\'t watch the clock; do what it does. Keep going!'
  ];

  /**
   * Generate mock Twitter API response
   */
  generateMockResponse(hashtag: string, count: number = 10): TwitterAPIResponse {
    const tweets: TwitterAPITweet[] = [];
    const users: TwitterAPIUser[] = [...this.sampleUsers];

    for (let i = 0; i < count; i++) {
      const user = this.getRandomUser();
      const tweet = this.generateMockTweet(hashtag, user, i);
      tweets.push(tweet);
    }

    return {
      data: tweets,
      includes: {
        users: users
      },
      meta: {
        result_count: count,
        newest_id: tweets[0]?.id || '1',
        oldest_id: tweets[tweets.length - 1]?.id || '1',
        next_token: count >= 10 ? 'mock_next_token_' + Date.now() : undefined
      }
    };
  }

  /**
   * Generate a single mock tweet
   */
  private generateMockTweet(hashtag: string, user: TwitterAPIUser, index: number): TwitterAPITweet {
    const tweetId = (1800000000000000000 + index).toString();
    const phrase = this.getRandomPhrase();
    const additionalHashtags = this.getRandomHashtags(2, hashtag);
    const mentions = this.getRandomMentions(1);
    
    const content = `${phrase} #${hashtag} ${additionalHashtags.map(h => `#${h}`).join(' ')} ${mentions.map(m => `@${m}`).join(' ')}`;

    // Generate realistic engagement metrics based on user's follower count
    const baseEngagement = Math.max(user.public_metrics?.followers_count || 1000, 1000) * 0.02; // 2% base engagement
    const variation = Math.random() * 0.5 + 0.75; // 75% - 125% variation
    const totalEngagement = Math.floor(baseEngagement * variation);

    const likes = Math.floor(totalEngagement * (0.6 + Math.random() * 0.2)); // 60-80% of engagement
    const retweets = Math.floor(totalEngagement * (0.15 + Math.random() * 0.1)); // 15-25% of engagement
    const replies = Math.floor(totalEngagement * (0.05 + Math.random() * 0.1)); // 5-15% of engagement
    const quotes = Math.floor(totalEngagement * (0.02 + Math.random() * 0.03)); // 2-5% of engagement

    // Generate realistic timestamps (last 24 hours)
    const now = new Date();
    const hoursAgo = Math.random() * 24;
    const createdAt = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000));

    return {
      id: tweetId,
      text: content,
      created_at: createdAt.toISOString(),
      author_id: user.id,
      public_metrics: {
        like_count: likes,
        retweet_count: retweets,
        reply_count: replies,
        quote_count: quotes,
        impression_count: Math.floor(totalEngagement * 10) // Impressions are usually 10x engagement
      },
      entities: {
        hashtags: [hashtag, ...additionalHashtags].map((tag, idx) => ({
          start: 10 + idx * 15,
          end: 10 + idx * 15 + tag.length + 1,
          tag: tag
        })),
        mentions: mentions.map((mention, idx) => ({
          start: 100 + idx * 20,
          end: 100 + idx * 20 + mention.length + 1,
          username: mention,
          id: (12345 + idx).toString()
        })),
        urls: Math.random() > 0.7 ? [{
          start: 200,
          end: 220,
          url: 'https://t.co/mocklink',
          expanded_url: 'https://nike.com/example-campaign',
          display_url: 'nike.com/example-campaign'
        }] : []
      },
      lang: 'en',
      possibly_sensitive: false,
      referenced_tweets: Math.random() > 0.8 ? [{
        type: Math.random() > 0.5 ? 'replied_to' : 'quoted',
        id: (1700000000000000000 + Math.floor(Math.random() * 1000)).toString()
      }] : undefined
    };
  }

  private getRandomUser(): TwitterAPIUser {
    return this.sampleUsers[Math.floor(Math.random() * this.sampleUsers.length)];
  }

  private getRandomPhrase(): string {
    return this.motivationalPhrases[Math.floor(Math.random() * this.motivationalPhrases.length)];
  }

  private getRandomHashtags(count: number, exclude?: string): string[] {
    const available = this.sampleHashtags.filter(tag => tag !== exclude);
    const selected: string[] = [];
    
    for (let i = 0; i < count && i < available.length; i++) {
      const randomTag = available[Math.floor(Math.random() * available.length)];
      if (!selected.includes(randomTag)) {
        selected.push(randomTag);
      }
    }
    
    return selected;
  }

  private getRandomMentions(count: number): string[] {
    const selected: string[] = [];
    
    for (let i = 0; i < count && i < this.sampleMentions.length; i++) {
      const randomMention = this.sampleMentions[Math.floor(Math.random() * this.sampleMentions.length)];
      if (!selected.includes(randomMention)) {
        selected.push(randomMention);
      }
    }
    
    return selected;
  }
}

export default MockTwitterDataGenerator;
