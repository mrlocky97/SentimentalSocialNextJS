import { NextFunction, Request, Response } from 'express';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Custom error class for business logic errors
 */
export class BusinessLogicError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 422, details);
    this.name = 'BusinessLogicError';
  }
}

/**
 * Custom error class for resource not found errors
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Sentiment Analysis specific error handlers
 */
export class SentimentAnalysisError {
  /**
   * Handle tweet validation errors
   */
  static invalidTweet(details?: any): ValidationError {
    return new ValidationError('Tweet object with content is required', {
      expected: {
        tweet: {
          tweetId: 'string',
          content: 'string (required)',
          author: { username: 'string', verified: 'boolean', followersCount: 'number' },
          metrics: { likes: 'number', retweets: 'number', replies: 'number' },
        },
      },
      ...details,
    });
  }

  /**
   * Handle text validation errors
   */
  static invalidText(details?: any): ValidationError {
    return new ValidationError('Text string is required', {
      example: { text: "I love this product! It's amazing and works perfectly." },
      ...details,
    });
  }

  /**
   * Handle batch processing errors
   */
  static invalidBatch(receivedCount?: number): ValidationError {
    const message =
      receivedCount && receivedCount > 100
        ? `Maximum 100 tweets allowed per batch request. Received: ${receivedCount}`
        : 'Array of tweets is required';

    return new ValidationError(message, {
      maxItems: 100,
      receivedCount,
      example: {
        tweets: [
          { tweetId: '1', content: 'I love this product!', author: { username: 'user1' } },
          {
            tweetId: '2',
            content: 'Not satisfied with the service',
            author: { username: 'user2' },
          },
        ],
      },
    });
  }

  /**
   * Handle model training errors
   */
  static invalidTrainingData(details?: any): ValidationError {
    return new ValidationError('Array of training examples is required', {
      example: {
        examples: [
          { text: 'I love this product!', label: 'positive' },
          { text: 'This is terrible service', label: 'negative' },
          { text: 'The package arrived yesterday', label: 'neutral' },
        ],
      },
      ...details,
    });
  }

  /**
   * Handle invalid training examples
   */
  static noValidTrainingExamples(): ValidationError {
    return new ValidationError('No valid training examples provided', {
      requirements: {
        text: 'Must be a non-empty string',
        label: 'Must be one of: positive, negative, neutral',
      },
    });
  }

  /**
   * Handle analysis array validation errors
   */
  static invalidAnalysisArray(): ValidationError {
    return new ValidationError('Array of sentiment analyses is required');
  }

  /**
   * Handle model processing errors
   */
  static modelProcessingError(operation: string, error: Error): BusinessLogicError {
    return new BusinessLogicError(`Failed to ${operation}`, {
      operation,
      originalError: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle sentiment method errors
   */
  static invalidSentimentMethod(method: string): ValidationError {
    return new ValidationError(`Invalid sentiment analysis method: ${method}`, {
      validMethods: ['rule', 'naive'],
      received: method,
    });
  }
}

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Success response helper
 */
export const successResponse = (
  res: Response,
  data: any,
  message: string,
  statusCode: number = 200
) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Error response helper
 */
export const errorResponse = (res: Response, error: ApiError | Error, statusCode?: number) => {
  const status = statusCode || (error instanceof ApiError ? error.statusCode : 500);

  const response: any = {
    success: false,
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString(),
  };

  // Add details if it's an ApiError
  if (error instanceof ApiError && error.details) {
    response.details = error.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  console.error(`❌ ${error.name || 'Error'}:`, error.message);
  if (error.stack) {
    console.error(error.stack);
  }

  return res.status(status).json(response);
};

/**
 * Global error handling middleware for Express applications
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle known ApiError instances
  if (err instanceof ApiError) {
    return errorResponse(res, err);
  }

  // Handle MongoDB/Mongoose errors
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    const mongoError = new ApiError('Database operation failed', 500, {
      type: 'DatabaseError',
      code: err.code,
    });
    return errorResponse(res, mongoError);
  }

  // Handle validation errors from express-validator or similar
  if (err.name === 'ValidationError' && err.errors) {
    const validationError = new ValidationError('Validation failed', {
      fields: err.errors,
    });
    return errorResponse(res, validationError);
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    const parseError = new ValidationError('Invalid JSON format in request body');
    return errorResponse(res, parseError);
  }

  // Handle unknown errors
  const unknownError = new ApiError(
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message || 'Internal server error',
    500,
    process.env.NODE_ENV === 'development' ? { originalError: err } : undefined
  );

  return errorResponse(res, unknownError);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const notFoundError = new NotFoundError(`Route ${req.originalUrl}`);
  return errorResponse(res, notFoundError, 404);
};
