/**
 * Campaign Middleware Module
 * Specialized middleware for campaign management routes
 */

import { NextFunction, Request, Response } from "express";
import { CampaignType } from "../../../enums/campaign.enum";
import { logger } from "../../../lib/observability/logger";
import {
  CreateCampaignRequest,
  UpdateCampaignRequest,
} from "../../../types/campaign";

/**
 * Validation middleware for create campaign request
 */
export const validateCreateCampaignRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const campaignData: CreateCampaignRequest = req.body;

    // Check required fields
    const requiredFields = [
      "name",
      "type",
      "dataSources",
      "startDate",
      "endDate",
    ];
    const missingFields = requiredFields.filter(
      (field) => !campaignData[field as keyof CreateCampaignRequest],
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Missing required fields",
          code: "MISSING_REQUIRED_FIELDS",
          details: {
            required: requiredFields,
            missing: missingFields,
            provided: Object.keys(req.body),
          },
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate campaign name
    if (
      typeof campaignData.name !== "string" ||
      campaignData.name.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Campaign name must be a non-empty string",
          code: "INVALID_CAMPAIGN_NAME",
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (campaignData.name.length > 100) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Campaign name cannot exceed 100 characters",
          code: "CAMPAIGN_NAME_TOO_LONG",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate campaign type
    const validTypes = Object.values(CampaignType);
    if (!validTypes.includes(campaignData.type)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid campaign type",
          code: "INVALID_CAMPAIGN_TYPE",
          details: {
            provided: campaignData.type,
            validTypes,
          },
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate tracking parameters
    const hasHashtags =
      campaignData.hashtags && campaignData.hashtags.length > 0;
    const hasKeywords =
      campaignData.keywords && campaignData.keywords.length > 0;
    const hasMentions =
      campaignData.mentions && campaignData.mentions.length > 0;

    if (!hasHashtags && !hasKeywords && !hasMentions) {
      return res.status(400).json({
        success: false,
        error: {
          message: "At least one hashtag, keyword, or mention must be provided",
          code: "NO_TRACKING_PARAMETERS",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate hashtags format
    if (campaignData.hashtags) {
      for (const hashtag of campaignData.hashtags) {
        if (typeof hashtag !== "string" || hashtag.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: "All hashtags must be non-empty strings",
              code: "INVALID_HASHTAG_FORMAT",
              timestamp: new Date().toISOString(),
            },
          });
        }
      }
    }

    // Validate keywords format
    if (campaignData.keywords) {
      for (const keyword of campaignData.keywords) {
        if (typeof keyword !== "string" || keyword.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: "All keywords must be non-empty strings",
              code: "INVALID_KEYWORD_FORMAT",
              timestamp: new Date().toISOString(),
            },
          });
        }
      }
    }

    // Validate date range
    const startDate = new Date(campaignData.startDate);
    const endDate = new Date(campaignData.endDate);

    if (isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid start date format",
          code: "INVALID_START_DATE",
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid end date format",
          code: "INVALID_END_DATE",
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

    next();
  } catch (error) {
    logger.error("Validation error:", { error });
    res.status(500).json({
      success: false,
      error: {
        message: "Internal validation error",
        code: "VALIDATION_ERROR",
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Validation middleware for update campaign request
 */
export const validateUpdateCampaignRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const updateData: UpdateCampaignRequest = req.body;

    // Validate campaign name if provided
    if (updateData.name !== undefined) {
      if (
        typeof updateData.name !== "string" ||
        updateData.name.trim().length === 0
      ) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Campaign name must be a non-empty string",
            code: "INVALID_CAMPAIGN_NAME",
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (updateData.name.length > 100) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Campaign name cannot exceed 100 characters",
            code: "CAMPAIGN_NAME_TOO_LONG",
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // Validate dates if provided
    if (updateData.startDate !== undefined) {
      const startDate = new Date(updateData.startDate);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Invalid start date format",
            code: "INVALID_START_DATE",
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    if (updateData.endDate !== undefined) {
      const endDate = new Date(updateData.endDate);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Invalid end date format",
            code: "INVALID_END_DATE",
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    next();
  } catch (error) {
    logger.error("Update validation error:", { error });
    res.status(500).json({
      success: false,
      error: {
        message: "Internal validation error",
        code: "VALIDATION_ERROR",
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Validation middleware for campaign ID parameter
 */
export const validateCampaignId = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { id, campaignId } = req.params;
  const targetId = id || campaignId;

  if (!targetId) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Campaign ID is required",
        code: "MISSING_CAMPAIGN_ID",
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Validate MongoDB ObjectId format (24 hex characters)
  if (!/^[0-9a-fA-F]{24}$/.test(targetId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Invalid campaign ID format",
        code: "INVALID_CAMPAIGN_ID",
        details: {
          provided: targetId,
          expected: "24-character hex string (MongoDB ObjectId)",
        },
        timestamp: new Date().toISOString(),
      },
    });
  }

  next();
};

/**
 * Pagination validation middleware
 */
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { page, limit } = req.query;

  if (page !== undefined) {
    const pageNum = parseInt(page as string);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Page must be a positive integer",
          code: "INVALID_PAGE_PARAMETER",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Limit must be a positive integer between 1 and 100",
          code: "INVALID_LIMIT_PARAMETER",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  next();
};

/**
 * Request logging middleware for campaign endpoints
 */
export const logCampaignRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (body) {
    const duration = Date.now() - startTime;
    const logData: Record<string, unknown> = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    // Add campaign context if available
    if (req.params.id || req.params.campaignId) {
      logData.campaignId = req.params.id || req.params.campaignId;
    }

    // Log request body for POST/PUT (without sensitive data)
    if (req.method === "POST" || req.method === "PUT") {
      const safeBody = { ...req.body };
      // Remove potentially sensitive fields
      if (safeBody.apiKeys) delete safeBody.apiKeys;
      if (safeBody.credentials) delete safeBody.credentials;
      logData.body = safeBody;
    }

    logger.info(`📊 Campaign Request:`, { meta: logData });
    return originalSend.call(this, body);
  };

  next();
};
