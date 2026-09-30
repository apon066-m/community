import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_URL ??
  `postgresql://${process.env.POSTGRES_USER ?? "assessment_user"}:${
    process.env.POSTGRES_PASSWORD ?? "assessment_password"
  }@localhost:${process.env.POSTGRES_PORT ?? "5432"}/${
    process.env.POSTGRES_DB ?? "assessment"
  }`;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/**/*.schema.ts",
  out: "./drizzle",

  dbCredentials: {
    url: databaseUrl,
  },
});
