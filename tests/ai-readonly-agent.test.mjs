import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(path) {
  try {
    return readFileSync(new URL(path, import.meta.url), "utf8");
  } catch {
    return "";
  }
}

const routeSource = readSource("../src/app/api/ai/chat/route.ts");
const registrySource = readSource("../src/app/api/ai/tools/registry.ts");
const inventoryToolsSource = readSource(
  "../src/app/api/ai/tools/inventory-tools.ts",
);
const toolTypesSource = readSource("../src/app/api/ai/tools/types.ts");
const assistantSource = readSource(
  "../src/app/(pages)/common/ai-assistant.tsx",
);
const styleSource = readSource("../src/app/(pages)/theme/styles/home.less");

test("AI route imports tool registry instead of defining inventory tools inline", () => {
  assert.match(routeSource, /from "\.\.\/tools\/registry"/);
  assert.match(routeSource, /aiToolDefinitions/);
  assert.match(routeSource, /executeAiTool/);
  assert.doesNotMatch(routeSource, /const tools = \[/);
  assert.doesNotMatch(routeSource, /function executeInventoryTool/);
});

test("tool registry exposes all read-only phase one tools", () => {
  assert.match(registrySource, /get_inventory_list/);
  assert.match(registrySource, /search_inventory_items/);
  assert.match(registrySource, /find_incomplete_items/);
  assert.match(registrySource, /summarize_inventory/);
  assert.match(registrySource, /recommend_outfit/);
  assert.match(registrySource, /generate_outfit_image/);
  assert.match(registrySource, /recoverable:\s*true/);
});

test("inventory tools implement search filters incomplete scans summaries and outfit recommendations", () => {
  assert.match(inventoryToolsSource, /searchInventoryItems/);
  assert.match(inventoryToolsSource, /findIncompleteItems/);
  assert.match(inventoryToolsSource, /summarizeInventory/);
  assert.match(inventoryToolsSource, /recommendOutfit/);
  assert.match(inventoryToolsSource, /has_image/);
  assert.match(inventoryToolsSource, /has_file/);
  assert.match(inventoryToolsSource, /has_url/);
  assert.match(inventoryToolsSource, /missing_fields/);
  assert.match(inventoryToolsSource, /min_count/);
  assert.match(inventoryToolsSource, /season/);
  assert.match(inventoryToolsSource, /clothes/);
  assert.match(inventoryToolsSource, /pants/);
});

test("AI tool types include structured response fields", () => {
  assert.match(toolTypesSource, /AssistantStructuredResponse/);
  assert.match(toolTypesSource, /sections\?/);
  assert.match(toolTypesSource, /items\?/);
  assert.match(toolTypesSource, /suggestions\?/);
  assert.match(toolTypesSource, /ToolExecutionContext/);
  assert.match(toolTypesSource, /prompt\?/);
  assert.match(toolTypesSource, /image_urls\?/);
});

test("AI assistant renders structured sections item rows and suggestion buttons", () => {
  assert.match(assistantSource, /sections\?: AssistantSection\[\]/);
  assert.match(assistantSource, /items\?: AssistantItem\[\]/);
  assert.match(assistantSource, /suggestions\?: string\[\]/);
  assert.match(assistantSource, /ai-assistant-section/);
  assert.match(assistantSource, /ai-assistant-item/);
  assert.match(assistantSource, /ai-assistant-suggestion/);
  assert.match(assistantSource, /setDraft\(suggestion\)/);
  assert.match(styleSource, /ai-assistant-section/);
  assert.match(styleSource, /ai-assistant-item/);
  assert.match(styleSource, /ai-assistant-suggestion/);
});

test("AI assistant touched files keep readable Chinese copy", () => {
  assert.match(assistantSource, /你好，我是 DeepSeek 库存助手/);
  assert.match(routeSource, /请先登录/);
  assert.match(routeSource, /请输入问题/);
  assert.doesNotMatch(assistantSource, /\uFFFD/);
  assert.doesNotMatch(routeSource, /\uFFFD/);
  assert.doesNotMatch(registrySource, /\uFFFD/);
  assert.doesNotMatch(inventoryToolsSource, /\uFFFD/);
});
