import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { EntitiesService } from '../entities/entities.service';
import { EntityRef, TbPageData } from '../types';
import { ParseTbIdPipe } from '../common/pipes/tb-id.pipe';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { AppSession } from '../auth/auth.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('customers')
@ApiSecurity('session-token')
@Controller('customers')
export class CustomersController {
  constructor(private readonly entitiesService: EntitiesService) {}

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
}
