import { Hono } from "hono";

import type { AppEnv } from "../../app-env";
import {
  getHealthHandler,
  getHelloHandler,
  getRootHandler,
  getSiziHandler,
} from "./system.handlers";

export const systemRoutes = new Hono<AppEnv>()
  .get("/test", getRootHandler)
  .get("/health", getHealthHandler)
  .get("/sizi", getSiziHandler)
  .get("/hello", getHelloHandler);
