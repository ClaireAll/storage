# Storage AI Assistant 2.0: Read-Only Inventory Agent Design

## Overview

Storage already has a floating AI assistant, a `/api/ai/chat` route, DeepSeek chat completion, inventory tool calling, and Wanxiang outfit image generation. This design upgrades the existing chat from a general conversation panel into a read-only inventory agent that can reliably answer questions about the user's stored items.

The first implementation phase does not create a separate product, CLI, or new app. It improves the current assistant in place.

## Goals

- Let the assistant answer inventory questions with real data from Storage.
- Keep phase 1 read-only: the assistant can query, summarize, recommend, and point out missing data, but it cannot create, update, or delete records.
- Make tool calling explicit and testable instead of keeping all tool behavior inline inside the chat route.
- Return structured results that the frontend can render as text, sections, item cards, and follow-up suggestions.
- Add stable evaluation cases so future changes can prove that the assistant still calls the right tools and produces useful answers.

## Non-Goals

- No write operations in phase 1.
- No database schema migration for phase 1.
- No separate CLI, browser extension, or standalone AI product.
- No broad redesign of the home dashboard or category pages.
- No new provider abstraction unless it is required to isolate the current chat route cleanly.

## Existing Context

The current implementation already includes:

- `src/app/(pages)/common/ai-assistant.tsx`: floating assistant UI, message state, send flow, generated image rendering, and theme-variable sync.
- `src/app/api/ai/chat/route.ts`: DeepSeek request orchestration, tool definitions, inventory lookup, Wanxiang image generation, and tool-call loop.
- `src/app/utils/database.ts`: shared item helpers for clothes, pants, toiletries, books, hobby, cosmetic, skincare, and blog.
- Shared category UI built around `ClothesGallery` and `ItemEditDialog`, with category behavior controlled by config.

The upgrade should preserve these boundaries and avoid touching unrelated category UI.

## User Workflows

The assistant should handle these phase 1 questions:

- "我有哪些夏天能穿的衣服？"
- "找出所有缺图片的物品。"
- "护肤品里哪些数量小于 2？"
- "帮我从衣服和裤子里推荐一套日常搭配。"
- "我的书里哪些没有封面或文件？"
- "我最近记录了哪些笔记链接？"

For each question, the assistant should give:

- A direct answer.
- The matched items, when item-level data is relevant.
- A short reason for any recommendation.
- Missing-field or data-quality notes when relevant.
- Suggested next questions or manual actions.

## Recommended Architecture

### 1. Tool Registry

Create a small server-side tool registry for AI inventory tools. The chat route should import the registry instead of defining every tool inline.

Recommended files:

- `src/app/api/ai/tools/types.ts`
- `src/app/api/ai/tools/inventory-tools.ts`
- `src/app/api/ai/tools/registry.ts`

The registry owns:

- DeepSeek-compatible tool definitions.
- Tool name to executor mapping.
- Argument parsing and validation.
- Safe JSON output formatting.

The chat route owns:

- Authentication.
- Message normalization.
- DeepSeek request loop.
- Passing the current user id into tool executors.
- Returning the final assistant response to the frontend.

### 2. Read-Only Inventory Tools

Phase 1 should expose these tools:

#### `get_inventory_list`

Existing behavior retained. It lists items from a specific category.

Use when the user asks for a broad category list.

#### `search_inventory_items`

Searches across one or more categories using filters:

- category list
- keyword
- season
- color
- min/max price
- min/max count
- has image
- has file
- has url

Use when the user asks for matching items, such as summer clothes, black clothes, low-count skincare, or books without files.

#### `find_incomplete_items`

Finds items missing useful fields:

- missing image
- missing price
- missing category
- missing file
- missing url
- missing count

Use when the user asks what needs cleanup or which records are incomplete.

#### `summarize_inventory`

Returns grouped counts and simple aggregates:

- total by category
- items missing images
- items with low count
- rough price totals where price exists
- recently added categories if available from current fields

Use when the user asks for overview or inventory health.

#### `recommend_outfit`

Reads clothes and pants, then returns candidate combinations with reasons. It should not generate images by default. Image generation remains a separate existing tool that should only run when the user explicitly asks for a generated image.

Use when the user asks for outfits, matching, or what to wear.

### 3. Structured Assistant Response

The final `/api/ai/chat` response should support both current text replies and structured display data.

Recommended response shape:

```ts
type AssistantStructuredResponse = {
  reply: string;
  sections?: Array<{
    title: string;
    content: string;
  }>;
  items?: Array<{
    category: string;
    categoryLabel: string;
    id: string;
    imageUrl?: string;
    name: string;
    price?: number;
    subtitle?: string;
    url?: string;
  }>;
  suggestions?: string[];
  images?: string[];
};
```

The API should keep `reply` for backward compatibility. The frontend can render richer fields only when present.

