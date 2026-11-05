import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ApiErrorBody, ErrorCode } from '@yoyo/shared';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { AppError, RateLimitedError } from './app-error';
import { DomainError, fromDomainError } from './domain-errors';

interface ErrorResponse {
  status: number;
  body: ApiErrorBody;
  retryAfterSeconds?: number;
}

interface ZodIssueLike {
  path: PropertyKey[];
  message: string;
}

/** First message per field path, e.g. `{ email: 'Invalid email address' }`. */
function fieldMessages(zodError: unknown): Record<string, string> | undefined {
  const issues = (zodError as { issues?: ZodIssueLike[] } | undefined)?.issues ?? [];
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.');
    if (key && !(key in fields)) fields[key] = issue.message;
  }
  return Object.keys(fields).length > 0 ? fields : undefined;
}

/** Codes for framework errors (unknown routes, malformed JSON…) that are not AppErrors. */
function codeForStatus(status: number): ErrorCode {
  if (status === HttpStatus.NOT_FOUND) return 'NOT_FOUND';
  if (status === HttpStatus.UNAUTHORIZED) return 'AUTH_UNAUTHENTICATED';
  if (status === HttpStatus.FORBIDDEN) return 'AUTH_FORBIDDEN';
  if (status === HttpStatus.TOO_MANY_REQUESTS) return 'RATE_LIMITED';
  if (status === HttpStatus.PAYLOAD_TOO_LARGE) return 'PAYLOAD_TOO_LARGE';
  if (status === HttpStatus.UNSUPPORTED_MEDIA_TYPE) return 'UNSUPPORTED_MEDIA';
  if (status >= 500) return 'INTERNAL';
  return 'VALIDATION_FAILED';
}

function toErrorResponse(exception: unknown): ErrorResponse {
  if (exception instanceof AppError) {
    const error = {
      code: exception.code,
      message: exception.message,
      ...(exception.fields && { fields: exception.fields }),
      ...(exception.details && { details: exception.details }),
    };
    return {
      status: exception.status,
      body: { error },
      ...(exception instanceof RateLimitedError && { retryAfterSeconds: exception.retryAfterSeconds }),
    };
  }
  if (exception instanceof ZodValidationException) {
    const fields = fieldMessages(exception.getZodError());
    return {
      status: HttpStatus.BAD_REQUEST,
      body: { error: { code: 'VALIDATION_FAILED', message: 'Some fields are invalid', ...(fields && { fields }) } },
    };
  }
  if (exception instanceof HttpException && exception.getStatus() < 500) {
    const status = exception.getStatus();
    return { status, body: { error: { code: codeForStatus(status), message: exception.message } } };
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: { error: { code: 'INTERNAL', message: 'Something went wrong on our side' } },
  };
}

/**
 * Turns every error into `{ error: { code, message, fields? } }`. Unexpected errors become a bare
 * 500 INTERNAL: their text and stack go to the log only, never to the client.
 */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('ErrorFilter');

  catch(original: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') throw original;
    // A refusal of the business rules (@yoyo/domain) answers like any AppError; a broken invariant is a 500.
    const exception = original instanceof DomainError ? fromDomainError(original) : original;
    if (original instanceof DomainError && exception instanceof AppError && exception.status >= 500) {
      this.logger.error(`domain invariant broken: ${original.message}\n${original.stack ?? ''}`);
    }
    const res = host.switchToHttp().getResponse<Response>();
    const { status, body, retryAfterSeconds } = toErrorResponse(exception);

    // An AppError with a 5xx status (photo storage off, say) is an expected state, logged where it arises.
    if (status >= 500 && !(exception instanceof AppError)) {
      this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    }
    if (res.headersSent) return;
    if (retryAfterSeconds !== undefined) res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(status).json(body);
  }
}
