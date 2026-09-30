export function createGuestOrderToken() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

export async function hashGuestOrderToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
