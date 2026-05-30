import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc/context';
import { EmailTemplateService } from './template.service';
import type { EmailTemplate, EmailTemplateData } from './template.service';
import { previewSamples, allTemplateNames } from './preview-samples';

function devOnly(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }
}

export const emailPreviewTrpc = router({
  list: publicProcedure.query(({ ctx }) => {
    devOnly();
    const service = ctx.container.get<EmailTemplateService>(EmailTemplateService);
    return allTemplateNames.map((name) => ({
      name,
      subject: service.getSubject(name),
    }));
  }),

  render: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      devOnly();

      const template = input.name as EmailTemplate;
      if (!allTemplateNames.includes(template)) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Template "${input.name}" not found` });
      }

      const service = ctx.container.get<EmailTemplateService>(EmailTemplateService);
      const data = previewSamples[template] as EmailTemplateData[EmailTemplate];
      const { html, text } = await service.renderTemplate(
        template,
        data as EmailTemplateData[typeof template]
      );

      return {
        name: template,
        subject: service.getSubject(template),
        html,
        text,
      };
    }),
});
