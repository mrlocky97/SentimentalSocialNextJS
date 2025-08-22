/**
 * User Repository Interface
 * Following Interface Segregation Principle
 */

import { BaseRepository, QueryOptions } from "./base.repository";
import {
  User,
  UserAuth,
  CreateUserRequest,
  UpdateUserRequest,
} from "../types/user";

export interface UserRepository
  extends BaseRepository<User, CreateUserRequest, UpdateUserRequest> {
  // Specific user methods
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmailOrUsername(identifier: string): Promise<User | null>;

  // Authentication related
  findAuthById(id: string): Promise<UserAuth | null>;
  findAuthByEmail(email: string): Promise<UserAuth | null>;
  updatePassword(id: string, passwordHash: string): Promise<boolean>;

  // Social features
  followUser(followerId: string, followingId: string): Promise<boolean>;
  unfollowUser(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string, options?: QueryOptions): Promise<User[]>;
  getFollowing(userId: string, options?: QueryOptions): Promise<User[]>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;

  // Statistics
  getFollowersCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  getPostsCount(userId: string): Promise<number>;
  getCampaignsCount(userId: string): Promise<number>;

  // Search
  searchUsers(query: string, options?: QueryOptions): Promise<User[]>;

  // Bulk operations
  findManyByIds(ids: string[]): Promise<User[]>;

  // Admin functions
  verifyUser(userId: string): Promise<boolean>;
  deactivateUser(userId: string): Promise<boolean>;
  activateUser(userId: string): Promise<boolean>;
}
