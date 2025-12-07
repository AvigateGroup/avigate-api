// ormconfig.ts
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config(); // Load .env file

// Parse DATABASE_URL if available (Railway provides this)
const databaseUrl = process.env.DATABASE_URL;

export default new DataSource({
  type: 'postgres',
  ...(databaseUrl 
    ? { 
        url: databaseUrl,
        ssl: { rejectUnauthorized: false }
      } 
    : {
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        username: process.env.DATABASE_USERNAME,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        ssl: process.env.DATABASE_SSL === 'true' 
          ? { rejectUnauthorized: false } 
          : false,
      }
  ),
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});