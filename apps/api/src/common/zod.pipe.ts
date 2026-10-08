import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/** `@Body(zod(schema))` — validates and returns the typed value, 400 with field errors otherwise. */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private schema: ZodType<T>) {}
  transform(value: unknown): T {
    const r = this.schema.safeParse(value);
    if (!r.success) throw new BadRequestException({ message: 'Validation failed', issues: r.error.issues });
    return r.data;
  }
}
export const zod = <T>(schema: ZodType<T>) => new ZodPipe(schema);
