/**
 * HTTP Client Module
 *
 * Registers the HttpClient service for dependency injection.
 */

import { Module } from '../di';
import { HttpClient } from './http-client.service';

@Module({
  providers: [
    { provide: HttpClient, useFactory: () => new HttpClient() },
  ],
})
export class HttpClientModule {}
