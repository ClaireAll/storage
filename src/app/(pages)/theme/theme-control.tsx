"use client";

import { BgColorsOutlined } from "@ant-design/icons";
import { Button, Popover, Segmented } from "antd";
import { themeColors } from "./constants";
import type { ThemeConfig, ThemeMode } from "./types";

type ThemeControlProps = {
  themeConfig: ThemeConfig;
  updateTheme: (nextConfig: ThemeConfig) => Promise<void>;
};

export function ThemeControl({ themeConfig, updateTheme }: ThemeControlProps) {
  const content = (
    <div className="theme-popover">
      <div className="theme-popover-title">主题</div>
      <Segmented<ThemeMode>
        block
        onChange={(mode) => updateTheme({ ...themeConfig, mode })}
        options={[
          { label: "浅色", value: "light" },
          { label: "深色", value: "dark" },
        ]}
        value={themeConfig.mode}
      />

      <div className="theme-popover-title theme-color-title">主题色</div>
      <div className="theme-swatches">
        {themeColors.map((color) => (
          <button
            aria-label={`切换主题色 ${color}`}
            className="theme-swatch"
            key={color}
            onClick={() => updateTheme({ ...themeConfig, color })}
            style={{
              backgroundColor: color,
              outlineColor:
                themeConfig.color === color ? color : "transparent",
            }}
            type="button"
          />
        ))}
      </div>
      <label className="theme-color-input">
        自定义
        <input
          aria-label="自定义主题色"
          onChange={(event) =>
            updateTheme({ ...themeConfig, color: event.target.value })
          }
          type="color"
          value={themeConfig.color}
        />
      </label>
    </div>
  );

  return (
    <Popover content={content} placement="bottomRight" trigger="click">
      <Button aria-label="修改主题" icon={<BgColorsOutlined />} />
    </Popover>
  );
}
