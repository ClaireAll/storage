"use client";

import { CategoryIcon } from "@/app/(pages)/common/category-icon";
import { ClothesCreateModal } from "@/app/(pages)/home/clothes/clothes-create-modal";
import {
  getThemeShellBackground,
  mixHexColor,
} from "@/app/(pages)/theme/colors";
import { ThemeTexturePublisher } from "@/app/(pages)/theme/shared-theme-texture";
import { ThemeControl } from "@/app/(pages)/theme/theme-control";
import { ThemeProvider } from "@/app/(pages)/theme/theme-provider";
import { ThemeShellBackground } from "@/app/(pages)/theme/theme-shell-background";
import type { ThemeConfig } from "@/app/(pages)/theme/types";
import { cn } from "@/lib/utils";
import { uploadImageToOss } from "@/utils/oss";
import { reqPost } from "@/utils/request";
import {
  EditOutlined,
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
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Space,
  Statistic,
  Typography,
} from "antd";
import { SessionProvider, signOut } from "next-auth/react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

const categories = [
  {
    label: "衣服",
    href: "/home/clothes",
    iconClassName: "icon-clothes",
  },
  {
    label: "裤子",
    href: "/home/pants",
    iconClassName: "icon-pants",
  },
];

const stats = [
  { label: "物品", value: 0, icon: <InboxOutlined /> },
  { label: "分类", value: categories.length, icon: <TagsOutlined /> },
  { label: "位置", value: 0, icon: <EnvironmentOutlined /> },
];

/** 首页左上角展示的用户基础信息。 */
type HomeUser = {
  /** 用户头像地址，没有时显示默认头像图标。 */
  avatar?: string | null;
  /** 用户名称，用于头像无图时的辅助信息。 */
  name?: string | null;
  /** 用户手机号，仅用于资料弹窗展示。 */
  phone?: string | null;
};

/** 个人资料表单收集的字段。 */
type ProfileFormValues = {
  /** 用户头像地址。 */
  avatar?: string;
  /** 用户名称。 */
  name: string;
  /** 修改密码前输入的旧密码。 */
  oldPassword?: string;
  /** 用户新密码。 */
  password?: string;
};

/** 首页组件接收的属性。 */
type HomePageProps = {
  /** 页面首次渲染使用的主题配置。 */
  initialTheme: ThemeConfig;
  /** 当前登录用户信息，用于展示头像。 */
  user: HomeUser;
  /** 当前路由选中的分类路径，用于控制右侧内容区展示。 */
  activeCategoryHref?: string;
};

