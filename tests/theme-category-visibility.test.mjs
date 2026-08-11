import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const constantsPath = new URL(
  "../src/app/(pages)/theme/constants.ts",
  import.meta.url,
);
const databasePath = new URL("../src/app/utils/database.ts", import.meta.url);
const migrationPath = new URL(
  "../supabase/migrations/20260811_add_theme_hidden_category_keys.sql",
  import.meta.url,
);
const typesPath = new URL(
  "../src/app/(pages)/theme/types.ts",
  import.meta.url,
);

test("persists hidden category keys in the theme contract", async () => {
  const [constants, database, migration, types] = await Promise.all([
    readFile(constantsPath, "utf8"),
    readFile(databasePath, "utf8"),
    readFile(migrationPath, "utf8"),
    readFile(typesPath, "utf8"),
  ]);

  assert.equal(types.includes("hiddenCategoryKeys: string[];"), true);
  assert.equal(types.includes("hidden_category_keys: string[] | null;"), true);
  assert.equal(constants.includes("hiddenCategoryKeys: []"), true);
  assert.equal(constants.includes("hidden_category_keys:"), true);
  assert.equal(database.includes("hidden_category_keys"), true);
  assert.match(
    migration,
    /add column if not exists hidden_category_keys text\[\] not null default '\{\}'::text\[\]/,
  );
});
