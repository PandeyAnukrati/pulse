import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { OrganizationsService } from './organizations.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { Role } from '@aether/types';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateOrgDto) {
    return this.orgsService.createOrg(req.user.id, dto);
  }

  @Get()
  async list(@Req() req: any) {
    return this.orgsService.listUserOrgs(req.user.id);
  }

  @Post(':orgId/workspaces')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async createWorkspace(
    @Param('orgId') orgId: string,
    @Body() dto: CreateWorkspaceDto
  ) {
    return this.orgsService.createWorkspace(orgId, dto);
  }

  @Get(':orgId/workspaces')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async listWorkspaces(@Param('orgId') orgId: string) {
    return this.orgsService.listWorkspaces(orgId);
  }

  @Post(':orgId/members')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async inviteMember(
    @Param('orgId') orgId: string,
    @Body('email') email: string,
    @Body('role') role: Role
  ) {
    return this.orgsService.inviteMember(orgId, email, role);
  }

  @Get(':orgId/members')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async listMembers(@Param('orgId') orgId: string) {
    return this.orgsService.listMembers(orgId);
  }

  @Get('users-pool')
  async getUsersPool() {
    return this.orgsService.getUsersPool();
  }
}
