# Cafe App

A full-stack cafe application with a React client, a Bun and Hono API, and a PostgreSQL database managed with Drizzle.

## Prerequisites

- Git.
- Bun 1.2.4 for running the app on the host.
- PostgreSQL 17, installed locally or run in Docker.
- Docker Desktop or Docker Engine with Docker Compose v2 and Watch support for the Docker workflows.

The full Docker Compose workflow includes Bun in the app container, so a host Bun installation is not required for that option.

## Configure the environment

From the repository root, copy the example environment file.

PowerShell:

~~~powershell
Copy-Item .env.example .env
~~~

macOS, Linux, or Git Bash:

~~~sh
cp .env.example .env
~~~

The sample DATABASE_URL connects to a local PostgreSQL database named cafe_app on port 5432. Update it if your database uses a different host, port, name, user, or password. BETTER_AUTH_SECRET must be at least 32 characters. Keep .env private and do not commit it.

The example Google OAuth values allow the server to start and support email/password sign-in. Set real Google OAuth credentials if you want to use Google sign-in. The local Google callback URL is:

    http://localhost:3000/api/auth/callback/google

## Run with Bun

Install dependencies:

~~~sh
bun install
~~~

Start PostgreSQL locally and create a role and database. For example, connect to PostgreSQL as an administrator and run:

~~~sql
CREATE USER cafe_app WITH PASSWORD 'local_dev_password';
CREATE DATABASE cafe_app OWNER cafe_app;
~~~

Or start the PostgreSQL container from the included Compose file:

~~~sh
docker compose -f compose.local.yaml up -d db
~~~

The sample DATABASE_URL works with either setup when PostgreSQL is available on localhost:5432.

Apply the existing migrations:

~~~sh
bun run db:migrate
~~~

Load sample coffee items if desired:

~~~sh
bun --env-file=.env --filter=server run db:seed
~~~

To use staff or admin features, create the first administrator interactively:

~~~sh
bun --env-file=.env --filter=server run auth:create-admin
~~~

Start the client and API:

~~~sh
bun run dev
~~~

Open the app at http://localhost:5173. Check the API at http://localhost:3000/health.

## Run the app and database in Docker Compose

Copy and configure .env as described above. Start the database and apply the existing migrations:

~~~sh
docker compose -f compose.local.yaml up -d db
docker compose -f compose.local.yaml run --build --rm app bun --filter=server run db:migrate
~~~

Sample catalog data and the initial administrator are optional:

~~~sh
docker compose -f compose.local.yaml run --rm app bun --filter=server run db:seed
docker compose -f compose.local.yaml run --rm app bun --filter=server run auth:create-admin
~~~

Start the app with source watching:

~~~sh
docker compose -f compose.local.yaml up --build --watch
~~~

The app is available at http://localhost:5173 and the API health check at http://localhost:3000/health. Stop with Ctrl+C, then remove the containers:

~~~sh
docker compose -f compose.local.yaml down --remove-orphans
~~~

The PostgreSQL data volume persists after normal shutdown. Do not add the -v option unless you intend to delete the local database.

## Database schema changes

A fresh checkout only needs to apply the committed migrations with bun run db:migrate. Run bun run db:generate after changing the Drizzle schema, review the generated migration, and then apply it with bun run db:migrate.

For the existing shared sandbox Docker setup and additional development commands, see [Development](docs/development.md).
