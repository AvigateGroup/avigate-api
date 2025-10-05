// src/modules/reputation/reputation.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReputationService } from './reputation.service';
import { ReputationController } from './reputation.controller';
import { ReputationTransaction } from './entities/reputation-transaction.entity';
import { UserBadge } from './entities/user-badge.entity';
import { Badge } from './entities/badge.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReputationTransaction,
      UserBadge,
      Badge,
      User,
    ]),
  ],
  controllers: [ReputationController],
  providers: [ReputationService],
  exports: [ReputationService],
})
export class ReputationModule {}