import { CategoryIcon } from "@/app/(pages)/common/category-icon";
import { cn } from "@/lib/utils";
import {
  BulbOutlined,
  CloudOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Button, Card, Cascader, Menu, Typography } from "antd";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { homeCategories, homeStats } from "./constant";
import {
  fetchTodayWeather,
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

type HomeDashboardProps = {
  activeCategoryHref?: string;
  children?: ReactNode;
  itemCount: number;
  visibleCategoryHrefs: string[];
  isAllCategoriesVisible: boolean;
  surfaceBackground: string;
  surfaceBorderColor: string;
  onOpenQuickItemCreate: () => void;
  onToggleAllCategoriesVisible: () => void;
  onToggleCategoryVisible: (categoryHref: string) => void;
};

export function HomeDashboard({
  activeCategoryHref,
  children,
  itemCount,
  onOpenQuickItemCreate,
  surfaceBackground,
  surfaceBorderColor,
  visibleCategoryHrefs,
}: HomeDashboardProps) {
  const [weather, setWeather] = useState<WeatherState>({
    description: "获取中",
    status: "loading",
  });
  const [weatherAreaPath, setWeatherAreaPath] = useState<string[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(false);
  const surfaceStyle = {
    backgroundColor: surfaceBackground,
    borderColor: surfaceBorderColor,
  } satisfies CSSProperties;
  const menuItems = useMemo(
    () =>
      homeCategories
        .filter((category) => visibleCategoryHrefs.includes(category.href))
        .map((category) => ({
          className: cn("hover:scale-[1.1]", {
            "scale-[1.1] font-bold": activeCategoryHref === category.href,
          }),
          icon: (
            <CategoryIcon Icon={category.Icon} name={category.iconClassName} />
          ),
          key: category.href,
          label: <Link href={category.href}>{category.label}</Link>,
        })),
    [activeCategoryHref, visibleCategoryHrefs],
  );
  const selectedCategoryKeys = activeCategoryHref ? [activeCategoryHref] : [];
  const weatherCascaderOptions = useMemo(
    () =>
      weatherAreaPath[0] === "当前位置"
        ? [{ label: "当前位置", value: "当前位置" }, ...weatherAreaOptions]
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

      setKnowledgeItems((result.items ?? []).slice(0, 4));
    } catch {
      setKnowledgeItems([]);
    } finally {
      setIsKnowledgeLoading(false);
    }
  }, []);

  const updateWeatherByLocation = useCallback(
    async (location: WeatherLocation) => {
      setWeather({ description: "获取中", status: "loading" });

      try {
        const todayWeather = await fetchTodayWeather(location);

        setWeather({
          ...todayWeather,
          status: "ready",
        });
      } catch {
        setWeather({ description: "天气获取失败", status: "error" });
      }
    },
    [],
  );

  async function handleAreaChange(value: (string | number)[]) {
    const areaPath = value.map(String);

    setWeatherAreaPath(areaPath);
    setWeather({ description: "获取中", status: "loading" });

    try {
      await updateWeatherByLocation(
        await resolveWeatherLocationByAreaPath(areaPath),
      );
    } catch {
      setWeather({ description: "天气获取失败", status: "error" });
    }
  }

  useEffect(() => {
    let isUnmounted = false;

    if (!navigator.geolocation) {
      const timerId = window.setTimeout(() => {
        setWeatherAreaPath([]);
        setWeather({ description: "请选择位置", status: "error" });
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

        setWeatherAreaPath(["当前位置"]);
        await updateWeatherByLocation({
          id: "current-location",
          label: "当前位置",
          latitude: coords.latitude,
          longitude: coords.longitude,
          name: "当前位置",
        });
      },
      () => {
        if (!isUnmounted) {
          setWeatherAreaPath([]);
          setWeather({ description: "请选择位置", status: "error" });
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
    const timerId = window.setTimeout(() => {
      void refreshKnowledgeItems();
    });

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refreshKnowledgeItems]);

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 flex-col gap-5 overflow-hidden px-8 pb-6 pt-6 max-[900px]:overflow-visible max-md:p-5">
      <section className="grid shrink-0 grid-cols-3 gap-4 max-md:grid-cols-1">
        {homeStats.map((stat) => {
          const StatIcon = stat.Icon;

          return (
            <Card
              className="home-soft-shadow"
              classNames={
                stat.label === "文章推荐"
                  ? { body: "flex h-full min-h-0 flex-col" }
                  : undefined
              }
              key={stat.label}
              style={surfaceStyle}
            >
              {stat.label === "文章推荐" ? (
                <div className="flex h-full min-h-[140px] flex-col">
                  <div className="flex items-center justify-between gap-3">
                    <Typography.Text type="secondary">
                      <BulbOutlined />
                      <span className="ml-1">文章推荐</span>
                      <span className="ml-2 text-xs opacity-70">
                        {itemCount} 条
                      </span>
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
                  <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2">
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
                    <StatIcon />
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

      <section className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)] gap-6 max-[900px]:min-h-[520px] max-md:grid-cols-1">
        <aside
          className="home-soft-shadow h-full min-h-0 overflow-hidden rounded-lg border p-4"
          style={surfaceStyle}
        >
          <Typography.Title level={5}>分类</Typography.Title>
          <Menu
            className="home-category-menu"
            items={menuItems}
            mode="inline"
            selectedKeys={selectedCategoryKeys}
          />
        </aside>

        <Card
          className="home-soft-shadow flex h-full min-h-0 overflow-hidden"
          classNames={{
            body: "flex h-full min-h-0 w-full p-[18px]",
          }}
          style={surfaceStyle}
        >
          {children}
        </Card>
      </section>
    </main>
  );
}
