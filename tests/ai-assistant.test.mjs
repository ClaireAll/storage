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

const layoutSource = readSource("../src/app/layout.tsx");
const homeViewSource = readSource("../src/app/(pages)/home/home-view.tsx");
const assistantSource = readSource("../src/app/(pages)/common/ai-assistant.tsx");
const routeSource = readSource("../src/app/api/ai/chat/route.ts");
const registrySource = readSource("../src/app/api/ai/tools/registry.ts");
const inventoryToolsSource = readSource(
  "../src/app/api/ai/tools/inventory-tools.ts",
);
const outfitRouteSource = readSource("../src/app/api/ai/outfit-image/route.ts");
const wanxiangSource = readSource("../src/app/api/ai/wanxiang.ts");
const ossPolicySource = readSource("../src/app/api/oss/policy/route.ts");
const ossClientSource = readSource("../src/utils/oss.ts");
const ossServerSource = readSource("../src/utils/oss-server.ts");
const styleSource = readSource("../src/app/(pages)/theme/styles/home.less");

test("home dashboard mounts the AI assistant in the page card layout", () => {
  assert.doesNotMatch(layoutSource, /AiAssistant/);
  assert.match(
    homeViewSource,
    /import \{ AiAssistant \} from "(?:@\/app\/\(pages\)|\.\/\(pages\))\/common\/ai-assistant"/,
  );
  assert.match(homeViewSource, /aiAssistant=\{<AiAssistant \/>\}/);
});

test("AI assistant shows a bottom-right DeepSeek icon and inline chat panel", () => {
  assert.match(assistantSource, /"use client"/);
  assert.doesNotMatch(assistantSource, /createPortal/);
  assert.match(assistantSource, /ai-assistant-root/);
  assert.match(assistantSource, /icon-deepseek/);
  assert.match(assistantSource, /mode="font"/);
  assert.match(assistantSource, /ai-assistant-fab/);
  assert.match(assistantSource, /ai-assistant-fab-icon/);
  assert.match(assistantSource, /ai-assistant-fab-symbol/);
  assert.doesNotMatch(assistantSource, /absolute bottom/);
  assert.match(assistantSource, /openChat/);
  assert.doesNotMatch(assistantSource, /Modal/);
  assert.doesNotMatch(assistantSource, /centered/);
  assert.doesNotMatch(assistantSource, /getContainer/);
  assert.match(assistantSource, /ai-assistant-panel/);
  assert.match(assistantSource, /role="dialog"/);
  assert.match(assistantSource, /isExpanded/);
  assert.match(assistantSource, /togglePanelExpanded/);
  assert.match(assistantSource, /FullscreenOutlined/);
  assert.match(assistantSource, /FullscreenExitOutlined/);
  assert.match(assistantSource, /ai-assistant-header-actions/);
  assert.match(assistantSource, /ai-assistant-expand/);
  assert.match(assistantSource, /ai-assistant-panel-expanded/);
  assert.match(assistantSource, /ai-assistant-root-expanded/);
  assert.match(assistantSource, /ai-assistant-capability/);
  assert.match(assistantSource, /ai-assistant-textarea/);
  assert.match(assistantSource, /ai-assistant-send/);
  assert.match(assistantSource, /\/api\/ai\/chat/);
  assert.match(assistantSource, /messages/);
  assert.match(assistantSource, /TextArea/);
});

test("AI chat route calls DeepSeek v4 flash with server-side API key", () => {
  assert.match(routeSource, /process\.env\.DEEPSEEK_API_KEY/);
  assert.match(routeSource, /https:\/\/api\.deepseek\.com\/chat\/completions/);
  assert.match(routeSource, /deepseek-v4-flash/);
  assert.match(routeSource, /Authorization/);
  assert.match(routeSource, /Bearer \$\{apiKey\}/);
  assert.match(routeSource, /choices/);
  assert.match(routeSource, /NextResponse\.json/);
});

test("AI chat route uses the read-only inventory tool registry", () => {
  assert.match(routeSource, /aiToolDefinitions/);
  assert.match(routeSource, /executeAiTool/);
  assert.match(routeSource, /tool_calls/);
  assert.match(routeSource, /tool_call_id/);
  assert.doesNotMatch(routeSource, /function executeInventoryTool/);
  assert.match(registrySource, /get_inventory_list/);
  assert.match(registrySource, /search_inventory_items/);
  assert.match(registrySource, /find_incomplete_items/);
  assert.match(registrySource, /summarize_inventory/);
  assert.match(registrySource, /recommend_outfit/);
  assert.match(inventoryToolsSource, /listItems/);
});

test("AI chat route exposes Wanxiang outfit image generation to DeepSeek", () => {
  assert.match(registrySource, /generate_outfit_image/);
  assert.match(registrySource, /executeWanxiangTool/);
  assert.match(routeSource, /maxToolRounds/);
  assert.match(routeSource, /generatedImages/);
  assert.match(routeSource, /images:\s*generatedImages/);
  assert.match(wanxiangSource, /DASHSCOPE_API_KEY/);
  assert.match(wanxiangSource, /wan2\.7-image-pro/);
  assert.match(
    wanxiangSource,
    /services\/aigc\/multimodal-generation\/generation/,
  );
  assert.match(wanxiangSource, /extractWanxiangImageUrls/);
  assert.match(outfitRouteSource, /generateWanxiangOutfitImage/);
});

