import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { EntitiesService } from '../entities/entities.service';
import { EntityRef, TbPageData } from '../types';
import { ParseTbIdPipe } from '../common/pipes/tb-id.pipe';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { AppSession } from '../auth/auth.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('customers')
@ApiSecurity('session-token')
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly entitiesService: EntitiesService,
    private readonly customersService: CustomersService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List customers, scoped to caller's customer hierarchy" })
  async list(
    @Query() pagination: PaginationQueryDto,
    @CurrentSession() session: AppSession | null,
  ): Promise<TbPageData<EntityRef>> {
    return this.entitiesService.list('CUSTOMER', session, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by id' })
  @ApiParam({ name: 'id' })
  async getById(@Param('id', ParseTbIdPipe) id: string): Promise<EntityRef> {
    return this.entitiesService.getById(id, 'CUSTOMER');
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SYSADMIN')
  @ApiOperation({
    summary: 'Create a Customer + hierarchy, sysadmin-only',
    description:
      'Creates a new Customer in ThingsBoard along with its ordered hierarchy levels (e.g. Site → Area → Asset → Sensor). ' +
      'The hierarchy is immutable — there is no endpoint to change it after creation. Pass parentCustomerId to create it as a sub-customer.',
  })
  @ApiResponse({ status: 201, description: 'Customer created with its hierarchy levels' })
  @ApiResponse({ status: 400, description: 'hierarchyLevels must be non-empty' })
  @ApiResponse({ status: 403, description: 'Caller is not sysadmin' })
  async create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get(':id/hierarchy')
  @ApiOperation({ summary: "Get a Customer's hierarchy levels, ordered by levelIndex ascending" })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Hierarchy levels in order' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getHierarchy(@Param('id', ParseTbIdPipe) id: string) {
    return this.customersService.getHierarchy(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SYSADMIN')
  @ApiOperation({ summary: "Update a Client's title, sysadmin-only" })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 403, description: 'Caller is not sysadmin' })
  async update(@Param('id', ParseTbIdPipe) id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(RolesGuard)
  @Roles('SYSADMIN')
  @ApiOperation({
    summary: 'Delete a Client (Customer) + its hierarchy, sysadmin-only',
    description: 'Blocked if any Asset is still tracked under this Customer — delete those first.',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: 'Customer still has Assets assigned to its hierarchy' })
  @ApiResponse({ status: 403, description: 'Caller is not sysadmin' })
  async delete(@Param('id', ParseTbIdPipe) id: string): Promise<void> {
    await this.customersService.delete(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Direct level-0 Assets attached to this Customer via real TB Contains relations' })
  @ApiParam({ name: 'id' })
  async getChildren(@Param('id', ParseTbIdPipe) id: string): Promise<{ assets: EntityRef[]; devices: EntityRef[] }> {
    return this.entitiesService.getRelationChildren(id, 'CUSTOMER');
  }
}
