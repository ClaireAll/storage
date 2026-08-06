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
import { Button, Card, Cascader, Menu, Spin, Typography } from "antd";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { homeCategories, homeStats } from "./constant";
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
const codexLogCategoryHref = "/home/codex-log";

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
  itemCount: number;
  visibleCategoryHrefs: string[];
  isCategoryContentLoading: boolean;
  isAllCategoriesVisible: boolean;
  surfaceBackground: string;
  surfaceBorderColor: string;
  onCategoryNavigate: (categoryHref: string) => void;
  onOpenQuickItemCreate: () => void;
  onToggleAllCategoriesVisible: () => void;
  onToggleCategoryVisible: (categoryHref: string) => void;
};

export function HomeDashboard({
  activeCategoryHref,
  aiAssistant,
  children,
  isCategoryContentLoading,
  onCategoryNavigate,
  onOpenQuickItemCreate,
  surfaceBackground,
  surfaceBorderColor,
  visibleCategoryHrefs,
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
  const [isCodexLogFullscreen, setIsCodexLogFullscreen] = useState(false);
  const categoryContentRef = useRef<HTMLDivElement>(null);
  const surfaceStyle = {
    backgroundColor: surfaceBackground,
    borderColor: surfaceBorderColor,
  } satisfies CSSProperties;
  const refreshFullscreenLayout = useCallback(() => {
    window.setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 80);
  }, []);
  const handleCodexLogFullscreenClick = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

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
  const menuItems = useMemo(
    () =>
      homeCategories
        .filter((category) => visibleCategoryHrefs.includes(category.href))
        .map((category) => {
          const isCategoryActive = activeCategoryHref === category.href;
          const shouldShowFullscreenButton =
            category.href === codexLogCategoryHref &&
            isCategoryActive &&
            !isCategorySidebarCollapsed;

          return {
            className: cn("hover:scale-[1.1]", {
              "scale-[1.1] font-bold": isCategoryActive,
            }),
            icon: (
              <CategoryIcon
                Icon={category.Icon}
                name={category.iconClassName}
                mode="symbol"
              />
            ),
            key: category.href,
            label: shouldShowFullscreenButton ? (
              <span className="codex-log-fullscreen-menu-label">
                <span className="codex-log-fullscreen-menu-text">
                  {category.label}
                </span>
                <button
                  aria-label="全屏预览Codex日报"
                  className={cn("codex-log-fullscreen-button", {
                    "is-active": isCodexLogFullscreen,
                  })}
                  onClick={handleCodexLogFullscreenClick}
                  title={isCodexLogFullscreen ? "退出全屏" : "全屏"}
                  type="button"
                >
                  <i aria-hidden className="iconfont icon-fullscreen" />
                </button>
              </span>
            ) : (
              category.label
            ),
            title: category.label,
          };
        }),
    [
      activeCategoryHref,
      handleCodexLogFullscreenClick,
      isCategorySidebarCollapsed,
      isCodexLogFullscreen,
      visibleCategoryHrefs,
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
      setIsCodexLogFullscreen(
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
    <main className="home-dashboard-main mx-auto flex min-h-0 w-full max-w-[1540px] flex-1 flex-col gap-5 overflow-hidden px-8 pb-6 pt-6 max-[900px]:overflow-visible max-md:p-5">
      <div className="home-dashboard-grid grid min-h-0 w-full flex-1 grid-cols-[minmax(0,1180px)] justify-center gap-6 [&:has(.ai-assistant-root-expanded)]:grid-cols-[minmax(0,1180px)_minmax(320px,360px)] max-[640px]:[&:has(.ai-assistant-root-expanded)]:grid-cols-[minmax(0,1fr)]">
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
                <div className="flex h-full min-h-[130px] flex-col gap-3">
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
                <div className="flex h-full min-h-[140px] flex-col justify-between">
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
                      <span className="text-[30px] leading-none font-semibold">
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
          "home-category-workspace grid min-h-0 flex-1 justify-center gap-6 transition-[grid-template-columns] duration-200 max-[900px]:min-h-[520px] max-md:grid-cols-1",
          isCategorySidebarCollapsed
            ? "home-category-layout-collapsed grid-cols-[72px_minmax(0,1fr)]"
            : "grid-cols-[260px_minmax(0,1fr)]",
        )}
      >
        <aside
          className={cn(
            "home-soft-shadow h-full min-h-0 overflow-hidden rounded-lg border p-4 transition-[padding] duration-200",
            isCategorySidebarCollapsed && "px-2",
          )}
          style={surfaceStyle}
        >
          <div
            className={cn(
              "mb-3 flex items-center",
              isCategorySidebarCollapsed
                ? "justify-center"
                : "justify-between gap-2",
            )}
          >
            {isCategorySidebarCollapsed ? null : (
              <Typography.Title className="mb-0!" level={5}>
                分类
              </Typography.Title>
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
              onClick={() =>
                setIsCategorySidebarCollapsed((collapsed) => !collapsed)
              }
              size="small"
              title={isCategorySidebarCollapsed ? "展开分类" : "收起分类"}
              type="text"
            />
          </div>
          <Menu
            className="home-category-menu"
            inlineCollapsed={isCategorySidebarCollapsed}
            items={menuItems}
            mode="inline"
            onClick={({ key }) => onCategoryNavigate(String(key))}
            selectedKeys={selectedCategoryKeys}
          />
        </aside>

        <Card
          className={cn(
            "home-category-content-card home-soft-shadow flex h-full min-h-0 overflow-hidden",
            isCodexLogFullscreen && "codex-log-dashboard-fullscreen",
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
            children
          )}
        </Card>
      </section>
        </div>

        {aiAssistant ? (
          <div className="home-ai-assistant-slot contents min-h-0 [&:has(.ai-assistant-root-expanded)]:block">
            {aiAssistant}
          </div>
        ) : null}
      </div>
    </main>
  );
}
