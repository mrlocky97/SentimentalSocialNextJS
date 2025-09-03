/**
 * MongoDB Tweet Model
 * Schema for storing collected tweets and their analysis
 */

import mongoose, { Document, Schema } from "mongoose";
import { Label } from "../enums/sentiment.enum";
import { SentimentAnalysis, TweetMetrics, TwitterUser } from "../types/twitter";

export interface ITweetDocument extends Document {
  tweetId: string;
  content: string;
  author: TwitterUser;
  metrics: TweetMetrics;
  sentiment?: SentimentAnalysis;
  hashtags: string[];
  mentions: string[];
  urls: string[];
  mediaUrls?: string[];
  campaignId?: string;

  // Tweet Classification
  isRetweet: boolean;
  isReply: boolean;
  isQuote: boolean;
  parentTweetId?: string;

  // Geographic Data
  geoLocation?: {
    country?: string;
    city?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  // Language
  language: string;

  // Timestamps
  scrapedAt: Date;
  tweetCreatedAt: Date; // Original tweet creation date
  createdAt: Date;
  updatedAt: Date;
}

const twitterUserSchema = new Schema(
  {
    id: { type: String, required: true },
    username: { type: String, required: true, index: true },
    displayName: { type: String, required: true },
    avatar: { type: String },
    verified: { type: Boolean, default: false },
    followersCount: { type: Number, default: 0, min: 0 },
    followingCount: { type: Number, default: 0, min: 0 },
    tweetsCount: { type: Number, default: 0, min: 0 },
    location: { type: String },
    bio: { type: String, maxlength: 500 },
    website: { type: String },
    joinedDate: { type: Date },
    influenceScore: { type: Number, min: 0, max: 100 },
    engagementRate: { type: Number, min: 0, max: 100 },
  },
  { _id: false },
);

const tweetMetricsSchema = new Schema(
  {
    retweets: { type: Number, required: true, min: 0, default: 0 },
    likes: { type: Number, required: true, min: 0, default: 0 },
    replies: { type: Number, required: true, min: 0, default: 0 },
    quotes: { type: Number, required: true, min: 0, default: 0 },
    views: { type: Number, min: 0 },
    engagement: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const sentimentAnalysisSchema = new Schema(
  {
    score: { type: Number, required: true, min: -1, max: 1 },
    magnitude: { type: Number, required: true, min: 0, max: 1 },
    label: {
      type: String,
      required: true,
      enum: [
        Label.VERY_POSITIVE,
        Label.POSITIVE,
        Label.NEUTRAL,
        Label.NEGATIVE,
        Label.VERY_NEGATIVE,
      ],
    },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    emotions: {
      joy: { type: Number, min: 0, max: 1 },
      anger: { type: Number, min: 0, max: 1 },
      fear: { type: Number, min: 0, max: 1 },
      sadness: { type: Number, min: 0, max: 1 },
      surprise: { type: Number, min: 0, max: 1 },
      disgust: { type: Number, min: 0, max: 1 },
    },
    keywords: [{ type: String }],
    analyzedAt: { type: Date, required: true },
    processingTime: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const geoLocationSchema = new Schema(
  {
    country: { type: String, maxlength: 2 },
    city: { type: String, maxlength: 100 },
    coordinates: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
  },
  { _id: false },
);

const tweetSchema = new Schema<ITweetDocument>(
  {
    tweetId: {
      type: String,
      required: [true, "Tweet ID is required"],
      unique: true,
      index: true,
      validate: {
        validator: function (tweetId: string) {
          // Allow pure numeric strings (real Twitter IDs) or prefixed IDs (scraped/test data)
          return /^\d+$/.test(tweetId) || /^(scraped|test|bulk|service|mongoose|native)_/.test(tweetId);
        },
        message: "Tweet ID must be a numeric string or a valid prefixed identifier (scraped_, test_, mongoose_, native_, etc.)",
      },
    },

    content: {
      type: String,
      required: [true, "Tweet content is required"],
      maxlength: [1000, "Tweet content cannot exceed 1000 characters"],
      index: "text", // Text search index
    },

    author: {
      type: twitterUserSchema,
      required: [true, "Tweet author is required"],
    },

    metrics: {
      type: tweetMetricsSchema,
      required: [true, "Tweet metrics are required"],
    },

    sentiment: sentimentAnalysisSchema,

    hashtags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [50, "Hashtag cannot exceed 50 characters"],
        validate: {
          validator: function (hashtag: string) {
            return /^[a-zA-Z0-9_]+$/.test(hashtag);
          },
          message: "Hashtag can only contain letters, numbers, and underscores",
        },
      },
    ],

    mentions: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [50, "Mention cannot exceed 50 characters"],
        validate: {
          validator: function (mention: string) {
            return /^[a-zA-Z0-9_]+$/.test(mention);
          },
          message: "Mention can only contain letters, numbers, and underscores",
        },
      },
    ],

    urls: [
      {
        type: String,
        validate: {
          validator: function (url: string) {
            try {
              new URL(url);
              return true;
            } catch {
              return false;
            }
          },
          message: "Invalid URL format",
        },
      },
    ],

    mediaUrls: [
      {
        type: String,
        validate: {
          validator: function (url: string) {
            try {
              new URL(url);
              return true;
            } catch {
              return false;
            }
          },
          message: "Invalid media URL format",
        },
      },
    ],

    campaignId: {
      type: String,
      index: true,
      validate: {
        validator: function (id: string) {
          // Allow valid ObjectIds or simple string identifiers for testing/campaigns
          return mongoose.Types.ObjectId.isValid(id) || /^[a-zA-Z0-9_-]+$/.test(id);
        },
        message: "Campaign ID must be a valid ObjectId or alphanumeric string",
      },
    },

    // Tweet Classification
    isRetweet: { type: Boolean, required: true, default: false, index: true },
    isReply: { type: Boolean, required: true, default: false, index: true },
    isQuote: { type: Boolean, required: true, default: false, index: true },

    parentTweetId: {
      type: String,
      validate: {
        validator: function (tweetId: string) {
          return /^\d+$/.test(tweetId);
        },
        message: "Parent tweet ID must be a numeric string",
      },
    },

    geoLocation: geoLocationSchema,

    language: {
      type: String,
      required: [true, "Language is required"],
      default: "en",
      validate: {
        validator: function (lang: string) {
          // Allow ISO 639-1 codes (2 letters) or "unknown"
          return /^[a-z]{2}$/.test(lang) || lang === "unknown";
        },
        message: "Language must be a valid ISO 639-1 code (2 letters) or 'unknown'",
      },
      index: true,
    },

    scrapedAt: {
      type: Date,
      required: [true, "Scraped timestamp is required"],
      default: Date.now,
      index: true,
    },

    tweetCreatedAt: {
      type: Date,
      required: [true, "Tweet creation date is required"],
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Text search index
tweetSchema.index({
  content: "text",
  hashtags: "text",
  mentions: "text",
  "author.displayName": "text",
  "author.username": "text",
});

// Pre-save middleware
tweetSchema.pre("save", function (next) {
  // Calculate engagement if not provided
  if (this.metrics && this.author.followersCount > 0) {
    const totalEngagement =
      this.metrics.likes +
      this.metrics.retweets +
      this.metrics.replies +
      this.metrics.quotes;
    this.metrics.engagement =
      (totalEngagement / this.author.followersCount) * 100;
  }

  // Ensure hashtags don't have # prefix
  this.hashtags = this.hashtags.map((tag) =>
    tag.replace("#", "").toLowerCase(),
  );

  // Ensure mentions don't have @ prefix
  this.mentions = this.mentions.map((mention) =>
    mention.replace("@", "").toLowerCase(),
  );

  next();
});

// Instance methods
tweetSchema.methods.calculateEngagementRate = function (): number {
  if (this.author.followersCount === 0) return 0;
  const totalEngagement =
    this.metrics.likes +
    this.metrics.retweets +
    this.metrics.replies +
    this.metrics.quotes;
  return (totalEngagement / this.author.followersCount) * 100;
};

tweetSchema.methods.isHighEngagement = function (): boolean {
  return this.calculateEngagementRate() > 2; // 2% is considered high engagement
};

tweetSchema.methods.getAgeInHours = function (): number {
  const now = new Date();
  const diffMs = now.getTime() - this.tweetCreatedAt.getTime();
  return diffMs / (1000 * 60 * 60);
};

// Static methods
tweetSchema.statics.findByCampaign = function (
  campaignId: string,
  limit: number = 100,
) {
  return this.find({ campaignId }).sort({ tweetCreatedAt: -1 }).limit(limit);
};

tweetSchema.statics.findByHashtag = function (
  hashtag: string,
  limit: number = 100,
) {
  return this.find({ hashtags: hashtag.toLowerCase().replace("#", "") })
    .sort({ tweetCreatedAt: -1 })
    .limit(limit);
};

tweetSchema.statics.findBySentiment = function (
  sentiment: Label,
  limit: number = 100,
) {
  return this.find({ "sentiment.label": sentiment })
    .sort({ tweetCreatedAt: -1 })
    .limit(limit);
};

export const TweetModel = mongoose.model<ITweetDocument>("Tweet", tweetSchema);
export default TweetModel;
