/**
 * MongoDB User Repository Implementation
 * Real implementation of UserRepository using Mongoose
 */

import { UserRepository } from './user.repository';
import { QueryOptions } from './base.repository';
import { User, UserAuth, CreateUserRequest, UpdateUserRequest, UserRole, Permission } from '../types/user';
import UserModel, { IUserDocument } from '../models/User.model';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

export class MongoUserRepository implements UserRepository {
  
  async create(data: CreateUserRequest): Promise<User> {
    try {
      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 12);
      
      const userData = {
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        passwordHash,
      };

      const user = new UserModel(userData);
      const savedUser = await user.save();
      
      return this.documentToUser(savedUser);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        // Duplicate key error - MongoDB duplicate key error
        throw new Error('EMAIL_OR_USERNAME_EXISTS');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const user = await UserModel.findById(id);
      return user ? this.documentToUser(user) : null;
    } catch {
      return null;
    }
  }

  async findMany(filter?: Partial<User>, options?: QueryOptions): Promise<User[]> {
    const query = UserModel.find(filter || {});
    
    if (options?.limit) query.limit(options.limit);
    if (options?.offset) query.skip(options.offset);
    if (options?.sortBy && options?.sortOrder) {
      query.sort({ [options.sortBy]: options.sortOrder === 'asc' ? 1 : -1 });
    }
    
    const users = await query.exec();
    return users.map(user => this.documentToUser(user));
  }

  async update(id: string, data: UpdateUserRequest): Promise<User | null> {
    try {
      const user = await UserModel.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      );
      
      return user ? this.documentToUser(user) : null;
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await UserModel.findByIdAndDelete(id);
      return !!result;
    } catch {
      return false;
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const user = await UserModel.findById(id).select('_id');
      return !!user;
    } catch {
      return false;
    }
  }

  async count(filter?: Partial<User>): Promise<number> {
    try {
      return await UserModel.countDocuments(filter || {});
    } catch {
      return 0;
    }
  }

  // User-specific methods
  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await UserModel.findOne({ email: email.toLowerCase() });
      return user ? this.documentToUser(user) : null;
    } catch {
      return null;
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    try {
      const user = await UserModel.findOne({ username: username.toLowerCase() });
      return user ? this.documentToUser(user) : null;
    } catch {
      return null;
    }
  }

  async findByEmailOrUsername(identifier: string): Promise<User | null> {
    try {
      const user = await UserModel.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() }
        ]
      });
      return user ? this.documentToUser(user) : null;
    } catch {
      return null;
    }
  }

  // Authentication related
  async findAuthById(id: string): Promise<UserAuth | null> {
    try {
      const user = await UserModel.findById(id).select('+passwordHash');
      return user ? this.documentToUserAuth(user) : null;
    } catch {
      return null;
    }
  }

  async findAuthByEmail(email: string): Promise<UserAuth | null> {
    try {
      const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash');
      return user ? this.documentToUserAuth(user) : null;
    } catch {
      return null;
    }
  }

  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    try {
      const result = await UserModel.findByIdAndUpdate(id, { passwordHash });
      return !!result;
    } catch {
      return false;
    }
  }

  // Social features (placeholder implementations)
  async followUser(followerId: string, followingId: string): Promise<boolean> {
    // This would require a separate followers collection or embedded arrays
    // For now, just return true (implement based on your social features design)
    console.log(`User ${followerId} following ${followingId}`);
    return true;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    // Placeholder implementation
    console.log(`User ${followerId} unfollowing ${followingId}`);
    return true;
  }

  async getFollowers(userId: string, options?: QueryOptions): Promise<User[]> {
    // Placeholder - would need followers collection
    console.log(`Getting followers for ${userId}`, options);
    return [];
  }

  async getFollowing(userId: string, options?: QueryOptions): Promise<User[]> {
    // Placeholder - would need following collection  
    console.log(`Getting following for ${userId}`, options);
    return [];
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    // Placeholder implementation
    console.log(`Checking if ${followerId} follows ${followingId}`);
    return false;
  }

  // Statistics
  async getFollowersCount(userId: string): Promise<number> {
    try {
      const user = await UserModel.findById(userId).select('followersCount');
      return user?.followersCount || 0;
    } catch {
      return 0;
    }
  }

  async getFollowingCount(userId: string): Promise<number> {
    try {
      const user = await UserModel.findById(userId).select('followingCount');
      return user?.followingCount || 0;
    } catch {
      return 0;
    }
  }

  async getPostsCount(userId: string): Promise<number> {
    try {
      const user = await UserModel.findById(userId).select('postsCount');
      return user?.postsCount || 0;
    } catch {
      return 0;
    }
  }

  // Search
  async searchUsers(query: string, options?: QueryOptions): Promise<User[]> {
    try {
      const searchRegex = new RegExp(query, 'i');
      const mongoQuery = UserModel.find({
        $or: [
          { username: searchRegex },
          { displayName: searchRegex }
        ],
        isActive: true
      });

      if (options?.limit) mongoQuery.limit(options.limit);
      if (options?.offset) mongoQuery.skip(options.offset);

      const users = await mongoQuery.exec();
      return users.map(user => this.documentToUser(user));
    } catch {
      return [];
    }
  }

  // Bulk operations
  async findManyByIds(ids: string[]): Promise<User[]> {
    try {
      const users = await UserModel.find({ _id: { $in: ids } });
      return users.map(user => this.documentToUser(user));
    } catch {
      return [];
    }
  }

  // Admin functions
  async verifyUser(userId: string): Promise<boolean> {
    try {
      const result = await UserModel.findByIdAndUpdate(userId, { isVerified: true });
      return !!result;
    } catch {
      return false;
    }
  }

  async deactivateUser(userId: string): Promise<boolean> {
    try {
      const result = await UserModel.findByIdAndUpdate(userId, { isActive: false });
      return !!result;
    } catch {
      return false;
    }
  }

  async activateUser(userId: string): Promise<boolean> {
    try {
      const result = await UserModel.findByIdAndUpdate(userId, { isActive: true });
      return !!result;
    } catch {
      return false;
    }
  }

  // Helper methods to convert between MongoDB documents and domain objects
  private documentToUser(doc: IUserDocument): User {
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

  private documentToUserAuth(doc: IUserDocument): UserAuth {
    return {
      id: (doc._id as mongoose.Types.ObjectId).toString(),
      email: doc.email,
      passwordHash: doc.passwordHash,
      role: doc.role as UserRole,
      isActive: doc.isActive,
      organizationId: doc.organizationId,
    };
  }
}
