import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const constantSource = readFileSync(
  new URL("../src/app/(pages)/home/constant.ts", import.meta.url),
  "utf8",
);
const configSource = readFileSync(
  new URL("../src/app/(pages)/home/item-edit-config.ts", import.meta.url),
  "utf8",
);
const databaseSource = readFileSync(
  new URL("../src/app/utils/database.ts", import.meta.url),
  "utf8",
);
const pageSource = readFileSync(
  new URL("../src/app/(pages)/home/hobby/page.tsx", import.meta.url),
  "utf8",
);
const apiSource = readFileSync(
  new URL("../src/app/api/hobby/route.ts", import.meta.url),
  "utf8",
);
const dialogSource = readFileSync(
  new URL("../src/app/(pages)/home/clothes/clothes-create-modal.tsx", import.meta.url),
  "utf8",
);
const gallerySource = readFileSync(
  new URL("../src/app/(pages)/home/clothes/clothes-gallery.tsx", import.meta.url),
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

test("home category list contains hobby", () => {
  assert.match(constantSource, /href:\s*"\/home\/hobby"[\s\S]*label:\s*"爱好"/);
});

test("hobby config uses fixed hobby category options without file upload or color", () => {
  assert.match(configSource, /"\/home\/hobby"[\s\S]*apiPath:\s*"\/api\/hobby"/);
  assert.match(configSource, /"\/home\/hobby"[\s\S]*hasColor:\s*false/);
  assert.doesNotMatch(configSource, /"\/home\/hobby"[\s\S]*hasImage:\s*false/);
  assert.match(configSource, /"\/home\/hobby"[\s\S]*hasSeason:\s*false/);
  assert.doesNotMatch(configSource, /"\/home\/hobby"[\s\S]*hasBookCategory:\s*true/);
  assert.doesNotMatch(configSource, /"\/home\/hobby"[\s\S]*hasBookFile:\s*true/);
  assert.match(configSource, /"\/home\/hobby"[\s\S]*itemCategoryOptions:\s*hobbyCategoryOptions/);
  assert.match(constantSource, /hobbyCategoryOptions[\s\S]*金属拼图[\s\S]*value:\s*1/);
  assert.match(constantSource, /hobbyCategoryOptions[\s\S]*数字油画[\s\S]*value:\s*2/);
  assert.match(constantSource, /hobbyCategoryOptions[\s\S]*钻石画[\s\S]*value:\s*3/);
  assert.match(configSource, /"\/home\/hobby"[\s\S]*uploadDirectory:\s*"hobby"/);
});

test("database helpers map hobby records by h_id", () => {
  assert.match(databaseSource, /type ItemCategory =[\s\S]*"hobby"/);
  assert.match(databaseSource, /hobby:\s*\{[\s\S]*idColumn:\s*"h_id"/);
  assert.match(databaseSource, /hobby:\s*\{[\s\S]*selectFields:\s*"h_id,name,timeStamp,price,pic_url,category"/);
  assert.match(databaseSource, /h_id\?: string \| number/);
});

test("hobby page renders shared gallery with hobby-specific fields", () => {
  assert.match(pageSource, /activeCategoryHref:\s*"\/home\/hobby"/);
  assert.match(pageSource, /listItems\(supabase,\s*"hobby",\s*userId\)/);
  assert.match(pageSource, /itemCategoryLabels=\{hobbyCategoryLabels\}/);
  assert.match(pageSource, /itemLabel="爱好"/);
});

test("hobby API writes h_id keyed hobby rows", () => {
  assert.match(apiSource, /import \{ randomUUID \} from "crypto"/);
  assert.match(apiSource, /h_id:\s*randomUUID\(\)/);
  assert.match(apiSource, /category:\s*values\.category/);
  assert.match(apiSource, /pic_url:\s*values\.picUrl/);
  assert.match(apiSource, /price:\s*values\.price/);
  assert.match(apiSource, /timeStamp:\s*values\.timeStamp/);
  assert.match(apiSource, /请上传爱好图片/);
  assert.match(apiSource, /createItem\(\s*supabase,\s*"hobby"/);
  assert.match(apiSource, /updateItem\(\s*supabase,\s*"hobby"/);
  assert.match(apiSource, /deleteItem\(\s*supabase,\s*"hobby"/);
});

test("shared dialog and gallery support hobby categories with image upload and hidden file upload", () => {
  assert.match(dialogSource, /itemCategoryOptions/);
  assert.match(dialogSource, /hasImage/);
  assert.match(dialogSource, /hasImage \? \(/);
  assert.match(dialogSource, /hasBookFile \? \([\s\S]*label="文件"/);
  assert.match(dialogSource, /const itemFormCategoryOptions = itemCategoryOptions \?\? bookCategoryOptions/);
  assert.match(dialogSource, /name="category"[\s\S]*options=\{itemFormCategoryOptions\}/);
  assert.match(gallerySource, /hasPrice/);
  assert.match(gallerySource, /itemCategoryLabels/);
  assert.match(gallerySource, /hasPrice \?/);
});

test("hobby images can upload to the hobby OSS directory", () => {
  assert.match(ossSource, /"hobby"/);
  assert.match(ossServerSource, /"hobby"/);
  assert.match(ossPolicySource, /"hobby"/);
  assert.match(ossPolicySource, /directory !== "hobby"/);
});
