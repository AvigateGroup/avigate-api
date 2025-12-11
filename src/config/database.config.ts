// src/config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  DB_HOST: process.env.DATABASE_HOST,
  DB_PORT: parseInt(process.env.DATABASE_PORT ?? '5432', 10) || 5432,
  DB_USER: process.env.DATABASE_USERNAME,
  DB_PASSWORD: process.env.DATABASE_PASSWORD,
  DB_DATABASE: process.env.DATABASE_NAME,
  DB_SSL: process.env.DATABASE_SSL === 'true',
}));