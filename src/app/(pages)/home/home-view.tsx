"use client";

import { ClothesCreateModal } from "@/app/(pages)/home/clothes/clothes-create-modal";
import type { ClothesItem } from "@/app/(pages)/home/clothes/clothes-type";
import { HomeDashboard } from "@/app/(pages)/home/home-dashboard";
import { ThemeTexturePublisher } from "@/app/(pages)/theme/shared-theme-texture";
import { ThemeControl } from "@/app/(pages)/theme/theme-control";
import { ThemeProvider } from "@/app/(pages)/theme/theme-provider";
import { ThemeShellBackground } from "@/app/(pages)/theme/theme-shell-background";
import {
  getThemeShellBackground,
  mixHexColor,
} from "@/app/(pages)/theme/theme-utils";
import type { ThemeConfig } from "@/app/(pages)/theme/types";
import { cn } from "@/lib/utils";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Empty, Layout, Space } from "antd";
import { SessionProvider } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { homeCategories } from "./constant";
import {
  HomeProfileButton,
  HomeProfileModal,
  type HomeUser,
  useHomeProfile,
} from "./home-profile";

type HomeContentActions = {
  /** 打开当前分类可用的新增物品弹窗。 */
  openClothesCreateModal: () => void;
  /** 打开当前分类可用的编辑物品弹窗。 */
  openClothesEditModal: (item: ClothesItem) => void;
};

type ItemCategoryConfig = {
  /** 新增和编辑接口地址。 */
  apiPath: string;
  /** 物品名称。 */
  itemLabel: string;
  /** OSS 上传目录。 */
  uploadDirectory: "clothes" | "pants";
};

const itemCategoryConfigs: Record<string, ItemCategoryConfig> = {
  "/home/clothes": {
    apiPath: "/api/clothes",
    itemLabel: "衣服",
    uploadDirectory: "clothes",
  },
  "/home/pants": {
    apiPath: "/api/pants",
    itemLabel: "裤子",
    uploadDirectory: "pants",
  },
};

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
  /** 当前分类物品数量。 */
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
  const [isClothesCreateModalOpen, setIsClothesCreateModalOpen] =
    useState(false);
  const [editingClothes, setEditingClothes] = useState<ClothesItem | null>(
    null,
  );
  const [visibleCategoryHrefs, setVisibleCategoryHrefs] = useState(() =>
    homeCategories.map((category) => category.href),
  );
  const isAllCategoriesVisible =
    visibleCategoryHrefs.length === homeCategories.length;
  const activeItemCategory = activeCategoryHref
    ? itemCategoryConfigs[activeCategoryHref]
    : undefined;
  const activeCategory = homeCategories.find(
    (category) => category.href === activeCategoryHref,
  );
  const emptyDescription = activeCategory
    ? `${activeCategory.label}分类暂未添加内容`
    : "请选择左侧分类";

  /** 切换分类复选按钮，并控制左侧分类列表显示哪些项。 */
  function toggleCategoryVisible(categoryHref: string) {
    setVisibleCategoryHrefs((currentHrefs) =>
      currentHrefs.includes(categoryHref)
        ? currentHrefs.filter((href) => href !== categoryHref)
        : [...currentHrefs, categoryHref],
    );
  }

  /** 切换全部分类复选按钮，全选时再次点击会清空左侧分类列表。 */
  function toggleAllCategoriesVisible() {
    setVisibleCategoryHrefs((currentHrefs) =>
      currentHrefs.length === homeCategories.length
        ? []
        : homeCategories.map((category) => category.href),
    );
  }

  /** 打开当前分类新增弹窗，仅支持已经开发的物品分类。 */
  function openClothesCreateModal() {
    if (activeItemCategory) {
      setEditingClothes(null);
      setIsClothesCreateModalOpen(true);
    }
  }

  /** 打开当前分类编辑弹窗，仅支持已经开发的物品分类。 */
  function openClothesEditModal(item: ClothesItem) {
    if (activeItemCategory) {
      setEditingClothes(item);
      setIsClothesCreateModalOpen(true);
    }
  }

  /** 关闭衣服编辑弹窗并清理编辑对象。 */
  function closeClothesModal() {
    setIsClothesCreateModalOpen(false);
    setEditingClothes(null);
  }

  /** 物品保存成功后刷新当前路由，让服务端读取到最新物品列表。 */
  function refreshClothesAfterSaved() {
    router.refresh();
  }

  return (
    <SessionProvider basePath="/api/users/auth">
      <ThemeProvider initialTheme={initialTheme}>
        {({ activePalette, resolvedMode, themeConfig }) => {
          const isDark = resolvedMode === "dark";
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
              <ThemeShellBackground color={homeShellBackground} />
              <ThemeTexturePublisher
                background={homeShellBackground}
                color={homeAnimationColor}
                text={activePalette.text}
                texture={themeConfig.texture}
              />
              <Layout
                className={cn(
                  "app-shell app-textured-shell home-shell flex h-dvh min-h-dvh flex-1 flex-col overflow-hidden max-[900px]:!h-auto max-[900px]:min-h-dvh max-[900px]:overflow-visible",
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
                    "--home-theme-text": activePalette.text,
                    color: activePalette.text,
                  } as CSSProperties
                }
              >
                <header
                  className="flex shrink-0 items-center justify-between gap-4 border-b px-8 py-2 max-md:flex-col max-md:items-start max-md:p-5"
                  style={{
                    backgroundColor: homeHeaderBackground,
                    borderBottomColor: homeBorderColor,
                  }}
                >
                  <div className="flex items-center gap-3.5">
                    <HomeProfileButton
                      editor={profileEditor}
                      isDark={isDark}
                      palette={activePalette}
                    />
                    <span
                      className="flex h-16 items-center font-['Dancing_Script',cursive] text-[38px] leading-none"
                      style={{
                        color: activePalette.color,
                      }}
                    >
                      {profileEditor.profile.name ?? "用户"}
                    </span>
                  </div>
                  <Space wrap>
                    <Button icon={<SearchOutlined />}>搜索</Button>
                    <Button
                      disabled={!activeItemCategory}
                      icon={<PlusOutlined />}
                      onClick={openClothesCreateModal}
                      type="primary"
                    >
                      添加物品
                    </Button>
                    <ThemeControl />
                  </Space>
                </header>

                <HomeDashboard
                  activeCategoryHref={activeCategoryHref}
                  isAllCategoriesVisible={isAllCategoriesVisible}
                  itemCount={itemCount}
                  onToggleAllCategoriesVisible={toggleAllCategoriesVisible}
                  onToggleCategoryVisible={toggleCategoryVisible}
                  surfaceBackground={activePalette.bg}
                  surfaceBorderColor={homeBorderColor}
                  visibleCategoryHrefs={visibleCategoryHrefs}
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
                  apiPath={activeItemCategory?.apiPath ?? "/api/clothes"}
                  editingClothes={editingClothes}
                  itemLabel={activeItemCategory?.itemLabel}
                  onClose={closeClothesModal}
                  onSaved={refreshClothesAfterSaved}
                  open={isClothesCreateModalOpen}
                  themeColor={activePalette.color}
                  uploadDirectory={
                    activeItemCategory?.uploadDirectory ?? "clothes"
                  }
                />
              </Layout>
            </HomeContentActionsContext.Provider>
          );
        }}
      </ThemeProvider>
    </SessionProvider>
  );
}
