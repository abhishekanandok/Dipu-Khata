import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { requireAuth, loginRateLimiter } from './auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.schema.js';

export const authRouter = Router();

// Public Authentication Endpoints
authRouter.post('/register', validate(registerSchema), AuthController.register);
authRouter.post('/login', loginRateLimiter, validate(loginSchema), AuthController.login);
authRouter.post('/refresh', validate(refreshTokenSchema), AuthController.refresh);
authRouter.post('/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);
authRouter.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);

// Protected Authentication Endpoints
authRouter.get('/me', requireAuth, AuthController.getMe);
authRouter.post('/logout', requireAuth, AuthController.logout);
authRouter.post('/change-password', requireAuth, validate(changePasswordSchema), AuthController.changePassword);
