import { Response, NextFunction } from 'express';
import { ApiRes } from '../../utils/apiResponse.js';
import { AuthService } from './auth.service.js';
import { AuthenticatedRequest } from './auth.middleware.js';

export class AuthController {
  static async register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);
      return ApiRes.created(res, result, 'User registered successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async login(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.login(req.body);
      return ApiRes.success(res, result, 'Login successful');
    } catch (error) {
      return next(error);
    }
  }

  static async refresh(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tokens = await AuthService.refreshToken(req.body.refreshToken);
      return ApiRes.success(res, tokens, 'Tokens refreshed successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (req.userId) {
        await AuthService.logout(req.userId);
      }
      return ApiRes.success(res, null, 'Logged out successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async forgotPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.forgotPassword(req.body.email);
      return ApiRes.success(
        res,
        result,
        'If an account exists with this email, a reset token has been generated'
      );
    } catch (error) {
      return next(error);
    }
  }

  static async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await AuthService.resetPassword(req.body.token, req.body.password);
      return ApiRes.success(res, null, 'Password has been reset successfully. Please log in.');
    } catch (error) {
      return next(error);
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await AuthService.changePassword(req.userId!, req.body);
      return ApiRes.success(res, null, 'Password changed successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.getMe(req.userId!);
      return ApiRes.success(res, user, 'Profile retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }
}
