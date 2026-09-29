export type NodeEnvironment = "development" | "production" | "test";

export function parseNodeEnvironment(
  value: string | undefined,
): NodeEnvironment {
  const normalized = value?.trim().toLowerCase();

  if (
    normalized !== "development" &&
    normalized !== "production" &&
    normalized !== "test"
  ) {
    throw new Error(
      'NODE_ENV must be set to "development", "production", or "test"',
    );
  }

  return normalized;
}

export const nodeEnv = parseNodeEnvironment(process.env.NODE_ENV);
export const isProduction = nodeEnv === "production";
