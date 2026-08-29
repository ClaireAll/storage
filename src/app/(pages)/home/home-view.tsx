"use client";

import { AiAssistant } from "@/app/(pages)/common/ai-assistant";
import { ClothesCreateModal } from "@/app/(pages)/home/clothes/clothes-create-modal";
import type { ClothesItem } from "@/app/(pages)/home/clothes/clothes-type";
import { HomeDashboard } from "@/app/(pages)/home/home-dashboard";
import { HobbyShareControl } from "@/app/(pages)/home/share/hobby-share-control";
import {
  ThemeFallingLights,
  ThemeTexturePublisher,
} from "@/app/(pages)/theme/shared-theme-texture";
import { ThemeControl } from "@/app/(pages)/theme/theme-control";
import { ThemeGeometryTexture } from "@/app/(pages)/theme/theme-geometry-texture";
import { ThemeProvider } from "@/app/(pages)/theme/theme-provider";
import { ThemeShellBackground } from "@/app/(pages)/theme/theme-shell-background";
import { getThemeColumns } from "@/app/(pages)/theme/constants";
import {
  getThemeShellBackground,
  mixHexColor,
} from "@/app/(pages)/theme/theme-utils";
import type { ThemeConfig } from "@/app/(pages)/theme/types";
import { cn } from "@/lib/utils";
import { App, Empty, Layout, Space } from "antd";
import { SessionProvider } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import { homeLeafCategories } from "./constant";
import {
  HomeProfileButton,
  HomeProfileModal,
  useHomeProfile,
  type HomeUser,
} from "./home-profile";
import { getItemCategoryConfig, itemCategoryConfigs } from "./item-edit-config";

type HomeContentActions = {
  /** 打开当前分类可用的新增文章推荐弹窗。 */
  openClothesCreateModal: () => void;
  /** 打开当前分类可用的编辑文章推荐弹窗。 */
  openClothesEditModal: (item: ClothesItem) => void;
};

type CategoryVisibilityErrorMessageProps = {
  errorMessage?: string;
};

/** 在 Ant Design App 上下文内提示分类设置保存失败。 */
function CategoryVisibilityErrorMessage({
  errorMessage,
}: CategoryVisibilityErrorMessageProps) {
  const { message } = App.useApp();

  useEffect(() => {
    if (errorMessage) {
      message.error(errorMessage);
    }
  }, [errorMessage, message]);

  return null;
}

const HomeContentActionsContext = createContext<HomeContentActions | null>(
  null,
);

/** 分类内容区使用的主页动作。 */
export function useHomeContentActions() {
  const actions = useContext(HomeContentActionsContext);

  if (!actions) {
    throw new Error("useHomeContentActions must be used inside HomePage.");
  }

  return actions;
}

/** 首页组件接收的属性。 */
type HomePageProps = {
  /** 页面首次渲染使用的主题配置。 */
  initialTheme: ThemeConfig;
  /** 当前登录用户信息，用于展示头像和个人资料弹窗。 */
  user: HomeUser;
  /** 当前路由选中的分类路径，用于控制右侧内容区展示。 */
  activeCategoryHref?: string;
  /** 当前分类文章推荐数量。 */
  itemCount?: number;
  /** 当前分类页面提供的内容区域。 */
  children?: ReactNode;
};

