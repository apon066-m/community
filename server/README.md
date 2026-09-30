To install dependencies:
```sh
bun install
```

Required authentication and database variables are documented in the root
`.env.example` file. Google OAuth uses this local callback URL:

`NODE_ENV` must be set to `development`, `production`, or `test`. Bun uses this
value to select `.env.development`, `.env.production`, and `.env.test` files.

```text
http://localhost:3000/api/auth/callback/google
```

Generate and apply database migrations from this workspace:

```sh
bun run db:generate
bun run db:migrate
```

Email signup accepts `name`, `email`, `password`, and an optional `phone`.
Validation failures return field-level messages under `fields` with
`code: "VALIDATION_ERROR"`.

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "correct-horse-battery-staple",
  "phone": "+15551234567"
}
```

Postman requests must include `Origin: http://localhost:5173`.

After applying migrations, create the initial administrator interactively:

```sh
bun run auth:create-admin
```

From the production container, use the compiled configuration instead:

```sh
bun run auth:create-admin:prod
```

Run fast tests with `bun test`. Database-backed tests are available through
`bun run test:integration` when PostgreSQL is running and the required
environment variables are configured.

To run:
```sh
bun run dev
```

open http://localhost:3000
