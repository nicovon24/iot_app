import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AppSession } from '../auth/auth.service';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { ParseTbIdPipe } from '../common/pipes/tb-id.pipe';
import { DashboardsService } from './dashboards.service';
import { SaveDashboardDto } from './dto/save-dashboard.dto';

function requireSession(session: AppSession | null): AppSession {
  if (!session) throw new UnauthorizedException();
  return session;
}

@ApiTags('dashboards')
@ApiSecurity('session-token')
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get()
  @ApiOperation({ summary: 'List dashboards visible to the caller (own PRIVATE + SHARED in scope)' })
  async list(@CurrentSession() session: AppSession | null) {
    return this.dashboardsService.list(requireSession(session));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a dashboard with its widgets' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 403, description: 'Dashboard is outside your customer hierarchy / not yours' })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  async getById(@Param('id', ParseTbIdPipe) id: string, @CurrentSession() session: AppSession | null) {
    return this.dashboardsService.getById(id, requireSession(session));
  }

  @Post()
  @ApiOperation({
    summary: 'Create a dashboard with its full widget list',
    description:
      'customerScope "ALL" is sysadmin-only. A non-sysadmin caller\'s customerIds are always forced to their own customer.',
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400, description: 'A widget config failed validation against its widgetType schema' })
  @ApiResponse({ status: 403, description: 'Non-sysadmin attempted customerScope ALL' })
  async create(@Body() dto: SaveDashboardDto, @CurrentSession() session: AppSession | null) {
    return this.dashboardsService.create(dto, requireSession(session));
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Whole-dashboard save — replaces title/scope/widgets atomically',
    description: 'Only the creator or a sysadmin may save. Sends the full widget list, not a delta.',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 400, description: 'A widget config failed validation — no partial write occurs' })
  @ApiResponse({ status: 403, description: 'Caller is not the creator or a sysadmin' })
  async save(
    @Param('id', ParseTbIdPipe) id: string,
    @Body() dto: SaveDashboardDto,
    @CurrentSession() session: AppSession | null,
  ) {
    return this.dashboardsService.save(id, dto, requireSession(session));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a dashboard — only the creator or a sysadmin' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: 'Caller is not the creator or a sysadmin' })
  async delete(@Param('id', ParseTbIdPipe) id: string, @CurrentSession() session: AppSession | null): Promise<void> {
    await this.dashboardsService.delete(id, requireSession(session));
  }
}
