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
const configSource = readSource("../src/app/(pages)/home/item-edit-config.ts");
const databaseSource = readSource("../src/app/utils/database.ts");
const cosmeticPageSource = readSource("../src/app/(pages)/home/cosmetic/page.tsx");
const skincarePageSource = readSource("../src/app/(pages)/home/skincare/page.tsx");
const cosmeticApiSource = readSource("../src/app/api/cosmetic/route.ts");
const skincareApiSource = readSource("../src/app/api/skincare/route.ts");
const dialogSource = readSource("../src/app/(pages)/home/clothes/clothes-create-modal.tsx");
const ossSource = readSource("../src/utils/oss.ts");
const ossServerSource = readSource("../src/utils/oss-server.ts");
const ossPolicySource = readSource("../src/app/api/oss/policy/route.ts");

test("home category list contains cosmetic and skincare", () => {
  assert.match(constantSource, /href:\s*"\/home\/cosmetic"[\s\S]*iconClassName:\s*"icon-cosmetic"[\s\S]*label:\s*"化妆品"/);
  assert.match(constantSource, /href:\s*"\/home\/skincare"[\s\S]*iconClassName:\s*"icon-skincare"[\s\S]*label:\s*"护肤品"/);
});

test("category constants centralize book hobby cosmetic and skincare options", () => {
  assert.match(constantSource, /export const bookCategoryOptions[\s\S]*实体书[\s\S]*电子书/);
  assert.match(constantSource, /export const hobbyCategoryOptions[\s\S]*金属拼图[\s\S]*数字油画[\s\S]*钻石画/);
  assert.match(constantSource, /export const cosmeticCategoryOptions[\s\S]*口红[\s\S]*眼影/);
  assert.match(constantSource, /export const skincareCategoryOptions[\s\S]*面霜[\s\S]*眼霜/);
  assert.match(constantSource, /export const cosmeticCategoryLabels/);
  assert.match(constantSource, /export const skincareCategoryLabels/);
});

test("cosmetic and skincare edit configs match shared item behavior", () => {
  assert.match(configSource, /"\/home\/cosmetic"[\s\S]*apiPath:\s*"\/api\/cosmetic"/);
  assert.match(configSource, /"\/home\/cosmetic"[\s\S]*hasColor:\s*false/);
  assert.match(configSource, /"\/home\/cosmetic"[\s\S]*hasCount:\s*true/);
  assert.match(configSource, /"\/home\/cosmetic"[\s\S]*hasSeason:\s*false/);
  assert.match(configSource, /"\/home\/cosmetic"[\s\S]*itemCategoryOptions:\s*cosmeticCategoryOptions/);
  assert.match(configSource, /"\/home\/cosmetic"[\s\S]*uploadDirectory:\s*"cosmetic"/);
  assert.match(configSource, /"\/home\/skincare"[\s\S]*apiPath:\s*"\/api\/skincare"/);
  assert.match(configSource, /"\/home\/skincare"[\s\S]*hasColor:\s*false/);
  assert.match(configSource, /"\/home\/skincare"[\s\S]*hasCount:\s*true/);
  assert.match(configSource, /"\/home\/skincare"[\s\S]*hasSeason:\s*false/);
  assert.match(configSource, /"\/home\/skincare"[\s\S]*itemCategoryOptions:\s*skincareCategoryOptions/);
  assert.match(configSource, /"\/home\/skincare"[\s\S]*uploadDirectory:\s*"skincare"/);
});

test("database helpers map cosmetic and skincare records by their own ids", () => {
  assert.match(databaseSource, /type ItemCategory =[\s\S]*"cosmetic"[\s\S]*"skincare"/);
  assert.match(databaseSource, /cosmetic:\s*\{[\s\S]*idColumn:\s*"c_id"[\s\S]*selectFields:\s*"c_id,name,timeStamp,price,pic_url,count,category"/);
  assert.match(databaseSource, /skincare:\s*\{[\s\S]*idColumn:\s*"s_id"[\s\S]*selectFields:\s*"s_id,name,timeStamp,price,pic_url,count,category"/);
});

test("cosmetic and skincare pages render shared gallery with category labels", () => {
  assert.match(cosmeticPageSource, /activeCategoryHref:\s*"\/home\/cosmetic"/);
  assert.match(cosmeticPageSource, /listItems\(supabase,\s*"cosmetic",\s*userId\)/);
  assert.match(cosmeticPageSource, /itemCategoryLabels=\{cosmeticCategoryLabels\}/);
  assert.match(cosmeticPageSource, /itemLabel="化妆品"/);
  assert.match(cosmeticPageSource, /showCount/);
  assert.match(skincarePageSource, /activeCategoryHref:\s*"\/home\/skincare"/);
  assert.match(skincarePageSource, /listItems\(supabase,\s*"skincare",\s*userId\)/);
  assert.match(skincarePageSource, /itemCategoryLabels=\{skincareCategoryLabels\}/);
  assert.match(skincarePageSource, /itemLabel="护肤品"/);
  assert.match(skincarePageSource, /showCount/);
});

test("cosmetic and skincare APIs write ids categories count and images", () => {
  assert.match(cosmeticApiSource, /import \{ randomUUID \} from "crypto"/);
  assert.match(cosmeticApiSource, /const supportedCosmeticCategories = cosmeticCategoryOptions\.map/);
  assert.match(cosmeticApiSource, /c_id:\s*randomUUID\(\)/);
  assert.match(cosmeticApiSource, /createItem\(\s*supabase,\s*"cosmetic"/);
  assert.match(cosmeticApiSource, /category:\s*values\.category/);
  assert.match(cosmeticApiSource, /count:\s*values\.count/);
  assert.match(cosmeticApiSource, /pic_url:\s*values\.picUrl/);
  assert.match(cosmeticApiSource, /deleteOwnOssObject[\s\S]*"cosmetic"/);
  assert.match(skincareApiSource, /import \{ randomUUID \} from "crypto"/);
  assert.match(skincareApiSource, /const supportedSkincareCategories = skincareCategoryOptions\.map/);
  assert.match(skincareApiSource, /s_id:\s*randomUUID\(\)/);
  assert.match(skincareApiSource, /createItem\(\s*supabase,\s*"skincare"/);
  assert.match(skincareApiSource, /category:\s*values\.category/);
  assert.match(skincareApiSource, /count:\s*values\.count/);
  assert.match(skincareApiSource, /pic_url:\s*values\.picUrl/);
  assert.match(skincareApiSource, /deleteOwnOssObject[\s\S]*"skincare"/);
});

test("shared item dialog supports item category dropdown and count for new categories", () => {
  assert.match(dialogSource, /itemCategoryOptions/);
  assert.match(dialogSource, /hasCount/);
  assert.match(dialogSource, /name="category"[\s\S]*options=\{itemFormCategoryOptions\}/);
  assert.match(dialogSource, /name="count"/);
});

test("cosmetic and skincare images can upload to their OSS directories", () => {
  assert.match(ossSource, /"cosmetic"/);
  assert.match(ossSource, /"skincare"/);
  assert.match(ossServerSource, /"cosmetic"/);
  assert.match(ossServerSource, /"skincare"/);
  assert.match(ossPolicySource, /directory !== "cosmetic"/);
  assert.match(ossPolicySource, /directory !== "skincare"/);
});
