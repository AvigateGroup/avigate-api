// src/config/email.config.ts

import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  zeptomailToken: process.env.ZEPTOMAIL_API_TOKEN,
  fromEmail: process.env.FROM_EMAIL || 'noreply@avigate.co',
  adminFromEmail: process.env.ADMIN_FROM_EMAIL || 'notifications@avigate.co',
  frontendUrl: process.env.FRONTEND_URL || 'https://avigate.co',
  adminFrontendUrl: process.env.ADMIN_FRONTEND_URL || 'https://admin.avigate.co',
}));