/**
 * Resource Module
 *
 * Registers the ResourceTransformer service into the DI container.
 */

import { Module } from '../di';
import { ResourceTransformer } from './resource.transformer';

@Module({
  providers: [ResourceTransformer],
})
export class ResourceModule {}
