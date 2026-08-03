import { Controller, Post, Body, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponse } from '@aether/types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshTokenCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie('aether_refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/api/auth', // scoped to auth endpoints for security
    });
  }

  private clearRefreshTokenCookie(res: Response) {
    res.clearCookie('aether_refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
    });
  }

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponse> {
    const result = await this.authService.login(dto);
    this.setRefreshTokenCookie(res, result.refreshToken, result.expiresAt);
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponse> {
    const token = req.cookies['aether_refresh_token'];
    if (!token) {
      throw new UnauthorizedException('No refresh token provided.');
    }

    try {
      const result = await this.authService.refresh(token);
      this.setRefreshTokenCookie(res, result.refreshToken, result.expiresAt);
      return {
        user: result.user,
        accessToken: result.accessToken,
      };
    } catch (e) {
      this.clearRefreshTokenCookie(res);
      throw e;
    }
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ success: boolean }> {
    const token = req.cookies['aether_refresh_token'];
    if (token) {
      await this.authService.logout(token);
    }
    this.clearRefreshTokenCookie(res);
    return { success: true };
  }
}
