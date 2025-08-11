/**
 * User Service
 * Business logic for user operations following Single Responsibility Principle
 */

import { UserRepository } from '../repositories/user.repository';
import { User, CreateUserRequest, UpdateUserRequest, UserProfile } from '../types/user';
import { PaginatedResponse, PaginationParams } from '../types/api';

export class UserService {
  constructor(private userRepository: UserRepository) {}

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

    // TODO: Implement getCampaignsCount in UserRepository
    const campaignsCount = 0; // await this.userRepository.getCampaignsCount(userId);

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
  async updateUser(userId: string, updateData: UpdateUserRequest): Promise<User | null> {
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new ApiError('USER_NOT_FOUND', 'User not found');
    }

    return await this.userRepository.update(userId, updateData);
  }

  /**
   * Follow a user - TODO: Remove or adapt for marketing platform
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async followUser(_followerId: string, _followingId: string): Promise<boolean> {
    // This functionality might not be needed for marketing analytics platform
    throw new ApiError(
      'NOT_IMPLEMENTED',
      'Follow functionality not implemented for marketing platform'
    );
  }

  /**
   * Unfollow a user - TODO: Remove or adapt for marketing platform
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async unfollowUser(_followerId: string, _followingId: string): Promise<boolean> {
    // This functionality might not be needed for marketing analytics platform
    throw new ApiError(
      'NOT_IMPLEMENTED',
      'Unfollow functionality not implemented for marketing platform'
    );
  }

  /**
   * Search users
   */
  async searchUsers(query: string, pagination: PaginationParams): Promise<PaginatedResponse<User>> {
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
    pagination: PaginationParams
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    // TODO: Implement getUserCampaigns to return user's marketing campaigns
    const campaigns: Record<string, unknown>[] = []; // await this.campaignRepository.findByUserId(userId, pagination);
    const total = 0; // await this.campaignRepository.countByUserId(userId);

    return this.formatPaginatedResponse(campaigns, pagination, total);
  }

  /**
   * Get users in organization (adapted for marketing platform)
   */
  async getOrganizationUsers(
    organizationId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<User>> {
    // TODO: Implement organization-based user listing
    const users: User[] = []; // await this.userRepository.findByOrganization(organizationId, pagination);
    const total = 0; // await this.userRepository.countByOrganization(organizationId);

    return this.formatPaginatedResponse(users, pagination, total);
  }

  // Private helper methods
  private async validateUniqueEmail(email: string): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ApiError('EMAIL_EXISTS', 'Email already exists');
    }
  }

  private async validateUniqueUsername(username: string): Promise<void> {
    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new ApiError('USERNAME_EXISTS', 'Username already exists');
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
    total: number
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
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