### 4. Frontend Rendering

The assistant panel should keep the current chat interaction and theme-aware styling.

Add lightweight rendering support inside assistant messages:

- Text reply remains the primary content.
- `sections` render as compact titled blocks.
- `items` render as small inventory result rows or cards.
- `suggestions` render as buttons that fill the input draft.
- `images` keep the existing generated-image rendering.

The result UI should stay compact because the assistant panel is small. Full gallery redesign is outside this scope.

## Data Flow

1. User sends a message from `AiAssistant`.
2. Frontend posts normalized conversation to `/api/ai/chat`.
3. Chat route authenticates the session.
4. Chat route sends messages and tool definitions to DeepSeek.
5. DeepSeek requests a tool call when inventory data is needed.
6. Tool registry validates arguments and executes a read-only database query for the current user.
7. Chat route appends tool results and continues the tool loop.
8. DeepSeek returns the final answer.
9. Chat route normalizes the final answer into `AssistantStructuredResponse`.
10. Frontend renders text, sections, item results, suggestions, and generated images.

## Safety And Permissions

- Every inventory tool receives the authenticated `userId` from the server. The model never supplies the user id.
- Phase 1 tools only read data.
- Unknown tool names return a structured error instead of throwing through the whole request.
- Invalid arguments return a structured validation error for the model to recover from.
- Tool results should cap item arrays to a fixed size, such as 50, to avoid oversized model context.
- Image generation should remain explicit and separate from outfit recommendation.

## Error Handling

The assistant should handle:

- Missing login session: return 401 with the existing login message style.
- Missing API key: return a clear server configuration message.
- DeepSeek request failure: return the provider error if safe, otherwise a generic AI request failure.
- Tool validation failure: return JSON `{ "error": "...", "recoverable": true }`.
- Database error: return JSON `{ "error": "...", "recoverable": false }`.
- Empty tool result: answer with an empty-state explanation and a suggested next query.

## Testing And Eval

Keep the existing source-inspection tests where they are useful, but add focused tests for the new boundaries.

Recommended tests:

- Registry exposes all phase 1 tool definitions.
- Registry rejects unsupported tool names.
- Inventory tool argument parsing handles invalid JSON safely.
- Search filters map to expected item fields.
- Missing-field scan recognizes missing image, file, url, count, and price.
- Chat route imports tool definitions from the registry instead of declaring all tools inline.
- Frontend renders structured sections, item results, and suggestion buttons.

Recommended eval prompts:

- "找出所有缺图片的物品。"
- "护肤品里哪些数量小于 2？"
- "我有哪些夏天能穿的衣服？"
- "帮我从衣服和裤子里推荐一套日常搭配。"
- "我的书里哪些没有封面或文件？"

Each eval should assert the intended tool family, the response shape, and at least one expected item field when fixture data is used.

## Delivery Phases

### Phase 0: Text And Boundary Cleanup

- Fix user-facing mojibake in the assistant and AI route files that are touched by this work.
- Keep edits narrow; do not rewrite unrelated copy.
- Preserve existing assistant layout and generated-image behavior.

### Phase 1: Read-Only Tool Registry

- Move current tool definitions and executors into a small registry.
- Preserve `get_inventory_list` behavior.
- Add `search_inventory_items`, `find_incomplete_items`, `summarize_inventory`, and `recommend_outfit`.
- Keep all tools read-only.

### Phase 2: Structured Results

- Add structured response normalization in the chat route.
- Render sections, item results, and suggestion buttons in `AiAssistant`.
- Keep plain `reply` rendering as fallback.

### Phase 3: Evaluation Guardrails

- Add tests for registry, tools, chat-route wiring, and structured frontend rendering.
- Add a small eval fixture or deterministic source-level assertions for the key user prompts.

### Phase 4: Confirmed Write Operations

This phase is explicitly after read-only behavior is stable.

- Add tools that propose create/update/delete operations.
- Render a change preview in the assistant.
- Require user confirmation before executing any write.
- Record success or failure in the chat response.

## Acceptance Criteria For Phase 1-3

- Typecheck passes.
- Lint passes.
- Existing tests pass.
- New tests cover the tool registry and structured assistant rendering.
- The assistant can answer the five eval prompts without write operations.
- Outfit recommendation does not call image generation unless the user asks for an image.
- Existing generated outfit image flow still works.
- The assistant still respects the current theme-aware floating panel behavior.

## Implementation Constraints

- Keep changes compact and close to current AI assistant files.
- Do not split files aggressively unless the split creates a clear server-side tool boundary.
- Do not change unrelated spacing or category gallery behavior.
- Keep category data access through existing database helpers unless a missing helper is required for a tool.
- Preserve the current authenticated-user boundary.
- Use Chinese for user-facing assistant copy and keep it readable in UTF-8.

