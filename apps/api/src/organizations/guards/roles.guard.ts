import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '@aether/types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are specified, allow access (protected by JWT guard only)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }

    // Attempt to extract organization id from params, query, or body
    const orgId = request.params.orgId || request.body.orgId || request.query.orgId;
    if (!orgId) {
      throw new ForbiddenException('Organization context (orgId) is missing.');
    }

    const member = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: orgId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this organization.');
    }

    // Owner role automatically bypasses administrative checks
    if (member.role === 'OWNER') {
      return true;
    }

    const hasRole = requiredRoles.includes(member.role as Role);
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions within this organization.');
    }

    return true;
  }
}
