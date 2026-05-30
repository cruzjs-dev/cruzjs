/**
 * AI Module
 *
 * Contains AI and LLM services.
 */

import { Module } from '../di';
import { AIService } from './ai.service';

@Module({
  providers: [AIService],
})
export class AIModule {}
