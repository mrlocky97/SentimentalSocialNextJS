/**
 * User Service
 * Business logic for user operations following Single Responsibility Principle
 */

import { MongoCampaignRepository } from "../repositories/mongo-campaign.repository";
import { UserRepository } from "../repositories/user.repository";
import { PaginatedResponse, PaginationParams } from "../types/api";
import {
  CreateUserRequest,
  UpdateUserRequest,
  User,
  UserProfile,
} from "../types/user";

export class UserService {
  constructor(
    private userRepository: UserRepository,
    private campaignRepository: MongoCampaignRepository,
  ) {}

  /**
   * Create a new user
   * Follows Open/Closed Principle - extensible without modification
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    // Validation
    await this.validateUniqueEmail(userData.email);
    await this.validateUniqueUsername(userData.username);

    // Hash password (delegated to password service)
    const hashedPassword = await this.hashPassword(userData.password);

    // Create user
    const user = await this.userRepository.create({
      ...userData,
      password: hashedPassword,
    });

    return user;
  }

  /**
   * Get user profile with statistics
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) return null;

    // Get user's campaigns count
    const campaignsCount = await this.userRepository.getCampaignsCount(userId);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      role: user.role,
      permissions: user.permissions,
      organizationId: user.organizationId,
      campaignsCount,
      lastLoginAt: user.lastLoginAt,
    };
  }

  /**
   * Update user profile
   */
  async updateUser(
    userId: string,
    updateData: UpdateUserRequest,
  ): Promise<User | null> {
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new ApiError("USER_NOT_FOUND", "User not found");
    }

    return await this.userRepository.update(userId, updateData);
  }

  /**
   * Search users
   */
  async searchUsers(
    query: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<User>> {
    const users = await this.userRepository.searchUsers(query, {
      limit: pagination.limit,
      offset: (pagination.page - 1) * pagination.limit,
    });

    const total = await this.userRepository.count(); // You might want a more specific count method

    return this.formatPaginatedResponse(users, pagination, total);
  }

  /**
   * Get user campaigns (adapted for marketing platform)
   */
  async getUserCampaigns(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    try {
      // Convert page-based pagination to offset-based for repository
      const offset = (pagination.page - 1) * pagination.limit;

      // Find campaigns where user is either creator or assigned
      const campaigns = await this.campaignRepository.findByUserId(userId, {
        offset,
        limit: pagination.limit,
      });

      // Get total count for pagination
      const total = await this.campaignRepository.countByUserId(userId);

      // Convert documents to plain objects for API response
      const campaignData = campaigns.map((campaign) => ({
        id: campaign._id,
        name: campaign.name,
        description: campaign.description,
        status: campaign.status,
        type: campaign.type,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        hashtags: campaign.hashtags,
        keywords: campaign.keywords,
        mentions: campaign.mentions,
        dataSources: campaign.dataSources,
        createdBy: campaign.createdBy,
        assignedTo: campaign.assignedTo,
        organizationId: campaign.organizationId,
        stats: campaign.stats,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      }));

      return this.formatPaginatedResponse(campaignData, pagination, total);
    } catch (error) {
      console.error("Error getting user campaigns:", error);
      // Return empty result on error
      return this.formatPaginatedResponse([], pagination, 0);
    }
  }

  /**
   * Get users in organization (adapted for marketing platform)
   */
  async getOrganizationUsers(
    organizationId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<User>> {
    try {
      // Use existing findMany method with organizationId filter
      const users = await this.userRepository.findMany(
        { organizationId },
        {
          limit: pagination.limit,
          offset: (pagination.page - 1) * pagination.limit,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      );

      // Use existing count method with organizationId filter
      const total = await this.userRepository.count({ organizationId });

      return this.formatPaginatedResponse(users, pagination, total);
    } catch (error) {
      console.error("Error getting organization users:", error);
      // Return empty result on error
      return this.formatPaginatedResponse([], pagination, 0);
    }
  }

  // Private helper methods
  private async validateUniqueEmail(email: string): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ApiError("EMAIL_EXISTS", "Email already exists");
    }
  }

  private async validateUniqueUsername(username: string): Promise<void> {
    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new ApiError("USERNAME_EXISTS", "Username already exists");
    }
  }

  private async hashPassword(password: string): Promise<string> {
    // This would be implemented using bcrypt or similar
    // For now, returning the password as-is for example
    return password;
  }

  private formatPaginatedResponse<T>(
    items: T[],
    pagination: PaginationParams,
    total: number,
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      },
    };
  }
}

// Custom error class
class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
