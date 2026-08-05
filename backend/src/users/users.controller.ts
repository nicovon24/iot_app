import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AppSession, AuthService } from '../auth/auth.service';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseTbIdPipe, TB_ID_RE } from '../common/pipes/tb-id.pipe';
import { EntityRef } from '../types';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiSecurity('session-token')
@UseGuards(RolesGuard)
@Roles('SYSADMIN')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a Customer User',
    description: 'Creates a new ADMIN or READER user in ThingsBoard, scoped to one customer.',
  })
  @ApiResponse({ status: 201 })
  async create(@Body() dto: CreateUserDto): Promise<EntityRef> {
    return this.usersService.create(dto.email, dto.password, dto.role, dto.customerId);
  }

  @Get()
  @ApiOperation({
    summary: 'List Customer Users, sysadmin-only',
    description: 'Scoped to one customer if customerId is given; otherwise every Customer User across the whole tenant.',
  })
  @ApiQuery({ name: 'customerId', required: false })
  async list(@Query('customerId') customerId?: string): Promise<EntityRef[]> {
    if (!customerId) {
      return this.usersService.listAll();
    }
    if (!TB_ID_RE.test(customerId)) {
      throw new BadRequestException('Invalid entity id');
    }
    return this.usersService.listByCustomer(customerId);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a Customer User; the tenant admin account can never be deleted here' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: 'Cannot delete the tenant admin account' })
  async delete(@Param('id', ParseTbIdPipe) id: string): Promise<void> {
    await this.usersService.delete(id);
  }

  @Post(':id/impersonate')
  @HttpCode(201)
  @ApiOperation({ summary: 'Sysadmin "Login as" — mints a new session scoped to the target Customer User' })
  @ApiResponse({ status: 201 })
  async impersonate(
    @Param('id', ParseTbIdPipe) id: string,
    @CurrentSession() session: AppSession | null,
  ): Promise<{ sessionToken: string; logId: string }> {
    if (!session) {
      throw new ForbiddenException('No active session');
    }
    return this.authService.impersonate(session, id);
  }

  @Post('impersonate/:logId/end')
  @HttpCode(204)
  @ApiOperation({ summary: 'Marks an impersonation session as ended in the audit log' })
  @ApiResponse({ status: 204 })
  async endImpersonation(@Param('logId') logId: string): Promise<void> {
    await this.authService.endImpersonation(logId);
  }
}
