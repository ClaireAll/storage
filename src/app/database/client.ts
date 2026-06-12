import postgres from "postgres";
import { getDatabaseConfig, getDatabaseUrl } from "./config";

declare global {
  var storageSql: ReturnType<typeof postgres> | undefined;
}

export function getSqlClient() {
  if (globalThis.storageSql) {
    return globalThis.storageSql;
  }

  const databaseUrl = getDatabaseUrl();
  const config = getDatabaseConfig();

  globalThis.storageSql = databaseUrl
    ? postgres(databaseUrl, {
        max: 5,
        ssl: "require",
      })
    : postgres({
        database: config.database,
        host: config.host,
        max: 5,
        password: config.password,
        port: config.port,
        ssl: config.ssl ? "require" : false,
        username: config.username,
      });

  return globalThis.storageSql;
}
