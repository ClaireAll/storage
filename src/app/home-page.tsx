"use client";

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

type HomePageProps = {
  initialTheme: ThemeConfig;
};

export default function HomePage({ initialTheme }: HomePageProps) {
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
      {({ themeConfig, updateTheme }) => (
        <Layout className={`app-shell theme-${themeConfig.mode}`}>
          <header className="app-header">
            <div>
              <Typography.Title className="app-title" level={1}>
                Storage <i className="iconfont icon-book" />
              </Typography.Title>
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

          <main className="app-main">
            <section className="stats-grid">
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

            <section className="content-grid">
              <aside className="category-panel">
                <Typography.Title level={5}>分类</Typography.Title>
                <Menu
                  defaultSelectedKeys={["书籍"]}
                  items={menuItems}
                  mode="inline"
                />
              </aside>

              <Card className="empty-card">
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
      )}
    </ThemeProvider>
  );
}
