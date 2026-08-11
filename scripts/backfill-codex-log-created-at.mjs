import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { generateCodexDailyEntries } from "./generate-codex-daily-entries.mjs";

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toIsoTimestamp(value) {
  const timestamp = toText(value);
  const date = new Date(timestamp);

  return timestamp && !Number.isNaN(date.getTime()) ? date.toISOString() : "";
}

function getFingerprint(entry) {
  return [
    toText(entry.date),
    toText(entry.thread_title),
    toText(entry.user_tasks),
    toText(entry.assistant_summary),
  ]
    .map((value) => value.replace(/\s+/g, " "))
    .join("\u0001");
}

function groupByFingerprint(items) {
  const groups = new Map();

  for (const item of items) {
    const fingerprint = getFingerprint(item);
    const group = groups.get(fingerprint) ?? [];

    group.push(item);
    groups.set(fingerprint, group);
  }

  return groups;
}

/** Plans only safe, unique historical created_at updates. */
export function planCreatedAtBackfill(entries, rows) {
  const entriesByFingerprint = groupByFingerprint(entries);
  const rowsByFingerprint = groupByFingerprint(rows);
  const result = {
    ambiguous: 0,
    invalid: 0,
    unchanged: 0,
    unmatched: 0,
    updates: [],
  };

  for (const [fingerprint, entryGroup] of entriesByFingerprint) {
    const rowsForFingerprint = rowsByFingerprint.get(fingerprint) ?? [];

    if (entryGroup.length !== 1 || rowsForFingerprint.length > 1) {
      result.ambiguous += 1;
      continue;
    }

    if (rowsForFingerprint.length === 0) {
      result.unmatched += 1;
      continue;
    }

    const createdAt = toIsoTimestamp(entryGroup[0].created_at);

    if (!createdAt) {
      result.invalid += 1;
      continue;
    }

    if (toIsoTimestamp(rowsForFingerprint[0].created_at) === createdAt) {
      result.unchanged += 1;
      continue;
    }

    result.updates.push({ created_at: createdAt, r_id: rowsForFingerprint[0].r_id });
  }

  return result;
}

function loadLocalEnv() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);

      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Environment variables can be supplied by the caller.
  }
}

async function resolveOwnerId(supabase) {
  const configuredId = toText(process.env.CODEX_DAILY_USER_ID);

  if (configuredId) {
    return configuredId;
  }

  const { data, error } = await supabase.from("users").select("id").limit(2);

  if (error || data?.length !== 1 || !data[0].id) {
    throw new Error(error?.message || "Unable to resolve a unique Codex daily user");
  }

  return data[0].id;
}

async function main() {
  loadLocalEnv();
  const apply = process.argv.slice(2).includes("--apply");
  const supabaseUrl = toText(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = toText(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const ownerId = await resolveOwnerId(supabase);
  const { data: rows, error } = await supabase
    .from("codex_log")
    .select("r_id,date,thread_title,user_tasks,assistant_summary,created_at")
    .eq("id", ownerId)
    .limit(10000);

  if (error) {
    throw new Error(`Unable to read Codex logs: ${error.message}`);
  }

  const dates = [...new Set((rows ?? []).map((row) => toText(row.date)).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))];
  const entries = [];

  for (const date of dates) {
    entries.push(...(await generateCodexDailyEntries({ targetDate: date })));
  }

  const plan = planCreatedAtBackfill(entries, rows ?? []);

  if (apply) {
    for (const update of plan.updates) {
      const { error: updateError } = await supabase
        .from("codex_log")
        .update({ created_at: update.created_at })
        .eq("r_id", update.r_id);

      if (updateError) {
        throw new Error(`Unable to update ${update.r_id}: ${updateError.message}`);
      }
    }
  }

  console.log(
    JSON.stringify({
      ...plan,
      apply,
      entries: entries.length,
      records: rows?.length ?? 0,
      sessionDates: dates.length,
      updated: apply ? plan.updates.length : 0,
    }),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
