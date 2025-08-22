/**
 * MongoDB Campaign Repository
 * Data access layer for campaign operations
 */

import { ICampaignDocument, CampaignModel } from "../models/Campaign.model";
import {
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignFilter,
} from "../types/campaign";
import { PaginationOptions } from "../types/common";

export class MongoCampaignRepository {
  /**
   * Create a new campaign
   */
  async create(
    campaignData: CreateCampaignRequest,
  ): Promise<ICampaignDocument> {
    try {
      // Convert date strings to Date objects
      const campaignToCreate = {
        ...campaignData,
        startDate: new Date(campaignData.startDate),
        endDate: new Date(campaignData.endDate),
        // Set default values
        collectImages: campaignData.collectImages ?? true,
        collectVideos: campaignData.collectVideos ?? true,
        collectReplies: campaignData.collectReplies ?? false,
        collectRetweets: campaignData.collectRetweets ?? true,
        sentimentAnalysis: campaignData.sentimentAnalysis ?? true,
        emotionAnalysis: campaignData.emotionAnalysis ?? false,
        topicsAnalysis: campaignData.topicsAnalysis ?? false,
        influencerAnalysis: campaignData.influencerAnalysis ?? false,
        assignedTo: campaignData.assignedTo ?? [],
      };

      const campaign = new CampaignModel(campaignToCreate);
      const savedCampaign = await campaign.save();

      return savedCampaign;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("validation failed")) {
          throw new Error("VALIDATION_ERROR");
        }
        if (error.message.includes("duplicate key")) {
          throw new Error("CAMPAIGN_NAME_EXISTS");
        }
      }
      console.error("Error creating campaign:", error);
      throw new Error("CREATE_CAMPAIGN_ERROR");
    }
  }

  /**
   * Find campaign by ID
   */
  async findById(id: string): Promise<ICampaignDocument | null> {
    try {
      const campaign = await CampaignModel.findById(id);
      return campaign;
    } catch (error) {
      console.error("Error finding campaign by ID:", error);
      return null;
    }
  }

  /**
   * Find campaigns with filtering and pagination
   */
  async findMany(
    filter: CampaignFilter = {},
    options: PaginationOptions = {},
  ): Promise<ICampaignDocument[]> {
    try {
      const {
        offset = 0,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;

      // Build MongoDB filter
      const mongoFilter: Record<string, unknown> = {};

      if (filter.status) mongoFilter.status = filter.status;
      if (filter.type) mongoFilter.type = filter.type;
      if (filter.organizationId)
        mongoFilter.organizationId = filter.organizationId;
      if (filter.createdBy) mongoFilter.createdBy = filter.createdBy;
      if (filter.assignedTo)
        mongoFilter.assignedTo = { $in: [filter.assignedTo] };
      if (filter.dataSources && filter.dataSources.length > 0) {
        mongoFilter.dataSources = { $in: filter.dataSources };
      }

      // Date range filters
      if (filter.startDateFrom || filter.startDateTo) {
        mongoFilter.startDate = {};
        if (filter.startDateFrom) {
          (mongoFilter.startDate as Record<string, unknown>).$gte = new Date(
            filter.startDateFrom,
          );
        }
        if (filter.startDateTo) {
          (mongoFilter.startDate as Record<string, unknown>).$lte = new Date(
            filter.startDateTo,
          );
        }
      }

      if (filter.endDateFrom || filter.endDateTo) {
        mongoFilter.endDate = {};
        if (filter.endDateFrom) {
          (mongoFilter.endDate as Record<string, unknown>).$gte = new Date(
            filter.endDateFrom,
          );
        }
        if (filter.endDateTo) {
          (mongoFilter.endDate as Record<string, unknown>).$lte = new Date(
            filter.endDateTo,
          );
        }
      }

      // Build sort object
      const sortDirection = sortOrder === "desc" ? -1 : 1;
      const sort: Record<string, 1 | -1> = { [sortBy]: sortDirection };

      const campaigns = await CampaignModel.find(mongoFilter)
        .sort(sort)
        .skip(offset)
        .limit(limit)
        .exec();

      return campaigns;
    } catch (error) {
      console.error("Error finding campaigns:", error);
      throw new Error("FIND_CAMPAIGNS_ERROR");
    }
  }

  /**
   * Count campaigns with filtering
   */
  async count(filter: CampaignFilter = {}): Promise<number> {
    try {
      const mongoFilter: Record<string, unknown> = {};

      if (filter.status) mongoFilter.status = filter.status;
      if (filter.type) mongoFilter.type = filter.type;
      if (filter.organizationId)
        mongoFilter.organizationId = filter.organizationId;
      if (filter.createdBy) mongoFilter.createdBy = filter.createdBy;
      if (filter.assignedTo)
        mongoFilter.assignedTo = { $in: [filter.assignedTo] };
      if (filter.dataSources && filter.dataSources.length > 0) {
        mongoFilter.dataSources = { $in: filter.dataSources };
      }

      // Date range filters
      if (filter.startDateFrom || filter.startDateTo) {
        mongoFilter.startDate = {};
        if (filter.startDateFrom) {
          (mongoFilter.startDate as Record<string, unknown>).$gte = new Date(
            filter.startDateFrom,
          );
        }
        if (filter.startDateTo) {
          (mongoFilter.startDate as Record<string, unknown>).$lte = new Date(
            filter.startDateTo,
          );
        }
      }

      const count = await CampaignModel.countDocuments(mongoFilter);
      return count;
    } catch (error) {
      console.error("Error counting campaigns:", error);
      throw new Error("COUNT_CAMPAIGNS_ERROR");
    }
  }

  /**
   * Update campaign by ID
   */
  async update(
    id: string,
    updateData: UpdateCampaignRequest,
  ): Promise<ICampaignDocument | null> {
    try {
      // Convert date strings to Date objects if provided
      const updatePayload: Record<string, unknown> = { ...updateData };
      if (updateData.startDate) {
        updatePayload.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        updatePayload.endDate = new Date(updateData.endDate);
      }

      const updatedCampaign = await CampaignModel.findByIdAndUpdate(
        id,
        { ...updatePayload, updatedAt: new Date() },
        { new: true, runValidators: true },
      );

      return updatedCampaign;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("validation failed")) {
          throw new Error("VALIDATION_ERROR");
        }
        if (error.message.includes("Cannot modify tracking parameters")) {
          throw new Error("CANNOT_MODIFY_ACTIVE_CAMPAIGN");
        }
      }
      console.error("Error updating campaign:", error);
      throw new Error("UPDATE_CAMPAIGN_ERROR");
    }
  }

  /**
   * Delete campaign by ID (soft delete - archive)
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await CampaignModel.findByIdAndUpdate(
        id,
        { status: "archived", updatedAt: new Date() },
        { new: true },
      );

      return result !== null;
    } catch (error) {
      console.error("Error deleting campaign:", error);
      throw new Error("DELETE_CAMPAIGN_ERROR");
    }
  }

  /**
   * Find campaigns by organization
   */
  async findByOrganization(
    organizationId: string,
  ): Promise<ICampaignDocument[]> {
    try {
      const campaigns = await CampaignModel.find({ organizationId }).sort({
        createdAt: -1,
      });
      return campaigns;
    } catch (error) {
      console.error("Error finding campaigns by organization:", error);
      throw new Error("FIND_CAMPAIGNS_BY_ORG_ERROR");
    }
  }

  /**
   * Find active campaigns for a user
   */
  async findActiveByUser(userId: string): Promise<ICampaignDocument[]> {
    try {
      const campaigns = await CampaignModel.find({
        $and: [
          { status: "active" },
          { $or: [{ createdBy: userId }, { assignedTo: userId }] },
        ],
      }).sort({ startDate: 1 });
      return campaigns;
    } catch (error) {
      console.error("Error finding active campaigns by user:", error);
      throw new Error("FIND_ACTIVE_CAMPAIGNS_ERROR");
    }
  }

  /**
   * Find campaigns by hashtag
   */
  async findByHashtag(hashtag: string): Promise<ICampaignDocument[]> {
    try {
      const campaigns = await CampaignModel.find({
        hashtags: { $in: [hashtag.toLowerCase().replace("#", "")] },
      }).sort({ createdAt: -1 });

      return campaigns;
    } catch (error) {
      console.error("Error finding campaigns by hashtag:", error);
      throw new Error("FIND_CAMPAIGNS_BY_HASHTAG_ERROR");
    }
  }

  /**
   * Find campaigns that should collect data now
   */
  async findActiveForCollection(): Promise<ICampaignDocument[]> {
    try {
      const now = new Date();
      const campaigns = await CampaignModel.find({
        status: "active",
        startDate: { $lte: now },
        endDate: { $gte: now },
      }).sort({ lastDataCollection: 1 }); // Prioritize campaigns that haven't been collected recently

      return campaigns;
    } catch (error) {
      console.error("Error finding campaigns for collection:", error);
      throw new Error("FIND_CAMPAIGNS_FOR_COLLECTION_ERROR");
    }
  }

  /**
   * Update campaign statistics
   */
  async updateStats(
    id: string,
    stats: {
      totalTweets: number;
      totalEngagement: number;
      avgSentiment: number;
      topHashtags?: { tag: string; count: number }[];
      topMentions?: { mention: string; count: number }[];
      dailyVolume?: { date: string; count: number }[];
    },
  ): Promise<ICampaignDocument | null> {
    try {
      const updatedCampaign = await CampaignModel.findByIdAndUpdate(
        id,
        {
          stats,
          lastDataCollection: new Date(),
          updatedAt: new Date(),
        },
        { new: true },
      );

      return updatedCampaign;
    } catch (error) {
      console.error("Error updating campaign stats:", error);
      throw new Error("UPDATE_CAMPAIGN_STATS_ERROR");
    }
  }

  /**
   * Search campaigns by text
   */
  async searchByText(
    searchTerm: string,
    organizationId?: string,
    limit: number = 20,
  ): Promise<ICampaignDocument[]> {
    try {
      const filter: Record<string, unknown> = {
        $text: { $search: searchTerm },
      };

      if (organizationId) {
        filter.organizationId = organizationId;
      }

      const campaigns = await CampaignModel.find(filter, {
        score: { $meta: "textScore" },
      })
        .sort({ score: { $meta: "textScore" } })
        .limit(limit);

      return campaigns;
    } catch (error) {
      console.error("Error searching campaigns by text:", error);
      throw new Error("SEARCH_CAMPAIGNS_ERROR");
    }
  }

  /**
   * Find campaigns by user ID with pagination
   */
  async findByUserId(
    userId: string,
    pagination: { offset: number; limit: number } = { offset: 0, limit: 20 },
  ): Promise<ICampaignDocument[]> {
    try {
      const campaigns = await CampaignModel.find({
        $or: [{ createdBy: userId }, { assignedTo: userId }],
      })
        .sort({ createdAt: -1 })
        .skip(pagination.offset)
        .limit(pagination.limit)
        .exec();

      return campaigns;
    } catch (error) {
      console.error("Error finding campaigns by user ID:", error);
      throw new Error("FIND_CAMPAIGNS_BY_USER_ERROR");
    }
  }

  /**
   * Count campaigns by user ID
   */
  async countByUserId(userId: string): Promise<number> {
    try {
      const count = await CampaignModel.countDocuments({
        $or: [{ createdBy: userId }, { assignedTo: userId }],
      });

      return count;
    } catch (error) {
      console.error("Error counting campaigns by user ID:", error);
      throw new Error("COUNT_CAMPAIGNS_BY_USER_ERROR");
    }
  }
}
