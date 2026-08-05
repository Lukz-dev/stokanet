import dotenv from "dotenv";
import { defineConfig } from "prisma/config";
import { resolveDatabaseUrl } from "./lib/database-url";

dotenv.config({ path: ".env.local" });
dotenv.config();

const databaseUrl = resolveDatabaseUrl({ allowFallback: true });
const directUrl = resolveDatabaseUrl({ allowFallback: false });

if (!databaseUrl) {
  throw new Error("No database URL was resolved. Set DATABASE_URL, DIRECT_URL, POSTGRES_URL, POSTGRES_PRISMA_URL or POSTGRES_URL_NON_POOLING.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
    directUrl: directUrl ?? databaseUrl,
  },
});
