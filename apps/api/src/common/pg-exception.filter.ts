import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

/**
 * The database enforces the workflow rules (see db/migrations/060_hostel_rules.sql). This filter turns its
 * SQLSTATE errors into readable HTTP responses so the UI can show the rule that was broken.
 */
@Catch()
export class PgExceptionFilter implements ExceptionFilter {
  catch(err: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (err instanceof HttpException) {
      return res.status(err.getStatus()).json(err.getResponse());
    }
    // drizzle wraps driver errors: the SQLSTATE lives on err.cause
    const raw = (err as { cause?: unknown })?.cause && typeof (err as { cause?: { code?: unknown } }).cause === 'object' && (err as { cause: { code?: unknown } }).cause.code ? (err as { cause: unknown }).cause : err;
    const e = raw as { code?: string; message?: string; detail?: string; constraint_name?: string; table_name?: string };
    const map: Record<string, [number, string]> = {
      '23514': [HttpStatus.UNPROCESSABLE_ENTITY, 'Rule violated'],
      P0001: [HttpStatus.UNPROCESSABLE_ENTITY, 'Rule violated'],
      '23505': [HttpStatus.CONFLICT, 'Already exists'],
      '23503': [HttpStatus.BAD_REQUEST, 'Refers to a row that does not exist'],
      '23502': [HttpStatus.BAD_REQUEST, 'Required value missing'],
      '23P01': [HttpStatus.CONFLICT, 'Overlaps an existing period'],
      '42501': [HttpStatus.FORBIDDEN, 'Not allowed'],
      '23000': [HttpStatus.UNPROCESSABLE_ENTITY, 'Cannot be changed'],
    };
    const [status, title]: [number, string] = (e.code ? map[e.code] : undefined) ?? [HttpStatus.INTERNAL_SERVER_ERROR, 'Unexpected error'];
    if (status === 500) console.error(err);
    return res.status(status).json({
      statusCode: status,
      error: title,
      message: e.message?.replace(/^.*?ERROR:\s*/, '') ?? title,
      detail: e.detail,
      constraint: e.constraint_name,
      table: e.table_name,
    });
  }
}
