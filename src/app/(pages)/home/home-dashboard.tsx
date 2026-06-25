import { CategoryIcon } from "@/app/(pages)/common/category-icon";
import { cn } from "@/lib/utils";
import { Button, Card, Menu, Statistic, Typography } from "antd";
import Link from "next/link";
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { homeCategories, homeStats } from "./constant";

/** 首页主体区域接收的属性。 */
type HomeDashboardProps = {
  /** 当前路由选中的分类路径。 */
  activeCategoryHref?: string;
  /** 当前分类物品数量。 */
  itemCount: number;
  /** 当前分类页提供的内容区域。 */
  children?: ReactNode;
  /** 左侧分类菜单当前展示的分类路径列表。 */
  visibleCategoryHrefs: string[];
  /** 是否已展示全部分类。 */
  isAllCategoriesVisible: boolean;
  /** 首页卡片和面板通用背景色。 */
  surfaceBackground: string;
  /** 首页卡片和面板通用边框色。 */
  surfaceBorderColor: string;
  /** 切换全部分类显示状态。 */
  onToggleAllCategoriesVisible: () => void;
  /** 切换单个分类显示状态，参数 categoryHref 为分类页面路径。 */
  onToggleCategoryVisible: (categoryHref: string) => void;
};

/** 首页主体内容区，只负责统计卡片、分类菜单和分类内容承载。 */
export function HomeDashboard({
  activeCategoryHref,
  children,
  isAllCategoriesVisible,
  itemCount,
  onToggleAllCategoriesVisible,
  onToggleCategoryVisible,
  surfaceBackground,
  surfaceBorderColor,
  visibleCategoryHrefs,
}: HomeDashboardProps) {
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
          icon: <CategoryIcon name={category.iconClassName} />,
          key: category.href,
          label: <Link href={category.href}>{category.label}</Link>,
        })),
    [activeCategoryHref, visibleCategoryHrefs],
  );
  const selectedCategoryKeys = activeCategoryHref ? [activeCategoryHref] : [];

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 flex-col gap-5 overflow-hidden px-8 pb-6 pt-6 max-[900px]:overflow-visible max-md:p-5">
      <section className="grid shrink-0 grid-cols-3 gap-4 max-md:grid-cols-1">
        {homeStats.map((stat) => {
          const StatIcon = stat.Icon;
          const statValue = stat.label === "物品" ? itemCount : stat.value;

          return (
            <Card
              className="home-soft-shadow"
              key={stat.label}
              style={surfaceStyle}
            >
              {stat.label === "分类" ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <Typography.Text type="secondary">
                      <StatIcon />
                      {stat.label}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      <span>{statValue}</span>
                    </Typography.Text>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      aria-pressed={isAllCategoriesVisible}
                      onClick={onToggleAllCategoriesVisible}
                      size="small"
                      style={{ height: 32 }}
                      type={isAllCategoriesVisible ? "primary" : "default"}
                    >
                      全部
                    </Button>
                    {homeCategories.map((category) => {
                      const isCategoryActive = visibleCategoryHrefs.includes(
                        category.href,
                      );

                      return (
                        <Button
                          aria-pressed={isCategoryActive}
                          icon={
                            <CategoryIcon
                              hasPadding={false}
                              name={category.iconClassName}
                            />
                          }
                          key={category.href}
                          onClick={() => onToggleCategoryVisible(category.href)}
                          size="small"
                          style={{ height: 32 }}
                          type={isCategoryActive ? "primary" : "default"}
                        >
                          {category.label}
                        </Button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <Statistic
                  prefix={<StatIcon />}
                  title={stat.label}
                  value={statValue}
                />
              )}
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
