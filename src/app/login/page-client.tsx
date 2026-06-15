"use client";

import { LockOutlined, PhoneOutlined, UserOutlined } from "@ant-design/icons";
import {
  Alert,
  theme as antdTheme,
  Button,
  Card,
  ConfigProvider,
  Form,
  Input,
  Segmented,
  Typography,
} from "antd";
import { SessionProvider, signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { reqPost } from "@/utils/request";
import {
  dateNumberClassName,
  datePanelClassName,
  dateRowClassName,
  getAuthFormClassName,
  getDateCardClassName,
  getDateLabelClassName,
  getFormPanelClassName,
  getLoginPageClassName,
  getThemeButtonClassName,
  getYearClassName,
  heroBrandClassName,
  heroCopyClassName,
  heroImageClassName,
  heroOverlayClassName,
  heroSectionClassName,
  heroTextClassName,
  heroTitleClassName,
  loginBrandClassName,
  loginCardClassName,
  themeIconClassName,
} from "./styles";

/** 登录页当前展示的表单模式。 */
type AuthMode = "login" | "register";

/** 登录页主题模式，默认根据系统明暗偏好初始化。 */
type LoginThemeMode = "light" | "dark";

/** 登录/注册表单收集的字段。 */
type AuthFormValues = {
  /** 注册时填写的姓名。 */
  name?: string;
  /** 登录和注册使用的密码。 */
  password: string;
  /** 登录和注册使用的手机号。 */
  phone: string;
};

/** 图片区域展示的日期信息。 */
type DisplayDate = {
  /** 当前年份。 */
  year: string;
  /** 当前月份，补齐两位。 */
  month: string;
  /** 当前日期，补齐两位。 */
  day: string;
};

const initialDisplayDate: DisplayDate = {
  day: "--",
  month: "--",
  year: "----",
};

/** 根据浏览器系统设置判断登录页应使用的明暗主题。 */
function getSystemThemeMode(): LoginThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** 订阅浏览器系统明暗主题变化，参数 onStoreChange 用于通知 React 重新读取主题快照。 */
function subscribeSystemTheme(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", onStoreChange);

  return () => {
    mediaQuery.removeEventListener("change", onStoreChange);
  };
}

/** 获取图片区域需要展示的年月日。 */
function getDisplayDate(): DisplayDate {
  const now = new Date();

  return {
    day: String(now.getDate()).padStart(2, "0"),
    month: String(now.getMonth() + 1).padStart(2, "0"),
    year: String(now.getFullYear()),
  };
}

/** 渲染登录和注册表单，并在注册后自动登录。 */
function LoginForm() {
  const router = useRouter();
  const [form] = Form.useForm<AuthFormValues>();
  const [mode, setMode] = useState<AuthMode>("login");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const systemThemeMode = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemThemeMode,
    () => "light",
  );
  const [selectedThemeMode, setSelectedThemeMode] =
    useState<LoginThemeMode | null>(null);
  const themeMode = selectedThemeMode ?? systemThemeMode;
  const [displayDate, setDisplayDate] =
    useState<DisplayDate>(initialDisplayDate);
  const isRegister = mode === "register";
  const isDark = themeMode === "dark";

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setDisplayDate(getDisplayDate());
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  /** 提交登录或注册表单，注册成功后继续调用 NextAuth 登录。 */
  async function handleSubmit(values: AuthFormValues) {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await reqPost("/api/users/register", { data: values });
      }

      const result = await signIn("credentials", {
        password: values.password,
        phone: values.phone,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(
          isRegister ? "注册成功，但自动登录失败" : "手机号或密码错误",
        );
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark
          ? antdTheme.darkAlgorithm
          : antdTheme.defaultAlgorithm,
        token: {
          borderRadius: 8,
          colorPrimary: "#22b96f",
        },
      }}
    >
      <main className={getLoginPageClassName(isDark)}>
        <button
          aria-label={isDark ? "切换为浅色主题" : "切换为深色主题"}
          className={getThemeButtonClassName(isDark)}
          onClick={() => setSelectedThemeMode(isDark ? "light" : "dark")}
          type="button"
        >
          <i className={themeIconClassName} />
        </button>

        <section className={heroSectionClassName}>
          <Image
            alt="登录页背景"
            className={heroImageClassName}
            fill
            priority
            src="/images/login-hero.png"
          />
          <div className={heroOverlayClassName}>
            <div aria-label="当前日期" className={datePanelClassName}>
              <span className={heroBrandClassName}>Storage</span>
              <span className={getYearClassName(isDark)}>
                {displayDate.year}
              </span>
              <div className={dateRowClassName}>
                <div className={getDateCardClassName(isDark)}>
                  <strong className={dateNumberClassName}>
                    {displayDate.month}
                  </strong>
                  <span className={getDateLabelClassName(isDark)}>月</span>
                </div>
                <div className={getDateCardClassName(isDark)}>
                  <strong className={dateNumberClassName}>
                    {displayDate.day}
                  </strong>
                  <span className={getDateLabelClassName(isDark)}>日</span>
                </div>
              </div>
            </div>
            <div className={heroCopyClassName}>
              <Typography.Title className={heroTitleClassName} level={2}>
                管理你的每一件物品
              </Typography.Title>
              <Typography.Paragraph className={heroTextClassName}>
                记录位置、分类和图片，让个人库存清晰可查。
              </Typography.Paragraph>
            </div>
          </div>
        </section>

        <section className={getFormPanelClassName(isDark)}>
          <Card className={loginCardClassName}>
            <Typography.Text className={loginBrandClassName}>
              Storage
            </Typography.Text>
            <Typography.Title level={2}>
              {isRegister ? "创建账号" : "欢迎回来"}
            </Typography.Title>
            <Typography.Paragraph type="secondary">
              {isRegister ? "创建你的个人库存账号" : "登录个人库存管理平台"}
            </Typography.Paragraph>

            <Segmented<AuthMode>
              block
              className="mb-5"
              onChange={(value) => {
                setMode(value);
                setErrorMessage("");
                form.resetFields();
              }}
              options={[
                { label: "登录", value: "login" },
                { label: "注册", value: "register" },
              ]}
              value={mode}
            />

            {errorMessage ? (
              <Alert
                className="mb-4"
                message={errorMessage}
                showIcon
                type="error"
              />
            ) : null}

            <Form
              className={getAuthFormClassName(isDark)}
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              requiredMark={false}
            >
              {isRegister ? (
                <Form.Item
                  label="姓名"
                  name="name"
                  rules={[{ required: true, message: "请输入姓名" }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="请输入姓名" />
                </Form.Item>
              ) : null}

              <Form.Item
                label="手机号"
                name="phone"
                rules={[{ required: true, message: "请输入手机号" }]}
              >
                <Input prefix={<PhoneOutlined />} placeholder="请输入手机号" />
              </Form.Item>

              <Form.Item
                label="密码"
                name="password"
                rules={[
                  { required: true, message: "请输入密码" },
                  { min: 4, message: "密码最少 4 位" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入至少 4 位密码"
                />
              </Form.Item>

              <Button
                block
                htmlType="submit"
                loading={isSubmitting}
                type="primary"
              >
                {isRegister ? "注册并登录" : "登录"}
              </Button>
            </Form>
          </Card>
        </section>
      </main>
    </ConfigProvider>
  );
}

/** 登录页客户端入口，为 NextAuth 指定 users 分组下的认证接口路径。 */
export default function LoginPageClient() {
  return (
    <SessionProvider basePath="/api/users/auth">
      <LoginForm />
    </SessionProvider>
  );
}
