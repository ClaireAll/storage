"use client";

import type { ThemePalette } from "@/app/(pages)/theme/types";
import { cn } from "@/lib/utils";
import { uploadImageToOss } from "@/utils/oss";
import { reqPost } from "@/utils/request";
import { EditOutlined } from "@ant-design/icons";
import { Avatar, Button, Form, Input, Modal, Space } from "antd";
import { signOut } from "next-auth/react";
import { useRef, useState } from "react";

/** 首页左上角展示的用户基础信息。 */
export type HomeUser = {
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

function createAvatarFileName(userName: string) {
  const safeName = userName.trim() || "avatar";

  return `${safeName}.png`;
}

/** 个人资料编辑器状态和行为。 */
export type HomeProfileEditor = ReturnType<typeof useHomeProfile>;

/** 管理首页个人资料弹窗、头像预览和保存行为，参数 user 为初始用户资料。 */
export function useHomeProfile(user: HomeUser) {
  const [profileForm] = Form.useForm<ProfileFormValues>();
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const avatarPreviewObjectUrlRef = useRef<string | null>(null);
  const [profile, setProfile] = useState<HomeUser>(user);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isPasswordFieldsVisible, setIsPasswordFieldsVisible] = useState(false);
  const [isAvatarEditHovered, setIsAvatarEditHovered] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(user.avatar ?? "");
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const headerAvatarUrl = profile.avatar || undefined;
  const modalAvatarUrl = avatarPreviewUrl || profile.avatar || undefined;

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
        ? await uploadImageToOss(pendingAvatarFile, {
            fileName: createAvatarFileName(values.name),
          })
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

  return {
    avatarFileInputRef,
    closeProfileModal,
    handleAvatarFileChange,
    headerAvatarUrl,
    hidePasswordFields,
    isAvatarEditHovered,
    isPasswordFieldsVisible,
    isProfileModalOpen,
    isSavingProfile,
    isSigningOut,
    modalAvatarUrl,
    openProfileModal,
    profile,
    profileError,
    profileForm,
    logout,
    saveProfile,
    setIsAvatarEditHovered,
    setIsPasswordFieldsVisible,
  };
}

/** 首页用户头像入口，参数 editor 为个人资料编辑器，palette 为当前主题调色板。 */
export function HomeProfileButton({
  editor,
  isDark,
  palette,
}: {
  /** 个人资料编辑器状态和行为。 */
  editor: HomeProfileEditor;
  /** 当前是否为深色模式。 */
  isDark: boolean;
  /** 当前主题调色板。 */
  palette: ThemePalette;
}) {
  const { headerAvatarUrl, openProfileModal, profile } = editor;

  return (
    <button
      aria-label="编辑个人资料"
      className="home-profile-trigger group relative size-8 rounded-full border-0 bg-transparent p-0"
      onClick={openProfileModal}
      type="button"
    >
      <Avatar
        alt={profile.name ?? "用户头像"}
        className={cn(
          "home-profile-avatar size-8! text-white! text-[24px]! leading-[32px]! shrink-0",
          {
            "text-[#141414]!": isDark,
            "text-white!": !isDark,
          },
        )}
        icon={
          headerAvatarUrl ? undefined : (
            <i className="iconfont icon-avatar text-[32px]!" />
          )
        }
        key={headerAvatarUrl ?? "default-header-avatar"}
        src={headerAvatarUrl}
        style={{
          backgroundColor: palette.color,
        }}
      />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        <EditOutlined className="text-xs" />
      </span>
    </button>
  );
}

/** 首页个人资料编辑弹窗，参数 editor 为个人资料编辑器，palette 为当前主题调色板。 */
export function HomeProfileModal({
  editor,
  isDark,
  palette,
}: {
  /** 个人资料编辑器状态和行为。 */
  editor: HomeProfileEditor;
  /** 当前是否为深色模式。 */
  isDark: boolean;
  /** 当前主题调色板。 */
  palette: ThemePalette;
}) {
  const {
    avatarFileInputRef,
    closeProfileModal,
    handleAvatarFileChange,
    hidePasswordFields,
    isAvatarEditHovered,
    isPasswordFieldsVisible,
    isProfileModalOpen,
    isSavingProfile,
    isSigningOut,
    logout,
    modalAvatarUrl,
    profile,
    profileError,
    profileForm,
    saveProfile,
    setIsAvatarEditHovered,
    setIsPasswordFieldsVisible,
  } = editor;

  return (
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
            icon={<i className="iconfont icon-avatar text-[112px]!" />}
            key={modalAvatarUrl ?? "default-profile-avatar"}
            src={modalAvatarUrl}
            style={{ backgroundColor: palette.color }}
          />
          <Button
            aria-label="上传头像"
            className="absolute! bottom-0 right-0 z-10 size-9! rounded-full border-2 border-white/70 p-0! text-white! shadow-lg backdrop-blur-[1px]"
            disabled={isSavingProfile}
            icon={<EditOutlined />}
            onClick={() => avatarFileInputRef.current?.click()}
            onMouseEnter={() => setIsAvatarEditHovered(true)}
            onMouseLeave={() => setIsAvatarEditHovered(false)}
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
  );
}
