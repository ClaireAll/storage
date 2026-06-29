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
import { SearchOutlined } from "@ant-design/icons";
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
  useHomeProfile,
  type HomeUser,
} from "./home-profile";
import {
  getItemCategoryConfig,
  itemCategoryConfigs,
} from "./item-edit-config";

type HomeContentActions = {
  /** 鎵撳紑褰撳墠鍒嗙被鍙敤鐨勬柊澧炴枃绔犳帹鑽愬脊绐椼€?*/
  openClothesCreateModal: () => void;
  /** 鎵撳紑褰撳墠鍒嗙被鍙敤鐨勭紪杈戞枃绔犳帹鑽愬脊绐椼€?*/
  openClothesEditModal: (item: ClothesItem) => void;
};


const HomeContentActionsContext = createContext<HomeContentActions | null>(
  null,
);

/** 鍒嗙被鍐呭鍖轰娇鐢ㄧ殑涓婚〉鍔ㄤ綔銆?*/
export function useHomeContentActions() {
  const actions = useContext(HomeContentActionsContext);

  if (!actions) {
    throw new Error("useHomeContentActions must be used inside HomePage.");
  }

  return actions;
}

/** 棣栭〉缁勪欢鎺ユ敹鐨勫睘鎬с€?*/
type HomePageProps = {
  /** 椤甸潰棣栨娓叉煋浣跨敤鐨勪富棰橀厤缃€?*/
  initialTheme: ThemeConfig;
  /** 褰撳墠鐧诲綍鐢ㄦ埛淇℃伅锛岀敤浜庡睍绀哄ご鍍忓拰涓汉璧勬枡寮圭獥銆?*/
  user: HomeUser;
  /** 褰撳墠璺敱閫変腑鐨勫垎绫昏矾寰勶紝鐢ㄤ簬鎺у埗鍙充晶鍐呭鍖哄睍绀恒€?*/
  activeCategoryHref?: string;
  /** 褰撳墠鍒嗙被鏂囩珷鎺ㄨ崘鏁伴噺銆?*/
  itemCount?: number;
  /** 褰撳墠鍒嗙被椤甸潰鎻愪緵鐨勫唴瀹瑰尯鍩熴€?*/
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
  const [selectedItemCategoryHref, setSelectedItemCategoryHref] =
    useState<string>();
  const [shouldShowItemCategorySelect, setShouldShowItemCategorySelect] =
    useState(false);
  const [visibleCategoryHrefs, setVisibleCategoryHrefs] = useState(() =>
    homeCategories.map((category) => category.href),
  );
  const isAllCategoriesVisible =
    visibleCategoryHrefs.length === homeCategories.length;
  const activeItemCategory = getItemCategoryConfig(activeCategoryHref);
  const selectedItemCategory =
    getItemCategoryConfig(selectedItemCategoryHref) ?? activeItemCategory;
  const itemCategoryOptions = homeCategories
    .filter((category) => itemCategoryConfigs[category.href])
    .map((category) => ({
      label: category.label,
      value: category.href,
    }));
  const activeCategory = homeCategories.find(
    (category) => category.href === activeCategoryHref,
  );
  const emptyDescription = activeCategory
    ? `${activeCategory.label}鍒嗙被鏆傛湭娣诲姞鍐呭`
    : "璇烽€夋嫨宸︿晶鍒嗙被";

  /** 鍒囨崲鍒嗙被澶嶉€夋寜閽紝骞舵帶鍒跺乏渚у垎绫诲垪琛ㄦ樉绀哄摢浜涢」銆?*/
  function toggleCategoryVisible(categoryHref: string) {
    setVisibleCategoryHrefs((currentHrefs) =>
      currentHrefs.includes(categoryHref)
        ? currentHrefs.filter((href) => href !== categoryHref)
        : [...currentHrefs, categoryHref],
    );
  }

  /** 鍒囨崲鍏ㄩ儴鍒嗙被澶嶉€夋寜閽紝鍏ㄩ€夋椂鍐嶆鐐瑰嚮浼氭竻绌哄乏渚у垎绫诲垪琛ㄣ€?*/
  function toggleAllCategoriesVisible() {
    setVisibleCategoryHrefs((currentHrefs) =>
      currentHrefs.length === homeCategories.length
        ? []
        : homeCategories.map((category) => category.href),
    );
  }

  /** 鎵撳紑褰撳墠鍒嗙被鏂板寮圭獥锛屼粎鏀寔宸茬粡寮€鍙戠殑鏂囩珷鎺ㄨ崘鍒嗙被銆?*/
  function openClothesCreateModal() {
    if (activeItemCategory) {
      setSelectedItemCategoryHref(activeCategoryHref);
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

  /** 鎵撳紑褰撳墠鍒嗙被缂栬緫寮圭獥锛屼粎鏀寔宸茬粡寮€鍙戠殑鏂囩珷鎺ㄨ崘鍒嗙被銆?*/
  function openClothesEditModal(item: ClothesItem) {
    if (activeItemCategory) {
      setSelectedItemCategoryHref(activeCategoryHref);
      setShouldShowItemCategorySelect(false);
      setEditingClothes(item);
      setIsClothesCreateModalOpen(true);
    }
  }

  /** 鍏抽棴琛ｆ湇缂栬緫寮圭獥骞舵竻鐞嗙紪杈戝璞°€?*/
  function closeClothesModal() {
    setIsClothesCreateModalOpen(false);
    setEditingClothes(null);
    setSelectedItemCategoryHref(undefined);
    setShouldShowItemCategorySelect(false);
  }

  /** 鏂囩珷鎺ㄨ崘淇濆瓨鎴愬姛鍚庡埛鏂板綋鍓嶈矾鐢憋紝璁╂湇鍔＄璇诲彇鍒版渶鏂版枃绔犳帹鑽愬垪琛ㄣ€?*/
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
                      {profileEditor.profile.name ?? "鐢ㄦ埛"}
                    </span>
                  </div>
                  <Space wrap>
                    <Button icon={<SearchOutlined />}>鎼滅储</Button>
                    <ThemeControl />
                  </Space>
                </header>

                <HomeDashboard
                  activeCategoryHref={activeCategoryHref}
                  isAllCategoriesVisible={isAllCategoriesVisible}
                  itemCount={itemCount}
                  onOpenQuickItemCreate={openQuickItemCreateModal}
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
                  apiPath={selectedItemCategory?.apiPath ?? "/api/clothes"}
                  categoryOptions={itemCategoryOptions}
                  editingClothes={editingClothes}
                  hasBookCategory={selectedItemCategory?.hasBookCategory}
                  hasColor={selectedItemCategory?.hasColor}
                  hasCount={selectedItemCategory?.hasCount}
                  hasDate={selectedItemCategory?.hasDate}
                  hasSeason={selectedItemCategory?.hasSeason}
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
              </Layout>
            </HomeContentActionsContext.Provider>
          );
        }}
      </ThemeProvider>
    </SessionProvider>
  );
}
