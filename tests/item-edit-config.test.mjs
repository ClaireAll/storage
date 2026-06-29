import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/app/(pages)/home/item-edit-config.ts", import.meta.url),
  "utf8",
);

test("item edit config exposes all quick-add categories", () => {
  assert.match(source, /"\/home\/clothes"[\s\S]*uploadDirectory:\s*"clothes"/);
  assert.match(source, /"\/home\/pants"[\s\S]*uploadDirectory:\s*"pants"/);
  assert.match(source, /"\/home\/toiletries"[\s\S]*uploadDirectory:\s*"toiletries"/);
  assert.match(source, /"\/home\/books"[\s\S]*uploadDirectory:\s*"books"/);
});

test("toiletries config hides color and season and shows count", () => {
  assert.match(source, /"\/home\/toiletries"[\s\S]*hasColor:\s*false/);
  assert.match(source, /"\/home\/toiletries"[\s\S]*hasSeason:\s*false/);
  assert.match(source, /"\/home\/toiletries"[\s\S]*hasCount:\s*true/);
});

test("books config uses the books API and book-specific fields", () => {
  assert.match(source, /"\/home\/books"[\s\S]*apiPath:\s*"\/api\/books"/);
  assert.match(source, /"\/home\/books"[\s\S]*hasColor:\s*false/);
  assert.match(source, /"\/home\/books"[\s\S]*hasSeason:\s*false/);
  assert.match(source, /"\/home\/books"[\s\S]*hasDate:\s*false/);
  assert.match(source, /"\/home\/books"[\s\S]*hasBookCategory:\s*true/);
  assert.match(source, /"\/home\/books"[\s\S]*itemLabel:\s*"\u56fe\u4e66"/);
});
