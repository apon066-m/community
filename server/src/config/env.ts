import { isProduction, nodeEnv } from "./runtime";

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function requireUrl(name: string): string {
  const value = requireEnvironmentVariable(name);

  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
}

function requireProductionHttps(name: string, value: string): string {
  if (isProduction && !value.startsWith("https://")) {
    throw new Error(`${name} must use HTTPS in production`);
  }

  return value;
}

const betterAuthSecret = requireEnvironmentVariable("BETTER_AUTH_SECRET");

if (betterAuthSecret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
}

export const env = {
  isProduction,
  nodeEnv,
  databaseUrl: requireEnvironmentVariable("DATABASE_URL"),
  betterAuthSecret,
  betterAuthUrl: requireProductionHttps(
    "BETTER_AUTH_URL",
    requireUrl("BETTER_AUTH_URL"),
  ),
  clientOrigin: requireProductionHttps(
    "CLIENT_ORIGIN",
    requireUrl("CLIENT_ORIGIN"),
  ),
  googleClientId: requireEnvironmentVariable("GOOGLE_CLIENT_ID"),
  googleClientSecret: requireEnvironmentVariable("GOOGLE_CLIENT_SECRET"),
};
