"use client";

import { cn } from "@/lib/utils";
import {
  ArrowLeftOutlined,
  DesktopOutlined,
  MoonOutlined,
  SaveOutlined,
  SunOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  ColorPicker,
  Input,
  Layout,
  Segmented,
  Select,
  Switch,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DARK_THEMES,
  findThemeOption,
  LIGHT_THEMES,
  THEME_TEXTURES,
  themeConfigChangeEventName,
} from "./constants";
import {
  ThemeFallingLights,
  ThemeTexturePublisher,
} from "./shared-theme-texture";
import { themeReturnMarkerKey } from "./theme-control";
import { ThemeGeometryTexture } from "./theme-geometry-texture";
import { ThemeProvider } from "./theme-provider";
import { ThemeShellBackground } from "./theme-shell-background";
import { getThemeShellBackground, withColorAlpha } from "./theme-utils";
import type {
  ThemeConfig,
  ThemeMode,
  ThemeOption,
  ThemePalette,
} from "./types";

/** 主题设置页接收的属性。 */
type ThemeSettingsPageProps = {
  /** 首次渲染使用的主题配置。 */
  initialTheme: ThemeConfig;
};

/** 单组主题选择器接收的属性。 */
type ThemePanelProps = {
  /** 当前面板对应的主题显示模式。 */
  mode: Exclude<ThemeMode, "system">;
  /** 面板标题。 */
  title: string;
  /** 可供选择的主题列表。 */
  options: ThemeOption[];
  /** 当前调色板值。 */
  value: ThemePalette;
  /** 调色板变化回调，参数 nextPalette 为最新调色板。 */
  onChange: (
    mode: Exclude<ThemeMode, "system">,
    nextPalette: ThemePalette,
  ) => void;
};

/** 自定义主题配置区域接收的属性。 */
type CustomThemePanelProps = {
  animationFallbackColor: string;
  /** 当前主题配置草稿。 */
  value: ThemeConfig;
  /** 自定义配置变化回调，参数 nextConfig 为最新主题配置。 */
  onChange: (nextConfig: ThemeConfig) => void;
};

const themeModeOptions: Array<{
  icon: React.ReactNode;
  label: string;
  value: ThemeMode;
}> = [
  { icon: <SunOutlined />, label: "浅色", value: "light" },
  { icon: <MoonOutlined />, label: "深色", value: "dark" },
  { icon: <DesktopOutlined />, label: "系统", value: "system" },
];

/** 主题设置页组件，参数 initialTheme 为服务端读取的用户主题配置。 */
export function ThemeSettingsPage({ initialTheme }: ThemeSettingsPageProps) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      {({ resolvedMode, themeConfig, updateTheme }) => (
        <ThemeSettingsContent
          appliedPalette={themeConfig[resolvedMode]}
          appliedTexture={themeConfig.texture}
          initialTheme={themeConfig}
          resolvedMode={resolvedMode}
          updateTheme={updateTheme}
        />
      )}
    </ThemeProvider>
  );
}

