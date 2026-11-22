import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export class ApiRes {
  static success<T>(
    res: Response,
    data?: T,
    message = 'Success',
    statusCode = 200,
    meta?: ApiResponse['meta']
  ): Response {
    const payload: ApiResponse<T> = {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
    return res.status(statusCode).json(payload);
  }

  static created<T>(res: Response, data?: T, message = 'Created successfully'): Response {
    return ApiRes.success(res, data, message, 201);
  }

  static error(
    res: Response,
    message = 'An unexpected error occurred',
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: unknown
  ): Response {
    const payload: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
    return res.status(statusCode).json(payload);
  }

  static badRequest(res: Response, message = 'Bad request', details?: unknown): Response {
    return ApiRes.error(res, message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(res: Response, message = 'Unauthorized'): Response {
    return ApiRes.error(res, message, 401, 'UNAUTHORIZED');
  }

  static forbidden(res: Response, message = 'Forbidden'): Response {
    return ApiRes.error(res, message, 403, 'FORBIDDEN');
  }

  static notFound(res: Response, message = 'Resource not found'): Response {
    return ApiRes.error(res, message, 404, 'NOT_FOUND');
  }

  static conflict(res: Response, message = 'Conflict detected'): Response {
    return ApiRes.error(res, message, 409, 'CONFLICT');
  }
}
