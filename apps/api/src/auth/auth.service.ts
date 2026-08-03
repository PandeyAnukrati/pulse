import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { User, AuthResponse } from '@aether/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    let user;
    const passwordHash = await argon2.hash(dto.password);

    if (existing) {
      if (existing.passwordHash === 'INVITED_PLACEHOLDER') {
        // Upgrade / Activate the placeholder invited user
        user = await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        });
      } else {
        throw new ConflictException('A user with this email address already exists.');
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      });
    }

    // Auto-create a default organization for the user
    const userSlug = dto.firstName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'org';
    await this.prisma.organization.create({
      data: {
        name: `${dto.firstName}'s Org`,
        slug: `${userSlug}-${crypto.randomBytes(3).toString('hex')}`,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
        workspaces: {
          create: {
            name: 'Default Board',
          },
        },
      },
    });

    const accessToken = await this.generateAccessToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      accessToken,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse & { refreshToken: string; expiresAt: Date }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const accessToken = await this.generateAccessToken(user.id, user.email);
    const { token: refreshToken, expiresAt } = await this.createSession(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  async refresh(token: string): Promise<{ user: User; accessToken: string; refreshToken: string; expiresAt: Date }> {
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      if (session) {
        // Revoke immediately if expired but not marked
        await this.prisma.session.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });
      }
      throw new UnauthorizedException('Invalid or expired session.');
    }

    // Revoke old session and roll a new one
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const newAccessToken = await this.generateAccessToken(session.user.id, session.user.email);
    const { token: newRefreshToken, expiresAt } = await this.createSession(session.user.id);

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        createdAt: session.user.createdAt.toISOString(),
        updatedAt: session.user.updatedAt.toISOString(),
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt,
    };
  }

  async logout(token: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  private async generateAccessToken(userId: string, email: string): Promise<string> {
    return this.jwtService.signAsync({ sub: userId, email });
  }

  private async createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 Days session life

    await this.prisma.session.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  async validateUserById(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
