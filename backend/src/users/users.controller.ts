import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseTbIdPipe } from '../common/pipes/tb-id.pipe';
import { EntityRef } from '../types';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiSecurity('session-token')
@UseGuards(RolesGuard)
@Roles('SYSADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a ThingsBoard Customer User (ADMIN/READER), sysadmin-only' })
  @ApiResponse({ status: 201 })
  async create(@Body() dto: CreateUserDto): Promise<EntityRef> {
    return this.usersService.create(dto.email, dto.password, dto.role, dto.customerId);
  }

  @Get()
  @ApiOperation({ summary: 'List Customer Users for a given customer, sysadmin-only' })
  @ApiQuery({ name: 'customerId' })
  async list(@Query('customerId', ParseTbIdPipe) customerId: string): Promise<EntityRef[]> {
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
}
