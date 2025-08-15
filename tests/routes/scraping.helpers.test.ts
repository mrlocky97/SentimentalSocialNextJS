import { SCRAPING_CONFIG } from "@/config/scraping.config";
import { Label } from "@/enums/sentiment.enum";
import type { TweetSentimentAnalysis } from "@/lib/sentiment/types";
import {
  processSentimentAnalysis,
  validateRequestParams,
} from "@/routes/modules/scraping/helpers";
import type { Tweet } from "@/types/twitter";

function makeTweet(id: string, score = 0): Tweet {
  return {
    id,
    tweetId: id,
    content: `tweet ${id}`,
    author: {
      id: `u-${id}`,
      username: `user${id}`,
      displayName: `User ${id}`,
      verified: false,
      followersCount: 0,
      followingCount: 0,
      tweetsCount: 0,
    },
    metrics: { retweets: 0, likes: 0, replies: 0, quotes: 0, engagement: 0 },
    hashtags: [],
    mentions: [],
    urls: [],
    isRetweet: false,
    isReply: false,
    isQuote: false,
    language: "en",
    scrapedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    sentiment: undefined,
  };
}

function makeAnalysis(
  id: string,
  label: string,
  score: number,
): TweetSentimentAnalysis {
  return {
    tweetId: id,
    analysis: {
      sentiment: {
        label: label as any,
        score,
        magnitude: Math.abs(score),
        confidence: 0.9,
        emotions: {
          joy: 0,
          sadness: 0,
          anger: 0,
          fear: 0,
          surprise: 0,
          disgust: 0,
        },
      },
      keywords: [],
      language: "en",
      signals: {
        tokens: [],
        ngrams: {},
        emojis: {},
        negationFlips: 0,
        intensifierBoost: 0,
        sarcasmScore: 0,
      },
      version: "test",
    },
    brandMentions: [],
    marketingInsights: {
      engagementPotential: 0,
      viralityIndicators: [],
      targetDemographics: [],
      competitorMentions: [],
      trendAlignment: 0,
      brandRisk: "low",
      opportunityScore: 0,
    },
    analyzedAt: new Date(),
  };
}

describe("processSentimentAnalysis", () => {
  it("normaliza labels positivas y negativas a POSITIVE / NEGATIVE", () => {
    const tweets: Tweet[] = [makeTweet("1"), makeTweet("2"), makeTweet("3")];
    const analyses: TweetSentimentAnalysis[] = [
      makeAnalysis("1", "very_positive", 0.8),
      makeAnalysis("2", "very_negative", -0.9),
      makeAnalysis("3", "neutral", 0),
    ];
    const result = processSentimentAnalysis(tweets, analyses);
    expect(result[0].sentiment?.label).toBe(Label.POSITIVE);
    expect(result[1].sentiment?.label).toBe(Label.NEGATIVE);
    expect(result[2].sentiment?.label).toBe(Label.NEUTRAL);
  });
});

describe("validateRequestParams", () => {
  const resMock = () => {
    const store: any = {};
    return {
      status(code: number) {
        store.code = code;
        return this;
      },
      json(payload: any) {
        store.payload = payload;
        return this;
      },
      store,
    } as any;
  };

  it("rechaza límites fuera de rango", () => {
    const res = resMock();
    const ok = validateRequestParams(res, {
      identifier: "nike",
      tweetsToRetrieve: SCRAPING_CONFIG.LIMITS.MAX_TWEETS + 1,
      analyzeSentiment: true,
      campaignId: undefined,
      language: "en",
      validLanguages: [...SCRAPING_CONFIG.LANGUAGES],
      type: "hashtag",
      exampleValue: "JustDoIt",
    });
    expect(ok).toBe(false);
    expect(res.store.payload.error).toMatch(/between/);
  });

  it("acepta parámetros válidos", () => {
    const res = resMock();
    const ok = validateRequestParams(res, {
      identifier: "adidas",
      tweetsToRetrieve: 10,
      analyzeSentiment: true,
      campaignId: undefined,
      language: "en",
      validLanguages: [...SCRAPING_CONFIG.LANGUAGES],
      type: "hashtag",
      exampleValue: "JustDoIt",
    });
    expect(ok).toBe(true);
  });
});
