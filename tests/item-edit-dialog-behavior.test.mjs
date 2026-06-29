import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dialogSource = readFileSync(
  new URL("../src/app/(pages)/home/clothes/clothes-create-modal.tsx", import.meta.url),
  "utf8",
);
const homeViewSource = readFileSync(
  new URL("../src/app/(pages)/home/home-view.tsx", import.meta.url),
  "utf8",
);

test("item edit form labels the name field as name title", () => {
  assert.match(dialogSource, /label="\\u540d\\u79f0"|label="名称"/);
  assert.doesNotMatch(dialogSource, /label="\\u540d\\u5b57"|label="名字"/);
  assert.match(dialogSource, /请输入\$\{itemLabel\}名称/);
});

test("base item fields render even before a category is selected", () => {
  const nameFieldIndex = dialogSource.indexOf('label="名称"');
  const dateFieldIndex = dialogSource.indexOf('label="日期"');
  const priceFieldIndex = dialogSource.indexOf('label="价格"');

  assert.ok(nameFieldIndex > 0, "name field exists");
  assert.ok(dateFieldIndex > 0, "date field exists");
  assert.ok(priceFieldIndex > 0, "price field exists");
  assert.doesNotMatch(dialogSource, /\{hasSelectedCategory\s*&&\s*\(/);
});

test("quick add defaults to first category while category add hides category select", () => {
  assert.match(
    homeViewSource,
    /setSelectedItemCategoryHref\(itemCategoryOptions\[0\]\?\.value\)/,
  );
  assert.match(homeViewSource, /setShouldShowItemCategorySelect\(true\)/);
  assert.match(homeViewSource, /setShouldShowItemCategorySelect\(false\)/);
  assert.match(dialogSource, /showCategorySelect/);
  assert.match(
    dialogSource,
    /showCategorySelect && categoryOptions\?\.length/,
  );
});
