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

/** 清理用户请求中的桌面注入包装，只保留真实任务文本。 */
export function cleanUserMessage(value) {
  let text = toText(value);
  const marker = /^## My request(?: for Codex)?:\s*$/m;
  const markerMatch = marker.exec(text);

  if (markerMatch) {
    text = text.slice(markerMatch.index + markerMatch[0].length);
  }

  text = text
    .replace(/<image\b[^>]*>[\s\S]*?<\/image>/gi, "")
    .replace(/<image\b[^>]*\/?\s*>/gi, "")
    .replace(/<\/?(?:environment_context|recommended_plugins|developer)\b[^>]*>[\s\S]*?<\/(?:environment_context|recommended_plugins|developer)>/gi, "")
    .replace(/<\/?(?:environment_context|recommended_plugins|developer)\b[^>]*>/gi, "")
    .trim();

  if (/^# AGENTS\.md instructions\b/i.test(text) || /<INSTRUCTIONS>[\s\S]*<\/INSTRUCTIONS>/i.test(text)) {
    return "";
  }

  return text;
}

/** 提取新版 response_item 用户消息中的文本片段。 */
export function getResponseUserMessage(payload) {
  if (payload?.role !== "user" || !Array.isArray(payload.content)) {
    return "";
  }

  return payload.content
    .filter((item) => item?.type === "input_text")
    .map((item) => toText(item.text))
    .filter(Boolean)
    .join("\n")
    .trim();
}

/** 追加用户请求并过滤新旧日志格式在短时间内产生的镜像记录。 */
function appendUserMessage(messages, timestamps, message, timestamp) {
  const previousMessage = messages.at(-1);
  const previousTimestamp = timestamps.at(-1);
  const currentTime = new Date(timestamp).getTime();
  const previousTime = new Date(previousTimestamp).getTime();

  if (
    previousMessage === message &&
    Number.isFinite(currentTime) &&
    Number.isFinite(previousTime) &&
    Math.abs(currentTime - previousTime) <= 1000
  ) {
    return false;
  }

  messages.push(message);
  timestamps.push(timestamp);
  return true;
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

/** Parses the individual user tasks in one Codex session for a target date. */
export function parseCodexSessionTaskEntries(lines, targetDate) {
  const entries = [];

  for (const line of lines) {
    let event;

    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    if (getShanghaiDate(event.timestamp) !== targetDate) {
      continue;
    }

    const userTasks =
      event.type === "event_msg" && event.payload?.type === "user_message"
        ? cleanUserMessage(event.payload.message)
        : event.type === "response_item"
          ? cleanUserMessage(getResponseUserMessage(event.payload))
          : "";

    if (!userTasks) {
      continue;
    }

    const createdAt = new Date(event.timestamp).toISOString();
    const previous = entries.at(-1);

    if (
      previous &&
      previous.user_tasks === userTasks &&
      Math.abs(new Date(createdAt).getTime() - new Date(previous.created_at).getTime()) <= 1000
    ) {
      continue;
    }

    entries.push({ created_at: createdAt, date: targetDate, user_tasks: userTasks });
  }

  return entries[0]?.user_tasks.startsWith("Automation:") ? [] : entries;
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
  const userMessageTimestamps = [];
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
      const userMessage = cleanUserMessage(getResponseUserMessage(event.payload));

      if (userMessage) {
        const timestamp = new Date(event.timestamp).toISOString();

        if (appendUserMessage(userMessages, userMessageTimestamps, userMessage, timestamp)) {
          createdAt ||= timestamp;
        }
      }

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
        const timestamp = new Date(event.timestamp).toISOString();

        if (appendUserMessage(userMessages, userMessageTimestamps, message, timestamp)) {
          createdAt ||= timestamp;
        }
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

/** Reads timestamped user tasks for safely repairing legacy imported rows. */
export async function generateCodexDailyTaskEntries({ targetDate, sessionRoots } = {}) {
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

    entries.push(...parseCodexSessionTaskEntries(allLines, targetDate));
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
