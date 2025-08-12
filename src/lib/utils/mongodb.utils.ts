/**
 * MongoDB Document Conversion Utilities
 * Centralized utilities for converting between MongoDB documents and domain objects
 */

import mongoose from "mongoose";
import { User, UserAuth, UserRole, Permission } from "../../types/user";
import { Tweet } from "../../types/twitter";
import { Campaign } from "../../types/campaign";

/**
 * Convert MongoDB User document to domain User object
 */
export function documentToUser(doc: any): User {
  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    email: doc.email,
    username: doc.username,
    displayName: doc.displayName,
    avatar: doc.avatar,
    role: doc.role as UserRole,
    permissions: doc.permissions as Permission[],
    organizationId: doc.organizationId,
    isActive: doc.isActive,
    isVerified: doc.isVerified,
    lastLoginAt: doc.lastLoginAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Convert MongoDB User document to UserAuth object (includes password hash)
 */
export function documentToUserAuth(doc: any): UserAuth {
  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    email: doc.email,
    passwordHash: doc.passwordHash,
    role: doc.role as UserRole,
    isActive: doc.isActive,
    organizationId: doc.organizationId,
  };
}

/**
 * Convert MongoDB Tweet document to domain Tweet object
 */
export function documentToTweet(doc: any): Tweet {
  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    tweetId: doc.tweetId,
    content: doc.text || doc.content,
    author: {
      id: doc.user?.id || doc.author?.id,
      username: doc.user?.username || doc.author?.username,
      displayName: doc.user?.displayName || doc.author?.displayName,
      verified: doc.user?.verified || doc.author?.verified || false,
      followersCount: doc.user?.followers || doc.author?.followersCount || 0,
      followingCount: doc.author?.followingCount || 0,
      tweetsCount: doc.author?.tweetsCount || 0,
      avatar: doc.user?.avatar || doc.author?.avatar,
    },
    metrics: {
      likes: doc.metrics?.likes || 0,
      retweets: doc.metrics?.retweets || 0,
      replies: doc.metrics?.replies || 0,
      quotes: doc.metrics?.quotes || 0,
      views: doc.metrics?.views,
      engagement: doc.metrics?.engagement || 0,
    },
    hashtags: doc.hashtags || [],
    mentions: doc.mentions || [],
    urls: doc.urls || [],
    mediaUrls: doc.media || doc.mediaUrls,
    isRetweet: doc.isRetweet || false,
    isReply: doc.isReply || false,
    isQuote: doc.isQuote || doc.isQuoteStatus || false,
    parentTweetId: doc.parentTweetId,
    language: doc.language || "unknown",
    scrapedAt: doc.scrapedAt || doc.createdAt,
    sentiment: doc.sentiment
      ? {
          score: doc.sentiment.score || 0,
          magnitude: doc.sentiment.magnitude || 0,
          label: doc.sentiment.label,
          confidence: doc.sentiment.confidence || 0,
          keywords: doc.sentiment.keywords || [],
          analyzedAt: doc.sentiment.analyzedAt || new Date(),
          processingTime: doc.sentiment.processingTime || 0,
        }
      : undefined,
    campaignId: doc.campaignId,
    createdAt: doc.postedAt || doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Convert MongoDB Campaign document to domain Campaign object
 */
export function documentToCampaign(doc: any): Campaign {
  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    name: doc.name,
    description: doc.description,
    type: doc.type,
    status: doc.status,
    dataSources: doc.dataSources,
    hashtags: doc.hashtags,
    keywords: doc.keywords,
    mentions: doc.mentions,
    startDate: doc.startDate,
    endDate: doc.endDate,
    timezone: doc.timezone,
    maxTweets: doc.maxTweets,
    collectImages: doc.collectImages ?? false,
    collectVideos: doc.collectVideos ?? false,
    collectReplies: doc.collectReplies ?? false,
    collectRetweets: doc.collectRetweets ?? false,
    geoLocation: doc.geoLocation,
    languages: doc.languages,
    sentimentAnalysis: doc.sentimentAnalysis ?? false,
    emotionAnalysis: doc.emotionAnalysis ?? false,
    topicsAnalysis: doc.topicsAnalysis ?? false,
    influencerAnalysis: doc.influencerAnalysis ?? false,
    organizationId: doc.organizationId,
    createdBy: doc.createdBy,
    assignedTo: doc.assignedTo,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    lastDataCollection: doc.lastDataCollection,
    stats: doc.stats,
  };
}

/**
 * Sanitize user object (remove sensitive fields)
 */
export function sanitizeUserDocument(user: any): Record<string, unknown> {
  const sanitized = { ...user };

  // Remove sensitive fields
  delete sanitized.passwordHash;
  delete sanitized.password;
  delete sanitized.__v;

  // Convert _id to id if present
  if (sanitized._id) {
    sanitized.id = sanitized._id.toString();
    delete sanitized._id;
  }

  return sanitized;
}

/**
 * Convert multiple MongoDB documents to domain objects
 */
export function documentsToUsers(docs: any[]): User[] {
  return docs.map((doc) => documentToUser(doc));
}

export function documentsToTweets(docs: any[]): Tweet[] {
  return docs.map((doc) => documentToTweet(doc));
}

export function documentsToCampaigns(docs: any[]): Campaign[] {
  return docs.map((doc) => documentToCampaign(doc));
}

/**
 * Handle MongoDB duplicate key errors
 */
export function handleMongoError(error: any): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === 11000
  ) {
    // Duplicate key error
    if (error.keyPattern?.email) {
      return "EMAIL_ALREADY_EXISTS";
    }
    if (error.keyPattern?.username) {
      return "USERNAME_ALREADY_EXISTS";
    }
    return "DUPLICATE_KEY_ERROR";
  }

  if (error && error.name === "ValidationError") {
    return "VALIDATION_ERROR";
  }

  return "DATABASE_ERROR";
}

/**
 * Create MongoDB query options from common parameters
 */
export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  select?: string[];
}

export function createMongoQueryOptions(options: QueryOptions = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
    select,
  } = options;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  const mongoOptions: any = {
    skip,
    limit,
    sort,
  };

  if (select && select.length > 0) {
    mongoOptions.select = select.join(" ");
  }

  return mongoOptions;
}
