import { NextFunction, Request, Response } from "express";
import { ErrorCode, ValidationError } from "../../../core/errors";

export function validateUserIdParam(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { id } = req.params;
  if (!id || id.length !== 24) {
    return next(
      new ValidationError("Invalid user ID format", ErrorCode.INVALID_INPUT, {
        operation: "validate_user_id",
        additionalData: { providedId: id },
      }),
    );
  }
  next();
}

export function validateCreateUserBody(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { email, password, displayName, username } = req.body || {};
  if (!email || !password || !displayName || !username) {
    return next(
      new ValidationError("Missing required fields", ErrorCode.INVALID_INPUT, {
        operation: "validate_create_user_body",
        additionalData: { provided: Object.keys(req.body || {}) },
      }),
    );
  }
  next();
}

export function stripForbiddenProfileFields(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (req.body) {
    delete req.body.role;
    delete req.body.permissions;
    delete req.body.isActive;
    delete req.body.password;
  }
  next();
}

export function sanitizeUpdateBody(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (req.body && "password" in req.body) {
    delete req.body.password;
  }
  next();
}
