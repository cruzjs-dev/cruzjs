import { EmailService, EMAIL_SERVICE } from '../../email/email.service';
import { buildContainerWithProviders } from '../../framework/application.server';
import { UserRegisteredEvent } from '../events/user-registered.event';

/**
 * Send welcome email when a user registers
 */
export async function sendWelcomeEmailListener(
  event: UserRegisteredEvent
): Promise<void> {
  const container = await buildContainerWithProviders([]);
  const emailService = container.get<EmailService>(EMAIL_SERVICE);

  try {
    await emailService.sendEmail(
      event.email,
      'Welcome to our platform!',
      `
        <h1>Welcome, ${event.name}!</h1>
        <p>Thank you for registering. We're excited to have you on board.</p>
        <p>If you have any questions, feel free to reach out to our support team.</p>
      `,
      `Welcome, ${event.name}!\n\nThank you for registering. We're excited to have you on board.\n\nIf you have any questions, feel free to reach out to our support team.`
    );
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't throw - listener failures shouldn't break the registration flow
  }
}

