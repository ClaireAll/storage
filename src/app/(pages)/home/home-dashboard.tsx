import { CategoryIcon } from "@/app/(pages)/common/category-icon";
import { cn } from "@/lib/utils";
import {
  BulbOutlined,
  CloudOutlined,
  EnvironmentOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  ReloadOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { Button, Card, Cascader, Menu, Spin, Tooltip, Typography } from "antd";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { homeCategories, homeStats } from "./constant";
import { HomeContentFullscreenProvider } from "./home-content-fullscreen";
import {
  fetchTodayWeather,
  resolveCurrentWeatherLocation,
  resolveWeatherLocationByAreaPath,
  weatherAreaOptions,
  type TodayWeather,
  type WeatherLocation,
} from "./home-utils";

type WeatherState =
  | { status: "loading"; description: string }
  | ({ status: "ready" } & TodayWeather)
  | { status: "error"; description: string };

type KnowledgeItem = {
  link: string;
  title: string;
};

const initialWeather: WeatherState = {
  description: "获取中",
  status: "loading",
};
const codexCategoryKey = "codex";

const homeDashboardCache: {
  hasInitializedKnowledge: boolean;
  hasInitializedWeather: boolean;
  knowledgeItems: KnowledgeItem[];
  weather: WeatherState;
  weatherAreaPath: string[];
} = {
  hasInitializedKnowledge: false,
  hasInitializedWeather: false,
  knowledgeItems: [],
  weather: initialWeather,
  weatherAreaPath: [],
};

type HomeDashboardProps = {
  activeCategoryHref?: string;
  aiAssistant?: ReactNode;
  children?: ReactNode;
  hiddenCategoryKeys: string[];
  itemCount: number;
  isCategoryVisibilityEditing: boolean;
  isCategoryContentLoading: boolean;
  surfaceBackground: string;
  surfaceBorderColor: string;
  onCancelCategoryVisibilityEditing: () => void;
  onCategoryNavigate: (categoryHref: string) => void;
  onFinishCategoryVisibilityEditing: () => void;
  onOpenQuickItemCreate: () => void;
  onStartCategoryVisibilityEditing: () => void;
  onToggleCategoryVisibility: (categoryKey: string) => void;
};

export function HomeDashboard({
  activeCategoryHref,
  aiAssistant,
  children,
  hiddenCategoryKeys,
  isCategoryContentLoading,
  isCategoryVisibilityEditing,
  onCancelCategoryVisibilityEditing,
  onCategoryNavigate,
  onFinishCategoryVisibilityEditing,
  onOpenQuickItemCreate,
  onStartCategoryVisibilityEditing,
  onToggleCategoryVisibility,
  surfaceBackground,
  surfaceBorderColor,
}: HomeDashboardProps) {
  const [weather, setWeather] = useState<WeatherState>(
    () => homeDashboardCache.weather,
  );
  const [weatherAreaPath, setWeatherAreaPath] = useState<string[]>(
    () => homeDashboardCache.weatherAreaPath,
  );
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>(
    () => homeDashboardCache.knowledgeItems,
  );
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(false);
  const [isCategorySidebarCollapsed, setIsCategorySidebarCollapsed] =
    useState(false);
  const [isCategoryContentFullscreen, setIsCategoryContentFullscreen] =
    useState(false);
  const [openCategoryKeys, setOpenCategoryKeys] = useState<string[]>([
    codexCategoryKey,
  ]);
  const categoryContentRef = useRef<HTMLDivElement>(null);
  const surfaceStyle = {
    backgroundColor: surfaceBackground,
    borderColor: surfaceBorderColor,
  } satisfies CSSProperties;
  const refreshFullscreenLayout = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
    window.setTimeout(() => window.dispatchEvent(new Event("resize")), 120);
    window.setTimeout(() => window.dispatchEvent(new Event("resize")), 280);
  }, []);
  const toggleCategoryContentFullscreen = useCallback(
    async () => {
      const element = categoryContentRef.current;

      if (!element?.requestFullscreen) {
        return;
      }

      if (document.fullscreenElement === element) {
        await document.exitFullscreen?.();
        return;
      }

      await element.requestFullscreen();
      refreshFullscreenLayout();
    },
    [refreshFullscreenLayout],
  );
  const fullscreenContextValue = useMemo(
    () => ({
      isFullscreen: isCategoryContentFullscreen,
      toggleFullscreen: toggleCategoryContentFullscreen,
    }),
    [isCategoryContentFullscreen, toggleCategoryContentFullscreen],
  );
  const menuItems = useMemo(
    () =>
      homeCategories
        .filter(
          (category) =>
            category.children?.some((child) =>
              isCategoryVisibilityEditing ||
              !hiddenCategoryKeys.includes(child.key),
            ) ??
            (isCategoryVisibilityEditing ||
              !hiddenCategoryKeys.includes(category.key)),
        )
        .map((category) => {
          const isCategoryDirectActive = activeCategoryHref === category.href;
          const hasActiveChild = Boolean(
            category.children?.some((child) => activeCategoryHref === child.href),
          );
          const isCategoryHidden = hiddenCategoryKeys.includes(category.key);

          return {
            className: cn("hover:scale-110", {
              "opacity-45": isCategoryVisibilityEditing && isCategoryHidden,
              "scale-110": isCategoryDirectActive || hasActiveChild,
              "font-bold": isCategoryDirectActive,
            }),
            children: category.children
              ?.filter(
                (child) =>
                  isCategoryVisibilityEditing ||
                  !hiddenCategoryKeys.includes(child.key),
              )
              .map((child) => {
                const isChildActive = activeCategoryHref === child.href;
                const isChildHidden = hiddenCategoryKeys.includes(child.key);

                return {
                  className: cn("hover:scale-110", {
                    "opacity-45":
                      isCategoryVisibilityEditing && isChildHidden,
                    "scale-110 font-bold": isChildActive,
                  }),
                  icon: (
                    <CategoryIcon
                      Icon={child.Icon}
                      name={child.iconClassName}
                      mode="symbol"
                    />
                  ),
                  key: child.href,
                  label: (
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 flex-1 truncate">
                        {child.label}
                      </span>
                      {isCategoryVisibilityEditing ? (
                        <Tooltip
                          title={isChildHidden ? `显示${child.label}` : `隐藏${child.label}`}
                        >
                          <Button
                            aria-label={
                              isChildHidden
                                ? `显示${child.label}`
                                : `隐藏${child.label}`
                            }
                            className="shrink-0 text-(--home-theme-color)!"
                            icon={
                              <CategoryIcon
                                hasPadding={false}
                                name={
                                  isChildHidden
                                    ? "icon-invisible"
                                    : "icon-visible"
                                }
                              />
                            }
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              onToggleCategoryVisibility(child.key);
                            }}
                            size="small"
                            type="text"
                          />
                        </Tooltip>
                      ) : null}
                    </div>
                  ),
                };
              }),
            icon: (
              <CategoryIcon
                Icon={category.Icon}
                name={category.iconClassName}
                mode="symbol"
              />
            ),
            key: category.href,
            label: category.children ? (
              category.label
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{category.label}</span>
                {isCategoryVisibilityEditing ? (
                  <Tooltip
                    title={
                      isCategoryHidden ? `显示${category.label}` : `隐藏${category.label}`
                    }
                  >
                    <Button
                      aria-label={
                        isCategoryHidden
                          ? `显示${category.label}`
                          : `隐藏${category.label}`
                      }
                      className="shrink-0 text-(--home-theme-color)!"
                      icon={
                        <CategoryIcon
                          hasPadding={false}
                          name={
                            isCategoryHidden ? "icon-invisible" : "icon-visible"
                          }
                        />
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onToggleCategoryVisibility(category.key);
                      }}
                      size="small"
                      type="text"
                    />
                  </Tooltip>
                ) : null}
              </div>
            ),
          };
        }),
    [
      activeCategoryHref,
      hiddenCategoryKeys,
      isCategoryVisibilityEditing,
      onToggleCategoryVisibility,
    ],
  );
  const selectedCategoryKeys = activeCategoryHref ? [activeCategoryHref] : [];
  const weatherCascaderOptions = useMemo(
    () =>
      weatherAreaPath.length === 1 && weatherAreaPath[0]
        ? [
            { label: weatherAreaPath[0], value: weatherAreaPath[0] },
            ...weatherAreaOptions,
          ]
        : weatherAreaOptions,
    [weatherAreaPath],
  );

  const refreshKnowledgeItems = useCallback(async () => {
    setIsKnowledgeLoading(true);

    try {
      const response = await fetch(`/api/knowledge?t=${Date.now()}`);

      if (!response.ok) {
        throw new Error("knowledge request failed");
      }

      const result = (await response.json()) as { items?: KnowledgeItem[] };
      const nextItems = (result.items ?? []).slice(0, 4);

      homeDashboardCache.knowledgeItems = nextItems;
      homeDashboardCache.hasInitializedKnowledge = true;
      setKnowledgeItems(nextItems);
    } catch {
      homeDashboardCache.knowledgeItems = [];
      homeDashboardCache.hasInitializedKnowledge = true;
      setKnowledgeItems([]);
    } finally {
      setIsKnowledgeLoading(false);
    }
  }, []);

  const updateWeatherByLocation = useCallback(
    async (location: WeatherLocation) => {
      homeDashboardCache.weather = initialWeather;
      setWeather(initialWeather);

      try {
        const todayWeather = await fetchTodayWeather(location);
        const nextWeather = {
          ...todayWeather,
          status: "ready",
        } satisfies WeatherState;

        homeDashboardCache.weather = nextWeather;
        homeDashboardCache.hasInitializedWeather = true;
        setWeather(nextWeather);
      } catch {
        const nextWeather = {
          description: "天气获取失败",
          status: "error",
        } satisfies WeatherState;

        homeDashboardCache.weather = nextWeather;
        homeDashboardCache.hasInitializedWeather = true;
        setWeather(nextWeather);
      }
    },
    [],
  );

  async function handleAreaChange(value: (string | number)[]) {
    const areaPath = value.map(String);

    homeDashboardCache.weatherAreaPath = areaPath;
    setWeatherAreaPath(areaPath);
    homeDashboardCache.weather = initialWeather;
    setWeather(initialWeather);

    try {
      await updateWeatherByLocation(
        await resolveWeatherLocationByAreaPath(areaPath),
      );
    } catch {
      const nextWeather = {
        description: "天气获取失败",
        status: "error",
      } satisfies WeatherState;

      homeDashboardCache.weather = nextWeather;
      homeDashboardCache.hasInitializedWeather = true;
      setWeather(nextWeather);
    }
  }

  useEffect(() => {
    let isUnmounted = false;

    if (homeDashboardCache.hasInitializedWeather) {
      return;
    }

    if (!navigator.geolocation) {
      const timerId = window.setTimeout(() => {
        const nextWeather = {
          description: "请选择位置",
          status: "error",
        } satisfies WeatherState;

        homeDashboardCache.weatherAreaPath = [];
        homeDashboardCache.weather = nextWeather;
        homeDashboardCache.hasInitializedWeather = true;
        setWeatherAreaPath([]);
        setWeather(nextWeather);
      });

      return () => {
        window.clearTimeout(timerId);
      };
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (isUnmounted) {
          return;
        }

        const location = await resolveCurrentWeatherLocation(coords);
        const locationLabel = location.label;
        const nextAreaPath = [locationLabel];

        homeDashboardCache.weatherAreaPath = nextAreaPath;
        setWeatherAreaPath(nextAreaPath);
        await updateWeatherByLocation(location);
      },
      () => {
        if (!isUnmounted) {
          const nextWeather = {
            description: "请选择位置",
            status: "error",
          } satisfies WeatherState;

          homeDashboardCache.weatherAreaPath = [];
          homeDashboardCache.weather = nextWeather;
          homeDashboardCache.hasInitializedWeather = true;
          setWeatherAreaPath([]);
          setWeather(nextWeather);
        }
      },
      {
        maximumAge: 10 * 60 * 1000,
        timeout: 8000,
      },
    );

    return () => {
      isUnmounted = true;
    };
  }, [updateWeatherByLocation]);

  useEffect(() => {
    if (homeDashboardCache.hasInitializedKnowledge) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void refreshKnowledgeItems();
    });

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refreshKnowledgeItems]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsCategoryContentFullscreen(
        document.fullscreenElement === categoryContentRef.current,
      );
      refreshFullscreenLayout();
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [refreshFullscreenLayout]);

  return (
    <main className="home-dashboard-main mx-auto flex min-h-0 w-full max-w-385 flex-1 flex-col gap-5 overflow-hidden px-8 pb-6 pt-6 max-[900px]:overflow-visible max-md:p-5">
      <div className="home-dashboard-grid grid min-h-0 w-full flex-1 grid-cols-[minmax(0,1180px)] justify-center gap-6 has-[.ai-assistant-root-expanded]:grid-cols-[minmax(0,1180px)_minmax(320px,360px)] max-sm:has-[.ai-assistant-root-expanded]:grid-cols-[minmax(0,1fr)]">
        <div className="home-dashboard-left-stack flex min-h-0 min-w-0 flex-col gap-5">
      <section className="grid shrink-0 grid-cols-3 gap-4 max-md:grid-cols-1">
        {homeStats.map((stat) => {
          return (
            <Card
              className="home-soft-shadow"
              classNames={{ body: "flex h-full min-h-0 flex-col p-4!" }}
              key={stat.label}
              style={surfaceStyle}
            >
              {stat.label === "文章推荐" ? (
                <div className="flex h-full min-h-32.5 flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <Typography.Text type="secondary">
                      <BulbOutlined />
                      <span className="ml-1">文章推荐</span>
                    </Typography.Text>
                    <Button
                      icon={<ReloadOutlined />}
                      loading={isKnowledgeLoading}
                      onClick={refreshKnowledgeItems}
                      size="small"
                      type="text"
                    >
                      换一批
                    </Button>
                  </div>
                  <div className="flex min-h-0 flex-col gap-2">
                    {knowledgeItems.length > 0 ? (
                      knowledgeItems.map((item) => (
                        <a
                          className="flex min-w-0 items-center gap-2 text-sm hover:underline"
                          href={item.link}
                          key={item.link}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <span className="size-1.5 shrink-0 rounded-full bg-(--home-theme-color)" />
                          <span className="line-clamp-1 min-w-0">
                            {item.title}
                          </span>
                        </a>
                      ))
                    ) : (
                      <Typography.Text className="mt-1" type="secondary">
                        {isKnowledgeLoading ? "获取中" : "暂无内容"}
                      </Typography.Text>
                    )}
                  </div>
                </div>
              ) : stat.label === "快捷功能" ? (
                <div className="flex h-full min-h-35 flex-col justify-between">
                  <Typography.Text type="secondary">
                    <TagsOutlined />
                    <span className="ml-1">快捷功能</span>
                  </Typography.Text>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      icon={<PlusOutlined />}
                      onClick={onOpenQuickItemCreate}
                      type="primary"
                    >
                      添加
                    </Button>
                  </div>
                </div>
              ) : stat.label === "位置" ? (
                <div>
                  <Typography.Text type="secondary">
                    <CloudOutlined />
                    <span className="ml-1">今日天气</span>
                  </Typography.Text>
                  <div className="mt-3 flex items-center gap-2">
                    <EnvironmentOutlined className="shrink-0 opacity-70" />
                    <Cascader
                      changeOnSelect
                      className="min-w-0 flex-1 shrink-0 h-8"
                      onChange={(value) => {
                        void handleAreaChange(value);
                      }}
                      options={weatherCascaderOptions}
                      placeholder="选择位置"
                      showSearch
                      size="small"
                      value={weatherAreaPath}
                    />
                  </div>
                  {weather.status === "ready" ? (
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-3xl leading-none font-semibold">
                        {weather.temp}°
                      </span>

                      <Typography.Text className="block" type="secondary">
                        {weather.min}° / {weather.max}°
                        <span className="ml-2 text-sm opacity-75">
                          {weather.description}
                        </span>
                      </Typography.Text>
                    </div>
                  ) : (
                    <Typography.Text className="mt-4 block" type="secondary">
                      {weather.description}
                    </Typography.Text>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </section>

      <section
        className={cn(
          "home-category-workspace grid min-h-0 flex-1 justify-center gap-6 transition-[grid-template-columns] duration-200 max-[900px]:min-h-130 max-md:grid-cols-1",
          isCategorySidebarCollapsed
            ? "home-category-layout-collapsed grid-cols-[72px_minmax(0,1fr)]"
            : "grid-cols-[260px_minmax(0,1fr)]",
        )}
      >
        <aside
          className={cn(
            "home-soft-shadow flex h-full min-h-0 flex-col overflow-hidden rounded-lg border p-4 transition-[padding] duration-200",
            isCategorySidebarCollapsed && "px-2",
          )}
          style={surfaceStyle}
        >
          <div
            className={cn(
              "mb-3 flex shrink-0 items-center",
              isCategorySidebarCollapsed
                ? "justify-center"
                : "justify-between gap-2",
            )}
          >
            {isCategorySidebarCollapsed ? null : (
              <div className="flex min-w-0 items-center gap-1">
                <Typography.Title className="mb-0!" level={5}>
                  分类
                </Typography.Title>
                <Tooltip
                  title={
                    isCategoryVisibilityEditing ? "保存分类设置" : "编辑分类设置"
                  }
                >
                  <Button
                    aria-label={
                      isCategoryVisibilityEditing
                        ? "保存分类设置"
                        : "编辑分类设置"
                    }
                    className="text-(--home-theme-color)!"
                    icon={<CategoryIcon hasPadding={false} name="icon-setting" />}
                    onClick={
                      isCategoryVisibilityEditing
                        ? onFinishCategoryVisibilityEditing
                        : onStartCategoryVisibilityEditing
                    }
                    size="small"
                    type="text"
                  />
                </Tooltip>
              </div>
            )}
            <Button
              aria-label={
                isCategorySidebarCollapsed ? "展开分类" : "收起分类"
              }
              icon={
                isCategorySidebarCollapsed ? (
                  <MenuUnfoldOutlined />
                ) : (
                  <MenuFoldOutlined />
                )
              }
              onClick={() => {
                if (isCategoryVisibilityEditing) {
                  onCancelCategoryVisibilityEditing();
                }

                setIsCategorySidebarCollapsed((collapsed) => !collapsed);
              }}
              size="small"
              title={isCategorySidebarCollapsed ? "展开分类" : "收起分类"}
              type="text"
            />
          </div>
          <div
            className={cn(
              "home-category-menu-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto",
              isCategorySidebarCollapsed ? "px-0" : "pr-1",
            )}
          >
            <Menu
              className="home-category-menu !w-full min-w-0"
              inlineCollapsed={isCategorySidebarCollapsed}
              items={menuItems}
              mode="inline"
              onClick={({ key }) => {
                if (isCategoryVisibilityEditing) {
                  return;
                }

                const categoryHref = String(key);

                if (categoryHref.startsWith("/")) {
                  onCategoryNavigate(categoryHref);
                }
              }}
              onOpenChange={(keys) => {
                setOpenCategoryKeys(keys.map(String));
              }}
              openKeys={
                isCategorySidebarCollapsed ? undefined : openCategoryKeys
              }
              selectedKeys={selectedCategoryKeys}
            />
          </div>
        </aside>

        <Card
          className={cn(
            "home-category-content-card home-soft-shadow flex h-full min-h-0 overflow-hidden",
            isCategoryContentFullscreen && "home-category-content-fullscreen",
          )}
          classNames={{
            body: "flex h-full min-h-0 w-full p-4!",
          }}
          ref={categoryContentRef}
          style={surfaceStyle}
        >
          {isCategoryContentLoading ? (
            <div
              aria-busy="true"
              className="flex min-h-0 flex-1 items-center justify-center"
            >
              <Spin />
            </div>
          ) : (
            <HomeContentFullscreenProvider value={fullscreenContextValue}>
              {children}
            </HomeContentFullscreenProvider>
          )}
        </Card>
      </section>
        </div>

        {aiAssistant ? (
          <div className="home-ai-assistant-slot contents min-h-0 has-[.ai-assistant-root-expanded]:block">
            {aiAssistant}
          </div>
        ) : null}
      </div>
    </main>
  );
}