export default function HomePage({
  activeCategoryHref,
  initialTheme,
  user,
}: HomePageProps) {
  const [profileForm] = Form.useForm<ProfileFormValues>();
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const avatarPreviewObjectUrlRef = useRef<string | null>(null);
  const [profile, setProfile] = useState<HomeUser>(user);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isClothesCreateModalOpen, setIsClothesCreateModalOpen] =
    useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isPasswordFieldsVisible, setIsPasswordFieldsVisible] = useState(false);
  const [isAvatarEditHovered, setIsAvatarEditHovered] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(user.avatar ?? "");
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [visibleCategoryHrefs, setVisibleCategoryHrefs] = useState(() =>
    categories.map((category) => category.href),
  );
  const headerAvatarUrl = profile.avatar || undefined;
  const modalAvatarUrl = avatarPreviewUrl || profile.avatar || undefined;
  const isAllCategoriesVisible =
    visibleCategoryHrefs.length === categories.length;
  const visibleCategories = categories.filter((category) =>
    visibleCategoryHrefs.includes(category.href),
  );
  const menuItems = useMemo(
    () =>
      visibleCategories.map((category) => ({
        key: category.href,
        className: cn("hover:scale-[1.1]", {
          "scale-[1.1]": activeCategoryHref === category.href,
        }),
        icon: <CategoryIcon name={category.iconClassName} />,
        label: <Link href={category.href}>{category.label}</Link>,
      })),
    [visibleCategories],
  );
  const activeCategory = categories.find(
    (category) => category.href === activeCategoryHref,
  );
  const selectedCategoryKeys = activeCategoryHref ? [activeCategoryHref] : [];
  const isClothesPage = activeCategoryHref === "/home/clothes";
  const emptyDescription = activeCategory
    ? `还没有${activeCategory.label}物品`
    : "还没有物品";

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
      currentHrefs.length === categories.length
        ? []
        : categories.map((category) => category.href),
    );
  }

  /** 打开衣服新增弹窗，仅衣服分类页面可用。 */
  function openClothesCreateModal() {
    if (isClothesPage) {
      setIsClothesCreateModalOpen(true);
    }
  }

  /** 释放头像本地预览地址，避免重复选择图片后残留浏览器内存。 */
  function revokeAvatarPreviewObjectUrl() {
    if (avatarPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(avatarPreviewObjectUrlRef.current);
      avatarPreviewObjectUrlRef.current = null;
    }
  }

  /** 校验用户选择的头像文件，参数 file 为本地图片文件。 */
  function validateAvatarFile(file: File) {
    if (!file.type.startsWith("image/")) {
      throw new Error("请选择图片文件");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("图片大小不能超过 5MB");
    }
  }

  /** 使用当前已保存资料重置编辑弹窗的临时状态。 */
  function resetProfileModalDraft() {
    revokeAvatarPreviewObjectUrl();
    setPendingAvatarFile(null);
    setIsPasswordFieldsVisible(false);
    setAvatarPreviewUrl(profile.avatar ?? "");
    setProfileError("");
    profileForm.setFieldsValue({
      avatar: profile.avatar ?? "",
      name: profile.name ?? "",
      oldPassword: "",
      password: "",
    });
  }

  /** 打开个人资料弹窗，并将当前资料写入表单。 */
  function openProfileModal() {
    resetProfileModalDraft();
    setIsProfileModalOpen(true);
  }

  /** 关闭个人资料弹窗，并丢弃未保存的头像预览。 */
  function closeProfileModal() {
    resetProfileModalDraft();
    setIsProfileModalOpen(false);
  }

  /** 收起密码修改区域，并清空旧密码和新密码输入。 */
  function hidePasswordFields() {
    setIsPasswordFieldsVisible(false);
    profileForm.setFieldsValue({
      oldPassword: "",
      password: "",
    });
  }

  /** 保存个人资料表单，参数 values 为用户输入的最新资料。 */
  async function saveProfile(values: ProfileFormValues) {
    setIsSavingProfile(true);
    setProfileError("");

    try {
      const avatarUrl = pendingAvatarFile
        ? await uploadImageToOss(pendingAvatarFile)
        : values.avatar;
      const nextProfile = await reqPost<HomeUser>("/api/users/profile", {
        data: {
          avatar: avatarUrl,
          name: values.name,
          oldPassword: values.oldPassword,
          password: values.password,
        },
      });

      setProfile(nextProfile);
      revokeAvatarPreviewObjectUrl();
      setPendingAvatarFile(null);
      setAvatarPreviewUrl(nextProfile.avatar ?? "");
      setIsProfileModalOpen(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSavingProfile(false);
    }
  }

  /** 退出当前登录账号，并跳转回登录页。 */
  async function logout() {
    setIsSigningOut(true);
    await signOut({ redirectTo: "/login" });
  }

  /** 选择头像图片后生成本地临时预览，保存时才上传 OSS。 */
  async function handleAvatarFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setProfileError("");

    try {
      validateAvatarFile(file);
      revokeAvatarPreviewObjectUrl();

      const objectUrl = URL.createObjectURL(file);

      avatarPreviewObjectUrlRef.current = objectUrl;
      setPendingAvatarFile(file);
      setAvatarPreviewUrl(objectUrl);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "头像选择失败");
    } finally {
      event.target.value = "";
    }
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
          const homeHeaderBackground = mixHexColor(
            activePalette.bg,
            "#ffffff",
            isDark ? 16 : 12,
          );
          const homeSurfaceBackground = activePalette.bg;
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
          const homeMenuSelectedColor = activePalette.color;

          return (
            <>
              <ThemeShellBackground color={homeShellBackground} />
              <ThemeTexturePublisher
                background={homeShellBackground}
                color={activePalette.color}
                text={activePalette.text}
                texture={themeConfig.texture}
              />
              <Layout
                className={cn(
                  "app-shell app-textured-shell home-shell flex min-h-dvh flex-1 flex-col",
                  isDark ? "bg-neutral-950" : "bg-neutral-100",
                  `theme-${resolvedMode}`,
                  `app-texture-${themeConfig.texture}`,
                )}
                style={
                  {
                    "--app-shell-bg": homeShellBackground,
                    "--app-texture-color": activePalette.color,
                    "--app-texture-text": activePalette.text,
                    "--home-theme-bg": activePalette.bg,
                    "--home-theme-color": activePalette.color,
                    "--home-menu-hover-bg": homeMenuHoverBackground,
                    "--home-menu-selected-bg": homeMenuSelectedBackground,
                    "--home-menu-selected-color": homeMenuSelectedColor,
                    "--home-theme-text": activePalette.text,
                    color: activePalette.text,
                    minHeight: "100dvh",
                  } as React.CSSProperties
                }
              >
                <header
                  className={cn(
                    "flex items-center justify-between gap-4 border-b px-8 py-2 max-md:flex-col max-md:items-start max-md:p-5",
                  )}
                  style={{
                    backgroundColor: homeHeaderBackground,
                    borderBottomColor: homeBorderColor,
                  }}
                >
                  <div className="flex items-center gap-3.5">
                    <button
                      aria-label="编辑个人资料"
                      className="group relative rounded-full border-0 bg-transparent p-0"
                      onClick={openProfileModal}
                      type="button"
                    >
                      <Avatar
                        alt={profile.name ?? "用户头像"}
                        className={cn(
                          "size-16! text-white! text-[44px]! leading-[64px]! shrink-0",
                          {
                            "text-[#141414]!": isDark,
                            "text-white!": !isDark,
                          },
                        )}
                        icon={
                          <i className="iconfont icon-avatar text-[64px]!" />
                        }
                        key={headerAvatarUrl ?? "default-header-avatar"}
                        src={headerAvatarUrl}
                        style={{
                          backgroundColor: activePalette.color,
                        }}
                      />
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                        <EditOutlined className="text-xl" />
                      </span>
                    </button>
                    <span
                      className="flex h-16 items-center font-['Dancing_Script',cursive] text-[38px] leading-none"
                      style={{
                        color: activePalette.color,
                      }}
                    >
                      {profile.name ?? "用户"}
                    </span>
                  </div>
                  <Space wrap>
                    <Button icon={<SearchOutlined />}>搜索</Button>
                    <Button
                      disabled={!isClothesPage}
                      icon={<PlusOutlined />}
                      onClick={openClothesCreateModal}
                      type="primary"
                    >
                      添加物品
                    </Button>
                    <ThemeControl />
                  </Space>
                </header>

                <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-8 pb-6 pt-6 max-md:p-5">
                  <section className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
                    {stats.map((stat) => (
                      <Card
                        className="shadow-[0_20px_80px_rgb(0_0_0/18%)]"
                        key={stat.label}
                        style={{
                          backgroundColor: homeSurfaceBackground,
                          borderColor: homeBorderColor,
                        }}
                      >
                        {stat.label === "分类" ? (
                          <>
                            <div className="flex items-center justify-between gap-3">
                              <Typography.Text type="secondary">
                                {stat.icon}
                                {stat.label}
                              </Typography.Text>
                              <Typography.Text type="secondary">
                                <span>{stat.value}</span>
                              </Typography.Text>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                aria-pressed={isAllCategoriesVisible}
                                onClick={toggleAllCategoriesVisible}
                                size="small"
                                style={{ height: 32 }}
                                type={
                                  isAllCategoriesVisible ? "primary" : "default"
                                }
                              >
                                全部
                              </Button>
                              {categories.map((category) => {
                                const isCategoryActive =
                                  visibleCategoryHrefs.includes(category.href);

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
                                    onClick={() =>
                                      toggleCategoryVisible(category.href)
                                    }
                                    size="small"
                                    style={{ height: 32 }}
                                    type={
                                      isCategoryActive ? "primary" : "default"
                                    }
                                  >
                                    {category.label}
                                  </Button>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <Statistic
                            prefix={stat.icon}
                            title={stat.label}
                            value={stat.value}
                          />
                        )}
                      </Card>
                    ))}
                  </section>

                  <section className="grid flex-1 grid-cols-[260px_minmax(0,1fr)] gap-6 max-md:grid-cols-1">
                    <aside
                      className={cn(
                        "h-full rounded-lg border p-4 shadow-[0_20px_80px_rgb(0_0_0/18%)]",
                      )}
                      style={{
                        backgroundColor: homeSurfaceBackground,
                        borderColor: homeBorderColor,
                      }}
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
                      className="flex h-full min-h-[420px] items-center justify-center shadow-[0_20px_80px_rgb(0_0_0/18%)]"
                      classNames={{
                        body: "flex h-full w-full items-center justify-center",
                      }}
                      style={{
                        backgroundColor: homeSurfaceBackground,
                        borderColor: homeBorderColor,
                      }}
                    >
                      <Empty
                        description={emptyDescription}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      >
                        <Typography.Paragraph type="secondary">
                          添加第一件物品，开始记录它的存放位置、分类和图片。
                        </Typography.Paragraph>
                        <Flex justify="center">
                          <Button
                            disabled={!isClothesPage}
                            icon={<PlusOutlined />}
                            onClick={openClothesCreateModal}
                            type="primary"
                          >
                            添加第一件物品
                          </Button>
                        </Flex>
                      </Empty>
                    </Card>
                  </section>
                  <div
                    className="min-h-28 rounded-lg border shadow-[0_20px_80px_rgb(0_0_0/18%)]"
                    style={{
                      backgroundColor: homeSurfaceBackground,
                      borderColor: homeBorderColor,
                    }}
                  />
                </main>
                <Modal
                  centered
                  className="profile-edit-modal"
                  footer={
                    <div className="flex items-center justify-between gap-3">
                      <Button
                        danger
                        loading={isSigningOut}
                        onClick={logout}
                        type="text"
                      >
                        退出登录
                      </Button>
                      <Space>
                        <Button onClick={closeProfileModal}>取消</Button>
                        <Button
                          htmlType="submit"
                          loading={isSavingProfile}
                          onClick={() => profileForm.submit()}
                          type="primary"
                        >
                          保存
                        </Button>
                      </Space>
                    </div>
                  }
                  mask={{
                    closable: false,
                  }}
                  onCancel={closeProfileModal}
                  open={isProfileModalOpen}
                  title="编辑个人资料"
                  width={520}
                >
                  <input
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                    ref={avatarFileInputRef}
                    type="file"
                  />
                  <div className="mb-8 flex justify-center">
                    <div className="relative">
                      <Avatar
                        alt={profile.name ?? "用户头像"}
                        className={cn(
                          "size-28! text-white! text-[76px]! leading-[112px]! shrink-0",
                          {
                            "text-[#141414]!": isDark,
                            "text-white!": !isDark,
                          },
                        )}
                        icon={
                          <i className="iconfont icon-avatar text-[112px]!" />
                        }
                        key={modalAvatarUrl ?? "default-profile-avatar"}
                        src={modalAvatarUrl}
                        style={{ backgroundColor: activePalette.color }}
                      />
                      <Button
                        aria-label="上传头像"
                        className="absolute! bottom-0 right-0 z-10 size-9! rounded-full border-2 border-white/70 p-0! text-white! shadow-lg backdrop-blur-[1px]"
                        icon={<EditOutlined />}
                        disabled={isSavingProfile}
                        onMouseEnter={() => setIsAvatarEditHovered(true)}
                        onMouseLeave={() => setIsAvatarEditHovered(false)}
                        onClick={() => avatarFileInputRef.current?.click()}
                        shape="circle"
                        style={{
                          backgroundColor: isAvatarEditHovered
                            ? "rgb(82 82 82 / 56%)"
                            : "rgb(82 82 82 / 32%)",
                        }}
                      />
                    </div>
                  </div>

                  {profileError ? (
                    <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                      {profileError}
                    </div>
                  ) : null}

                  <Form
                    autoComplete="off"
                    colon={false}
                    form={profileForm}
                    labelAlign="left"
                    labelCol={{ span: 6 }}
                    layout="horizontal"
                    onFinish={saveProfile}
                    requiredMark={false}
                    wrapperCol={{ span: 18 }}
                  >
                    <Form.Item
                      label="用户名称"
                      name="name"
                      rules={[{ required: true, message: "请输入用户名称" }]}
                    >
                      <Input
                        autoComplete="new-password"
                        name="storage-profile-display-title"
                        placeholder="请输入用户名称"
                      />
                    </Form.Item>
                    <Form.Item hidden name="avatar">
                      <Input autoComplete="off" name="storage-profile-avatar" />
                    </Form.Item>
                    <Form.Item label="手机号">
                      <Input
                        autoComplete="new-password"
                        disabled
                        name="storage-profile-phone-readonly"
                        value={profile.phone ?? ""}
                      />
                    </Form.Item>
                    {isPasswordFieldsVisible ? (
                      <>
                        <Form.Item
                          dependencies={["password"]}
                          label="旧密码"
                          name="oldPassword"
                          rules={[
                            ({ getFieldValue }) => ({
                              /** 当填写新密码时校验旧密码是否同步填写，参数 value 为旧密码输入值。 */
                              validator(_, value) {
                                const nextPassword = getFieldValue("password");

                                if (!nextPassword || value) {
                                  return Promise.resolve();
                                }

                                return Promise.reject(
                                  new Error("修改密码时请输入旧密码"),
                                );
                              },
                            }),
                          ]}
                        >
                          <Input.Password
                            autoComplete="new-password"
                            name="storage-profile-old-secret"
                            placeholder="请输入旧密码"
                          />
                        </Form.Item>
                        <Form.Item
                          label="新密码"
                          name="password"
                          rules={[{ min: 4, message: "密码最少 4 位" }]}
                        >
                          <Input.Password
                            autoComplete="new-password"
                            name="storage-profile-new-secret"
                            placeholder="请输入新密码"
                          />
                        </Form.Item>
                        <Form.Item label=" ">
                          <Button onClick={hidePasswordFields} type="link">
                            收起
                          </Button>
                        </Form.Item>
                      </>
                    ) : (
                      <Form.Item label="密码">
                        <Button
                          onClick={() => setIsPasswordFieldsVisible(true)}
                          type="link"
                        >
                          修改密码
                        </Button>
                      </Form.Item>
                    )}
                  </Form>
                </Modal>
                <ClothesCreateModal
                  onClose={() => setIsClothesCreateModalOpen(false)}
                  open={isClothesCreateModalOpen}
                  themeColor={activePalette.color}
                />
              </Layout>
            </>
          );
        }}
      </ThemeProvider>
    </SessionProvider>
  );
}
