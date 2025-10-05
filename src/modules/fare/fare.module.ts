// src/modules/fare/fare.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FareController } from './fare.controller';
import { FareService } from './fare.service';
import { FareFeedback } from './entities/fare-feedback.entity';
import { FareHistory } from './entities/fare-history.entity';
import { FareRule } from './entities/fare-rule.entity';
import { ReputationModule } from '../reputation/reputation.module';

@Module({
  imports: [TypeOrmModule.forFeature([FareFeedback, FareHistory, FareRule]), ReputationModule],
  controllers: [FareController],
  providers: [FareService],
  exports: [FareService],
})
export class FareModule {}
