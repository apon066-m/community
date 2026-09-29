import { describe, expect, test } from "bun:test";

import { parseNodeEnvironment } from "../runtime";

describe("NODE_ENV", () => {
  test("accepts development and production modes", () => {
    expect(parseNodeEnvironment("development")).toBe("development");
    expect(parseNodeEnvironment("production")).toBe("production");
    expect(parseNodeEnvironment("test")).toBe("test");
  });

  test("normalizes whitespace and casing", () => {
    expect(parseNodeEnvironment(" DEVELOPMENT ")).toBe("development");
    expect(parseNodeEnvironment(" PRODUCTION ")).toBe("production");
  });

  test("rejects missing or unsupported modes", () => {
    expect(() => parseNodeEnvironment(undefined)).toThrow();
    expect(() => parseNodeEnvironment("dev")).toThrow();
  });
});
