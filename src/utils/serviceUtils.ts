import { HttpException, HttpStatus } from "@nestjs/common";

export function assertFound<T>(
  record: T | null | undefined,
  message: string,
): asserts record is T {
  if (!record) {
    throw new HttpException(message, HttpStatus.NOT_FOUND);
  }
}

export async function wrapHttpException<T>(
  fn: () => Promise<T>,
  message: string,
  status = HttpStatus.BAD_REQUEST,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new HttpException(message, status);
  }
}

export function toPlainObject<T>(
  record: T & { toObject?(): unknown },
): unknown {
  return record.toObject ? record.toObject() : record;
}
