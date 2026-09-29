import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../config/env";
import * as schema from "./schema";

const client = postgres(env.databaseUrl);

export const db = drizzle(client, { schema });

export async function closeDatabase() {
  await client.end({ timeout: 5 });
}

type TransactionCallback = Parameters<typeof db.transaction>[0];

export type DbTransaction = TransactionCallback extends (
  transaction: infer Transaction,
) => unknown
  ? Transaction
  : never;

export type DbExecutor = typeof db | DbTransaction;
