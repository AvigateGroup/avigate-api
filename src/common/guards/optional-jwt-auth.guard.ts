// src/common/guards/optional-jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT Auth Guard
 * Allows both authenticated and unauthenticated requests
 * If token is provided and valid, user is attached to request
 * If no token or invalid token, request continues without user
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If there's an error or no user, just return undefined
    // Don't throw an error like the regular JwtAuthGuard
    if (err || !user) {
      return undefined;
    }
    return user;
  }
}