import { createMiddleware } from "hono/factory";
import { StatusCodes } from "http-status-codes";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const methodsWithJsonBody = new Set(["POST", "PUT", "PATCH"]);

export function trustedMutationOrigin(trustedOrigin: string) {
  return createMiddleware(async (c, next) => {
    if (safeMethods.has(c.req.method)) {
      await next();
      return;
    }

    const origin = c.req.header("Origin");
    const hasCookie = Boolean(c.req.header("Cookie"));

    if ((origin && origin !== trustedOrigin) || (hasCookie && !origin)) {
      return c.json({ error: "Untrusted request origin" }, StatusCodes.FORBIDDEN);
    }

    if (
      methodsWithJsonBody.has(c.req.method) &&
      !isSupportedMutationContentType(c.req.header("Content-Type"))
    ) {
      return c.json(
        {
          error:
            "Content-Type must be application/json or multipart/form-data",
        },
        StatusCodes.UNSUPPORTED_MEDIA_TYPE,
      );
    }

    await next();
  });
}

function isSupportedMutationContentType(contentType: string | undefined) {
  const normalizedContentType = contentType?.toLowerCase() ?? "";

  return (
    normalizedContentType.startsWith("application/json") ||
    normalizedContentType.startsWith("multipart/form-data")
  );
}
