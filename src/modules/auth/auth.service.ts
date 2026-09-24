import { AppError } from '../../common/utils/AppError';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type TokenPayload,
} from '../../common/utils/jwt';
import { compare_password, hash_password } from '../../common/utils/password';
import type { Database } from '../../db/prisma';
import type {  ZCTLogin, ZCTRegister } from './auth.schema';

interface ClientMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export class AuthService {
  constructor(private readonly database: Database) {}

  private get prisma() {
    return this.database.client;
  }

  private calculateExpiryDate(days = 7): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    avatarUrl: string | null;
    phone: string | null;
    role?: { name: string } | string | null;
    status: string;
    emailVerified: Date | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    let roleName = 'CUSTOMER';
    if (typeof user.role === 'string') {
      roleName = user.role;
    } else if (user.role && typeof user.role === 'object') {
      roleName = user.role.name;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      role: roleName,
      status: user.status,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async register(input: ZCTRegister, metadata?: ClientMetadata) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    if (input.username) {
      const existingUsername = await this.prisma.user.findUnique({
        where: { username: input.username },
      });
      if (existingUsername) {
        throw new AppError('Username is already taken', 409);
      }
    }

    // Default role for new users is CUSTOMER
    const defaultRole = await this.prisma.role.findUnique({
      where: { name: 'CUSTOMER' },
    });

    if (!defaultRole) {
      throw new AppError(
        'Default CUSTOMER role not found. Please run database seed.',
        500,
      );
    }

    const hashedPassword = await hash_password(input.password);

    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        phone: input.phone,
        roleId: defaultRole.id,
      },
      include: {
        role: true,
      },
    });

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        sessionToken: refreshToken,
        expiresAt: this.calculateExpiryDate(7),
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async login(input: ZCTLogin, metadata?: ClientMetadata) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        role: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await compare_password(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Your account is not active. Please contact support.', 403);
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        sessionToken: refreshToken,
        expiresAt: this.calculateExpiryDate(7),
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async handleOAuthLogin(userId: string, metadata?: ClientMetadata) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        sessionToken: refreshToken,
        expiresAt: this.calculateExpiryDate(7),
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshTokenStr: string, metadata?: ClientMetadata) {
    let payload: TokenPayload;
    try {
      payload = verifyRefreshToken(refreshTokenStr);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const session = await this.prisma.authSession.findUnique({
      where: { sessionToken: refreshTokenStr },
      include: {
        user: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new AppError('Session has expired or was revoked. Please log in again.', 401);
    }

    // Invalidate old refresh token session
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    // Create rotated tokens
    const newPayload: TokenPayload = {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role.name,
    };

    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    await this.prisma.authSession.create({
      data: {
        userId: session.user.id,
        sessionToken: newRefreshToken,
        expiresAt: this.calculateExpiryDate(7),
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    });

    return {
      user: this.sanitizeUser(session.user),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshTokenStr?: string) {
    if (refreshTokenStr) {
      await this.prisma.authSession.updateMany({
        where: { sessionToken: refreshTokenStr },
        data: { isRevoked: true },
      });
    }
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return this.sanitizeUser(user);
  }

  async generateTokenForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Your account is not active', 403);
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
      tokenType: 'Bearer' as const,
    };
  }
}
