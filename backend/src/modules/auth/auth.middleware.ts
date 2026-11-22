import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { ApiRes } from '../../utils/apiResponse.js';
import { User, IUser } from './user.model.js';
import { TokenPayload } from './auth.service.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  userId?: string;
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiRes.unauthorized(res, 'Authentication token missing or malformed');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return ApiRes.unauthorized(res, 'User session invalid or deactivated');
    }

    req.user = user;
    req.userId = user._id.toString();
    return next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return ApiRes.unauthorized(res, 'Access token has expired');
    }
    return ApiRes.unauthorized(res, 'Invalid authentication token');
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return ApiRes.forbidden(res, 'You do not have permission to perform this action');
    }
    return next();
  };
};

// Rate limiter for authentication endpoints (prevent brute-force password guessing)
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per window
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
