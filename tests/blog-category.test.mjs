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
const readerSource = readSource("../src/app/(pages)/home/blog/blog-reader.tsx");
const apiSource = readSource("../src/app/api/blog/route.ts");
const modalSource = readSource(
  "../src/app/(pages)/home/clothes/clothes-create-modal.tsx",
);
const gallerySource = readSource(
  "../src/app/(pages)/home/clothes/clothes-gallery.tsx",
);
const homeViewSource = readSource("../src/app/(pages)/home/home-view.tsx");
const homeProfileSource = readSource("../src/app/(pages)/home/home-profile.tsx");
const styleSource = readSource("../src/app/(pages)/theme/styles/home.less");
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

test("blog page renders the dedicated split reader", () => {
  assert.match(pageSource, /activeCategoryHref:\s*"\/home\/blog"/);
  assert.match(pageSource, /listItems\(supabase,\s*"blog",\s*userId\)/);
  assert.match(pageSource, /<BlogReader items=\{blogItems\} \/>/);
  assert.doesNotMatch(pageSource, /ClothesGallery/);
  assert.match(readerSource, /blog-reader-shell/);
  assert.match(readerSource, /blog-reader-sidebar/);
  assert.match(readerSource, /blog-reader-preview/);
  assert.match(readerSource, /iframe/);
  assert.match(readerSource, /搜索笔记名称/);
  assert.match(readerSource, /aria-label="新增笔记"/);
  assert.match(
    readerSource,
    /aria-label="新增笔记"[\s\S]*icon=\{<PlusOutlined \/>\}[\s\S]*type="primary"/,
  );
  assert.doesNotMatch(
    readerSource,
    /aria-label="新增笔记"[\s\S]*shape="circle"[\s\S]*type="primary"/,
  );
  assert.match(
    styleSource,
    /blog-reader-add\.ant-btn-primary[\s\S]*height:\s*32px[\s\S]*min-width:\s*32px[\s\S]*width:\s*32px/,
  );
  assert.match(
    styleSource,
    /blog-reader-add\.ant-btn-primary[\s\S]*border-radius:\s*8px/,
  );
  assert.match(
    styleSource,
    /blog-reader-preview-header[\s\S]*min-height:\s*56px/,
  );
});

test("home title bar uses the compact 40px header", () => {
  assert.match(
    homeViewSource,
    /<header[\s\S]*className="[^"]*home-brand-header[^"]*h-10[^"]*py-0/,
  );
  assert.match(homeViewSource, /"--home-header-bg":\s*homeHeaderBackground/);
  assert.match(homeViewSource, /"--home-header-border":\s*homeBorderColor/);
  assert.match(
    homeViewSource,
    /className="home-brand-name flex h-10 items-center font-\['Dancing_Script',cursive\] text-\[28px\] leading-none"/,
  );
  assert.match(homeProfileSource, /className="home-profile-trigger group relative size-8/);
  assert.match(homeProfileSource, /"home-profile-avatar size-8! text-white! text-\[24px\]!/);
  assert.match(
    homeProfileSource,
    /icon=\{[\s\S]*headerAvatarUrl \? undefined :/,
  );
  assert.match(styleSource, /\.home-brand-header \{/);
  assert.match(
    styleSource,
    /background:\s*color-mix\([\s\S]*var\(--home-header-bg\) 72%/,
  );
  assert.doesNotMatch(styleSource, /border-radius:\s*12px 0 0 12px/);
  assert.doesNotMatch(styleSource, /border-left:\s*1px solid/);
  assert.match(styleSource, /\.home-brand-name \{/);
  assert.doesNotMatch(styleSource, /\.home-brand-name::after \{/);
  assert.match(styleSource, /\.home-profile-avatar\.ant-avatar \{/);
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
  assert.match(
    modalSource,
    /const modalWidth = hasImage \? \(hasMultipleImages \? 960 : 608\) : 360/,
  );
  assert.match(modalSource, /width=\{modalWidth\}/);
  assert.match(
    modalSource,
    /\? "flex justify-between gap-3"\s*:\s*"flex justify-end gap-3"/,
  );
});

test("gallery hides advanced filters when a category only supports name search", () => {
  assert.match(gallerySource, /const hasAdvancedControls =/);
  assert.match(gallerySource, /hidden=\{!hasAdvancedControls\}/);
  assert.match(gallerySource, /availableSortOptions\.length \? \(/);
  assert.match(
    gallerySource,
    /const shouldShowFilterDetails = hasAdvancedControls && filtersExpanded/,
  );
});

test("ai inventory tools include blog", () => {
  assert.match(aiInventoryToolsSource, /blog:\s*"笔记"/);
  assert.match(
    aiToolRegistrySource,
    /clothes, pants, toiletries, books, hobby, cosmetic, skincare, blog/,
  );
});
