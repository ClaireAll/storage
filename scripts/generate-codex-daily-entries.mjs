import { createReadStream, existsSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getShanghaiDate(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).format(date);
}

function cleanUserMessage(value) {
  let text = toText(value);
  const marker = /^## My request for Codex:\s*$/m;
  const markerMatch = marker.exec(text);

  if (markerMatch) {
    text = text.slice(markerMatch.index + markerMatch[0].length);
  }

  return text
    .replace(/<image\b[^>]*>[\s\S]*?<\/image>/gi, "")
    .replace(/<image\b[^>]*\/?\s*>/gi, "")
    .replace(/<\/?(?:environment_context|recommended_plugins|developer)\b[^>]*>/gi, "")
    .trim();
}

function getAssistantMessage(payload) {
  if (payload?.role !== "assistant" || !Array.isArray(payload.content)) {
    return "";
  }

  return payload.content
    .map((item) => toText(item?.text))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function toTitle(value) {
  const firstLine = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? "";
  const firstSentence = firstLine.split(/(?<=[。！？!?])\s*/)[0] || firstLine;

  return Array.from(firstSentence).slice(0, 80).join("") || "未命名任务";
}

/** Parses one Codex session into a target-day import entry. */
export function parseCodexSessionLines(lines, targetDate, fallbackId = "") {
  let cwd = "";
  let id = fallbackId;
  let tokenCount = 0;
  const userMessages = [];
  const agentMessages = [];
  const assistantFallbacks = [];
  let createdAt = "";

  for (const line of lines) {
    let event;

    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    if (event.type === "session_meta") {
      cwd = toText(event.payload?.cwd) || cwd;
      id = toText(event.payload?.id) || id;
      continue;
    }

    if (getShanghaiDate(event.timestamp) !== targetDate) {
      continue;
    }

    if (event.type === "response_item") {
      const message = getAssistantMessage(event.payload);

      if (message) {
        assistantFallbacks.push(message);
      }

      continue;
    }

    if (event.type !== "event_msg") {
      continue;
    }

    if (event.payload?.type === "user_message") {
      const message = cleanUserMessage(event.payload.message);

      if (message) {
        userMessages.push(message);
        createdAt ||= new Date(event.timestamp).toISOString();
      }
      continue;
    }

    if (event.payload?.type === "agent_message") {
      const message = toText(event.payload.message);

      if (message) {
        agentMessages.push(message);
      }
      continue;
    }

    if (event.payload?.type === "token_count") {
      const amount = Number(event.payload.info?.last_token_usage?.total_tokens);

      if (Number.isFinite(amount) && amount > 0) {
        tokenCount += Math.trunc(amount);
      }
    }
  }

  if (userMessages.length === 0 || userMessages[0].startsWith("Automation:")) {
    return null;
  }

  return {
    assistant_summary: agentMessages.at(-1) ?? assistantFallbacks.at(-1) ?? "",
    codex_thread_id: id,
    created_at: createdAt,
    cwd,
    date: targetDate,
    thread_title: toTitle(userMessages[0]),
    token_count: tokenCount,
    user_tasks: userMessages.join("\n\n"),
  };
}

function visitSessionFiles(root, files) {
  if (!existsSync(root)) {
    return;
  }

  for (const item of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, item.name);

    if (item.isDirectory()) {
      visitSessionFiles(path, files);
    } else if (item.isFile() && item.name.endsWith(".jsonl")) {
      files.push(path);
    }
  }
}

function getDefaultSessionRoots() {
  const codexHome = process.env.CODEX_HOME?.trim() || join(homedir(), ".codex");

  return [join(codexHome, "sessions"), join(codexHome, "archived_sessions")];
}

/** Reads all Codex sessions and returns target-day import entries. */
export async function generateCodexDailyEntries({ targetDate, sessionRoots } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate ?? "")) {
    throw new Error("targetDate must use YYYY-MM-DD");
  }

  const files = [];
  (sessionRoots ?? getDefaultSessionRoots()).forEach((root) => visitSessionFiles(root, files));
  const entries = [];

  for (const file of files) {
    const lines = createInterface({
      crlfDelay: Infinity,
      input: createReadStream(file, { encoding: "utf8" }),
    });
    const allLines = [];

    for await (const line of lines) {
      allLines.push(line);
    }

    const fallbackId = toText(file.match(/-([0-9a-f-]{36})\.jsonl$/)?.[1]);
    const entry = parseCodexSessionLines(allLines, targetDate, fallbackId);

    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

async function main() {
  const [targetDate, outputPath] = process.argv.slice(2);

  if (!targetDate || !outputPath) {
    throw new Error("Usage: node scripts/generate-codex-daily-entries.mjs <date> <output-json>");
  }

  const entries = await generateCodexDailyEntries({ targetDate });
  writeFileSync(outputPath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ entries: entries.length, outputPath, targetDate }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
