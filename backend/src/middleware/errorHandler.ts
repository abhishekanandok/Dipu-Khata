import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiRes } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export class AppError extends Error {
  statusCode: number;
  code?: string;
  constructor(message: string, statusCode = 400, code?: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const errorHandler = (
  err: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('Unhandled Exception Caught:', err);

  if (err instanceof ZodError) {
    return ApiRes.badRequest(res, 'Validation error', err.errors);
  }

  if (err.name === 'ValidationError') {
    return ApiRes.badRequest(res, err.message);
  }

  if (err.name === 'CastError') {
    return ApiRes.badRequest(res, 'Invalid ID format provided');
  }

  // Handle custom application errors with statusCode
  if (err.statusCode && err.statusCode < 500) {
    return ApiRes.error(
      res,
      err.message,
      err.statusCode,
      err.code || 'CLIENT_ERROR',
      err.details
    );
  }

  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  return ApiRes.error(res, message, 500, err.code || 'INTERNAL_SERVER_ERROR');
};

export const notFoundHandler = (req: Request, res: Response) => {
  return ApiRes.notFound(res, `Route not found: ${req.method} ${req.originalUrl}`);
};
