import type { Context, MiddlewareHandler } from "hono";
import { validator } from "hono/validator";
import type { z } from "zod";

import type { AppEnv } from "../app-env";
import { ValidationError, type ValidationIssue } from "../errors/validation-error";

type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: ValidationIssue[] } };

type Schema<T> = {
  safeParse(value: unknown): SafeParseResult<T>;
};

export type ValidatedContext<
  TInput extends object,
  TOutput extends object = TInput,
> = Context<
  AppEnv,
  string,
  { in: TInput; out: TOutput }
>;

export function validateJson<TSchema extends z.ZodType>(schema: TSchema) {
  const validation = validator("json", (value, c: Context<AppEnv>) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      throw ValidationError.fromIssues(parsed.error.issues);
    }

    c.set("validatedBody", parsed.data);
    return parsed.data;
  });

  return validation as MiddlewareHandler<
    AppEnv,
    string,
    {
      in: { json: z.input<TSchema> };
      out: { json: z.output<TSchema> };
    },
    never
  >;
}

export function validateParams<T>(schema: Schema<T>) {
  const validation = validator("param", (value, c) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      throw ValidationError.fromIssues(parsed.error.issues);
    }

    c.set("validatedParams", parsed.data);
    return parsed.data;
  });

  return validation as MiddlewareHandler<
    AppEnv,
    string,
    { in: { param: T }; out: { param: T } }
  >;
}

export function validateQuery<T>(schema: Schema<T>) {
  const validation = validator("query", (value, c) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      throw ValidationError.fromIssues(parsed.error.issues);
    }

    c.set("validatedQuery", parsed.data);
    return parsed.data;
  });

  return validation as MiddlewareHandler<
    AppEnv,
    string,
    { in: { query: T }; out: { query: T } }
  >;
}

export function getValidatedBody<T>(c: Context<AppEnv>) {
  return c.get("validatedBody") as T;
}

export function getValidatedParams<T>(c: Context<AppEnv>) {
  return c.get("validatedParams") as T;
}

export function getValidatedQuery<T>(c: Context<AppEnv>) {
  return c.get("validatedQuery") as T;
}
