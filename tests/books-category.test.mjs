import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const constantSource = readFileSync(
  new URL("../src/app/(pages)/home/constant.ts", import.meta.url),
  "utf8",
);
const globalsSource = readFileSync(
  new URL("../src/app/globals.css", import.meta.url),
  "utf8",
);
const databaseSource = readFileSync(
  new URL("../src/app/utils/database.ts", import.meta.url),
  "utf8",
);
const pageSource = readFileSync(
  new URL("../src/app/(pages)/home/books/page.tsx", import.meta.url),
  "utf8",
);
const apiSource = readFileSync(
  new URL("../src/app/api/books/route.ts", import.meta.url),
  "utf8",
);
const dialogSource = readFileSync(
  new URL("../src/app/(pages)/home/clothes/clothes-create-modal.tsx", import.meta.url),
  "utf8",
);
const ossSource = readFileSync(
  new URL("../src/utils/oss.ts", import.meta.url),
  "utf8",
);
const ossServerSource = readFileSync(
  new URL("../src/utils/oss-server.ts", import.meta.url),
  "utf8",
);
const ossPolicySource = readFileSync(
  new URL("../src/app/api/oss/policy/route.ts", import.meta.url),
  "utf8",
);

test("home category list contains books", () => {
  assert.match(constantSource, /href:\s*"\/home\/books"[\s\S]*label:\s*"\u56fe\u4e66"/);
});

test("books category uses the refreshed iconfont class", () => {
  assert.match(constantSource, /href:\s*"\/home\/books"[\s\S]*iconClassName:\s*"icon-book"/);
  assert.doesNotMatch(constantSource, /BookOutlined/);
  assert.match(
    globalsSource,
    /font_4012350_rtxelimpn0g\.css\?t=1782734951619/,
  );
});

test("database helpers map books records by b_id", () => {
  assert.match(databaseSource, /type ItemCategory = [\s\S]*"books"/);
  assert.match(databaseSource, /books:\s*\{[\s\S]*idColumn:\s*"b_id"/);
  assert.match(databaseSource, /books:\s*\{[\s\S]*selectFields:\s*"b_id,name,price,pic_url,category"/);
  assert.match(databaseSource, /books:\s*\{[\s\S]*table:\s*"books"/);
});

test("books page renders the shared gallery without color season or date", () => {
  assert.match(pageSource, /activeCategoryHref:\s*"\/home\/books"/);
  assert.match(pageSource, /listItems\(supabase,\s*"books",\s*userId\)/);
  assert.match(pageSource, /hasColor=\{false\}/);
  assert.match(pageSource, /hasSeason=\{false\}/);
  assert.match(pageSource, /hasDate=\{false\}/);
  assert.match(pageSource, /hasBookCategory/);
  assert.match(pageSource, /itemLabel="\u56fe\u4e66"/);
});

test("books API writes b_id keyed books with custom category values", () => {
  assert.match(apiSource, /type BookCreatePayload = \{[\s\S]*category\?: number/);
  assert.match(apiSource, /b_id\?: string \| number/);
  assert.match(apiSource, /category:\s*values\.category/);
  assert.match(apiSource, /createItem\(\s*supabase,\s*"books"/);
  assert.match(apiSource, /updateItem\(\s*supabase,\s*"books"/);
  assert.match(apiSource, /getItemPicture\(supabase,\s*"books"/);
  assert.match(apiSource, /deleteItem\(\s*supabase,\s*"books"/);
  assert.match(apiSource, /deleteOwnOssObject\([^)]*\[[\s\n]*"books"[\s\n]*\]/);
});

test("item edit dialog exposes book category dropdown options", () => {
  assert.match(dialogSource, /hasBookCategory/);
  assert.match(dialogSource, /bookCategoryOptions[\s\S]*\u5b9e\u4f53\u4e66[\s\S]*value:\s*1/);
  assert.match(dialogSource, /bookCategoryOptions[\s\S]*\u7535\u5b50\u4e66[\s\S]*value:\s*2/);
  assert.match(dialogSource, /label="\u5206\u7c7b"[\s\S]*name="category"/);
});

test("books images can upload to the books OSS directory", () => {
  assert.match(ossSource, /"avatars" \| "clothes" \| "pants" \| "toiletries" \| "books"/);
  assert.match(ossServerSource, /"avatars" \| "clothes" \| "pants" \| "toiletries" \| "books"/);
  assert.match(ossPolicySource, /"avatars" \| "clothes" \| "pants" \| "toiletries" \| "books"/);
  assert.match(ossPolicySource, /directory !== "books"/);
});
