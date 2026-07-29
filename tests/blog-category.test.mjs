import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(path) {
  try {
    return readFileSync(new URL(path, import.meta.url), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

const constantSource = readSource("../src/app/(pages)/home/constant.ts");
const configSource = readSource(
  "../src/app/(pages)/home/item-edit-config.ts",
);
const databaseSource = readSource("../src/app/utils/database.ts");
const pageSource = readSource("../src/app/(pages)/home/blog/page.tsx");
const apiSource = readSource("../src/app/api/blog/route.ts");
const modalSource = readSource(
  "../src/app/(pages)/home/clothes/clothes-create-modal.tsx",
);
const gallerySource = readSource(
  "../src/app/(pages)/home/clothes/clothes-gallery.tsx",
);
const aiInventoryToolsSource = readSource(
  "../src/app/api/ai/tools/inventory-tools.ts",
);
const aiToolRegistrySource = readSource("../src/app/api/ai/tools/registry.ts");

test("home category list contains blog notes", () => {
  assert.match(
    constantSource,
    /href:\s*"\/home\/blog"[\s\S]*iconClassName:\s*"icon-blog"[\s\S]*label:\s*"笔记"/,
  );
  assert.match(constantSource, /export const blogCategoryOptions/);
  assert.match(constantSource, /export const blogCategoryLabels/);
});

test("blog edit config uses url without image or file upload", () => {
  assert.match(configSource, /"\/home\/blog"[\s\S]*apiPath:\s*"\/api\/blog"/);
  assert.match(configSource, /"\/home\/blog"[\s\S]*hasImage:\s*false/);
  assert.match(configSource, /"\/home\/blog"[\s\S]*hasBookFile:\s*false/);
  assert.match(configSource, /"\/home\/blog"[\s\S]*hasUrl:\s*true/);
  assert.match(
    configSource,
    /"\/home\/blog"[\s\S]*itemCategoryOptions:\s*blogCategoryOptions/,
  );
});

test("database helpers map blog records by b_id with url", () => {
  assert.match(databaseSource, /type ItemCategory =[\s\S]*"blog"/);
  assert.match(databaseSource, /url\?:\s*string/);
  assert.match(databaseSource, /blog:\s*\{[\s\S]*idColumn:\s*"b_id"/);
  assert.match(
    databaseSource,
    /blog:\s*\{[\s\S]*selectFields:\s*"b_id,name,category,url"/,
  );
  assert.match(databaseSource, /blog:\s*\{[\s\S]*table:\s*"blog"/);
});

test("blog page renders shared gallery without image price date file upload", () => {
  assert.match(pageSource, /activeCategoryHref:\s*"\/home\/blog"/);
  assert.match(pageSource, /listItems\(supabase,\s*"blog",\s*userId\)/);
  assert.match(pageSource, /hasDate=\{false\}/);
  assert.match(pageSource, /hasPrice=\{false\}/);
  assert.match(pageSource, /itemCategoryLabels=\{blogCategoryLabels\}/);
  assert.match(pageSource, /itemLabel="笔记"/);
});

test("blog API writes b_id name category and url only", () => {
  assert.match(apiSource, /import \{ randomUUID \} from "crypto"/);
  assert.match(apiSource, /b_id:\s*randomUUID\(\)/);
  assert.match(apiSource, /createItem\(\s*supabase,\s*"blog"/);
  assert.match(apiSource, /updateItem\(\s*supabase,\s*"blog"/);
  assert.match(apiSource, /deleteItem\(\s*supabase,\s*"blog"/);
  assert.match(apiSource, /url:\s*values\.url/);
  assert.doesNotMatch(apiSource, /pic_url/);
  assert.doesNotMatch(apiSource, /download_url/);
  assert.doesNotMatch(apiSource, /deleteOwnOssObject/);
});

test("shared dialog and gallery support blog urls", () => {
  assert.match(modalSource, /hasUrl\?:\s*boolean/);
  assert.match(modalSource, /url\?:\s*string/);
  assert.match(modalSource, /clothesPayload\.url\s*=\s*values\.url/);
  assert.match(gallerySource, /item\.url/);
  assert.match(gallerySource, /href=\{item\.url\}/);
});

test("blog dialog uses the compact no-image modal layout", () => {
  assert.match(modalSource, /const modalWidth = hasImage \? 608 : 360/);
  assert.match(modalSource, /width=\{modalWidth\}/);
  assert.match(
    modalSource,
    /\? "flex justify-between gap-3"\s*:\s*"flex justify-end gap-3"/,
  );
});

test("ai inventory tools include blog", () => {
  assert.match(aiInventoryToolsSource, /blog:\s*"笔记"/);
  assert.match(
    aiToolRegistrySource,
    /clothes, pants, toiletries, books, hobby, cosmetic, skincare, blog/,
  );
});
