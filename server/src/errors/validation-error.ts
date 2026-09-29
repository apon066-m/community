import { StatusCodes } from "http-status-codes";

import { AppError } from "./app-error";

export type ValidationIssue = {
  path: PropertyKey[];
  message: string;
};

export function formatValidationFields(issues: readonly ValidationIssue[]) {
  return Object.fromEntries(
    issues.map(({ path, message }) => [
      path.map(String).join(".") || "form",
      path.length ? message : "Enter valid request details.",
    ]),
  );
}

export class ValidationError extends AppError {
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    super({
      statusCode: StatusCodes.BAD_REQUEST,
      code: "VALIDATION_ERROR",
      message: "Please fix the highlighted fields.",
    });
    this.name = "ValidationError";
    this.fields = fields;
  }

  static fromIssues(issues: readonly ValidationIssue[]) {
    return new ValidationError(formatValidationFields(issues));
  }
}
