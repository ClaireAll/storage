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
const clothesUtilsSource = readFileSync(
  new URL("../src/app/(pages)/home/clothes/clothes-utils.ts", import.meta.url),
  "utf8",
);
const gallerySource = readFileSync(
  new URL("../src/app/(pages)/home/clothes/clothes-gallery.tsx", import.meta.url),
  "utf8",
);
const clothesStyleSource = readFileSync(
  new URL("../src/app/(pages)/theme/styles/clothes.less", import.meta.url),
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
const ossUploadSource = readFileSync(
  new URL("../src/app/api/oss/upload/route.ts", import.meta.url),
  "utf8",
);

test("home category list contains hobby", () => {
  assert.match(constantSource, /href:\s*"\/home\/hobby"[\s\S]*label:\s*"爱好"/);
});

test("hobby config uses fixed hobby category options without file upload or color", () => {
  assert.match(configSource, /"\/home\/hobby"[\s\S]*apiPath:\s*"\/api\/hobby"/);
  assert.match(configSource, /"\/home\/hobby"[\s\S]*hasColor:\s*false/);
  assert.doesNotMatch(configSource, /"\/home\/hobby"[\s\S]*hasImage:\s*false/);
  assert.match(configSource, /"\/home\/hobby"[\s\S]*hasMultipleImages:\s*true/);
  assert.match(configSource, /"\/home\/hobby"[\s\S]*hasSeason:\s*false/);
  assert.doesNotMatch(configSource, /"\/home\/hobby"[\s\S]*hasBookCategory:\s*true/);
  assert.doesNotMatch(configSource, /"\/home\/hobby"[\s\S]*hasBookFile:\s*true/);
  assert.match(configSource, /"\/home\/hobby"[\s\S]*itemCategoryOptions:\s*hobbyCategoryOptions/);
  assert.match(constantSource, /hobbyCategoryOptions[\s\S]*金属拼图[\s\S]*value:\s*1/);
  assert.match(constantSource, /hobbyCategoryOptions[\s\S]*数字油画[\s\S]*value:\s*2/);
  assert.match(constantSource, /hobbyCategoryOptions[\s\S]*钻石画[\s\S]*value:\s*3/);
  assert.match(configSource, /"\/home\/hobby"[\s\S]*uploadDirectory:\s*"hobby"/);
});

test("database helpers map hobby records by h_id and pic_urls", () => {
  assert.match(databaseSource, /type ItemCategory =[\s\S]*"hobby"/);
  assert.match(databaseSource, /hobby:\s*\{[\s\S]*idColumn:\s*"h_id"/);
  assert.match(databaseSource, /hobby:\s*\{[\s\S]*selectFields:\s*"h_id,name,timeStamp,price,pic_urls,category"/);
  assert.match(databaseSource, /pic_urls\?: string\[\]/);
  assert.match(databaseSource, /select\(category === "hobby" \? "name,pic_urls" : "name,pic_url"\)/);
  assert.match(databaseSource, /h_id\?: string \| number/);
});

test("hobby page renders shared gallery with hobby-specific fields", () => {
  assert.match(pageSource, /activeCategoryHref:\s*"\/home\/hobby"/);
  assert.match(pageSource, /listItems\(supabase,\s*"hobby",\s*userId\)/);
  assert.match(pageSource, /itemCategoryLabels=\{hobbyCategoryLabels\}/);
  assert.match(pageSource, /itemLabel="爱好"/);
});

test("hobby API writes h_id keyed hobby rows with image url arrays", () => {
  assert.match(apiSource, /import \{ randomUUID \} from "crypto"/);
  assert.match(apiSource, /h_id:\s*randomUUID\(\)/);
  assert.match(apiSource, /category:\s*values\.category/);
  assert.match(apiSource, /pic_urls:\s*values\.picUrls/);
  assert.match(apiSource, /renameOwnOssObject/);
  assert.match(apiSource, /currentHobby\?\.name && currentHobby\.name !== values\.name/);
  assert.match(apiSource, /const renamedImageUrls: string\[\] = \[\]/);
  assert.match(apiSource, /for \(const pictureUrl of nextImageUrls\)/);
  assert.doesNotMatch(apiSource, /return Promise\.all\(\s*nextImageUrls\.map/);
  assert.match(apiSource, /pic_urls:\s*nextPicUrls/);
  assert.match(apiSource, /parseHobbyImageUrls/);
  assert.match(apiSource, /price:\s*values\.price/);
  assert.match(apiSource, /timeStamp:\s*values\.timeStamp/);
  assert.doesNotMatch(apiSource, /请上传爱好图片/);
  assert.match(apiSource, /createItem\(\s*supabase,\s*"hobby"/);
  assert.match(apiSource, /updateItem\(\s*supabase,\s*"hobby"/);
  assert.match(apiSource, /deleteItem\(\s*supabase,\s*"hobby"/);
});

test("shared dialog and gallery support hobby multiple image management", () => {
  assert.match(dialogSource, /itemCategoryOptions/);
  assert.match(dialogSource, /hasImage/);
  assert.match(dialogSource, /hasMultipleImages/);
  assert.match(dialogSource, /pic_urls/);
  assert.match(dialogSource, /共 \{imageDrafts\.length\} 张图片/);
  assert.match(dialogSource, /hasMultipleImages \? \(\s*imageError \? \(\s*<Typography\.Text className="text-xs" type="danger">\s*\{imageError\}/);
  assert.match(dialogSource, /设为封面/);
  assert.match(dialogSource, /getClipboardImageFiles/);
  assert.match(dialogSource, /document\.addEventListener\("paste",\s*pasteDocumentImage,\s*true\)/);
  assert.match(dialogSource, /document\.removeEventListener\("paste",\s*pasteDocumentImage,\s*true\)/);
  assert.match(dialogSource, /clipboardData\.items/);
  assert.match(dialogSource, /function prepareNewImageDraft/);
  assert.match(dialogSource, /onClick=\{prepareNewImageDraft\}/);
  assert.match(dialogSource, /const isSelectedImageCover = selectedImageDraftIndex === 0/);
  assert.match(dialogSource, /!\s*isSelectedImageCover \? \(/);
  assert.match(dialogSource, /setImageDrafts\(\(currentDrafts\) => \[\.\.\.currentDrafts, \.\.\.nextDrafts\]\);\s*const firstDraft = nextDrafts\[0\];\s*resetCrop\(\);\s*setCropSourceUrl\(firstDraft\?\.url \?\? ""\);\s*setIsCropping\(Boolean\(firstDraft\)\);\s*setSelectedImageDraftId\(firstDraft\?\.id \?\? ""\);/);
  assert.match(dialogSource, /function prepareNewImageDraft\(\) \{\s*setSelectedImageDraftId\(""\);/);
  assert.doesNotMatch(dialogSource, /selectedImageDraft[\s\S]*\?\?\s*imageDrafts\[0\]/);
  assert.match(dialogSource, /if \(!hasMultipleImages\) \{\s*closeModal\(\);/);
  assert.match(dialogSource, /picUrls = nextPicUrls;\s*closeModal\(\);/);
  assert.match(dialogSource, /replaceFileUrl:\s*shouldCropSelectedDraft && !draft\.file \? draft\.url : undefined/);
  assert.match(dialogSource, /clothes-multi-image-preview relative flex aspect-square/);
  assert.doesNotMatch(dialogSource, /clothes-multi-image-preview relative flex aspect-\[4\/3\]/);
  assert.match(dialogSource, /hasMultipleImages && selectedImageDraft && cropSourceUrl && isCropping/);
  assert.match(dialogSource, /setCropSourceUrl\(draft\?\.url \?\? ""\)/);
  assert.match(dialogSource, /setIsCropImageReady\(false\)/);
  assert.match(dialogSource, /setIsCropping\(Boolean\(draft\)\)/);
  assert.match(dialogSource, /setCropSourceUrl\(hasMultipleImages \? \(nextImageDrafts\[0\]\?\.url \?\? ""\) : ""\)/);
  assert.match(dialogSource, /setIsCropping\(hasMultipleImages && Boolean\(nextImageDrafts\[0\]\)\)/);
  assert.match(dialogSource, /clothes-multi-image-crop/);
  assert.match(dialogSource, /key=\{cropSourceUrl\}/);
  assert.match(dialogSource, /isCropImageReady\s*\?\s*"pointer-events-none absolute left-1\/2 top-1\/2 max-h-none max-w-none select-none"\s*:\s*"pointer-events-none size-full object-cover select-none"/);
  assert.match(dialogSource, /style=\{isCropImageReady \? getCropImageStyle\(\) : undefined\}/);
  assert.match(dialogSource, /clothes-multi-image-preview[^`]*\$\{\s*isDragOverUpload \? "is-drag-over" : ""\s*\}[^`]*\$\{\s*isUploadPasteReady \? "is-paste-ready" : ""\s*\}/);
  assert.match(dialogSource, /onPaste=\{pasteUpload\}[\s\S]*>\s*\{selectedImageDraft/);
  assert.match(dialogSource, /className="clothes-multi-image-empty"[\s\S]*<PlusOutlined className="text-2xl" \/>[\s\S]*双击 \/ 拖拽 \/ 粘贴上传/);
  assert.match(dialogSource, /hasImage \? \(/);
  assert.match(dialogSource, /hasBookFile \? \([\s\S]*label="文件"/);
  assert.match(dialogSource, /const itemFormCategoryOptions = itemCategoryOptions \?\? bookCategoryOptions/);
  assert.match(dialogSource, /name="category"[\s\S]*options=\{itemFormCategoryOptions\}/);
  assert.match(gallerySource, /hasPrice/);
  assert.match(gallerySource, /itemCategoryLabels/);
  assert.match(gallerySource, /hasPrice \?/);
  assert.match(gallerySource, /getItemImageUrls/);
  assert.match(gallerySource, /pic_urls/);
  assert.match(gallerySource, /Image\.PreviewGroup/);
  assert.match(gallerySource, /openImagePreview/);
  assert.match(gallerySource, /onClick=\{\(event\) => openImagePreview\(event\)\}/);
  assert.match(gallerySource, /open:\s*previewOpen/);
  assert.match(gallerySource, /onOpenChange:\s*\(open\) => setPreviewOpen\(open\)/);
  assert.doesNotMatch(gallerySource, /visible:\s*previewVisible/);
  assert.doesNotMatch(gallerySource, /onVisibleChange/);
});

test("hobby image crop can read existing OSS images for adjustment", () => {
  assert.equal(
    clothesUtilsSource.match(/image\.crossOrigin = "anonymous"/g)?.length,
    2,
  );
});

test("hobby image preview controls stay near the preview area", () => {
  assert.match(clothesStyleSource, /ant-image-preview-close/);
  assert.match(clothesStyleSource, /ant-image-preview-switch-left/);
  assert.match(clothesStyleSource, /ant-image-preview-switch-right/);
  assert.match(clothesStyleSource, /min\(86vw,\s*960px\)/);
});

test("hobby images can upload to the hobby OSS directory", () => {
  assert.match(ossSource, /"hobby"/);
  assert.match(ossServerSource, /"hobby"/);
  assert.match(ossServerSource, /renameOwnOssObject/);
  assert.match(ossServerSource, /x-oss-copy-source/);
  assert.match(ossServerSource, /\$\{directory\}\/\$\{userId\}\/\$\{baseName\}\$\{suffix\}\.\$\{extension\}/);
  assert.doesNotMatch(ossServerSource, /encodedBaseName/);
  assert.match(ossServerSource, /同名 OSS 文件过多/);
  assert.match(ossPolicySource, /"hobby"/);
  assert.match(ossPolicySource, /\$\{baseName\}\.\$\{extension\}/);
  assert.match(ossPolicySource, /\$\{baseName\}_\$\{index\}\.\$\{extension\}/);
  assert.doesNotMatch(ossPolicySource, /encodedBaseName/);
  assert.match(ossPolicySource, /directory !== "hobby"/);
  assert.match(ossSource, /fetchWithTimeout\("\/api\/oss\/upload"/);
  assert.match(ossSource, /const uploadTimeoutMs = 30_000/);
  assert.match(ossSource, /function fetchWithTimeout/);
  assert.match(ossSource, /function hasNonAsciiText/);
  assert.match(ossSource, /if \(replaceFileUrl \|\| hasNonAsciiText\(fileName\)\) \{\s*return uploadWithServerFallback\(\);/);
  assert.ok(
    ossSource.indexOf("if (replaceFileUrl || hasNonAsciiText(fileName))") <
      ossSource.indexOf('reqPost<OssPolicyResponse>("/api/oss/policy"'),
  );
  assert.match(ossSource, /\.catch\(\(\) => null\)/);
  assert.match(ossSource, /if \(!response\?\.ok\) \{\s*return uploadWithServerFallback\(\);/);
  assert.match(ossUploadSource, /encodeObjectKey/);
  assert.match(ossUploadSource, /replaceFileUrl/);
  assert.match(ossUploadSource, /getObjectKeyFromPublicUrl/);
  assert.match(ossUploadSource, /isOwnAllowedObjectKey/);
  assert.match(ossSource, /replaceFileUrl/);
  assert.match(ossUploadSource, /x-oss-object-acl:public-read/);
  assert.match(ossUploadSource, /\$\{baseName\}\$\{suffix\}\.\$\{extension\}/);
});