test("AI assistant has theme-aware floating and dashboard-card dialog styles", () => {
  assert.match(styleSource, /ai-assistant-root/);
  assert.match(styleSource, /position:\s*fixed/);
  assert.match(styleSource, /right:\s*24px/);
  assert.match(styleSource, /bottom:\s*24px/);
  assert.match(styleSource, /z-index:\s*2147483000/);
  assert.match(styleSource, /ai-assistant-fab/);
  assert.match(styleSource, /width:\s*56px/);
  assert.match(styleSource, /height:\s*56px/);
  assert.match(styleSource, /ai-assistant-fab-icon/);
  assert.match(styleSource, /ai-assistant-fab-symbol/);
  assert.match(styleSource, /font-size:\s*28px/);
  assert.match(styleSource, /linear-gradient\([\s\S]*145deg/);
  assert.match(styleSource, /ai-assistant-panel/);
  assert.match(styleSource, /ai-assistant-panel-expanded/);
  assert.match(styleSource, /right:\s*12px/);
  assert.match(styleSource, /bottom:\s*56px/);
  assert.match(styleSource, /width:\s*min\(380px,\s*calc\(100vw - 48px\)\)/);
  assert.match(styleSource, /height:\s*min\(330px,\s*calc\(100dvh - 96px\)\)/);
  assert.match(styleSource, /home-ai-assistant-slot/);
  assert.match(
    styleSource,
    /home-dashboard-grid:has\(\.ai-assistant-root-expanded\)/,
  );
  assert.doesNotMatch(
    styleSource,
    /home-category-workspace:has\(\.ai-assistant-root-expanded\)[\s\S]*minmax\(320px,\s*360px\)/,
  );
  assert.match(styleSource, /ai-assistant-root\.ai-assistant-root-expanded/);
  assert.match(
    styleSource,
    /ai-assistant-root-expanded \.ai-assistant-panel-expanded/,
  );
  assert.match(styleSource, /position:\s*static/);
  assert.match(styleSource, /height:\s*100%/);
  assert.match(styleSource, /width:\s*100%/);
  assert.doesNotMatch(
    styleSource,
    /width:\s*min\(360px,\s*calc\(100vw - 324px\)\)/,
  );
  assert.doesNotMatch(styleSource, /height:\s*min\(720px/);
  assert.match(styleSource, /var\(--ai-assistant-theme-color/);
  assert.match(styleSource, /var\(--ai-assistant-theme-bg/);
  assert.match(styleSource, /var\(--ai-assistant-theme-text/);
  assert.match(styleSource, /ai-assistant-message-user/);
  assert.match(styleSource, /ai-assistant-message-assistant/);
  assert.match(styleSource, /ai-assistant-capabilities/);
  assert.match(styleSource, /ai-assistant-capability\.ant-btn-default/);
  assert.match(styleSource, /ai-assistant-textarea\.ant-input/);
  assert.match(styleSource, /ai-assistant-textarea\.ant-input-outlined/);
  assert.match(styleSource, /ai-assistant-send\.ant-btn-primary/);
  assert.match(styleSource, /background(?:-color)?:[\s\S]*!important/);
  assert.match(styleSource, /border-radius:\s*8px/);
});

test("AI assistant copies theme variables from the current app shell", () => {
  assert.match(assistantSource, /useEffect/);
  assert.match(assistantSource, /useRef/);
  assert.match(assistantSource, /syncThemeVariables/);
  assert.match(assistantSource, /document\.querySelector\("\.app-shell"\)/);
  assert.match(assistantSource, /getComputedStyle/);
  assert.match(assistantSource, /--home-theme-color/);
  assert.match(assistantSource, /--theme-page-color/);
  assert.match(assistantSource, /--app-texture-color/);
  assert.match(assistantSource, /--ai-assistant-theme-color/);
  assert.match(assistantSource, /--home-theme-bg/);
  assert.match(assistantSource, /--theme-page-bg/);
  assert.match(assistantSource, /--app-shell-bg/);
  assert.match(assistantSource, /--ai-assistant-theme-bg/);
  assert.match(assistantSource, /--home-theme-text/);
  assert.match(assistantSource, /--theme-page-text/);
  assert.match(assistantSource, /--app-texture-text/);
  assert.match(assistantSource, /--ai-assistant-theme-text/);
});

test("AI assistant exposes visible inventory capabilities", () => {
  assert.match(assistantSource, /assistantCapabilities/);
  assert.match(assistantSource, /缺图物品/);
  assert.match(assistantSource, /低库存护肤/);
  assert.match(assistantSource, /夏季衣服/);
  assert.match(assistantSource, /setDraft\(capability\.prompt\)/);
});

test("AI assistant keeps Wanxiang image generation as an explicit tool", () => {
  assert.match(registrySource, /generateWanxiangOutfitImage/);
  assert.match(registrySource, /generate_outfit_image/);
  assert.match(assistantSource, /先不要生成图片/);
});

test("AI assistant renders structured responses and generated outfit images", () => {
  assert.match(assistantSource, /images\?: string\[\]/);
  assert.match(assistantSource, /items\?: AssistantItem\[\]/);
  assert.match(assistantSource, /sections\?: AssistantSection\[\]/);
  assert.match(assistantSource, /suggestions\?: string\[\]/);
  assert.match(assistantSource, /result\.images/);
  assert.match(assistantSource, /result\.items/);
  assert.match(assistantSource, /result\.sections/);
  assert.match(assistantSource, /result\.suggestions/);
  assert.match(assistantSource, /ai-assistant-generated-images/);
  assert.match(assistantSource, /ai-assistant-generated-image/);
  assert.match(assistantSource, /ai-assistant-items/);
  assert.match(assistantSource, /ai-assistant-sections/);
  assert.match(assistantSource, /ai-assistant-suggestions/);
  assert.match(styleSource, /ai-assistant-generated-images/);
  assert.match(styleSource, /ai-assistant-items/);
  assert.match(styleSource, /ai-assistant-suggestions/);
  assert.match(styleSource, /object-fit:\s*cover/);
});
