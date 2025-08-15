import { Request, Response } from "express";
import {
  asyncHandler,
  BusinessLogicError,
  ErrorCode,
  NotFoundError,
  ResponseHelper,
  ValidationError,
} from "../../../core/errors";
import { Order } from "../../../enums/api.enum";
import { MongoUserRepository } from "../../../repositories/mongo-user.repository";
import {
  CreateUserRequest,
  Permission,
  UpdateUserRequest,
  User,
  UserRole,
} from "../../../types/user";

const userRepository = new MongoUserRepository();

interface AuthenticatedRequest extends Request {
  user?: { id: string; role?: UserRole; permissions?: Permission[] };
}

interface ListUsersQuery {
  page?: string | number;
  limit?: string | number;
  role?: string;
  organizationId?: string;
  isActive?: string;
}

interface IdParam {
  id: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const getUsers = asyncHandler(
  async (
    req: AuthenticatedRequest & { query: ListUsersQuery },
    res: Response,
  ) => {
    const { page = 1, limit = 20, role, organizationId, isActive } = req.query;
    const filter: Partial<User> = {};
    if (role) filter.role = role as UserRole;
    if (organizationId) filter.organizationId = organizationId;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const pageNum =
      typeof page === "string" ? parseInt(page, 10) : Number(page);
    const limitNum =
      typeof limit === "string" ? parseInt(limit, 10) : Number(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new ValidationError(
        "Invalid page number",
        ErrorCode.INVALID_INPUT,
        { operation: "user_pagination", additionalData: { page } },
      );
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new ValidationError(
        "Invalid limit value",
        ErrorCode.INVALID_INPUT,
        { operation: "user_pagination", additionalData: { limit } },
      );
    }

    const offset = (pageNum - 1) * limitNum;
    const users = await userRepository.findMany(filter, {
      offset,
      limit: limitNum,
      sortBy: "createdAt",
      sortOrder: Order.DESC,
    });
    const total = await userRepository.count(filter);
    const totalPages = Math.ceil(total / limitNum);
    const pagination: PaginationMeta = {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
    };
    ResponseHelper.success(res, { users, pagination });
  },
);

export const createUser = asyncHandler(
  async (
    req: AuthenticatedRequest & { body: CreateUserRequest },
    res: Response,
  ) => {
    const userData = req.body;
    if (
      !userData.email ||
      !userData.password ||
      !userData.displayName ||
      !userData.username
    ) {
      throw new ValidationError(
        "Missing required fields",
        ErrorCode.INVALID_INPUT,
        {
          operation: "create_user",
          additionalData: {
            required: ["email", "password", "displayName", "username"],
            provided: Object.keys(req.body),
          },
        },
      );
    }
    try {
      const newUser = await userRepository.create(userData);
      ResponseHelper.created(res, newUser, "User created successfully");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "EMAIL_OR_USERNAME_EXISTS"
      ) {
        throw new BusinessLogicError(
          "Email or username already exists",
          ErrorCode.BUSINESS_RULE_VIOLATION,
          {
            operation: "create_user",
            additionalData: {
              email: userData.email,
              username: userData.username,
            },
          },
        );
      }
      throw error;
    }
  },
);

export const getProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ValidationError(
        "Missing auth context",
        ErrorCode.INVALID_INPUT,
        { operation: "get_user_profile" },
      );
    }
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found", ErrorCode.USER_NOT_FOUND, {
        operation: "get_user_profile",
        additionalData: { userId },
      });
    }
    ResponseHelper.success(
      res,
      { user },
      "User profile retrieved successfully",
    );
  },
);

export const updateProfile = asyncHandler(
  async (
    req: AuthenticatedRequest & { body: Partial<UpdateUserRequest> },
    res: Response,
  ) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ValidationError(
        "Missing auth context",
        ErrorCode.INVALID_INPUT,
        { operation: "update_user_profile" },
      );
    }
    const { ...profileData } = req.body; // filtered out
    const updatedUser = await userRepository.update(userId, profileData);
    if (!updatedUser) {
      throw new NotFoundError("User not found", ErrorCode.USER_NOT_FOUND, {
        operation: "update_user_profile",
        additionalData: { userId },
      });
    }
    ResponseHelper.success(
      res,
      { user: updatedUser },
      "User profile updated successfully",
    );
  },
);

export const getUserById = asyncHandler(
  async (req: AuthenticatedRequest & { params: IdParam }, res: Response) => {
    const { id } = req.params;
    if (!id || id.length !== 24) {
      throw new ValidationError(
        "Invalid user ID format",
        ErrorCode.INVALID_INPUT,
        { operation: "get_user_by_id", additionalData: { providedId: id } },
      );
    }
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError("User not found", ErrorCode.USER_NOT_FOUND, {
        operation: "get_user_by_id",
        additionalData: { userId: id },
      });
    }
    ResponseHelper.success(res, user);
  },
);

export const updateUser = asyncHandler(
  async (
    req: AuthenticatedRequest & { params: IdParam; body: UpdateUserRequest },
    res: Response,
  ) => {
    const { id } = req.params;
    const updateData: Partial<UpdateUserRequest> = { ...req.body };
    if (!id || id.length !== 24) {
      throw new ValidationError(
        "Invalid user ID format",
        ErrorCode.INVALID_INPUT,
        { operation: "update_user", additionalData: { providedId: id } },
      );
    }
    if ("password" in updateData) {
      delete (updateData as { password?: unknown }).password;
    }
    try {
      const updatedUser = await userRepository.update(
        id,
        updateData as UpdateUserRequest,
      );
      if (!updatedUser) {
        throw new NotFoundError("User not found", ErrorCode.USER_NOT_FOUND, {
          operation: "update_user",
          additionalData: { userId: id },
        });
      }
      ResponseHelper.success(res, updatedUser, "User updated successfully");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "EMAIL_OR_USERNAME_EXISTS"
      ) {
        throw new BusinessLogicError(
          "Email or username already exists",
          ErrorCode.BUSINESS_RULE_VIOLATION,
          {
            operation: "update_user",
            additionalData: { userId: id, updateData },
          },
        );
      }
      throw error;
    }
  },
);

export const deleteUser = asyncHandler(
  async (req: AuthenticatedRequest & { params: IdParam }, res: Response) => {
    const { id } = req.params;
    if (!id || id.length !== 24) {
      throw new ValidationError(
        "Invalid user ID format",
        ErrorCode.INVALID_INPUT,
        { operation: "delete_user", additionalData: { providedId: id } },
      );
    }
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError("User not found", ErrorCode.USER_NOT_FOUND, {
        operation: "delete_user",
        additionalData: { userId: id },
      });
    }
    const deactivatedUser = await userRepository.update(id, {
      isActive: false,
    });
    if (!deactivatedUser) {
      throw new BusinessLogicError(
        "Failed to deactivate user",
        ErrorCode.BUSINESS_RULE_VIOLATION,
        {
          operation: "delete_user",
          additionalData: { userId: id, reason: "deactivation_failed" },
        },
      );
    }
    ResponseHelper.success(
      res,
      { id, isActive: false },
      "User deactivated successfully",
    );
  },
);