export default function HomePage({
  activeCategoryHref,
  children,
  initialTheme,
  itemCount = 0,
  user,
}: HomePageProps) {
  const router = useRouter();
  const profileEditor = useHomeProfile(user);
  const [, startCategoryTransition] = useTransition();
  const [isClothesCreateModalOpen, setIsClothesCreateModalOpen] =
    useState(false);
  const [hobbySharePortalHost, setHobbySharePortalHost] =
    useState<HTMLDivElement | null>(null);
  const [editingClothes, setEditingClothes] = useState<ClothesItem | null>(
    null,
  );
  const [categoryNavigation, setCategoryNavigation] = useState<{
    fromCategoryHref?: string;
    pendingCategoryHref?: string;
  }>({});
  const [selectedItemCategoryHref, setSelectedItemCategoryHref] =
    useState<string>();
  const [shouldShowItemCategorySelect, setShouldShowItemCategorySelect] =
    useState(false);
  const [hiddenCategoryKeys, setHiddenCategoryKeys] = useState(
    () => initialTheme.hiddenCategoryKeys,
  );
  const [draftHiddenCategoryKeys, setDraftHiddenCategoryKeys] = useState<
    string[]
  >([]);
  const [isCategoryVisibilityEditing, setIsCategoryVisibilityEditing] =
    useState(false);
  const [categoryVisibilityError, setCategoryVisibilityError] = useState<
    string | undefined
  >();
  const pendingCategoryHref =
    categoryNavigation.fromCategoryHref === activeCategoryHref
      ? categoryNavigation.pendingCategoryHref
      : undefined;
  const displayActiveCategoryHref = pendingCategoryHref ?? activeCategoryHref;
  const isCategoryContentLoading = Boolean(
    pendingCategoryHref && pendingCategoryHref !== activeCategoryHref,
  );
  const activeItemCategory = getItemCategoryConfig(displayActiveCategoryHref);
  const selectedItemCategory =
    getItemCategoryConfig(selectedItemCategoryHref) ?? activeItemCategory;
  const itemCategoryOptions = homeLeafCategories
    .filter((category) => itemCategoryConfigs[category.href])
    .map((category) => ({
      label: category.label,
      value: category.href,
    }));
  const activeCategory = homeLeafCategories.find(
    (category) => category.href === displayActiveCategoryHref,
  );
  const emptyDescription = activeCategory
    ? `${activeCategory.label}分类暂未添加内容`
    : "请选择左侧分类";

  /** 进入分类可见性设置，并用当前已保存的配置初始化草稿。 */
  function startCategoryVisibilityEditing() {
    setCategoryVisibilityError(undefined);
    setDraftHiddenCategoryKeys(hiddenCategoryKeys);
    setIsCategoryVisibilityEditing(true);
  }

  /** 取消分类可见性设置，并丢弃尚未保存的草稿。 */
  function cancelCategoryVisibilityEditing() {
    setDraftHiddenCategoryKeys(hiddenCategoryKeys);
    setIsCategoryVisibilityEditing(false);
  }

  /** 切换分类在当前设置草稿中的隐藏状态。 */
  function toggleCategoryVisibility(categoryKey: string) {
    setDraftHiddenCategoryKeys((currentKeys) =>
      currentKeys.includes(categoryKey)
        ? currentKeys.filter((key) => key !== categoryKey)
        : [...currentKeys, categoryKey],
    );
  }

  /** 退出分类设置并保存草稿，保存失败时恢复上一次已保存的状态。 */
  async function finishCategoryVisibilityEditing(
    themeConfig: ThemeConfig,
    updateTheme: (nextConfig: ThemeConfig) => Promise<void>,
  ) {
    const previousHiddenCategoryKeys = hiddenCategoryKeys;
    const nextHiddenCategoryKeys = draftHiddenCategoryKeys;

    setIsCategoryVisibilityEditing(false);
    setHiddenCategoryKeys(nextHiddenCategoryKeys);

    try {
      await updateTheme({
        ...themeConfig,
        hiddenCategoryKeys: nextHiddenCategoryKeys,
      });

      const activeLeafCategory = homeLeafCategories.find(
        (category) => category.href === activeCategoryHref,
      );

      if (!activeLeafCategory || !nextHiddenCategoryKeys.includes(activeLeafCategory.key)) {
        return;
      }

      const nextVisibleCategory = homeLeafCategories.find(
        (category) => !nextHiddenCategoryKeys.includes(category.key),
      );

      if (nextVisibleCategory) {
        navigateItemCategory(nextVisibleCategory.href);
        return;
      }

      setCategoryNavigation({});
      startCategoryTransition(() => {
        router.push("/home");
      });
    } catch (error) {
      setDraftHiddenCategoryKeys(previousHiddenCategoryKeys);
      setHiddenCategoryKeys(previousHiddenCategoryKeys);
      setCategoryVisibilityError(
        error instanceof Error ? error.message : "分类设置保存失败",
      );
    }
  }

  function navigateItemCategory(categoryHref: string) {
    if (categoryHref === displayActiveCategoryHref) {
      return;
    }

    setCategoryNavigation({
      fromCategoryHref: activeCategoryHref,
      pendingCategoryHref: categoryHref,
    });
    startCategoryTransition(() => {
      router.push(categoryHref);
    });
  }

  /** 打开当前分类新增弹窗，仅支持已经开发的文章推荐分类。 */
  function openClothesCreateModal() {
    if (activeItemCategory) {
      setSelectedItemCategoryHref(displayActiveCategoryHref);
      setShouldShowItemCategorySelect(false);
      setEditingClothes(null);
      setIsClothesCreateModalOpen(true);
    }
  }

  function openQuickItemCreateModal() {
    setSelectedItemCategoryHref(itemCategoryOptions[0]?.value);
    setShouldShowItemCategorySelect(true);
    setEditingClothes(null);
    setIsClothesCreateModalOpen(true);
  }

  /** 打开当前分类编辑弹窗，仅支持已经开发的文章推荐分类。 */
  function openClothesEditModal(item: ClothesItem) {
    if (activeItemCategory) {
      setSelectedItemCategoryHref(displayActiveCategoryHref);
      setShouldShowItemCategorySelect(false);
      setEditingClothes(item);
      setIsClothesCreateModalOpen(true);
    }
  }

  /** 关闭衣服编辑弹窗并清理编辑对象。 */
  function closeClothesModal() {
    setIsClothesCreateModalOpen(false);
    setEditingClothes(null);
    setSelectedItemCategoryHref(undefined);
    setShouldShowItemCategorySelect(false);
  }

  /** 文章推荐保存成功后刷新当前路由，让服务端读取到最新文章推荐列表。 */
  function refreshClothesAfterSaved() {
    router.refresh();
  }

  return (
    <SessionProvider>
      <ThemeProvider initialTheme={initialTheme}>
        {({ activePalette, resolvedMode, themeConfig, updateTheme }) => {
          const isDark = resolvedMode === "dark";
          const homeThemeColumns = getThemeColumns(
            activePalette,
            resolvedMode,
          );
          const homeShellBackground = getThemeShellBackground(
            activePalette,
            resolvedMode,
          );
          const homeAnimationColor =
            themeConfig.aniTheme ?? activePalette.color;
          const homeHeaderBackground = mixHexColor(
            activePalette.bg,
            "#ffffff",
            isDark ? 16 : 12,
          );
          const homeBorderColor = mixHexColor(
            activePalette.bg,
            activePalette.text,
            isDark ? 18 : 12,
          );
          const homeMenuHoverBackground = mixHexColor(
            activePalette.bg,
            activePalette.color,
            isDark ? 16 : 8,
          );
          const homeMenuSelectedBackground = mixHexColor(
            activePalette.bg,
            activePalette.color,
            isDark ? 26 : 14,
          );

          return (
            <HomeContentActionsContext.Provider
              value={{ openClothesCreateModal, openClothesEditModal }}
            >
              <CategoryVisibilityErrorMessage
                errorMessage={categoryVisibilityError}
              />
              <ThemeShellBackground
                color={homeShellBackground}
                scrollbarColor={activePalette.color}
              />
              <ThemeTexturePublisher
                background={homeShellBackground}
                color={homeAnimationColor}
                text={activePalette.text}
                texture={themeConfig.texture}
              />
              <Layout
                className={cn(
                  "app-shell app-textured-shell home-shell flex h-dvh min-h-dvh flex-1 flex-col overflow-hidden has-data-investment-dashboard:max-[1180px]:h-auto! has-data-investment-dashboard:max-[1180px]:min-h-dvh has-data-investment-dashboard:max-[1180px]:overflow-visible max-[900px]:h-auto! max-[900px]:min-h-dvh max-[900px]:overflow-visible",
                  isDark ? "bg-neutral-950" : "bg-neutral-100",
                  `theme-${resolvedMode}`,
                  `app-texture-${themeConfig.texture}`,
                )}
                style={
                  {
                    "--app-shell-bg": homeShellBackground,
                    "--app-texture-color": homeAnimationColor,
                    "--app-texture-text": activePalette.text,
                    "--home-menu-hover-bg": homeMenuHoverBackground,
                    "--home-menu-selected-bg": homeMenuSelectedBackground,
                    "--home-menu-selected-color": activePalette.color,
                    "--home-theme-bg": activePalette.bg,
                    "--home-theme-color": activePalette.color,
                    "--home-theme-columns": homeThemeColumns.join(","),
                    "--home-theme-text": activePalette.text,
                    "--home-header-bg": homeHeaderBackground,
                    "--home-header-border": homeBorderColor,
                    color: activePalette.text,
                  } as CSSProperties
                }
              >
                <ThemeGeometryTexture texture={themeConfig.texture} />
                <ThemeFallingLights
                  isActive={themeConfig.texture === "meteor"}
                  variant="shared"
                />
                <header className="home-brand-header relative z-3 flex h-11 w-full shrink-0 items-center justify-between gap-4 border-b px-8 py-0 max-md:h-auto max-md:flex-col max-md:items-start max-md:p-3">
                  <div className="flex h-9 min-w-0 items-center gap-2.5">
                    <HomeProfileButton
                      editor={profileEditor}
                      isDark={isDark}
                      palette={activePalette}
                    />
                    <span
                      className="home-brand-name flex h-9 min-w-0 items-center truncate font-['Dancing_Script',cursive] text-[28px] leading-none"
                      style={{
                        color: activePalette.color,
                      }}
                    >
                      {profileEditor.profile.name ?? "用户"}
                    </span>
                  </div>
                  <Space className="shrink-0">
                    <HobbyShareControl portalHost={hobbySharePortalHost} />
                    <ThemeControl />
                  </Space>
                </header>

                <HomeDashboard
                  activeCategoryHref={displayActiveCategoryHref}
                  aiAssistant={<AiAssistant />}
                  hiddenCategoryKeys={
                    isCategoryVisibilityEditing
                      ? draftHiddenCategoryKeys
                      : hiddenCategoryKeys
                  }
                  isCategoryContentLoading={isCategoryContentLoading}
                  isCategoryVisibilityEditing={isCategoryVisibilityEditing}
                  itemCount={itemCount}
                  onCancelCategoryVisibilityEditing={
                    cancelCategoryVisibilityEditing
                  }
                  onCategoryNavigate={navigateItemCategory}
                  onFinishCategoryVisibilityEditing={() => {
                    void finishCategoryVisibilityEditing(themeConfig, updateTheme);
                  }}
                  onOpenQuickItemCreate={openQuickItemCreateModal}
                  onStartCategoryVisibilityEditing={
                    startCategoryVisibilityEditing
                  }
                  onToggleCategoryVisibility={toggleCategoryVisibility}
                  surfaceBackground={activePalette.bg}
                  surfaceBorderColor={homeBorderColor}
                >
                  {children ?? (
                    <div className="flex min-h-0 flex-1 items-center justify-center">
                      <Empty
                        description={emptyDescription}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    </div>
                  )}
                </HomeDashboard>
                <HomeProfileModal
                  editor={profileEditor}
                  isDark={isDark}
                  palette={activePalette}
                />
                <ClothesCreateModal
                  apiPath={selectedItemCategory?.apiPath ?? "/api/clothes"}
                  categoryOptions={itemCategoryOptions}
                  editingClothes={editingClothes}
                  hasBookCategory={selectedItemCategory?.hasBookCategory}
                  hasBookFile={selectedItemCategory?.hasBookFile}
                  hasColor={selectedItemCategory?.hasColor}
                  hasCount={selectedItemCategory?.hasCount}
                  hasDate={selectedItemCategory?.hasDate}
                  hasImage={selectedItemCategory?.hasImage}
                  hasMultipleImages={selectedItemCategory?.hasMultipleImages}
                  hasPrice={selectedItemCategory?.hasPrice}
                  hasSeason={selectedItemCategory?.hasSeason}
                  hasUrl={selectedItemCategory?.hasUrl}
                  itemCategoryOptions={
                    selectedItemCategory?.itemCategoryOptions
                  }
                  itemLabel={selectedItemCategory?.itemLabel}
                  namePlaceholder={selectedItemCategory?.namePlaceholder}
                  onCategoryHrefChange={setSelectedItemCategoryHref}
                  onClose={closeClothesModal}
                  onSaved={refreshClothesAfterSaved}
                  open={isClothesCreateModalOpen}
                  selectedCategoryHref={selectedItemCategoryHref}
                  showCategorySelect={shouldShowItemCategorySelect}
                  themeColor={activePalette.color}
                  uploadDirectory={
                    selectedItemCategory?.uploadDirectory ?? "clothes"
                  }
                />
                <div
                  className="home-hobby-share-portal-host"
                  ref={setHobbySharePortalHost}
                />
              </Layout>
            </HomeContentActionsContext.Provider>
          );
        }}
      </ThemeProvider>
    </SessionProvider>
  );
}
