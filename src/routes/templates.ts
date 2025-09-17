/**
 * Campaign Templates API Routes
 * Provides pre-configured campaign templates and smart recommendations
 */

import express from "express";
import { authenticateToken, requireRole } from "../middleware/express-auth";
import { AICampaignAssistantService } from "../services/ai-campaign-assistant.service";
import { CampaignTemplatesService } from "../services/campaign-templates.service";

const router = express.Router();

/**
 * @swagger
 * /api/v1/templates:
 *   get:
 *     summary: Get all campaign templates
 *     description: Retrieve all available campaign templates for quick setup
 *     tags: [Campaign Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [marketing, brand-monitoring, crisis-management]
 *         description: Filter templates by category
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CampaignTemplate'
 */
router.get(
  "/",
  authenticateToken,
  requireRole(["admin", "manager", "analyst"]),
  async (req, res) => {
    try {
      const { category } = req.query;

      let templates;
      if (category) {
        templates = await CampaignTemplatesService.getTemplatesByCategory(
          category as string,
        );
      } else {
        templates = await CampaignTemplatesService.getTemplates();
      }

      res.json({
        success: true,
        data: templates,
        meta: {
          total: templates.length,
          categories: [
            "marketing",
            "brand-monitoring",
            "crisis-management",
          ],
        },
      });
    } catch (error: unknown) {
      console.error("Error fetching templates:", error);
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to fetch campaign templates",
          code: "FETCH_TEMPLATES_ERROR",
          timestamp: new Date().toISOString(),
        },
      });
    }
  },
);

/**
 * @swagger
 * /api/v1/templates/{id}:
 *   get:
 *     summary: Get specific template
 *     description: Retrieve a specific campaign template by ID
 *     tags: [Campaign Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template found
 *       404:
 *         description: Template not found
 */
router.get(
  "/:id",
  authenticateToken,
  requireRole(["admin", "manager", "analyst"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const template = await CampaignTemplatesService.getTemplate(id);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: {
            message: "Template not found",
            code: "TEMPLATE_NOT_FOUND",
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error: unknown) {
      console.error("Error fetching template:", error);
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to fetch template",
          code: "FETCH_TEMPLATE_ERROR",
          timestamp: new Date().toISOString(),
        },
      });
    }
  },
);

/**
 * @swagger
 * /api/v1/templates/{id}/generate:
 *   post:
 *     summary: Generate campaign from template
 *     description: Create a campaign configuration based on a template
 *     tags: [Campaign Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - organizationId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Nike Q2 Brand Monitoring"
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["#Nike", "#JustDoIt"]
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Nike", "athletic wear"]
 *               mentions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["@Nike", "@nikerunning"]
 *               organizationId:
 *                 type: string
 *                 example: "60d0fe4f5311236168a109cb"
 *     responses:
 *       200:
 *         description: Campaign configuration generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CreateCampaignRequest'
 */
router.post(
  "/:id/generate",
  authenticateToken,
  requireRole(["admin", "manager", "analyst"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, hashtags, keywords, mentions, organizationId } = req.body;

      if (!name || !organizationId) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Campaign name and organization ID are required",
            code: "MISSING_REQUIRED_FIELDS",
            timestamp: new Date().toISOString(),
          },
        });
      }

      const campaignConfig =
        await CampaignTemplatesService.generateCampaignFromTemplate(id, {
          name,
          hashtags,
          keywords,
          mentions,
          organizationId,
        });

      res.json({
        success: true,
        data: campaignConfig,
        message: "Campaign configuration generated from template",
      });
    } catch (error: unknown) {
      console.error("Error generating campaign from template:", error);

      if (error instanceof Error && error.message === "Template not found") {
        return res.status(404).json({
          success: false,
          error: {
            message: "Template not found",
            code: "TEMPLATE_NOT_FOUND",
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          message: "Failed to generate campaign from template",
          code: "GENERATE_CAMPAIGN_ERROR",
          timestamp: new Date().toISOString(),
        },
      });
    }
  },
);

/**
 * @swagger
 * /api/v1/templates/smart-suggestions:
 *   post:
 *     summary: Get smart campaign suggestions
 *     description: Get AI-powered suggestions for campaign setup based on user input
 *     tags: [Campaign Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               industry:
 *                 type: string
 *                 example: "technology"
 *               goal:
 *                 type: string
 *                 example: "product launch"
 *               budget:
 *                 type: string
 *                 example: "medium"
 *               duration:
 *                 type: number
 *                 example: 14
 *               brandName:
 *                 type: string
 *                 example: "TechCorp"
 *     responses:
 *       200:
 *         description: Smart suggestions generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     suggestedName:
 *                       type: string
 *                     suggestedHashtags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     suggestedKeywords:
 *                       type: array
 *                       items:
 *                         type: string
 *                     suggestedDuration:
 *                       type: number
 *                     reasoning:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.post(
  "/smart-suggestions",
  authenticateToken,
  requireRole(["admin", "manager", "analyst"]),
  async (req, res) => {
    try {
      const userInput = req.body;

      const suggestions =
        AICampaignAssistantService.generateSmartCampaignSuggestions(userInput);

      res.json({
        success: true,
        data: suggestions,
        message: "Smart campaign suggestions generated",
      });
    } catch (error: unknown) {
      console.error("Error generating smart suggestions:", error);
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to generate smart suggestions",
          code: "SMART_SUGGESTIONS_ERROR",
          timestamp: new Date().toISOString(),
        },
      });
    }
  },
);

export default router;
