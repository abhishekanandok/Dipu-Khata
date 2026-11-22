import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser } from './user.model.js';
import { env } from '../../config/env.js';
import {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
} from './auth.schema.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly ACCESS_TOKEN_EXPIRY = '1d';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateTokens(user: IUser): AuthTokens {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    };
  }

  static async register(input: RegisterInput): Promise<{ user: IUser; tokens: AuthTokens }> {
    const existing = await User.findOne({ email: input.email });
    if (existing) {
      const error = new Error('A user with this email address already exists');
      (error as any).statusCode = 409;
      (error as any).code = 'EMAIL_ALREADY_EXISTS';
      throw error;
    }

    const passwordHash = await this.hashPassword(input.password);
    const user = new User({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role || 'admin',
    });

    const tokens = this.generateTokens(user);
    // Hash refresh token before saving in database
    user.refreshTokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await user.save();

    return { user, tokens };
  }

  static async login(input: LoginInput): Promise<{ user: IUser; tokens: AuthTokens }> {
    const user = await User.findOne({ email: input.email }).select('+passwordHash +refreshTokenHash');
    if (!user) {
      const error = new Error('Invalid email or password');
      (error as any).statusCode = 401;
      (error as any).code = 'INVALID_CREDENTIALS';
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('Your account has been deactivated. Please contact administrator.');
      (error as any).statusCode = 403;
      (error as any).code = 'ACCOUNT_INACTIVE';
      throw error;
    }

    const isMatch = await this.comparePassword(input.password, user.passwordHash);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      (error as any).statusCode = 401;
      (error as any).code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const tokens = this.generateTokens(user);
    user.refreshTokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await user.save();

    return { user, tokens };
  }

  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;
      const user = await User.findById(decoded.userId).select('+refreshTokenHash');

      if (!user || !user.isActive || !user.refreshTokenHash) {
        const error = new Error('Invalid refresh token or inactive user');
        (error as any).statusCode = 401;
        throw error;
      }

      // Verify token hash matches stored hash
      const providedHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      if (providedHash !== user.refreshTokenHash) {
        // Token was rotated or revoked
        const error = new Error('Refresh token has been revoked');
        (error as any).statusCode = 401;
        throw error;
      }

      // Rotate tokens
      const newTokens = this.generateTokens(user);
      user.refreshTokenHash = crypto.createHash('sha256').update(newTokens.refreshToken).digest('hex');
      await user.save();

      return newTokens;
    } catch {
      const error = new Error('Invalid or expired refresh token');
      (error as any).statusCode = 401;
      (error as any).code = 'TOKEN_EXPIRED';
      throw error;
    }
  }

  static async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
  }

  static async forgotPassword(email: string): Promise<{ resetToken: string }> {
    const user = await User.findOne({ email });
    if (!user) {
      // Do not reveal email existence to prevent user enumeration
      return { resetToken: 'token_dispatched_if_email_exists' };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    return { resetToken: rawToken };
  }

  static async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+passwordHash');

    if (!user) {
      const error = new Error('Invalid or expired password reset token');
      (error as any).statusCode = 400;
      (error as any).code = 'INVALID_RESET_TOKEN';
      throw error;
    }

    user.passwordHash = await this.hashPassword(newPassword);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.refreshTokenHash = null; // Invalidate all active sessions
    await user.save();
  }

  static async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }

    const isMatch = await this.comparePassword(input.currentPassword, user.passwordHash);
    if (!isMatch) {
      const error = new Error('Current password does not match');
      (error as any).statusCode = 400;
      (error as any).code = 'INVALID_CURRENT_PASSWORD';
      throw error;
    }

    user.passwordHash = await this.hashPassword(input.newPassword);
    user.refreshTokenHash = null; // Force re-login on other devices
    await user.save();
  }

  static async getMe(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }
    return user;
  }
}
