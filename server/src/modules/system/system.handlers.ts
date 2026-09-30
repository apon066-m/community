import { sql } from "drizzle-orm";
import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "shared";

import { db } from "../../db";

export function getRootHandler(c: Context) {
  return c.text("Hello Hono!");
}

export async function getHealthHandler(c: Context) {
  try {
    await db.execute(sql`select 1`);
    const data: ApiResponse = {
      message: "Server is healthy!",
      success: true,
    };

    return c.json(data, StatusCodes.OK);
  } catch {
    return c.json(
      { message: "Server database is unavailable", success: false },
      StatusCodes.SERVICE_UNAVAILABLE,
    );
  }
}

export function getSiziHandler(c: Context) {
  const data: ApiResponse = {
    message: "Server is SIZI!",
    success: true,
  };

  return c.json(data, StatusCodes.OK);
}

export function getHelloHandler(c: Context) {
  const data: ApiResponse = {
    message: "Hello BHVR!",
    success: true,
  };

  return c.json(data, StatusCodes.OK);
}
