import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const cssBlock = (source, selector) =>
  source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? "";

const listSourceFiles = (directory, prefix = "") =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${prefix}${entry.name}`;
    const entryUrl = new URL(
      `${entry.name}${entry.isDirectory() ? "/" : ""}`,
      directory,
    );

    if (entry.isDirectory()) {
      return listSourceFiles(entryUrl, `${relativePath}/`);
    }

    return /\.(?:ts|tsx)$/.test(entry.name)
      ? [{ path: relativePath, source: readFileSync(entryUrl, "utf8") }]
      : [];
  });

test("hobby sharing defines snapshot contracts and duration helpers", () => {
  const types = read("src/app/api/share/hobby/share-types.ts");
  const utils = read("src/app/api/share/hobby/share-utils.ts");

  assert.match(types, /type HobbyShareExpiry = "day" \| "week" \| "month" \| "forever"/);
  assert.match(types, /type HobbyShareSlide/);
  assert.match(types, /type HobbyShareResolutionStatus/);
  assert.match(utils, /function flattenHobbyShareSlides/);
  assert.match(utils, /item\.pic_urls/);
  assert.match(utils, /24 \* 60 \* 60 \* 1000/);
  assert.match(utils, /30 \* 24 \* 60 \* 60 \* 1000/);
});

test("hobby share migration stores snapshots and hides password hashes", () => {
  const migrationPath =
    "supabase/migrations/20260730_create_hobby_shares.sql";
  assert.equal(existsSync(new URL(`../${migrationPath}`, import.meta.url)), true);
  const sql = read(migrationPath);

  assert.match(sql, /create table if not exists public\.hobby_shares/i);
  assert.match(sql, /create or replace function public\.create_hobby_share/i);
  assert.match(sql, /create or replace function public\.resolve_hobby_share/i);
  assert.match(sql, /extensions\.crypt/i);
  assert.match(sql, /password_required/);
  assert.match(sql, /invalid_password/);
  assert.match(sql, /expired/);
  assert.match(sql, /not_found/);
  assert.match(sql, /revoke all on table public\.hobby_shares from anon, authenticated/i);
});

test("hobby share migration rejects malformed or empty image slides", () => {
  const sql = read("supabase/migrations/20260730_create_hobby_shares.sql");

  assert.match(sql, /create or replace function public\.hobby_share_slides_are_valid/i);
  assert.match(sql, /jsonb_array_elements\(p_slides\)/i);
  assert.match(sql, /jsonb_typeof\(slide\.value\) <> 'object'/i);
  assert.match(
    sql,
    /jsonb_typeof\(slide\.value -> 'imageUrl'\) is distinct from 'string'/i,
  );
  assert.match(sql, /btrim\(slide\.value ->> 'imageUrl'\) = ''/i);
  assert.match(
    sql,
    /constraint hobby_shares_valid_slides\s+check \(public\.hobby_share_slides_are_valid\(slides\)\)/is,
  );
});

test("hobby share database wrappers preserve the RPC and public data boundary", () => {
  const database = read("src/app/utils/database.ts");

  assert.match(database, /export async function createHobbyShare/);
  assert.match(database, /\.rpc\("create_hobby_share", \{/);
  assert.match(database, /p_expires_at: values\.expiresAt/);
  assert.match(database, /p_owner_id: values\.ownerId/);
  assert.match(database, /p_password: values\.password \|\| null/);
  assert.match(database, /p_slides: values\.slides/);
  assert.match(database, /p_theme: values\.theme/);
  assert.match(database, /expiresAt: data\.expires_at/);
  assert.match(database, /export async function resolveHobbyShare/);
  assert.match(database, /\.rpc\("resolve_hobby_share", \{/);
  assert.match(database, /p_token: token/);
  assert.match(database, /slides: data\.slides \?\? \[\]/);
  assert.match(database, /export async function listHobbyShares/);
  assert.match(database, /\.from\("hobby_shares"\)/);
  assert.match(database, /\.select\("token,expires_at,created_at,password_hash"\)/);
  assert.match(database, /\.eq\("owner_id", ownerId\)/);
  assert.match(database, /hasPassword: Boolean\(item\.password_hash\)/);
  assert.match(database, /export function deleteHobbyShare/);
  assert.match(
    database,
    /\.delete\(\)[\s\S]*?\.eq\("owner_id", ownerId\)[\s\S]*?\.eq\("token", token\)/,
  );
});

test("share creation API snapshots only the authenticated user's hobby data", () => {
  const source = read("src/app/api/share/hobby/route.ts");

  assert.match(source, /export async function GET\(request: Request\)/);
  assert.match(source, /const session = await auth\(\)/);
  assert.match(source, /listHobbyShares\(adminSupabase, session\.user\.id\)/);
  assert.match(source, /shares: result\.data\.map/);
  assert.match(source, /listItems\(supabase, "hobby", session\.user\.id\)/);
  assert.match(source, /getThemeRow\(supabase, session\.user\.id\)/);
  assert.match(source, /flattenHobbyShareSlides/);
  assert.match(source, /getHobbyShareExpiresAt/);
  assert.match(source, /createHobbyShare/);
  assert.match(source, /暂无可分享的爱好图片/);
  assert.match(source, /密码不能超过 64 个字符/);
});

test("public resolver maps every share status without exposing a password hash", () => {
  const source = read("src/app/api/share/hobby/[token]/route.ts");

  assert.match(source, /export async function GET/);
  assert.match(source, /export async function POST/);
  assert.match(source, /export async function DELETE/);
  assert.match(source, /resolveHobbyShare/);
  assert.match(
    source,
    /deleteHobbyShare\(\s*adminSupabase,\s*session\.user\.id,\s*token\.trim\(\),\s*\)/,
  );
  assert.match(source, /password_required/);
  assert.match(source, /invalid_password/);
  assert.match(source, /status: 410/);
  assert.match(source, /status: 404/);
  assert.doesNotMatch(source, /password_hash/);
});

test("home header puts a themed hobby share control before theme settings", () => {
  const home = read("src/app/(pages)/home/home-view.tsx");
  const control = read(
    "src/app/(pages)/home/share/hobby-share-control.tsx",
  );
  const shareIndex = home.indexOf("<HobbyShareControl");
  const themeIndex = home.indexOf("<ThemeControl");

  assert.ok(shareIndex >= 0);
  assert.ok(themeIndex > shareIndex);
  assert.match(control, /aria-label="分享爱好页面"/);
  assert.match(control, /HobbyShareDialog/);
});

test("share dialog defaults to one week and exposes the four expiry options", () => {
  const dialog = read(
    "src/app/(pages)/home/share/hobby-share-dialog.tsx",
  );

  assert.match(dialog, /useState<HobbyShareExpiry>\("week"\)/);
  assert.match(
    dialog,
    /<Form\.Item label="分享内容">[\s\S]*?<Input[\s\S]*?readOnly[\s\S]*?value="爱好"/,
  );
  assert.match(dialog, /label: "1 天", value: "day"/);
  assert.match(dialog, /label: "1 周", value: "week"/);
  assert.match(dialog, /label: "1 月", value: "month"/);
  assert.match(dialog, /label: "永不失效", value: "forever"/);
  assert.match(dialog, /到期说明：永久有效/);
  assert.match(dialog, /maxLength=\{64\}/);
  assert.match(dialog, /复制链接/);
  assert.match(dialog, /新窗口预览/);
  assert.match(dialog, /type HobbyShareListItem/);
  assert.match(dialog, /loadExistingShares/);
  assert.match(dialog, /fetch\("\/api\/share\/hobby"/);
  assert.match(dialog, /已创建的链接/);
  assert.match(dialog, /删除链接/);
  assert.match(dialog, /deleteShare\(share\.token\)/);
});

test("share dialog invalidates closed requests before stale responses can update state", () => {
  const dialog = read(
    "src/app/(pages)/home/share/hobby-share-dialog.tsx",
  );

  assert.match(dialog, /useRef\(0\)/);
  assert.match(dialog, /new AbortController\(\)/);
  assert.match(dialog, /signal: controller\.signal/);
  assert.match(dialog, /function invalidateCreateRequest\(\)/);
  assert.match(dialog, /requestId !== requestIdRef\.current/);
  assert.match(
    dialog,
    /if \(requestId === requestIdRef\.current\) \{[\s\S]*?setIsCreating\(false\);/,
  );
  assert.match(
    dialog,
    /function closeDialog\(\) \{\s+invalidateCreateRequest\(\);\s+invalidateListRequest\(\);\s+onClose\(\);/,
  );
  assert.match(
    dialog,
    /function resetDialog\(\) \{\s+invalidateCreateRequest\(\);/,
  );
});

test("share dialog uses the home shell final child as a non-blocking top portal host", () => {
  const home = read("src/app/(pages)/home/home-view.tsx");
  const control = read(
    "src/app/(pages)/home/share/hobby-share-control.tsx",
  );
  const dialog = read(
    "src/app/(pages)/home/share/hobby-share-dialog.tsx",
  );
  const styles = read("src/app/(pages)/theme/styles/hobby-share.less");

  assert.match(
    home,
    /useState<HTMLDivElement \| null>\(null\)/,
  );
  assert.match(
    home,
    /<HobbyShareControl portalHost=\{hobbySharePortalHost\} \/>/,
  );
  assert.match(
    home,
    /<div\s+className="home-hobby-share-portal-host"\s+ref=\{setHobbySharePortalHost\}\s*\/>\s*<\/Layout>/,
  );
  assert.match(control, /portalHost: HTMLElement \| null/);
  assert.match(
    control,
    /portalHost \? \(\s*<HobbyShareDialog[\s\S]*?getContainer=\{portalHost\}/,
  );
  assert.doesNotMatch(control, /document\.body/);
  assert.match(dialog, /getContainer: HTMLElement/);
  assert.match(dialog, /getContainer=\{getContainer\}/);
  assert.match(
    styles,
    /\.home-hobby-share-portal-host \{[\s\S]*?height: 0;[\s\S]*?pointer-events: none;[\s\S]*?position: relative;[\s\S]*?width: 0;[\s\S]*?z-index: 2147483500;/,
  );
  assert.match(
    styles,
    /\.home-hobby-share-portal-host \.ant-modal-(?:mask|wrap)[\s\S]*?pointer-events: auto;/,
  );
});

test("public hobby share uses Swiper coverflow with a fixed centered Flame Wrap overlay", () => {
  const packageJson = read("package.json");
  const page = read(
    "src/app/(share)/share/hobby/[token]/hobby-share-view.tsx",
  );
  const styles = read("src/app/(pages)/theme/styles/hobby-share.less");
  const staticWrapBlock = cssBlock(styles, ".hobby-share-static-wrap");
  const cardBlock = cssBlock(styles, ".hobby-share-card");
  const flameOverlayBlock = cssBlock(styles, ".hobby-share-flame-overlay");
  const imageFrameBlock = cssBlock(styles, ".hobby-share-image-frame");
  const imageBlock = cssBlock(styles, ".hobby-share-image");
  const navButtonBlock = cssBlock(styles, ".hobby-share-nav-button");
  const navFocusBlock = cssBlock(styles, ".hobby-share-nav-button:focus-visible");
  const navHoverBlock = cssBlock(styles, ".hobby-share-nav-button:hover");
  const navPrevBlock = cssBlock(styles, ".hobby-share-nav-button-prev");
  const navNextBlock = cssBlock(styles, ".hobby-share-nav-button-next");

  assert.match(packageJson, /"swiper":/);
  assert.match(page, /from "swiper\/react"/);
  assert.match(page, /EffectCoverflow/);
  assert.doesNotMatch(page, /Autoplay/);
  assert.match(page, /effect="coverflow"/);
  assert.doesNotMatch(page, /EffectCards/);
  assert.doesNotMatch(page, /effect="cards"/);
  assert.doesNotMatch(page, /autoplay=\{\{/);
  assert.match(page, /hobbyShareCarouselRepeatCount = 3/);
  assert.match(page, /hobbyShareCarouselDelay = 3200/);
  assert.match(page, /createHobbyShareCarouselItems\(resolution\.slides\)/);
  assert.match(page, /initialSlide=\{getInitialCarouselSlide\(resolution\.slides\.length\)\}/);
  assert.doesNotMatch(page, /loop=\{/);
  assert.doesNotMatch(page, /loopAdditionalSlides=/);
  assert.match(page, /setActiveIndex\(carouselSlides\[swiper\.activeIndex\]\?\.sourceIndex \?\? 0\)/);
  assert.match(page, /window\.setInterval\(\(\) => \{/);
  assert.match(page, /swiper\.slideNext\(\)/);
  assert.match(page, /function moveCarousel\(direction: "next" \| "prev"\)/);
  assert.match(page, /swiper\.slidePrev\(\)/);
  assert.match(page, /aria-label="爱好图片切换"/);
  assert.match(page, /aria-label="上一张爱好图片"/);
  assert.match(page, /aria-label="下一张爱好图片"/);
  assert.match(page, /onClick=\{\(\) => moveCarousel\("prev"\)\}/);
  assert.match(page, /onClick=\{\(\) => moveCarousel\("next"\)\}/);
  assert.match(page, /normalizeCarouselPosition\(swiper, resolution\.slides\.length\)/);
  assert.doesNotMatch(page, /rewind=/);
  assert.match(page, /swiper\/css\/effect-coverflow/);
  assert.doesNotMatch(page, /swiper\/css\/effect-cards/);
  assert.match(page, /activeSlide && !prefersReducedMotion \?/);
  assert.match(page, /<FlameWrap/);
  assert.match(page, /height=\{88\}/);
  assert.match(page, /intensity=\{1\.05\}/);
  assert.match(page, /radius=\{24\}/);
  assert.match(page, /spread=\{20\}/);
  assert.match(page, /sparkDensity=\{1\.2\}/);
  assert.doesNotMatch(page, /flameLayoutVersion/);
  assert.doesNotMatch(page, /refreshFlameLayout/);
  assert.doesNotMatch(page, /onResize=\{/);
  assert.doesNotMatch(page, /key=\{`\$\{activeSlide\.hobbyId/);
  assert.doesNotMatch(page, /object-cover/);
  assert.match(page, /className="hobby-share-flame-overlay"/);
  assert.match(page, /hobby-share-image-frame/);
  assert.match(styles, /\.hobby-share-image-frame \{/);
  assert.match(flameOverlayBlock, /left: 50%;/);
  assert.match(flameOverlayBlock, /position: absolute;/);
  assert.match(flameOverlayBlock, /z-index: 5;/);
  assert.match(flameOverlayBlock, /transform: translateX\(-50%\);/);
  assert.match(flameOverlayBlock, /width: var\(--hobby-share-card-width\);/);
  assert.match(imageBlock, /mask-image:/);
  assert.match(imageBlock, /object-fit: contain;/);
  assert.match(imageBlock, /width: 100%;/);
  assert.match(styles, /--hobby-share-nav-bg: rgb\(18 23 33 \/ 72%\);/);
  assert.match(navButtonBlock, /background: var\(--hobby-share-nav-bg\);/);
  assert.match(navButtonBlock, /color: var\(--hobby-share-nav-text\);/);
  assert.match(navHoverBlock, /background: var\(--hobby-share-nav-hover-bg\);/);
  assert.match(navFocusBlock, /outline: 2px solid var\(--hobby-share-nav-focus\);/);
  assert.doesNotMatch(`${navButtonBlock}\n${navHoverBlock}\n${navFocusBlock}`, /hobby-share-color/);
  assert.match(navButtonBlock, /pointer-events: auto;/);
  assert.match(styles, /\.hobby-share-nav-button:focus-visible \{/);
  assert.match(navPrevBlock, /left: max/);
  assert.match(navNextBlock, /right: max/);
  assert.doesNotMatch(staticWrapBlock, /border:/);
  assert.doesNotMatch(cardBlock, /hobby-share-color/);
  assert.doesNotMatch(imageFrameBlock, /hobby-share-color/);
  assert.doesNotMatch(imageBlock, /outline:/);
  assert.match(page, /className="hobby-share-title"/);
  assert.doesNotMatch(page, /pagination=/);
  assert.doesNotMatch(page, /navigation=/);
});

