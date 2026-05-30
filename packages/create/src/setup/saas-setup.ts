import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

/**
 * Interactive post-scaffold setup for SaaS projects.
 * Prompts for Stripe keys and writes them to .env.
 */
export async function setupSaas(targetDir: string, projectName: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n--- SaaS Setup ---\n');

  const stripeKey = await prompt(rl, 'Enter your Stripe test secret key (or press Enter to skip): ');
  const stripeWebhookSecret = await prompt(rl, 'Enter your Stripe webhook secret (or press Enter to skip): ');
  const stripePriceId = await prompt(rl, 'Enter your Stripe Pro price ID (or press Enter to skip): ');

  rl.close();

  if (!stripeKey && !stripeWebhookSecret && !stripePriceId) {
    console.log('\nSkipped Stripe setup. Add keys to .env before running billing features.\n');
    return;
  }

  const envPath = path.join(targetDir, '.env');
  const envExamplePath = path.join(targetDir, '.env.example');

  const base = fs.existsSync(envExamplePath)
    ? fs.readFileSync(envExamplePath, 'utf8')
    : '';

  const stripeBlock = [
    '',
    '# Stripe',
    stripeKey ? `STRIPE_SECRET_KEY=${stripeKey}` : 'STRIPE_SECRET_KEY=sk_test_...',
    'STRIPE_PUBLISHABLE_KEY=pk_test_...',
    stripeWebhookSecret ? `STRIPE_WEBHOOK_SECRET=${stripeWebhookSecret}` : 'STRIPE_WEBHOOK_SECRET=whsec_...',
    stripePriceId ? `STRIPE_PRO_PRICE_ID=${stripePriceId}` : 'STRIPE_PRO_PRICE_ID=price_...',
  ].join('\n');

  fs.writeFileSync(envPath, base + stripeBlock + '\n');

  console.log(`\n✓ Wrote Stripe config to ${projectName}/.env\n`);
  console.log('Getting started with billing:');
  console.log('  1. Create a Stripe account at https://stripe.com');
  console.log('  2. Add your test keys to .env');
  console.log('  3. Run `cruz dev` to start the app');
  console.log('  4. Test upgrade with card 4242 4242 4242 4242, expiry 12/34, CVC 123');
  console.log('  5. Run `cruz deploy production` to ship\n');
}
