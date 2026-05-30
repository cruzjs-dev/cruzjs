/**
 * i18n Module
 *
 * Provides the I18nService and I18nFormatter for dependency injection.
 */

import { Module } from '../di';
import { I18nService } from './i18n.service';
import { I18nFormatter } from './i18n.formatter';

@Module({
  providers: [I18nService, I18nFormatter],
})
export class I18nModule {}