test("public hobby share keeps the coverflow title external, side slides visible, and flame frame centered", () => {
  const page = read(
    "src/app/(share)/share/hobby/[token]/hobby-share-view.tsx",
  );
  const styles = read("src/app/(pages)/theme/styles/hobby-share.less");
  const pageBlock = cssBlock(styles, ".hobby-share-page");
  const swiperBlock = cssBlock(styles, ".hobby-share-swiper");
  const cardBlock = cssBlock(styles, ".hobby-share-card");

  assert.match(page, /const activeSlide = resolution\.slides\[activeIndex\]/);
  assert.match(page, /<h2 className="hobby-share-title" title=\{activeSlide\.name\}>/);
  assert.doesNotMatch(page, /<h2 title=\{slide\.name\}>/);
  assert.match(page, /captureContent=\{false\}/);
  assert.doesNotMatch(page, /flameLayoutVersion/);
  assert.doesNotMatch(page, /refreshFlameLayout/);
  assert.doesNotMatch(page, /onResize=\{/);
  assert.match(page, /stretch: 24/);
  assert.doesNotMatch(page, /stretch: -/);
  assert.doesNotMatch(page, /loop=\{/);
  assert.doesNotMatch(page, /loopAdditionalSlides=/);
  assert.match(page, /setActiveIndex\(carouselSlides\[swiper\.activeIndex\]\?\.sourceIndex \?\? 0\)/);
  assert.match(page, /onSlideChangeTransitionEnd=\{\(swiper\) =>/);
  assert.match(page, /normalizeCarouselPosition\(swiper, resolution\.slides\.length\)/);
  assert.match(page, /onSwiper=\{\(swiper\) => \{/);
  assert.match(page, /swiperRef\.current = swiper/);
  assert.match(page, /window\.setInterval\(\(\) => \{/);
  assert.match(page, /swiper\.slideNext\(\)/);
  assert.doesNotMatch(page, /rewind=/);
  assert.match(page, /coverflowEffect=\{\{[\s\S]*?slideShadows: false/);
  assert.match(pageBlock, /--hobby-share-slide-width: min\(62vw, 380px\);/);
  assert.match(pageBlock, /--hobby-share-card-width: calc\(var\(--hobby-share-slide-width\) - 48px\);/);
  assert.match(swiperBlock, /overflow: visible;/);
  assert.match(swiperBlock, /width: min\(100vw, 970px\);/);
  assert.match(
    styles,
    /\.hobby-share-swiper \.swiper-slide \{[\s\S]*?opacity: 0;[\s\S]*?transition: opacity 360ms ease;/,
  );
  assert.match(
    styles,
    /\.hobby-share-swiper \.swiper-slide-active,[\s\S]*?\.hobby-share-swiper \.swiper-slide-next,[\s\S]*?\.hobby-share-swiper \.swiper-slide-prev \{[\s\S]*?opacity: 1;/,
  );
  assert.match(styles, /\.hobby-share-swiper \.swiper-slide \{[\s\S]*?padding: var\(--hobby-share-slide-padding\);/);
  assert.match(cardBlock, /background: linear-gradient/);
  assert.match(cardBlock, /border-radius: 24px;/);
  assert.doesNotMatch(styles, /\.hobby-share-active-wrap::before/);
});

test("public share hides the shared home texture and supports protected links", () => {
  const texture = read(
    "src/app/(pages)/theme/shared-theme-texture.tsx",
  );
  const page = read("src/app/(share)/share/hobby/[token]/page.tsx");
  const view = read(
    "src/app/(share)/share/hobby/[token]/hobby-share-view.tsx",
  );

  assert.match(texture, /pathname\.startsWith\("\/share\/hobby\/"\)/);
  assert.match(page, /resolveHobbyShare/);
  assert.match(view, /请输入访问密码/);
  assert.match(view, /密码错误，请重新输入/);
  assert.match(view, /分享链接已失效/);
  assert.match(view, /分享链接不存在/);
});

test("public share renders the complete theme snapshot without hydrating system mode", () => {
  const view = read(
    "src/app/(share)/share/hobby/[token]/hobby-share-view.tsx",
  );
  const styles = read("src/app/(pages)/theme/styles/hobby-share.less");

  assert.match(view, /useState\(true\)/);
  assert.match(view, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(view, /activeSlide && !prefersReducedMotion/);
  assert.match(view, /theme\.light\.bg/);
  assert.match(view, /theme\.light\.color/);
  assert.match(view, /theme\.light\.text/);
  assert.match(view, /theme\.dark\.bg/);
  assert.match(view, /theme\.dark\.color/);
  assert.match(view, /theme\.dark\.text/);
  assert.match(view, /ThemeFallingLights/);
  assert.match(view, /isActive=\{theme\?\.texture === "meteor"\}/);
  assert.match(view, /ThemeGeometryTexture/);
  assert.match(view, /texture=\{theme\?\.texture \?\? "none"\}/);
  assert.match(view, /"--app-texture-color": theme\.aniTheme \?\? activePalette\.color/);
  assert.match(view, /data-theme-mode=\{theme\?\.mode\}/);
  assert.match(view, /data-theme-texture=\{theme\?\.texture\}/);
  assert.match(styles, /@media \(prefers-color-scheme: dark\)/);
  assert.match(
    styles,
    /\.hobby-share-page\[data-theme-mode="system"\]/,
  );
});

test("ready share snapshots reject malformed runtime themes and slides", async () => {
  const { normalizeHobbyShareResolution } = await import(
    new URL(
      "../src/app/api/share/hobby/share-utils.ts",
      import.meta.url,
    )
  );
  assert.equal(typeof normalizeHobbyShareResolution, "function");

  const theme = {
    dark: { bg: "#111111", color: "#22cc88", text: "#ffffff" },
    light: { bg: "#ffffff", color: "#0066cc", text: "#111111" },
    mode: "system",
    texture: "none",
  };
  const ready = {
    expiresAt: null,
    slides: [
      {
        hobbyId: "hobby-1",
        imageUrl: " https://example.com/hobby.png ",
        name: "绘画",
      },
    ],
    status: "ready",
    theme,
  };
  const isValidTheme = (value) => value === theme;

  assert.deepEqual(normalizeHobbyShareResolution(ready, isValidTheme), {
    ...ready,
    slides: [{ ...ready.slides[0], imageUrl: ready.slides[0].imageUrl.trim() }],
  });

  for (const malformed of [
    { ...ready, theme: {} },
    { ...ready, slides: [{ ...ready.slides[0], hobbyId: 7 }] },
    {
      ...ready,
      slides: [
        {
          imageUrl: ready.slides[0].imageUrl,
          itemId: "legacy-round-1",
          name: ready.slides[0].name,
        },
      ],
    },
    { ...ready, slides: [{ ...ready.slides[0], name: null }] },
    { ...ready, slides: [{ ...ready.slides[0], imageUrl: "   " }] },
  ]) {
    assert.equal(
      normalizeHobbyShareResolution(malformed, isValidTheme).status,
      "error",
    );
  }
});

test("server and password ready boundaries reuse ThemeConfig validation", () => {
  const page = read("src/app/(share)/share/hobby/[token]/page.tsx");
  const view = read(
    "src/app/(share)/share/hobby/[token]/hobby-share-view.tsx",
  );

  assert.match(page, /isThemeConfig/);
  assert.match(page, /normalizeHobbyShareResolution/);
  assert.match(
    page,
    /normalizeHobbyShareResolution\([\s\S]*?result\.data[\s\S]*?isThemeConfig/,
  );
  assert.match(view, /isThemeConfig/);
  assert.match(
    view,
    /normalizeHobbyShareResolution\(\s*payload,\s*isThemeConfig,\s*\)/,
  );
  assert.doesNotMatch(view, /Boolean\(resolution\.theme\)/);
});

test("protected share passwords are never autofilled or retained after failures", () => {
  const view = read(
    "src/app/(share)/share/hobby/[token]/hobby-share-view.tsx",
  );

  assert.match(view, /<form[^>]*autoComplete="off"/);
  assert.match(view, /autoComplete="new-password"/);
  assert.doesNotMatch(view, /autoComplete="current-password"/);
  assert.doesNotMatch(
    view,
    /localStorage|sessionStorage|document\.cookie|URLSearchParams/,
  );
  assert.match(
    view,
    /function applyFailedResolution[\s\S]*?setPassword\(""\)[\s\S]*?setResolution/,
  );
  assert.match(
    view,
    /function showPasswordError[\s\S]*?setPassword\(""\)[\s\S]*?setRequestError/,
  );
});

test("protected share password requests keep only the latest response authoritative", () => {
  const view = read(
    "src/app/(share)/share/hobby/[token]/hobby-share-view.tsx",
  );

  assert.match(view, /useRef<AbortController \| null>\(null\)/);
  assert.match(view, /useRef\(0\)/);
  assert.match(view, /passwordAbortControllerRef\.current\?\.abort\(\)/);
  assert.match(view, /const controller = new AbortController\(\)/);
  assert.match(view, /signal: controller\.signal/);
  assert.match(
    view,
    /if \(requestId !== passwordRequestIdRef\.current\) \{\s+return;\s+\}/,
  );
  assert.match(
    view,
    /finally \{\s+if \(requestId === passwordRequestIdRef\.current\) \{[\s\S]*?setIsSubmitting\(false\);[\s\S]*?\}\s+\}/,
  );
  assert.match(
    view,
    /return \(\) => \{[\s\S]*?passwordRequestIdRef\.current \+= 1;[\s\S]*?passwordAbortControllerRef\.current\?\.abort\(\);/,
  );
});

test("active hobby cards retain a theme glow when Flame WebGL enhancement fails", () => {
  const view = read(
    "src/app/(share)/share/hobby/[token]/hobby-share-view.tsx",
  );
  const styles = read("src/app/(pages)/theme/styles/hobby-share.less");
  const flameOverlayBlock = cssBlock(styles, ".hobby-share-flame-overlay");
  const staticWrapBlock = cssBlock(styles, ".hobby-share-static-wrap");

  assert.match(
    view,
    /activeSlide && !prefersReducedMotion \? \(\s*<div className="hobby-share-flame-overlay">\s*<FlameWrap/,
  );
  assert.match(view, /captureContent=\{false\}/);
  assert.doesNotMatch(flameOverlayBlock, /border:/);
  assert.doesNotMatch(staticWrapBlock, /border:/);
  assert.match(styles, /\.hobby-share-card \{[\s\S]*?box-shadow:/);
  assert.match(
    view,
    /<div className="hobby-share-static-wrap">\s*<HobbyShareCard/,
  );
});

test("approved hobby share slide contract remains hobbyId end to end", () => {
  const types = read("src/app/api/share/hobby/share-types.ts");
  const utils = read("src/app/api/share/hobby/share-utils.ts");
  const view = read(
    "src/app/(share)/share/hobby/[token]/hobby-share-view.tsx",
  );

  assert.match(types, /hobbyId: string/);
  assert.match(utils, /hobbyId: String\(item\.c_id\)/);
  assert.match(utils, /typeof value\.hobbyId === "string"/);
  assert.match(view, /slide\.hobbyId/);
  assert.doesNotMatch(`${types}\n${utils}\n${view}`, /\bitemId\b/);
});

test("non-ready share states do not receive inline theme snapshot variables", () => {
  const view = read(
    "src/app/(share)/share/hobby/[token]/hobby-share-view.tsx",
  );
  const styles = read("src/app/(pages)/theme/styles/hobby-share.less");

  assert.doesNotMatch(view, /resolution\.theme \?\? defaultThemeConfig/);
  assert.match(
    view,
    /resolution\.status === "ready" && resolution\.theme\s+\? resolution\.theme\s+: null/,
  );
  assert.match(view, /const themeStyle = theme\s+\?/);
  assert.match(view, /data-theme-mode=\{theme\?\.mode\}/);
  assert.match(
    styles,
    /\.hobby-share-page \{[\s\S]*?--hobby-share-bg: #[\da-f]{6};[\s\S]*?--hobby-share-color: var\(--hobby-share-text\);[\s\S]*?--hobby-share-text: #[\da-f]{6};/i,
  );
});

test("hobby share keeps pnpm workspace placeholder deleted", () => {
  assert.equal(
    existsSync(new URL("../pnpm-workspace.yaml", import.meta.url)),
    false,
  );
});

test("share page imports its Less stylesheet through the theme entry", () => {
  const theme = read("src/app/(pages)/theme/theme.less");

  assert.match(theme, /@import "\.\/styles\/hobby-share\.less"/);
});

test("share implementation contains no management or unrelated category UI", () => {
  const dialog = read(
    "src/app/(pages)/home/share/hobby-share-dialog.tsx",
  );
  const view = read(
    "src/app/(share)/share/hobby/[token]/hobby-share-view.tsx",
  );

  assert.doesNotMatch(dialog, /选择爱好|衣服|裤子|图书/);
  assert.doesNotMatch(view, /价格|日期|分类|分页|编辑|删除/);
});

test("hobby external title reserves two clamped lines with the full accessible name", () => {
  const view = read(
    "src/app/(share)/share/hobby/[token]/hobby-share-view.tsx",
  );
  const styles = read("src/app/(pages)/theme/styles/hobby-share.less");

  assert.match(view, /<h2 className="hobby-share-title" title=\{activeSlide\.name\}>/);
  assert.match(view, /<span>\{activeSlide\.name\}<\/span>/);
  assert.match(
    styles,
    /\.hobby-share-title \{[\s\S]*?min-height: 42px;[\s\S]*?\}/,
  );
  assert.match(
    styles,
    /\.hobby-share-title span \{[\s\S]*?-webkit-line-clamp: 2;[\s\S]*?overflow: hidden;/,
  );
  assert.match(
    styles,
    /@media \(max-width: 640px\)[\s\S]*?min-height: 38px;/,
  );
});

test("hobby share creation uses a server-only service-role client", () => {
  const adminPath = "src/utils/supabase/admin.ts";
  assert.equal(existsSync(new URL(`../${adminPath}`, import.meta.url)), true);

  const admin = read(adminPath);
  const route = read("src/app/api/share/hobby/route.ts");

  assert.match(admin, /import "server-only"/);
  assert.match(admin, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(admin, /persistSession: false/);
  assert.match(admin, /autoRefreshToken: false/);
  assert.match(admin, /detectSessionInUrl: false/);
  assert.match(route, /createAdminClient/);
  assert.match(
    route,
    /adminSupabase = createAdminClient\(\);[\s\S]*?createHobbyShare\(\s*adminSupabase,/,
  );
  assert.doesNotMatch(route, /createHobbyShare\(\s*supabase,/);
  assert.match(route, /分享服务配置异常/);

  const postRoute = route.slice(route.indexOf("export async function POST"));
  const authIndex = postRoute.indexOf("const session = await auth()");
  const readIndex = postRoute.indexOf("await Promise.all");
  const adminIndex = postRoute.indexOf("adminSupabase = createAdminClient()");
  const createIndex = postRoute.indexOf("createHobbyShare(adminSupabase");
  assert.ok(authIndex >= 0);
  assert.ok(authIndex < readIndex);
  assert.ok(readIndex < adminIndex);
  assert.ok(adminIndex < createIndex);

  const serviceRoleReferences = listSourceFiles(
    new URL("../src/", import.meta.url),
  )
    .filter(({ source }) => source.includes("SUPABASE_SERVICE_ROLE_KEY"))
    .map(({ path }) => path);
  assert.deepEqual(serviceRoleReferences, ["utils/supabase/admin.ts"]);
});

test("hobby share SQL allows public resolution but only service-role creation", () => {
  const initial = read(
    "supabase/migrations/20260730_create_hobby_shares.sql",
  );
  const hardeningPath =
    "supabase/migrations/20260731_secure_hobby_share_creation.sql";
  assert.equal(
    existsSync(new URL(`../${hardeningPath}`, import.meta.url)),
    true,
  );
  const hardening = read(hardeningPath);

  for (const sql of [initial, hardening]) {
    assert.match(
      sql,
      /revoke all on function public\.create_hobby_share\(text, jsonb, jsonb, timestamptz, text\) from public/i,
    );
    assert.match(
      sql,
      /revoke all on function public\.create_hobby_share\(text, jsonb, jsonb, timestamptz, text\) from anon, authenticated/i,
    );
    assert.match(
      sql,
      /grant execute on function public\.create_hobby_share\(text, jsonb, jsonb, timestamptz, text\) to service_role/i,
    );
    assert.match(
      sql,
      /grant execute on function public\.resolve_hobby_share\(text, text\) to anon, authenticated/i,
    );
    assert.doesNotMatch(
      sql,
      /grant execute on function public\.create_hobby_share\([^;]+to anon/i,
    );
  }
});
