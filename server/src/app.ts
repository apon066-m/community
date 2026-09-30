import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { resolve } from "node:path";

import type { AppEnv } from "./app-env";
import { env } from "./config/env";
import { nodeEnv } from "./config/runtime";
import { handleError, handleNotFound } from "./middleware/error-handler";
import { authRoutes } from "./modules/auth/auth.routes";
import { systemRoutes } from "./modules/system/system.routes";
import { v1Routes } from "./route/v1";

export const app = new Hono<AppEnv>();

if (nodeEnv !== "test") {
  app.use("*", logger());
}

const serverPublicDir = resolve(import.meta.dir, "../public");
const clientDistDir = resolve(import.meta.dir, "../../client/dist");

app
  .use(
    "/assets/*",
    secureHeaders({ crossOriginResourcePolicy: "cross-origin" }),
  )
  .use(secureHeaders())
  .use("/assets/*", serveStatic({ root: serverPublicDir }))
  .use(
    cors({
      origin: env.clientOrigin,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      maxAge: 600,
    }),
  )
  .route("/", systemRoutes)
  .route("/api/auth", authRoutes)
  .route("/api/v1", v1Routes)
  // Keep the previous application paths available while clients migrate.
  .route("/api", v1Routes);

// ---------------------------------------------
// Production React/Vite application
// ---------------------------------------------

if (nodeEnv === "production") {
  // Vite-generated files only
  app.use(
    "/assets/*",
    serveStatic({
      root: clientDistDir,
    }),
  );

  // Other known static root files if your Vite app uses them
  app.get(
    "/favicon.ico",
    serveStatic({
      path: resolve(clientDistDir, "favicon.ico"),
    }),
  );

  // Unknown API routes should stay API 404s
  app.all("/api/*", handleNotFound);

  // Everything else is a client-side route
  app.get(
    "*",
    serveStatic({
      root: clientDistDir,
      rewriteRequestPath: () => "/index.html",
    }),
  );
}

app.onError(handleError);
app.notFound(handleNotFound);
