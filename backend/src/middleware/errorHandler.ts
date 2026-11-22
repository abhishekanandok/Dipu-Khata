import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiRes } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (
  err: Error,
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

  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message || 'Internal Server Error';

  return ApiRes.error(res, message, 500, 'INTERNAL_SERVER_ERROR');
};

export const notFoundHandler = (req: Request, res: Response) => {
  return ApiRes.notFound(res, `Route not found: ${req.method} ${req.originalUrl}`);
};
