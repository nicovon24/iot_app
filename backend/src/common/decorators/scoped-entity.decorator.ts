import { SetMetadata } from '@nestjs/common';
import { EntityType } from '../../types';

export const SCOPED_ENTITY = 'scopedEntity';

/**
 * Declares the EntityType a `:id` route operates on, so CustomerScopeGuard can
 * scope it without a `?type=` query parameter. Controllers like assets/devices/
 * customers have a fixed entity type but never pass that query parameter, so
 * without this their `:id` routes fell through the guard entirely.
 *
 * Apply per-HANDLER, never to a whole controller: `POST /devices/:id/claim`
 * legitimately targets a Device with no owning Customer, and scoping it would
 * reject every claim with 403 before the handler ran.
 */
export const ScopedEntity = (type: EntityType) => SetMetadata(SCOPED_ENTITY, type);