/** 主题设置页主体组件，负责管理草稿和保存操作。 */
function ThemeSettingsContent({
  appliedPalette,
  appliedTexture,
  initialTheme,
  resolvedMode,
  updateTheme,
}: {
  /** 当前已经保存并实际应用的调色板。 */
  appliedPalette: ThemePalette;
  /** 当前已经保存并实际应用的背景纹理。 */
  appliedTexture: ThemeConfig["texture"];
  /** 页面打开时使用的主题配置。 */
  initialTheme: ThemeConfig;
  /** 当前实际生效模式。 */
  resolvedMode: "light" | "dark";
  /** 保存并更新主题，参数 nextConfig 为最新主题配置。 */
  updateTheme: (nextConfig: ThemeConfig) => Promise<void>;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const [draftTheme, setDraftTheme] = useState(initialTheme);
  const [isSaving, setIsSaving] = useState(false);
  const previewMode =
    draftTheme.mode === "system" ? resolvedMode : draftTheme.mode;
  const previewPalette = draftTheme[previewMode];
  const previewAccentText = previewPalette.bg;
  const previewAnimationColor = draftTheme.aniTheme ?? previewPalette.color;
  const appliedShellBackground = getThemeShellBackground(
    appliedPalette,
    resolvedMode,
  );
  const appliedAnimationColor = initialTheme.aniTheme ?? appliedPalette.color;

  useEffect(() => {
    router.prefetch("/home");
  }, [router]);

  /** 返回首页，来自首页进入主题页时优先复用浏览器历史，避免重新拉取动态首页。 */
  function returnHome() {
    const returnPath = window.sessionStorage.getItem(themeReturnMarkerKey);
    const safeReturnPath = returnPath?.startsWith("/home")
      ? returnPath
      : "/home";
    const syncReturnedHomeTheme = () => {
      window.dispatchEvent(new Event(themeConfigChangeEventName));
      router.refresh();
    };

    window.sessionStorage.removeItem(themeReturnMarkerKey);
    router.replace(safeReturnPath);
    window.setTimeout(syncReturnedHomeTheme, 0);
    window.setTimeout(syncReturnedHomeTheme, 80);
  }

  /** 切换显示模式，参数 mode 为浅色、深色或系统。 */
  function changeMode(mode: ThemeMode) {
    setDraftTheme((current) => ({
      ...current,
      mode,
    }));
  }

  /** 选择预设主题，参数 mode 为明暗模式，nextPalette 为选中的调色板。 */
  function selectTheme(
    mode: Exclude<ThemeMode, "system">,
    nextPalette: ThemePalette,
  ) {
    setDraftTheme((current) => ({
      ...current,
      [mode]: nextPalette,
      mode,
    }));
  }

  /** 保存当前草稿主题配置。 */
  async function saveTheme() {
    setIsSaving(true);

    try {
      await updateTheme(draftTheme);
      message.success("主题已保存");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "主题保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <ThemeShellBackground color={appliedShellBackground} />
      <ThemeTexturePublisher
        background={appliedShellBackground}
        color={appliedAnimationColor}
        text={appliedPalette.text}
        texture={appliedTexture}
      />
      <Layout
        className={cn(
          "app-shell app-textured-shell theme-settings-shell flex min-h-dvh flex-1 flex-col",
          `theme-${resolvedMode}`,
          `app-texture-${appliedTexture}`,
        )}
        style={
          {
            "--theme-preview-bg": previewPalette.bg,
            "--theme-preview-button-text": previewAccentText,
            "--theme-preview-color": previewPalette.color,
            "--theme-preview-text": previewPalette.text,
            "--theme-page-bg": appliedPalette.bg,
            "--theme-page-button-text": "rgb(255 255 255 / 92%)",
            "--theme-page-color": appliedPalette.color,
            "--theme-page-text": appliedPalette.text,
            "--theme-page-text-muted": withColorAlpha(appliedPalette.text, 0.7),
            "--app-shell-bg": appliedShellBackground,
            "--app-texture-color": appliedAnimationColor,
            "--app-texture-text": appliedPalette.text,
          } as React.CSSProperties
        }
      >
        <ThemeGeometryTexture texture={appliedTexture} />
        <ThemeFallingLights
          isActive={appliedTexture === "meteor"}
          variant="shared"
        />
        <header className="theme-settings-header grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3.5 px-6 py-3 max-md:grid-cols-1 max-md:items-stretch">
          <div>
            <Typography.Title className="m-0! theme-settings-title" level={4}>
              主题设置
            </Typography.Title>
            <Typography.Text className="theme-settings-subtitle">
              使用浅色、深色，或匹配系统设置
            </Typography.Text>
          </div>
          <div className="inline-flex items-center justify-end gap-2 max-md:flex-col max-md:items-stretch">
            <Button
              aria-label="返回首页"
              className="theme-settings-icon-button"
              icon={<ArrowLeftOutlined />}
              onClick={returnHome}
            />
            <Button
              className="theme-settings-save"
              icon={<SaveOutlined />}
              loading={isSaving}
              onClick={saveTheme}
              type="primary"
            >
              保存
            </Button>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-[1180px] flex-1 grid-cols-2 items-stretch gap-[18px] p-6 max-md:grid-cols-1 max-md:p-4">
          <section className="theme-settings-toolbar-panel col-span-full">
            <div className="theme-settings-toolbar flex items-center justify-between gap-4 px-3 pb-2.5 pt-3 max-md:flex-col max-md:items-stretch">
              <div>
                <Typography.Title
                  className="m-0! theme-settings-title"
                  level={5}
                >
                  主题
                </Typography.Title>
                <Typography.Text className="theme-settings-subtitle">
                  使用浅色、深色，或匹配系统设置
                </Typography.Text>
              </div>
              <div className="flex items-center gap-2 max-md:flex-col max-md:items-stretch">
                <Segmented<ThemeMode>
                  className="theme-mode-segmented"
                  onChange={changeMode}
                  options={themeModeOptions.map((option) => ({
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        {option.icon}
                        {option.label}
                      </span>
                    ),
                    value: option.value,
                  }))}
                  value={draftTheme.mode}
                />
              </div>
            </div>
          </section>

          <ThemePanel
            mode="light"
            onChange={selectTheme}
            options={LIGHT_THEMES}
            title="浅色主题"
            value={draftTheme.light}
          />
          <CustomThemePanel
            animationFallbackColor={previewPalette.color}
            onChange={setDraftTheme}
            value={draftTheme}
          />
          <ThemePanel
            mode="dark"
            onChange={selectTheme}
            options={DARK_THEMES}
            title="深色主题"
            value={draftTheme.dark}
          />

          <section className="theme-live-preview grid h-[330px] grid-cols-1 grid-rows-[auto_1fr] p-0">
            <div className="theme-choice-header grid grid-cols-[minmax(120px,1fr)_minmax(220px,240px)] items-center gap-3.5 px-4 py-[9px] max-md:grid-cols-1 max-md:gap-2 max-md:py-3">
              <Typography.Title className="m-0! theme-choice-title" level={5}>
                预览
              </Typography.Title>
              <Typography.Text className="theme-choice-current justify-self-end max-md:justify-self-start">
                {previewMode === "dark" ? "深色" : "浅色"}
              </Typography.Text>
            </div>
            <div
              className="theme-live-preview-body relative flex flex-col justify-between overflow-hidden p-3"
              style={
                {
                  "--app-texture-color": previewAnimationColor,
                  "--app-texture-text": previewPalette.text,
                  backgroundColor: previewPalette.bg,
                  color: previewPalette.text,
                } as React.CSSProperties
              }
            >
              <ThemeGeometryTexture
                style={
                  {
                    "--app-texture-color": previewAnimationColor,
                    "--app-texture-text": previewPalette.text,
                  } as React.CSSProperties
                }
                texture={draftTheme.texture}
                variant="preview"
              />
              <span
                className={cn(
                  "theme-live-preview-texture",
                  `theme-texture-${draftTheme.texture}`,
                )}
              />
              <ThemeFallingLights
                isActive={draftTheme.texture === "meteor"}
                variant="preview"
              />
              <div className="mb-1 flex items-center gap-3">
                <span
                  className="block h-8 w-8 rounded-full"
                  style={{ backgroundColor: previewPalette.color }}
                />
                <Typography.Title
                  className="m-0!"
                  level={4}
                  style={{ color: previewPalette.text }}
                >
                  Storage
                </Typography.Title>
              </div>
              <div
                className="rounded-lg border bg-[rgb(127_127_127/10%)] px-3 py-[9px] opacity-[0.78]"
                style={{
                  borderColor: withColorAlpha(previewPalette.text, 0.18),
                }}
              >
                输入框 / 搜索状态
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="theme-live-preview-button"
                  style={{
                    backgroundColor: previewPalette.color,
                    borderColor: previewPalette.color,
                    color: previewAccentText,
                  }}
                  type="primary"
                >
                  主按钮
                </Button>
                <button
                  className="h-8 rounded-md border bg-transparent px-3"
                  style={{
                    borderColor: withColorAlpha(previewPalette.text, 0.2),
                    color: previewPalette.text,
                  }}
                  type="button"
                >
                  次按钮
                </button>
                <Switch
                  checked
                  style={{
                    backgroundColor: previewPalette.color,
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {["标签", "选中", "禁用"].map((label, index) => (
                  <span
                    className="rounded-full px-2.5 py-[5px] text-xs"
                    key={label}
                    style={{
                      backgroundColor:
                        index === 1
                          ? previewPalette.color
                          : withColorAlpha(previewPalette.text, 0.09),
                      color:
                        index === 1 ? previewAccentText : previewPalette.text,
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div
                className="flex items-center gap-2.5 rounded-lg border bg-[rgb(127_127_127/10%)] p-2.5"
                style={{
                  borderColor: withColorAlpha(previewPalette.text, 0.14),
                }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: previewPalette.color }}
                />
                <strong>列表行 / 卡片边框</strong>
              </div>
            </div>
          </section>
        </main>
      </Layout>
    </>
  );
}

/** 主题选择面板，参数 options 为浅色或深色主题列表。 */
function ThemePanel({
  mode,
  onChange,
  options,
  title,
  value,
}: ThemePanelProps) {
  const selectedTheme = findThemeOption(options, value);

  /** 根据主题名称选择调色板，参数 themeName 为选中的主题名称。 */
  function selectTheme(themeName: string) {
    const nextTheme = options.find((option) => option.name === themeName);

    if (nextTheme) {
      onChange(mode, {
        bg: nextTheme.bg,
        color: nextTheme.color,
        text: nextTheme.text,
      });
    }
  }

  return (
    <article className="theme-choice-panel grid h-[330px] grid-rows-[auto_minmax(0,1fr)] rounded-2xl">
      <div className="theme-choice-header grid grid-cols-[minmax(120px,1fr)_minmax(220px,240px)] items-center gap-3.5 px-4 py-[9px] max-md:grid-cols-1 max-md:gap-2 max-md:py-3">
        <Typography.Title className="m-0! theme-choice-title" level={5}>
          {title}
        </Typography.Title>
        <Typography.Text className="theme-choice-current justify-self-end max-md:justify-self-start">
          {selectedTheme?.name ?? "自定义"}
        </Typography.Text>
      </div>

      <div className="grid content-between grid-cols-2 gap-2 px-3 pb-2 pt-3 max-md:grid-cols-1">
        {options.map((option) => {
          const isSelected =
            option.bg === value.bg &&
            option.color === value.color &&
            option.text === value.text;

          return (
            <button
              className={cn(
                "theme-option-card grid min-h-9 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[10px] border px-2 py-1.5 text-left",
                {
                  "theme-option-card-selected": isSelected,
                },
              )}
              key={option.name}
              onClick={() => selectTheme(option.name)}
              style={{
                backgroundColor: option.bg,
                borderColor: isSelected ? option.color : `${option.text}`,
                color: option.text,
              }}
              type="button"
            >
              <ThemeIcon palette={option} />
              <span
                className="overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ color: option.text }}
              >
                {option.name}
              </span>
              <span className="inline-flex gap-1">
                <i
                  className="block h-3 w-3 rounded-full border border-[rgb(127_127_127/40%)]!"
                  style={{ backgroundColor: option.color }}
                />
                <i
                  className="block h-3 w-3 rounded-full border border-[rgb(127_127_127/40%)]!"
                  style={{ backgroundColor: option.bg }}
                />
                <i
                  className="block h-3 w-3 rounded-full border border-[rgb(127_127_127/40%)]!"
                  style={{ backgroundColor: option.text }}
                />
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

/** 自定义主题配置区域，参数 value 为当前主题草稿。 */
function CustomThemePanel({
  animationFallbackColor,
  onChange,
  value,
}: CustomThemePanelProps) {
  /** 修改单个调色板字段，参数 mode 为明暗模式，field 为颜色字段，nextValue 为颜色值。 */
  function changePalette(
    mode: "light" | "dark",
    field: keyof ThemePalette,
    nextValue: string,
  ) {
    onChange({
      ...value,
      [mode]: {
        ...value[mode],
        [field]: nextValue,
      },
      mode,
    });
  }

  /** 修改背景纹理，参数 texture 为用户选择的纹理类型。 */
  function changeTexture(texture: ThemeConfig["texture"]) {
    onChange({
      ...value,
      texture,
    });
  }

  function changeAnimationTheme(nextColor: string | null) {
    onChange({
      ...value,
      aniTheme: nextColor,
    });
  }

  return (
    <article className="theme-choice-panel grid h-[330px] grid-rows-[auto_minmax(0,1fr)_auto] rounded-2xl">
      <div className="theme-choice-header grid grid-cols-[minmax(120px,1fr)_minmax(220px,240px)] items-center gap-3.5 px-4 py-[9px] max-md:grid-cols-1 max-md:gap-2 max-md:py-3">
        <Typography.Title className="m-0! theme-choice-title" level={5}>
          自定义配置
        </Typography.Title>
        <Typography.Text className="theme-choice-current justify-self-end max-md:justify-self-start">
          修改后自动作为自定义主题
        </Typography.Text>
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-3 pb-2 pt-3 max-md:grid-cols-1">
        <CustomPaletteEditor
          onChange={(field, nextValue) =>
            changePalette("light", field, nextValue)
          }
          title="浅色"
          value={value.light}
        />
        <CustomPaletteEditor
          onChange={(field, nextValue) =>
            changePalette("dark", field, nextValue)
          }
          title="深色"
          value={value.dark}
        />
      </div>
      <div className="theme-texture-toolbar grid grid-cols-[auto_minmax(0,1fr)_minmax(180px,210px)] items-center gap-3 px-3 pb-2.5 pt-2 max-md:grid-cols-1">
        <Typography.Text className="theme-custom-title">
          背景动画
        </Typography.Text>
        <div className="flex min-w-0 items-center gap-2">
          <Typography.Text className="theme-custom-title shrink-0">
            动画色
          </Typography.Text>
          <ColorPicker
            aria-label="自定义动画主题色"
            className="theme-custom-picker"
            disabledAlpha={false}
            format="rgb"
            onChange={(_, css) => changeAnimationTheme(css)}
            value={value.aniTheme ?? animationFallbackColor}
          />
          <Button
            disabled={!value.aniTheme}
            onClick={() => changeAnimationTheme(null)}
            size="small"
            type="text"
          >
            跟随
          </Button>
        </div>
        <Select<ThemeConfig["texture"]>
          className="theme-texture-select min-w-[210px]"
          onChange={changeTexture}
          options={THEME_TEXTURES.map((option) => ({
            label: option.label,
            value: option.value,
          }))}
          getPopupContainer={(triggerNode) =>
            triggerNode.parentElement ?? document.body
          }
          classNames={{
            popup: {
              root: "theme-texture-select-popup",
            },
          }}
          popupMatchSelectWidth={false}
          value={value.texture}
        />
      </div>
    </article>
  );
}

/** 自定义单个调色板编辑器，参数 value 为当前调色板。 */
function CustomPaletteEditor({
  onChange,
  title,
  value,
}: {
  /** 自定义颜色变化回调，参数 field 为字段，nextValue 为颜色值。 */
  onChange: (field: keyof ThemePalette, nextValue: string) => void;
  /** 编辑器标题。 */
  title: string;
  /** 当前调色板。 */
  value: ThemePalette;
}) {
  return (
    <div className="theme-custom-palette grid gap-[7px] rounded-[10px] px-2.5 py-[9px]">
      <Typography.Text className="theme-custom-title">{title}</Typography.Text>
      <CustomColorInput
        label="主题色"
        onChange={(nextValue) => onChange("color", nextValue)}
        value={value.color}
      />
      <CustomColorInput
        label="背景色"
        onChange={(nextValue) => onChange("bg", nextValue)}
        value={value.bg}
      />
      <CustomColorInput
        label="文字色"
        onChange={(nextValue) => onChange("text", nextValue)}
        value={value.text}
      />
    </div>
  );
}

/** 自定义颜色输入，参数 value 为当前颜色值。 */
function CustomColorInput({
  label,
  onChange,
  value,
}: {
  /** 字段标签。 */
  label: string;
  /** 颜色变化回调，参数 nextValue 为颜色值。 */
  onChange: (nextValue: string) => void;
  /** 当前颜色值。 */
  value: string;
}) {
  return (
    <label className="theme-custom-row grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
      <span className="whitespace-nowrap">{label}</span>
      <span className="theme-custom-inputs flex h-8 items-stretch gap-2">
        <Input
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
        <ColorPicker
          aria-label={`自定义${label}`}
          className="theme-custom-picker"
          disabledAlpha={false}
          format="rgb"
          onChange={(_, css) => onChange(css)}
          value={value}
        />
      </span>
    </label>
  );
}

/** 主题图标，参数 palette 为待展示调色板。 */
function ThemeIcon({ palette }: { /** 调色板。 */ palette: ThemePalette }) {
  return (
    <span
      className="inline-flex h-6 w-7 items-center justify-center rounded-[7px] text-xs font-bold"
      style={{
        backgroundColor: palette.bg,
        color: palette.text,
      }}
    >
      Aa
    </span>
  );
}
