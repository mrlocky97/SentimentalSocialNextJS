/**
 * MongoDB Campaign Model
 * Mongoose schema and model for campaign data persistence
 */

import mongoose, { Document, Schema } from "mongoose";
import {
  CampaignStatus,
  CampaignType,
  DataSource,
} from "../enums/campaign.enum";

export interface ICampaignDocument extends Document {
  name: string;
  description?: string;

  // Campaign Configuration
  type: CampaignType;
  status: CampaignStatus;
  dataSources: DataSource[];

  // Tracking Parameters
  hashtags: string[];
  keywords: string[];
  mentions: string[];

  // Time Configuration
  startDate: Date;
  endDate: Date;
  timezone: string;

  // Collection Settings
  maxTweets: number;
  collectImages: boolean;
  collectVideos: boolean;
  collectReplies: boolean;
  collectRetweets: boolean;

  // Geographic Filters
  geoLocation?: {
    country?: string;
    city?: string;
    radius?: number;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  // Language Filters
  languages: string[];

  // Analysis Configuration
  sentimentAnalysis: boolean;
  emotionAnalysis: boolean;
  topicsAnalysis: boolean;
  influencerAnalysis: boolean;

  // Organization & Permissions
  organizationId: string;
  createdBy: string;
  assignedTo: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastDataCollection?: Date;

  // Statistics
  stats?: {
    totalTweets: number;
    totalEngagement: number;
    avgSentiment: number;
    topHashtags: { tag: string; count: number }[];
    topMentions: { mention: string; count: number }[];
    dailyVolume: { date: string; count: number }[];
  };

  // Instance methods
  canUserEdit(userId: string): boolean;
  getDurationInDays(): number;
  isActive(): boolean;
}

const geoLocationSchema = new Schema(
  {
    country: { type: String, maxlength: 2 },
    city: { type: String, maxlength: 100 },
    radius: { type: Number, min: 1, max: 1000 },
    coordinates: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
  },
  { _id: false },
);

const statsSchema = new Schema(
  {
    totalTweets: { type: Number, default: 0, min: 0 },
    totalEngagement: { type: Number, default: 0, min: 0 },
    avgSentiment: { type: Number, default: 0, min: -1, max: 1 },
    topHashtags: [
      {
        tag: { type: String, required: true },
        count: { type: Number, required: true, min: 0 },
      },
    ],
    topMentions: [
      {
        mention: { type: String, required: true },
        count: { type: Number, required: true, min: 0 },
      },
    ],
    dailyVolume: [
      {
        date: { type: String, required: true },
        count: { type: Number, required: true, min: 0 },
      },
    ],
  },
  { _id: false },
);

const campaignSchema = new Schema<ICampaignDocument>(
  {
    name: {
      type: String,
      required: [true, "Campaign name is required"],
      trim: true,
      minlength: [3, "Campaign name must be at least 3 characters"],
      maxlength: [100, "Campaign name cannot exceed 100 characters"],
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    type: {
      type: String,
      required: [true, "Campaign type is required"],
      enum: {
        values: Object.values(CampaignType),
        message: "Type must be one of: hashtag, keyword, mention, competitor",
      },
      index: true,
    },

    status: {
      type: String,
      required: [true, "Campaign status is required"],
      enum: {
        values: Object.values(CampaignStatus),
        message:
          "Status must be one of: draft, active, paused, completed, archived",
      },
      default: CampaignStatus.draft,
      index: true,
    },

    dataSources: [
      {
        type: String,
        enum: {
          values: Object.values(DataSource),
          message:
            "Data source must be one of: twitter, instagram, facebook, tiktok, linkedin",
        },
      },
    ],

    hashtags: [
      {
        type: String,
        trim: true,
        maxlength: [50, "Hashtag cannot exceed 50 characters"],
      },
    ],

    keywords: [
      {
        type: String,
        trim: true,
        maxlength: [100, "Keyword cannot exceed 100 characters"],
      },
    ],

    mentions: [
      {
        type: String,
        trim: true,
        maxlength: [50, "Mention cannot exceed 50 characters"],
      },
    ],

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
      index: true,
    },

    endDate: {
      type: Date,
      required: [true, "End date is required"],
      index: true,
    },

    timezone: {
      type: String,
      required: [true, "Timezone is required"],
      default: "UTC",
    },

    maxTweets: {
      type: Number,
      required: [true, "Max tweets limit is required"],
      min: [100, "Minimum tweets collection is 100"],
      max: [1000000, "Maximum tweets collection is 1,000,000"],
      default: 10000,
    },

    collectImages: { type: Boolean, default: true },
    collectVideos: { type: Boolean, default: true },
    collectReplies: { type: Boolean, default: false },
    collectRetweets: { type: Boolean, default: true },

    geoLocation: geoLocationSchema,

    languages: [
      {
        type: String,
        maxlength: [2, "Language code must be 2 characters"],
        minlength: [2, "Language code must be 2 characters"],
        match: [
          /^[a-z]{2}$/,
          "Language code must be a valid 2-letter ISO code",
        ],
      },
    ],

    sentimentAnalysis: { type: Boolean, default: true },
    emotionAnalysis: { type: Boolean, default: false },
    topicsAnalysis: { type: Boolean, default: false },
    influencerAnalysis: { type: Boolean, default: false },

    organizationId: {
      type: String,
      required: [true, "Organization ID is required"],
      index: true,
    },

    createdBy: {
      type: String,
      required: [true, "Creator user ID is required"],
      index: true,
    },

    assignedTo: [
      {
        type: String,
      },
    ],

    lastDataCollection: {
      type: Date,
      index: true,
    },

    stats: statsSchema,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Pre-save middleware
campaignSchema.pre("save", function (this: ICampaignDocument, next) {
  if (
    this.hashtags.length === 0 &&
    this.keywords.length === 0 &&
    this.mentions.length === 0
  ) {
    next(
      new Error("At least one hashtag, keyword, or mention must be provided"),
    );
    return;
  }

  if (this.dataSources.length === 0) {
    next(new Error("At least one data source must be selected"));
    return;
  }

  const daysDiff = Math.ceil(
    (this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysDiff > 365) {
    next(new Error("Campaign duration cannot exceed 365 days"));
    return;
  }

  next();
});

// Instance methods
campaignSchema.methods.canUserEdit = function (userId: string): boolean {
  return this.createdBy === userId || this.assignedTo.includes(userId);
};

campaignSchema.methods.getDurationInDays = function (): number {
  return Math.ceil(
    (this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
};

campaignSchema.methods.isActive = function (): boolean {
  const now = new Date();
  return (
    this.status === "active" && this.startDate <= now && this.endDate >= now
  );
};

// Static methods
campaignSchema.statics.findByOrganization = function (organizationId: string) {
  return this.find({ organizationId }).sort({ createdAt: -1 });
};

campaignSchema.statics.findActiveByUser = function (userId: string) {
  return this.find({
    $and: [
      { status: "active" },
      { $or: [{ createdBy: userId }, { assignedTo: userId }] },
    ],
  }).sort({ startDate: 1 });
};

export const CampaignModel = mongoose.model<ICampaignDocument>(
  "Campaign",
  campaignSchema,
);
export default CampaignModel;
