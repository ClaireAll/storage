export type DatabaseConfig = {
  database: string;
  host: string;
  password: string;
  port: number;
  ssl: boolean;
  username: string;
};

export function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

export function getDatabaseConfig(): DatabaseConfig {
  return {
    database: process.env.DATABASE_NAME?.trim() || "postgres",
    host: process.env.DATABASE_HOST?.trim() || "",
    password: process.env.DATABASE_PASSWORD?.trim() || "",
    port: Number(process.env.DATABASE_PORT || 5432),
    ssl: process.env.DATABASE_SSL !== "false",
    username: process.env.DATABASE_USERNAME?.trim() || "",
  };
}

export function isDatabaseConfigured() {
  const databaseUrl = getDatabaseUrl();

  if (databaseUrl) {
    return true;
  }

  const config = getDatabaseConfig();

  return Boolean(config.host && config.username && config.password);
}
