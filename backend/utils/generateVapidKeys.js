const webpush = require('web-push');

/**
 * Generate VAPID keys for web push notifications
 * This script generates public and private VAPID keys
 * Run with: npm run generate-vapid
 */

console.log('🔑 Generating VAPID keys for web push notifications...\n');

try {
  const vapidKeys = webpush.generateVAPIDKeys();

  console.log('✅ VAPID keys generated successfully!\n');
  console.log('📋 Add these to your .env file:\n');
  console.log('# VAPID Keys for Web Push Notifications');
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log('VAPID_EMAIL=mailto:your-email@example.com');
  console.log('\n⚠️  Important Notes:');
  console.log('• Replace "your-email@example.com" with your actual email');
  console.log('• Keep the private key secure and never expose it publicly');
  console.log('• These keys are needed for push notifications to work');
  console.log('• The public key will be used in the frontend service worker');
  console.log('\n🎉 Setup complete! Your app can now send push notifications.');

} catch (error) {
  console.error('❌ Error generating VAPID keys:', error);
  process.exit(1);
}
