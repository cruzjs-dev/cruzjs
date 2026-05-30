/**
 * API Module
 *
 * Core module that provides the ApiRouterDispatcher service.
 * Loaded automatically by the framework as a core module.
 */

import { Module } from '../di';
import { ApiRouterDispatcher } from './api-router.dispatcher';

@Module({
  providers: [ApiRouterDispatcher],
})
export class ApiModule {}
