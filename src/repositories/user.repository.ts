/**
 * User Repository Interface
 * Following Interface Segregation Principle
 */

import {
  CreateUserRequest,
  UpdateUserRequest,
  User,
  UserAuth,
} from "../types/user";
import { BaseRepository, QueryOptions } from "./base.repository";

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

  // Statistics
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
