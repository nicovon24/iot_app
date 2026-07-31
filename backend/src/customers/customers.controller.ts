import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { EntitiesService } from '../entities/entities.service';
import { EntityRef } from '../types';
import { ParseTbIdPipe } from '../common/pipes/tb-id.pipe';

@ApiTags('customers')
@ApiSecurity('session-token')
@Controller('customers')
export class CustomersController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List customers' })
  async list(): Promise<EntityRef[]> {
    return this.entitiesService.list('CUSTOMER');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by id' })
  @ApiParam({ name: 'id' })
  async getById(@Param('id', ParseTbIdPipe) id: string): Promise<EntityRef> {
    return this.entitiesService.getById(id, 'CUSTOMER');
  }
}
