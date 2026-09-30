import type { auth } from "./modules/auth/auth";

export type AuthorizationContext = {
  role: string;
  permissions: Set<string>;
};

export type AppEnv = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
    authorization: AuthorizationContext | null;
    validatedBody: unknown;
    validatedParams: unknown;
    validatedQuery: unknown;
  };
};
