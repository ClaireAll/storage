"use client";

import { cn } from "@/lib/utils";
import {
  AppstoreOutlined,
  BookOutlined,
  EnvironmentOutlined,
  InboxOutlined,
  PlusOutlined,
  SearchOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Flex,
  Layout,
  Menu,
  Space,
  Statistic,
  Typography,
} from "antd";
import { useMemo } from "react";
import { ThemeControl } from "./theme/theme-control";
import { ThemeProvider } from "./theme/theme-provider";
import type { ThemeConfig } from "./theme/types";

const stats = [
  { label: "物品", value: 0, icon: <InboxOutlined /> },
  { label: "分类", value: 6, icon: <TagsOutlined /> },
  { label: "位置", value: 0, icon: <EnvironmentOutlined /> },
];

const categories = ["衣物", "鞋履", "书籍", "电子设备", "日用品", "其他"];

/** 首页左上角展示的用户基础信息。 */
type HomeUser = {
  /** 用户头像地址，没有时显示默认头像图标。 */
  image?: string | null;
  /** 用户名称，用于头像无图时的辅助信息。 */
  name?: string | null;
};

/** 首页组件接收的属性。 */
type HomePageProps = {
  /** 页面首次渲染使用的主题配置。 */
  initialTheme: ThemeConfig;
  /** 当前登录用户信息，用于展示头像。 */
  user: HomeUser;
};

export default function HomePage({ initialTheme, user }: HomePageProps) {
  const menuItems = useMemo(
    () =>
      categories.map((category) => ({
        key: category,
        icon: category === "书籍" ? <BookOutlined /> : <AppstoreOutlined />,
        label: category,
      })),
    [],
  );

  return (
    <ThemeProvider initialTheme={initialTheme}>
      {({ themeConfig, updateTheme }) => {
        const isDark = themeConfig.mode === "dark";

        return (
          <Layout
            className={cn(
              "app-shell min-h-dvh",
              isDark ? "bg-neutral-950" : "bg-neutral-100",
              `theme-${themeConfig.mode}`,
            )}
          >
            <header
              className={cn(
                "flex items-center justify-between gap-4 border-b px-8 py-2 max-md:flex-col max-md:items-start max-md:p-5",
                isDark ? "bg-neutral-900" : "bg-white",
              )}
              style={{
                borderBottomColor: isDark ? "#262626" : "#f0f0f0",
              }}
            >
              <div className="flex items-center gap-3.5">
                <Avatar
                  alt={user.name ?? "用户头像"}
                  className={cn(
                    "size-16! text-white! text-[44px]! leading-[64px]! shrink-0",
                    {
                      "text-[#141414]!": isDark,
                      "text-white!": !isDark,
                    },
                  )}
                  icon={<i className="iconfont icon-avatar text-[64px]!" />}
                  src={user.image || undefined}
                  style={{
                    backgroundColor: themeConfig.color,
                  }}
                />
              </div>
              <Space wrap>
                <Button icon={<SearchOutlined />}>搜索</Button>
                <Button icon={<PlusOutlined />} type="primary">
                  添加物品
                </Button>
                <ThemeControl
                  themeConfig={themeConfig}
                  updateTheme={updateTheme}
                />
              </Space>
            </header>

            <main className="mx-auto w-full max-w-[1200px] px-8 pb-10 pt-6 max-md:p-5">
              <section className="mb-6 grid grid-cols-3 gap-4 max-md:grid-cols-1">
                {stats.map((stat) => (
                  <Card key={stat.label}>
                    <Statistic
                      prefix={stat.icon}
                      title={stat.label}
                      value={stat.value}
                    />
                  </Card>
                ))}
              </section>

              <section className="grid grid-cols-[260px_minmax(0,1fr)] gap-6 max-md:grid-cols-1">
                <aside
                  className={cn(
                    "rounded-lg border p-4",
                    isDark ? "bg-neutral-900" : "bg-white",
                  )}
                  style={{
                    borderColor: isDark ? "#262626" : "#f0f0f0",
                  }}
                >
                  <Typography.Title level={5}>分类</Typography.Title>
                  <Menu
                    defaultSelectedKeys={["书籍"]}
                    items={menuItems}
                    mode="inline"
                  />
                </aside>

                <Card
                  className="flex min-h-[420px] items-center justify-center"
                  classNames={{ body: "w-full" }}
                >
                  <Empty
                    description="还没有物品"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  >
                    <Typography.Paragraph type="secondary">
                      添加第一件物品，开始记录它的存放位置、分类和图片。
                    </Typography.Paragraph>
                    <Flex justify="center">
                      <Button icon={<PlusOutlined />} type="primary">
                        添加第一件物品
                      </Button>
                    </Flex>
                  </Empty>
                </Card>
              </section>
            </main>
          </Layout>
        );
      }}
    </ThemeProvider>
  );
}
