import { Module } from '../di';
import { EmailService } from './email.service';
import { EmailSendService } from '../shared/cloudflare';
import { EmailTemplateService } from './template.service';
import { EmailTemplateRegistry } from './email-template.registry';
import { EmailLogService } from './email-log.service';

@Module({
  providers: [
    EmailTemplateRegistry,
    EmailService,
    EmailSendService,
    EmailTemplateService,
    EmailLogService,
  ],
})
export class EmailModule {}
