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
  Input,
  Layout,
  Segmented,
  Select,
  Switch,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getThemeShellBackground } from "./colors";
import { DARK_THEMES, LIGHT_THEMES, THEME_TEXTURES } from "./constants";
import {
  ThemeFallingLights,
  ThemeTexturePublisher,
} from "./shared-theme-texture";
import { ThemeGeometryTexture } from "./theme-geometry-texture";
import { ThemeProvider } from "./theme-provider";
import { ThemeShellBackground } from "./theme-shell-background";
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
  /** 当前已经保存并实际应用的背景纹路。 */
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
  const appliedButtonText = getReadableTextColor(appliedPalette.color);
  const previewAccentText = previewPalette.bg;
  const appliedShellBackground = getThemeShellBackground(
    appliedPalette,
    resolvedMode,
  );

  /** 切换显示模式，参数 mode 为浅色、深色或系统。 */
  function changeMode(mode: ThemeMode) {
    setDraftTheme((current) => ({
      ...current,
      dark:
        mode === "dark" || mode === "system" ? DARK_THEMES[0] : current.dark,
      light:
        mode === "light" || mode === "system" ? LIGHT_THEMES[0] : current.light,
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
        color={appliedPalette.color}
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
            "--theme-page-button-text": appliedButtonText,
            "--theme-page-color": appliedPalette.color,
            "--theme-page-text": appliedPalette.text,
            "--theme-page-text-muted": `${appliedPalette.text}b3`,
            "--app-shell-bg": appliedShellBackground,
            "--app-texture-color": appliedPalette.color,
            "--app-texture-text": appliedPalette.text,
          } as React.CSSProperties
        }
      >
        <header className="theme-settings-header">
          <Button
            className="theme-settings-icon-button"
            aria-label="返回首页"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/home")}
          />
          <div>
            <Typography.Title className="m-0! theme-settings-title" level={4}>
              主题设置
            </Typography.Title>
            <Typography.Text className="theme-settings-subtitle">
              使用浅色、深色，或匹配系统设置
            </Typography.Text>
          </div>
          <Button
            className="theme-settings-save"
            icon={<SaveOutlined />}
            loading={isSaving}
            onClick={saveTheme}
            type="primary"
          >
            保存
          </Button>
        </header>

        <main className="theme-settings-main flex-1">
          <section className="theme-settings-toolbar-panel">
            <div className="theme-settings-toolbar">
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
              <div className="theme-settings-actions">
                <Segmented<ThemeMode>
                  className="theme-mode-segmented"
                  onChange={changeMode}
                  options={themeModeOptions.map((option) => ({
                    label: (
                      <span className="theme-mode-option">
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
          <CustomThemePanel onChange={setDraftTheme} value={draftTheme} />
          <ThemePanel
            mode="dark"
            onChange={selectTheme}
            options={DARK_THEMES}
            title="深色主题"
            value={draftTheme.dark}
          />

          <section className="theme-live-preview">
            <div className="theme-choice-header theme-live-preview-header">
              <Typography.Title className="m-0! theme-choice-title" level={5}>
                预览
              </Typography.Title>
              <Typography.Text className="theme-choice-current">
                {previewMode === "dark" ? "深色" : "浅色"}
              </Typography.Text>
            </div>
            <div
              className="theme-live-preview-body"
              style={
                {
                  "--app-texture-color": previewPalette.color,
                  "--app-texture-text": previewPalette.text,
                  backgroundColor: previewPalette.bg,
                  color: previewPalette.text,
                } as React.CSSProperties
              }
            >
              <ThemeGeometryTexture
                style={
                  {
                    "--app-texture-color": previewPalette.color,
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
              <div className="theme-live-preview-brand">
                <span
                  className="theme-live-preview-chip"
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
                className="theme-live-preview-search"
                style={{ borderColor: `${previewPalette.text}2e` }}
              >
                输入框 / 搜索状态
              </div>
              <div className="theme-live-preview-controls">
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
                  className="theme-live-preview-ghost-button"
                  style={{
                    borderColor: `${previewPalette.text}33`,
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
              <div className="theme-live-preview-tags">
                {["标签", "选中", "禁用"].map((label, index) => (
                  <span
                    className="theme-live-preview-tag"
                    key={label}
                    style={{
                      backgroundColor:
                        index === 1
                          ? previewPalette.color
                          : `${previewPalette.text}18`,
                      color:
                        index === 1 ? previewAccentText : previewPalette.text,
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div
                className="theme-live-preview-list-row"
                style={{ borderColor: `${previewPalette.text}24` }}
              >
                <span style={{ backgroundColor: previewPalette.color }} />
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
    <article className="theme-choice-panel">
      <div className="theme-choice-header">
        <Typography.Title className="m-0! theme-choice-title" level={5}>
          {title}
        </Typography.Title>
        <Typography.Text className="theme-choice-current">
          {selectedTheme?.name ?? "自定义"}
        </Typography.Text>
      </div>

      <div className="theme-option-grid">
        {options.map((option) => {
          const isSelected =
            option.bg === value.bg &&
            option.color === value.color &&
            option.text === value.text;

          return (
            <button
              className={cn("theme-option-card", {
                "theme-option-card-selected": isSelected,
              })}
              key={option.name}
              onClick={() => selectTheme(option.name)}
              style={{
                backgroundColor: option.bg,
                borderColor: isSelected ? option.color : `${option.text}33`,
                color: option.text,
              }}
              type="button"
            >
              <ThemeIcon palette={option} />
              <span className="theme-option-name">{option.name}</span>
              <span className="theme-option-swatches">
                <i style={{ backgroundColor: option.color }} />
                <i style={{ backgroundColor: option.bg }} />
                <i style={{ backgroundColor: option.text }} />
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

/** 自定义主题配置区域，参数 value 为当前主题草稿。 */
function CustomThemePanel({ onChange, value }: CustomThemePanelProps) {
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
    });
  }

  /** 修改背景纹路，参数 texture 为用户选择的纹路类型。 */
  function changeTexture(texture: ThemeConfig["texture"]) {
    onChange({
      ...value,
      texture,
    });
  }

  return (
    <article className="theme-choice-panel theme-custom-panel">
      <div className="theme-choice-header">
        <Typography.Title className="m-0! theme-choice-title" level={5}>
          自定义配置
        </Typography.Title>
        <Typography.Text className="theme-choice-current">
          修改后自动作为自定义主题
        </Typography.Text>
      </div>
      <div className="theme-custom-grid">
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
      <div className="theme-texture-toolbar">
        <Typography.Text className="theme-custom-title">
          背景动画
        </Typography.Text>
        <Select<ThemeConfig["texture"]>
          className="theme-texture-select"
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
    <div className="theme-custom-palette">
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
    <label className="theme-custom-row">
      <span>{label}</span>
      <span className="theme-custom-inputs">
        <Input
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
        <input
          aria-label={`自定义${label}`}
          className="theme-custom-picker"
          onChange={(event) => onChange(event.target.value)}
          type="color"
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
      className="theme-option-icon"
      style={{
        backgroundColor: palette.bg,
        color: palette.text,
      }}
    >
      Aa
    </span>
  );
}

/** 查找与当前调色板完全匹配的主题，参数 options 为主题列表，value 为当前调色板。 */
function findThemeOption(options: ThemeOption[], value: ThemePalette) {
  return options.find(
    (option) =>
      option.bg === value.bg &&
      option.color === value.color &&
      option.text === value.text,
  );
}

/** 根据背景色计算可读文字色，参数 color 为十六进制颜色。 */
function getReadableTextColor(color: string) {
  const normalizedColor = color.replace("#", "");
  const red = Number.parseInt(normalizedColor.slice(0, 2), 16);
  const green = Number.parseInt(normalizedColor.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedColor.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 150 ? "#252833" : "#ffffff";
}
