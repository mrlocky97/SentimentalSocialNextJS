/**
 * Twitter API Response Types
 * Additional type definitions for Twitter API v2 responses
 */

// Twitter API v2 User object
export interface TwitterAPIUser {
  id: string;
  username: string;
  name: string;
  verified?: boolean;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  description?: string;
  location?: string;
  url?: string;
  created_at?: string;
  profile_image_url?: string;
}

// Twitter API v2 Tweet object
export interface TwitterAPITweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
    impression_count?: number;
  };
  context_annotations?: Array<{
    domain: { id: string; name: string; description?: string };
    entity: { id: string; name: string; description?: string };
  }>;
  entities?: {
    hashtags?: Array<{ start: number; end: number; tag: string }>;
    mentions?: Array<{ start: number; end: number; username: string; id: string }>;
    urls?: Array<{ start: number; end: number; url: string; expanded_url?: string; display_url?: string }>;
    annotations?: Array<{ start: number; end: number; probability: number; type: string; normalized_text?: string }>;
  };
  geo?: {
    coordinates?: { type: string; coordinates: [number, number] };
    place_id?: string;
  };
  lang?: string;
  possibly_sensitive?: boolean;
  referenced_tweets?: Array<{
    type: 'retweeted' | 'quoted' | 'replied_to';
    id: string;
  }>;
  reply_settings?: 'everyone' | 'mentionedUsers' | 'following';
  source?: string;
  attachments?: {
    media_keys?: string[];
    poll_ids?: string[];
  };
}

// Twitter API v2 Media object
export interface TwitterAPIMedia {
  media_key: string;
  type: 'photo' | 'video' | 'animated_gif';
  url?: string;
  duration_ms?: number;
  height?: number;
  width?: number;
  preview_image_url?: string;
  public_metrics?: {
    view_count?: number;
  };
}

// Twitter API v2 Place object
export interface TwitterAPIPlace {
  id: string;
  full_name: string;
  name: string;
  country: string;
  country_code: string;
  geo?: {
    type: string;
    bbox: [number, number, number, number];
    properties: Record<string, unknown>;
  };
}

// Twitter API v2 Response with includes
export interface TwitterAPITweetResponse {
  data?: TwitterAPITweet[];
  includes?: {
    users?: TwitterAPIUser[];
    tweets?: TwitterAPITweet[];
    media?: TwitterAPIMedia[];
    places?: TwitterAPIPlace[];
  };
  meta?: {
    oldest_id?: string;
    newest_id?: string;
    result_count: number;
    next_token?: string;
    previous_token?: string;
  };
  errors?: Array<{
    detail: string;
    title: string;
    resource_type: string;
    parameter: string;
    value: string;
    type: string;
  }>;
}

// Single tweet response
export interface TwitterAPISingleTweetResponse {
  data?: TwitterAPITweet;
  includes?: {
    users?: TwitterAPIUser[];
    tweets?: TwitterAPITweet[];
    media?: TwitterAPIMedia[];
    places?: TwitterAPIPlace[];
  };
  errors?: Array<{
    detail: string;
    title: string;
    resource_type: string;
    parameter: string;
    value: string;
    type: string;
  }>;
}

// User response
export interface TwitterAPIUserResponse {
  data?: TwitterAPIUser;
  errors?: Array<{
    detail: string;
    title: string;
    resource_type: string;
    parameter: string;
    value: string;
    type: string;
  }>;
}

// Rate limit headers
export interface TwitterRateLimitHeaders {
  'x-rate-limit-limit'?: string;
  'x-rate-limit-remaining'?: string;
  'x-rate-limit-reset'?: string;
}
