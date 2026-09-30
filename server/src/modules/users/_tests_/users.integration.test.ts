import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";

import { user } from "../../auth/auth.schema";

const describeDatabase = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const createdEmails: string[] = [];

afterEach(async () => {
  if (!createdEmails.length || process.env.RUN_DB_TESTS !== "1") return;

  const { db } = await import("../../../db");
  for (const email of createdEmails.splice(0)) {
    await db.delete(user).where(eq(user.email, email));
  }
});

describeDatabase("user HTTP flow", () => {
  test("creates and returns an optional phone number", async () => {
    const { app } = await import("../../../app");
    const { db } = await import("../../../db");
    const email = `${crypto.randomUUID()}@example.test`;
    createdEmails.push(email);

    const signupResponse = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: process.env.CLIENT_ORIGIN!,
      },
      body: JSON.stringify({
        name: "Test Customer",
        email,
        password: "correct-horse-battery-staple",
        phone: "+15551234567",
      }),
    });

    expect(signupResponse.status).toBe(StatusCodes.OK);
    const cookie = signupResponse.headers.get("set-cookie")?.split(";", 1)[0];
    expect(cookie).toBeTruthy();

    const [createdUser] = await db
      .select({ id: user.id, phone: user.phone })
      .from(user)
      .where(eq(user.email, email));
    expect(createdUser).toBeTruthy();
    expect(createdUser?.phone).toBe("+15551234567");

    const currentUserResponse = await app.request("/api/v1/users/me", {
      method: "GET",
      headers: {
        cookie: cookie!,
      },
    });

    expect(currentUserResponse.status).toBe(StatusCodes.OK);
    expect(await currentUserResponse.json()).toMatchObject({
      user: { phone: "+15551234567" },
    });
  });

  test("lists customers and staff from the shared user resource", async () => {
    const { app } = await import("../../../app");
    const { db } = await import("../../../db");

    async function signUp(name: string) {
      const email = `${crypto.randomUUID()}@example.test`;
      createdEmails.push(email);
      const response = await app.request("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: process.env.CLIENT_ORIGIN!,
        },
        body: JSON.stringify({
          name,
          email,
          password: "correct-horse-battery-staple",
        }),
      });

      expect(response.status).toBe(StatusCodes.OK);
      const [createdUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email));

      expect(createdUser).toBeTruthy();
      return {
        id: createdUser!.id,
        cookie: response.headers.get("set-cookie")!.split(";", 1)[0]!,
      };
    }

    const admin = await signUp("Directory Admin");
    const customer = await signUp("Directory Customer");
    const staff = await signUp("Directory Staff");
    await db.update(user).set({ role: "admin" }).where(eq(user.id, admin.id));
    await db.update(user).set({ role: "staff" }).where(eq(user.id, staff.id));

    const customerResponse = await app.request(
      "/api/v1/users?role=customer&search=Directory%20Customer",
      { headers: { cookie: admin.cookie } },
    );
    expect(customerResponse.status).toBe(StatusCodes.OK);
    expect(await customerResponse.json()).toMatchObject({
      items: [
        {
          id: customer.id,
          name: "Directory Customer",
          role: "customer",
        },
      ],
    });

    const staffResponse = await app.request(
      "/api/v1/users?role=staff&search=Directory%20Staff",
      { headers: { cookie: admin.cookie } },
    );
    expect(staffResponse.status).toBe(StatusCodes.OK);
    expect(await staffResponse.json()).toMatchObject({
      items: [
        {
          id: staff.id,
          name: "Directory Staff",
          role: "staff",
        },
      ],
    });

    const teamResponse = await app.request(
      "/api/v1/admin/users/team?search=Directory%20&sort=name&order=asc",
      { headers: { cookie: admin.cookie } },
    );
    expect(teamResponse.status).toBe(StatusCodes.OK);
    expect(await teamResponse.json()).toMatchObject({
      items: [
        { id: admin.id, role: "admin" },
        { id: staff.id, role: "staff" },
      ],
    });

    const staffCustomerResponse = await app.request(
      "/api/v1/users?role=customer",
      { headers: { cookie: staff.cookie } },
    );
    expect(staffCustomerResponse.status).toBe(StatusCodes.OK);

    const staffListResponse = await app.request("/api/v1/users?role=staff", {
      headers: { cookie: staff.cookie },
    });
    expect(staffListResponse.status).toBe(StatusCodes.FORBIDDEN);

    const staffTeamResponse = await app.request("/api/v1/admin/users/team", {
      headers: { cookie: staff.cookie },
    });
    expect(staffTeamResponse.status).toBe(StatusCodes.FORBIDDEN);
  });
});
