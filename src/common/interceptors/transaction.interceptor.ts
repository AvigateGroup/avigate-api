// src/common/interceptors/transaction.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { DataSource } from 'typeorm';
import { TRANSACTIONAL_KEY } from '../decorators/transactional.decorator';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const isTransactional = this.reflector.get<boolean>(TRANSACTIONAL_KEY, context.getHandler());

    if (!isTransactional) {
      return next.handle();
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await next.handle().toPromise();
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
