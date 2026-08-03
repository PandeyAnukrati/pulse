import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { Organization, Workspace, OrganizationMember, Role } from '@aether/types';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrg(userId: string, dto: CreateOrgDto): Promise<Organization> {
    const existing = await this.prisma.organization.findFirst({
      where: {
        OR: [
          { slug: dto.slug },
          { name: dto.name },
        ],
      },
    });

    if (existing) {
      throw new ConflictException('An organization with this name or slug already exists.');
    }

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
        workspaces: {
          create: {
            name: 'General',
          },
        },
      },
    });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }

  async listUserOrgs(userId: string): Promise<(Organization & { role: Role })[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
    });

    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      createdAt: m.organization.createdAt.toISOString(),
      updatedAt: m.organization.updatedAt.toISOString(),
      role: m.role as Role,
    }));
  }

  async createWorkspace(orgId: string, dto: CreateWorkspaceDto): Promise<Workspace> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Organization not found.');
    }

    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name,
        organizationId: orgId,
      },
    });

    return {
      id: workspace.id,
      name: workspace.name,
      organizationId: workspace.organizationId,
      canvasData: workspace.canvasData || undefined,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    };
  }

  async listWorkspaces(orgId: string): Promise<Workspace[]> {
    const list = await this.prisma.workspace.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'asc' },
    });

    return list.map((w) => ({
      id: w.id,
      name: w.name,
      organizationId: w.organizationId,
      canvasData: w.canvasData || undefined,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    }));
  }

  async inviteMember(orgId: string, email: string, role: Role): Promise<OrganizationMember> {
    let user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash: 'INVITED_PLACEHOLDER',
          firstName: 'Invited',
          lastName: 'User',
        },
      });
    }

    const existing = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: orgId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this organization.');
    }

    const member = await this.prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        role: role,
      },
      include: {
        user: true,
      },
    });

    return {
      id: member.id,
      userId: member.userId,
      role: member.role as Role,
      organizationId: member.organizationId,
      createdAt: member.createdAt.toISOString(),
      user: {
        id: member.user.id,
        email: member.user.email,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        createdAt: member.user.createdAt.toISOString(),
        updatedAt: member.user.updatedAt.toISOString(),
      },
    };
  }

  async listMembers(orgId: string): Promise<OrganizationMember[]> {
    const list = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: true },
    });

    return list.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role as Role,
      organizationId: m.organizationId,
      createdAt: m.createdAt.toISOString(),
      user: {
        id: m.user.id,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        createdAt: m.user.createdAt.toISOString(),
        updatedAt: m.user.updatedAt.toISOString(),
      },
    }));
  }

  async getUsersPool(): Promise<any[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
  }
}
