import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin as adminPlugin, customSession } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

import { env } from "../../config/env";
import { db } from "../../db";
import * as schema from "../../db/schema";

const adminAccessControl = createAccessControl(defaultStatements);

const adminRole = adminAccessControl.newRole({
  user: ["create", "list", "get"],
  session: ["list", "revoke", "delete"],
});

const nonAdminRole = adminAccessControl.newRole({
  user: [],
  session: [],
});

export const auth = betterAuth({
  appName: "Coffee Platform",
  baseURL: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  trustedOrigins: [env.clientOrigin],
  rateLimit: {
    enabled: env.isProduction,
    window: 10,
    max: 100,
  },
  account: {
    encryptOAuthTokens: true,
  },
  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: false,
        input: true,
        returned: true,
      },
    },
  },
  advanced: {
    useSecureCookies: env.isProduction,
    cookiePrefix: "coffee-platform",
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    google: {
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email" && ctx.body?.role) {
        throw new APIError("BAD_REQUEST", {
          message: "Role cannot be assigned during public signup",
        });
      }

      if (ctx.path === "/admin/create-user" && Array.isArray(ctx.body?.role)) {
        throw new APIError("BAD_REQUEST", {
          message: "Each user must have exactly one role",
        });
      }
    }),
  },
  disabledPaths: [
    "/admin/set-role",
    "/admin/update-user",
    "/admin/ban-user",
    "/admin/unban-user",
    "/admin/impersonate-user",
    "/admin/stop-impersonating",
    "/admin/remove-user",
    "/admin/set-user-password",
  ],
  plugins: [
    adminPlugin({
      ac: adminAccessControl,
      defaultRole: "customer",
      adminRoles: ["admin"],
      roles: {
        admin: adminRole,
        staff: nonAdminRole,
        customer: nonAdminRole,
      },
    }),

    customSession(async ({ user, session }) => ({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
      },
      session: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
      },
    })),
  ],
});
