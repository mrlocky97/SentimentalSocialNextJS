/**
 * Campaign Handlers Module
 * Separated route handlers for campaign management endpoints
 */

import { Request, Response } from "express";
import { Order } from "../../../enums/api.enum";
import { CampaignType } from "../../../enums/campaign.enum";
import { MongoCampaignRepository } from "../../../repositories/mongo-campaign.repository";
import { TweetDatabaseService } from "../../../services/tweet-database.service";
import {
    CampaignFilter,
    CampaignStatus,
    CreateCampaignRequest,
    UpdateCampaignRequest,
} from "../../../types/campaign";

const campaignRepository = new MongoCampaignRepository();
const tweetDatabaseService = new TweetDatabaseService();

/**
 * Get all campaigns handler
 */
export const getCampaignsHandler = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status, type, organizationId } = req.query;

    // Build filter object
    const filter: CampaignFilter = {};
    if (status) filter.status = status as string as CampaignStatus;
    if (type) filter.type = type as string as CampaignType;
    if (organizationId) filter.organizationId = organizationId as string;

    // Convert pagination params
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Get campaigns with pagination
    const campaigns = await campaignRepository.findMany(filter, {
      offset,
      limit: limitNum,
      sortBy: "createdAt",
      sortOrder: Order.DESC,
    });

    // Get total count for pagination
    const total = await campaignRepository.count(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: campaigns,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to fetch campaigns",
        code: "CAMPAIGNS_FETCH_ERROR",
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Create new campaign handler
 */
export const createCampaignHandler = async (req: Request, res: Response) => {
  try {
    const campaignData: CreateCampaignRequest = req.body;
    const user = (
      req as unknown as { user?: { id: string; organizationId?: string } }
    ).user;

    // Ensure request is authenticated (we expect auth middleware to attach user)
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Authentication required to create a campaign",
          code: "AUTH_REQUIRED",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate required fields
    if (
      !campaignData.name ||
      !campaignData.type ||
      !campaignData.dataSources ||
      !campaignData.startDate ||
      !campaignData.endDate
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Missing required fields",
          code: "MISSING_REQUIRED_FIELDS",
          details: {
            required: ["name", "type", "dataSources", "startDate", "endDate"],
            provided: Object.keys(req.body),
          },
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate organizationId presence (can come from body or authenticated user)
    const organizationId = campaignData.organizationId || user.organizationId;
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Organization ID is required",
          code: "MISSING_ORGANIZATION_ID",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate that at least one tracking parameter is provided
    if (
      (!campaignData.hashtags || campaignData.hashtags.length === 0) &&
      (!campaignData.keywords || campaignData.keywords.length === 0) &&
      (!campaignData.mentions || campaignData.mentions.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message: "At least one hashtag, keyword, or mention must be provided",
          code: "NO_TRACKING_PARAMETERS",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate date range
    const startDate = new Date(campaignData.startDate);
    const endDate = new Date(campaignData.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid date format",
          code: "INVALID_DATE_FORMAT",
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        error: {
          message: "End date must be after start date",
          code: "INVALID_DATE_RANGE",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Add user context
    const campaignWithUser = {
      ...campaignData,
      createdBy: user.id,
      organizationId,
      status: CampaignStatus.draft,
      timezone: campaignData.timezone || "UTC",
    };

    try {
      const campaign = await campaignRepository.create(campaignWithUser);
      return res.status(201).json({
        success: true,
        data: campaign,
        message: "Campaign created successfully",
      });
    } catch (err: unknown) {
      // Map Mongoose validation errors and custom pre-save errors to 400
      const e = err as any;
      if (e) {
        // Mongoose ValidationError
        if (e.name === "ValidationError" && e.errors) {
          const details: Record<string, string> = {};
          Object.keys(e.errors).forEach((k) => {
            details[k] = e.errors[k].message || String(e.errors[k]);
          });
          return res.status(400).json({
            success: false,
            error: {
              message: "Validation failed",
              code: "VALIDATION_ERROR",
              details,
              timestamp: new Date().toISOString(),
            },
          });
        }

        // Pre-save or other thrown Error with descriptive message
        if (e instanceof Error && e.message) {
          const msg = e.message;
          if (
            msg.includes("At least one hashtag") ||
            msg.includes("At least one data source") ||
            msg.includes("duration cannot exceed")
          ) {
            return res.status(400).json({
              success: false,
              error: {
                message: msg,
                code: "VALIDATION_ERROR",
                timestamp: new Date().toISOString(),
              },
            });
          }
        }
      }

      // Re-throw to be handled by outer catch (which will return 500)
      throw err;
    }
  } catch (error: unknown) {
    console.error("Error creating campaign:", error);

    // Handle duplicate name error
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        error: {
          message: "Campaign name already exists",
          code: "DUPLICATE_CAMPAIGN_NAME",
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: "Failed to create campaign",
        code: "CAMPAIGN_CREATION_ERROR",
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Get campaign by ID handler
 */
export const getCampaignByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!id || id.length !== 24) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid campaign ID format",
          code: "INVALID_CAMPAIGN_ID",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const campaign = await campaignRepository.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Campaign not found",
          code: "CAMPAIGN_NOT_FOUND",
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      data: campaign,
    });
  } catch (error: unknown) {
    console.error("Error fetching campaign:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to fetch campaign",
        code: "CAMPAIGN_FETCH_ERROR",
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Update campaign handler
 */
export const updateCampaignHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: UpdateCampaignRequest = req.body;

    // Validate MongoDB ObjectId format
    if (!id || id.length !== 24) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid campaign ID format",
          code: "INVALID_CAMPAIGN_ID",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if campaign exists
    const existingCampaign = await campaignRepository.findById(id);
    if (!existingCampaign) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Campaign not found",
          code: "CAMPAIGN_NOT_FOUND",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate date range if dates are being updated
    if (updateData.startDate || updateData.endDate) {
      const startDate = new Date(
        updateData.startDate || existingCampaign.startDate,
      );
      const endDate = new Date(updateData.endDate || existingCampaign.endDate);

      if (
        (updateData.startDate && isNaN(startDate.getTime())) ||
        (updateData.endDate && isNaN(endDate.getTime()))
      ) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Invalid date format",
            code: "INVALID_DATE_FORMAT",
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          error: {
            message: "End date must be after start date",
            code: "INVALID_DATE_RANGE",
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // Add update metadata
    const updateWithMetadata = {
      ...updateData,
      updatedAt: new Date(),
    };

    const updatedCampaign = await campaignRepository.update(
      id,
      updateWithMetadata,
    );

    res.json({
      success: true,
      data: updatedCampaign,
      message: "Campaign updated successfully",
    });
  } catch (error: unknown) {
    console.error("Error updating campaign:", error);

    // Handle duplicate name error
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        error: {
          message: "Campaign name already exists",
          code: "DUPLICATE_CAMPAIGN_NAME",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Handle validation errors - Provide detailed feedback to API consumers
    if (error instanceof Error) {
      if (error.message === "VALIDATION_ERROR") {
        return res.status(400).json({
          success: false,
          error: {
            message: "Validation failed - check provided data",
            code: "CAMPAIGN_VALIDATION_ERROR",
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Check for mongoose validation errors with more details
      const mongooseError = error as any;
      if (mongooseError.name === "ValidationError" && mongooseError.errors) {
        const validationErrors: Record<string, string> = {};

        Object.keys(mongooseError.errors).forEach((field) => {
          validationErrors[field] = mongooseError.errors[field].message;
        });

        return res.status(400).json({
          success: false,
          error: {
            message: "Validation failed for campaign update",
            code: "VALIDATION_ERROR",
            details: validationErrors,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        message: "Failed to update campaign",
        code: "CAMPAIGN_UPDATE_ERROR",
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Delete campaign handler
 */
export const deleteCampaignHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!id || id.length !== 24) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid campaign ID format",
          code: "INVALID_CAMPAIGN_ID",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if campaign exists
    const existingCampaign = await campaignRepository.findById(id);
    if (!existingCampaign) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Campaign not found",
          code: "CAMPAIGN_NOT_FOUND",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Soft delete by updating status
    await campaignRepository.update(id, {
      status: CampaignStatus.deleted,
      updatedAt: new Date(),
    } as Partial<UpdateCampaignRequest>);

    res.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to delete campaign",
        code: "CAMPAIGN_DELETE_ERROR",
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Get campaign tweets handler
 */
export const getCampaignTweetsHandler = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { limit = 20, sentiment } = req.query;

    // Validate campaign ID
    if (!campaignId || campaignId.length !== 24) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid campaign ID format",
          code: "INVALID_CAMPAIGN_ID",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if campaign exists
    const campaign = await campaignRepository.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Campaign not found",
          code: "CAMPAIGN_NOT_FOUND",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const limitNum = parseInt(limit as string);

    // Build filter for tweets
    const filter: Record<string, unknown> = { campaignId };
    if (sentiment) {
      filter.sentiment = sentiment;
    }

    const tweets = await tweetDatabaseService.getTweetsByCampaign(
      campaignId,
      limitNum,
    );

    res.json({
      success: true,
      data: tweets,
    });
  } catch (error: unknown) {
    console.error("Error fetching campaign tweets:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to fetch campaign tweets",
        code: "CAMPAIGN_TWEETS_FETCH_ERROR",
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Get campaigns overview handler
 */
export const getCampaignsOverviewHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    // Get campaign statistics
    const totalCampaigns = await campaignRepository.count({});
    const activeCampaigns = await campaignRepository.count({
      status: CampaignStatus.active,
    });
    const draftCampaigns = await campaignRepository.count({
      status: CampaignStatus.draft,
    });
    const completedCampaigns = await campaignRepository.count({
      status: CampaignStatus.completed,
    });

    // Get recent campaigns
    const recentCampaigns = await campaignRepository.findMany(
      {},
      {
        limit: 10,
        sortBy: "createdAt",
        sortOrder: Order.DESC,
      },
    );

    res.json({
      success: true,
      data: {
        statistics: {
          total: totalCampaigns,
          active: activeCampaigns,
          draft: draftCampaigns,
          completed: completedCampaigns,
        },
        recentCampaigns,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching campaigns overview:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to fetch campaigns overview",
        code: "CAMPAIGNS_OVERVIEW_ERROR",
        timestamp: new Date().toISOString(),
      },
    });
  }
};
