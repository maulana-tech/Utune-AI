import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

/**
 * The API trusts `workspaceId` from the request, so it must never be reachable by
 * browsers or the public internet directly. Only the web app's server-side proxy
 * (apps/web/src/app/api/backend) calls it, with the shared API_SECRET.
 * /health stays open for uptime checks. Without API_SECRET the API is open in
 * development and closed in production.
 */
@Injectable()
export class ApiSecretGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (req.path === '/health') return true;

    const secret = process.env.API_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') throw new UnauthorizedException('API_SECRET is not configured');
      return true;
    }
    const given = req.header('x-api-secret') ?? '';
    const ok = given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
    if (!ok) throw new UnauthorizedException();
    return true;
  }
}
