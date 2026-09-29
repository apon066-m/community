import type { ContentfulStatusCode } from "hono/utils/http-status";

export class AppError extends Error {
  readonly statusCode: ContentfulStatusCode;
  readonly code: string;

  constructor(input: {
    statusCode: ContentfulStatusCode;
    code: string;
    message: string;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "AppError";
    this.statusCode = input.statusCode;
    this.code = input.code;
  }
}
