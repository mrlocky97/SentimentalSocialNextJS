/**
 * Type declarations for twid module
 */

declare module 'twid' {
  interface TwidOptions {
    count?: number;
    include_replies?: boolean;
    headless?: boolean;
    timeout?: number;
  }

  interface TwidResult {
    id?: string;
    text?: string;
    content?: string;
    author?: {
      id?: string;
      username?: string;
      displayName?: string;
      name?: string;
      verified?: boolean;
      followers?: number;
      avatar?: string;
      profileImageUrl?: string;
    };
    metrics?: {
      likes?: number;
      retweets?: number;
      replies?: number;
      views?: number;
    };
    likes?: number;
    retweets?: number;
    replies?: number;
    views?: number;
    createdAt?: string;
    hashtags?: string[];
    mentions?: string[];
    urls?: string[];
    media?: Array<{
      type: string;
      url: string;
      width?: number;
      height?: number;
    }>;
    isRetweet?: boolean;
    isReply?: boolean;
    lang?: string;
  }

  function scrape(query: string, options?: TwidOptions): Promise<TwidResult[]>;
  
  const twidModule: {
    scrape: typeof scrape;
  };
  
  export { scrape };
  export default twidModule;
}
