import { Body, Controller, Get, HttpCode, Param, ParseEnumPipe, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AttributesPayload, EntityType, TbAttribute, TbAttributeScope } from '../types';
import { AttributesService } from './attributes.service';
import { ParseTbIdPipe } from '../common/pipes/tb-id.pipe';

const ENTITY_TYPES: EntityType[] = ['DEVICE', 'ASSET', 'CUSTOMER'];
const SCOPES: TbAttributeScope[] = ['CLIENT_SCOPE', 'SERVER_SCOPE', 'SHARED_SCOPE'];

@ApiTags('attributes')
@ApiSecurity('session-token')
@Controller('entities/:id/attributes')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Get()
  @ApiOperation({
    summary: 'Dynamic attribute read — returns whatever keys exist in the given scope, unfiltered unless "keys" is passed',
  })
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'type', enum: ENTITY_TYPES })
  @ApiQuery({ name: 'scope', enum: SCOPES })
  @ApiQuery({ name: 'keys', required: false, description: 'Comma-separated keys; omit for all keys in scope' })
  async getAttributes(
    @Param('id', ParseTbIdPipe) id: string,
    @Query('type', new ParseEnumPipe(ENTITY_TYPES)) type: EntityType,
    @Query('scope', new ParseEnumPipe(SCOPES)) scope: TbAttributeScope,
    @Query('keys') keys?: string,
  ): Promise<TbAttribute[]> {
    return this.attributesService.getAttributes(id, type, scope, keys ? keys.split(',') : undefined);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Create/update attributes (upsert)',
    description: 'Writes a free-form key/value map: creates keys that don\'t exist, overwrites keys that do. Other existing keys are left untouched.',
  })
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'type', enum: ENTITY_TYPES })
  @ApiQuery({ name: 'scope', enum: SCOPES })
  @ApiBody({
    description: 'Free-form key/value map to write — dynamic by design, no fixed schema',
    schema: { type: 'object', additionalProperties: true, example: { customLabel: 'Pump A' } },
  })
  @ApiResponse({ status: 200, description: 'Attributes written' })
  async setAttributes(
    @Param('id', ParseTbIdPipe) id: string,
    @Query('type', new ParseEnumPipe(ENTITY_TYPES)) type: EntityType,
    @Query('scope', new ParseEnumPipe(SCOPES)) scope: TbAttributeScope,
    @Body() values: AttributesPayload,
  ): Promise<{ written: true }> {
    await this.attributesService.setAttributes(id, type, scope, values);
    return { written: true };
  }
}
