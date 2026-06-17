import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  defaultThemeConfig,
  isThemeColor,
  isThemeMode,
} from "./constants";
import type { ThemeConfig } from "./types";

const envPath = resolve(process.cwd(), ".env.local");

function parseEnvValue(value: string): string {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function readEnvEntries(): Map<string, string> {
  const entries = new Map<string, string>();

  if (!existsSync(envPath)) {
    return entries;
  }

  const envContent = readFileSync(envPath, "utf8");

  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    entries.set(key.trim(), parseEnvValue(valueParts.join("=")));
  }

  return entries;
}

export function readThemeConfig(): ThemeConfig {
  const entries = readEnvEntries();
  const mode = entries.get("THEME") ?? defaultThemeConfig.mode;
  const color = entries.get("THEME_COLOR") ?? defaultThemeConfig.color;

  return {
    mode: isThemeMode(mode) ? mode : defaultThemeConfig.mode,
    color: isThemeColor(color) ? color : defaultThemeConfig.color,
  };
}

function stringifyEnvValue(key: string, value: string): string {
  return key === "THEME_COLOR" ? `"${value}"` : value;
}

export async function writeThemeConfig(themeConfig: ThemeConfig) {
  const existingContent = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const nextValues = new Map<string, string>([
    ["THEME", themeConfig.mode],
    ["THEME_COLOR", themeConfig.color],
  ]);

  const seenKeys = new Set<string>();
  const nextLines = existingContent.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      return line;
    }

    const [key] = trimmed.split("=");
    const envKey = key.trim();

    if (!nextValues.has(envKey)) {
      return line;
    }

    seenKeys.add(envKey);
    return `${envKey}=${stringifyEnvValue(envKey, nextValues.get(envKey)!)}`;
  });

  for (const [key, value] of nextValues) {
    if (!seenKeys.has(key)) {
      nextLines.push(`${key}=${stringifyEnvValue(key, value)}`);
    }
  }

  await writeFile(envPath, `${nextLines.join("\n").replace(/\n+$/, "")}\n`, "utf8");
}
