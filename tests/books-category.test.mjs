import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const constantSource = readFileSync(
  new URL("../src/app/(pages)/home/constant.ts", import.meta.url),
  "utf8",
);
const globalsSource = readFileSync(
  new URL("../src/app/layout.tsx", import.meta.url),
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

test("home category list contains books", () => {
  assert.match(constantSource, /href:\s*"\/home\/books"[\s\S]*label:\s*"\u56fe\u4e66"/);
});

test("books category uses the refreshed iconfont class", () => {
  assert.match(constantSource, /href:\s*"\/home\/books"[\s\S]*iconClassName:\s*"icon-book"/);
  assert.doesNotMatch(constantSource, /BookOutlined/);
  assert.match(globalsSource, /href="\/iconfont\/iconfont\.css"/);
  assert.match(globalsSource, /<IconfontScriptLoader \/>/);
  assert.doesNotMatch(globalsSource, /at\.alicdn\.com/);
});

test("database helpers map books records by b_id", () => {
  assert.match(databaseSource, /type ItemCategory =[\s\S]*"books"/);
  assert.match(databaseSource, /books:\s*\{[\s\S]*idColumn:\s*"b_id"/);
  assert.match(databaseSource, /books:\s*\{[\s\S]*selectFields:\s*"b_id,name,price,pic_url,category,download_url"/);
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
  assert.match(apiSource, /import \{ randomUUID \} from "crypto"/);
  assert.match(apiSource, /type BookCreatePayload = \{[\s\S]*category\?: number/);
  assert.match(apiSource, /download_url\?: string/);
  assert.match(apiSource, /b_id\?: string \| number/);
  assert.match(apiSource, /b_id:\s*randomUUID\(\)/);
  assert.match(apiSource, /category:\s*values\.category/);
  assert.match(apiSource, /download_url:\s*values\.downloadUrl/);
  assert.match(apiSource, /getItemAssets\(supabase,\s*"books"/);
  assert.match(apiSource, /currentBook\.download_url/);
  assert.match(apiSource, /createItem\(\s*supabase,\s*"books"/);
  assert.match(apiSource, /updateItem\(\s*supabase,\s*"books"/);
  assert.match(apiSource, /deleteItem\(\s*supabase,\s*"books"/);
  assert.match(apiSource, /deleteOwnOssObject\([^)]*\[[\s\n]*"books"[\s\n]*\]/);
});

test("item edit dialog exposes book category dropdown options", () => {
  assert.match(dialogSource, /hasBookCategory/);
  assert.match(dialogSource, /hasBookFile/);
  assert.match(dialogSource, /uploadFileToOss/);
  assert.match(dialogSource, /bookFileInputRef/);
  assert.match(dialogSource, /download_url/);
  assert.match(dialogSource, /label="文件"/);
  assert.match(constantSource, /bookCategoryOptions[\s\S]*\u5b9e\u4f53\u4e66[\s\S]*value:\s*1/);
  assert.match(constantSource, /bookCategoryOptions[\s\S]*\u7535\u5b50\u4e66[\s\S]*value:\s*2/);
  assert.match(dialogSource, /label="\u5206\u7c7b"[\s\S]*name="category"/);
});

test("books can be saved without a cover image and show name placeholders", () => {
  assert.match(dialogSource, /const shouldRequireImage = hasImage && !hasBookCategory/);
  assert.match(dialogSource, /shouldRequireImage[\s\S]*!shouldUploadNewImage[\s\S]*!currentEditingClothes\?\.pic_url/);
  assert.doesNotMatch(apiSource, /请上传图书图片/);
  assert.match(gallerySource, /hasImage = Boolean\(item\.pic_url\)/);
  assert.match(gallerySource, /clothes-gallery-card-placeholder/);
  assert.match(gallerySource, /renderHighlightedClothesName\(item\.name, highlightIndexes\)/);
});

test("books with uploaded files expose a download action on image cards", () => {
  assert.match(gallerySource, /DownloadOutlined/);
  assert.match(gallerySource, /item\.download_url/);
  assert.match(gallerySource, /aria-label=\{`下载 \$\{item\.name\}`\}/);
  assert.match(gallerySource, /className="clothes-gallery-card-download-button clothes-gallery-card-edit-button"/);
  assert.match(gallerySource, /target="_blank"/);
});

test("books with uploaded files expose a download action on detail rows", () => {
  assert.match(gallerySource, /clothes-gallery-detail-action-cell/);
  assert.match(gallerySource, /className="clothes-gallery-detail-download-button"/);
  assert.match(gallerySource, /aria-label=\{`下载 \$\{item\.name\}`\}/);
  assert.match(gallerySource, /href=\{item\.download_url\}/);
});

test("books images can upload to the books OSS directory", () => {
  assert.match(ossSource, /uploadFileToOss/);
  assert.match(ossSource, /kind:\s*"file"/);
  assert.match(ossSource, /"books"/);
  assert.match(ossServerSource, /"books"/);
  assert.match(ossPolicySource, /"books"/);
  assert.match(ossPolicySource, /type OssUploadKind = "image" \| "file"/);
  assert.match(ossPolicySource, /directory !== "books"/);
});

test("book file uploads keep the original file name in OSS", () => {
  assert.match(ossPolicySource, /function createFileObjectKey/);
  assert.match(ossPolicySource, /sanitizeOssFileName\(fileName\)/);
  assert.match(ossPolicySource, /return `\$\{directory\}\/\$\{userId\}\/\$\{safeFileName\}`/);
  assert.match(ossPolicySource, /kind === "file"[\s\S]*createFileObjectKey/);
  assert.match(ossPolicySource, /kind === "image"[\s\S]*createImageObjectKey/);
});
