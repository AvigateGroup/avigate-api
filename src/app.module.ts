// src/app.module.ts (FIXED - Uses DATABASE_URL from Railway)
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { LocationModule } from './modules/location/location.module';
import { RouteModule } from './modules/route/route.module';
import { FareModule } from './modules/fare/fare.module';
import { ReputationModule } from './modules/reputation/reputation.module';
import { CommunityModule } from './modules/community/community.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { EmailModule } from './modules/email/email.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import databaseConfig from './config/database.config';

// Import all entities explicitly
import { Admin } from './modules/admin/entities/admin.entity';
import { AdminSession } from './modules/admin/entities/admin-session.entity';
import { User } from './modules/user/entities/user.entity';
import { UserDevice } from './modules/user/entities/user-device.entity';
import { UserOTP } from './modules/user/entities/user-otp.entity';
import { Location } from './modules/location/entities/location.entity';
import { Landmark } from './modules/location/entities/landmark.entity';
import { Route } from './modules/route/entities/route.entity';
import { RouteStep } from './modules/route/entities/route-step.entity';
import { FareFeedback } from './modules/fare/entities/fare-feedback.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // FIXED: Use DATABASE_URL from Railway
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (databaseUrl) {
          // Railway/Production: Use DATABASE_URL
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            entities: [
              Admin,
              AdminSession,
              User,
              UserDevice,
              UserOTP,
              Location,
              Landmark,
              Route,
              RouteStep,
              FareFeedback,
            ],
            synchronize: false,
            logging: configService.get('NODE_ENV') === 'development',
            ssl: {
              rejectUnauthorized: false, // Required for Railway
            },
          };
        }

        // Local development: Use individual environment variables
        return {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST') || 'localhost',
          port: parseInt(configService.get<string>('DB_PORT') || '5432', 10),
          username: configService.get<string>('DB_USER') || 'postgres',
          password: configService.get<string>('DB_PASSWORD') || '',
          database: configService.get<string>('DB_NAME') || 'avigate_db',
          entities: [
            Admin,
            AdminSession,
            User,
            UserDevice,
            UserOTP,
            Location,
            Landmark,
            Route,
            RouteStep,
            FareFeedback,
          ],
          synchronize: false,
          logging: configService.get('NODE_ENV') === 'development',
        };
      },
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get('RATE_LIMIT_TTL') || 60,
          limit: configService.get('RATE_LIMIT_MAX') || 100,
        },
      ],
      inject: [ConfigService],
    }),
    UserModule,
    AuthModule,
    AdminModule,
    LocationModule,
    RouteModule,
    ReputationModule,
    FareModule,
    CommunityModule,
    AnalyticsModule,
    EmailModule,
    WebsocketModule,
  ],
})
export class AppModule {}
