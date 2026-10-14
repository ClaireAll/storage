"use client";

import { memo, useId, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import {
  Button,
  ColorPicker,
  Divider,
  Segmented,
  Select,
  Slider,
  Switch,
  Tooltip,
  theme,
} from "antd";
import {
  BorderOutlined,
  DotChartOutlined,
  TableOutlined,
  StarOutlined,
  CloseOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { OverlayScrollArea } from "@/app/(pages)/common/overlay-scrollbar";
import { appearancePreset, type AtlasAppearance } from "./atlas-model";
import { opaqueAtlasColor } from "./atlas-colors";

type GlowEdge = Edge<{ glow: boolean; strength: number; curvature: number }>;

/** 通过两层淡色曲线表现光晕，不为每条连线创建模糊滤镜。 */
export const AtlasVisualEdge = memo(function AtlasVisualEdge(
  props: EdgeProps<GlowEdge>,
) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
    curvature: props.data?.curvature ?? 0.2,
  });
  const opacity = Number(props.style?.opacity ?? 1);
  const width = Number(props.style?.strokeWidth ?? 1);
  return (
    <>
      {props.data?.glow && (
        <g
          aria-hidden="true"
          pointerEvents="none"
          opacity={(opacity * props.data.strength) / 100}
        >
          <path
            d={path}
            fill="none"
            stroke={props.style?.stroke as string}
            strokeWidth={width + 6}
            opacity="0.08"
          />
          <path
            d={path}
            fill="none"
            stroke={props.style?.stroke as string}
            strokeWidth={width + 3}
            opacity="0.2"
          />
        </g>
      )}
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        markerStart={props.markerStart}
        label={props.label}
        labelX={labelX}
        labelY={labelY}
        labelStyle={props.labelStyle}
        labelBgStyle={props.labelBgStyle}
        style={props.style}
      />
    </>
  );
});

/** 使用静态纹理，不注册持续动画或视口监听。 */
export function AtlasBackground({
  appearance,
  color,
}: {
  appearance: AtlasAppearance;
  color: string;
}) {
  const id = useId();
  if (appearance.background === "solid") return null;
  if (appearance.background !== "stars")
    return (
      <Background
        variant={
          appearance.background === "grid"
            ? BackgroundVariant.Lines
            : BackgroundVariant.Dots
        }
        color={color}
        style={{ zIndex: 0, opacity: appearance.background === "grid" ? 0.14 : 0.28 }}
        gap={appearance.background === "grid" ? 40 : 28}
        size={3}
      />
    );
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 size-full"
    >
      <defs>
        <pattern id={id} width="180" height="180" patternUnits="userSpaceOnUse">
          <circle cx="18" cy="32" r="1.5" fill={color} opacity="0.4" />
          <circle cx="83" cy="14" r="1" fill={color} opacity="0.28" />
          <circle cx="152" cy="79" r="1.8" fill={color} opacity="0.45" />
          <circle cx="63" cy="135" r="1.3" fill={color} opacity="0.35" />
          <circle cx="129" cy="157" r="1" fill={color} opacity="0.25" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** 外观只修改当前图谱草稿，保存与撤销交由工作区统一处理。 */
export function AtlasAppearancePanel({
  value,
  disabled,
  onChange,
  onClose,
}: {
  value: AtlasAppearance;
  disabled: boolean;
  onChange: (value: AtlasAppearance, record?: boolean) => void;
  onClose: () => void;
}) {
  const { token } = theme.useToken();
  const patch = (changes: Partial<AtlasAppearance>) =>
    onChange({ ...value, ...changes, preset: "custom" });
  const rangeEditing = useRef(false);
  const previewRange = (changes: Partial<AtlasAppearance>) => {
    if (!rangeEditing.current) {
      onChange(value);
      rangeEditing.current = true;
    }
    onChange({ ...value, ...changes, preset: "custom" }, false);
  };
  return (
    <aside className="home-preview-divider flex w-80 shrink-0 flex-col overflow-hidden border-l p-4">
      <div className="flex shrink-0 items-center justify-between gap-3 pb-4">
        <strong>视觉设置</strong>
        <Button
          aria-label="关闭视觉设置"
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
        />
      </div>
      <OverlayScrollArea
        className="min-h-0 flex-1"
        viewportClassName="flex flex-col gap-5 pr-1 pb-2"
      >
        <div className="flex flex-col gap-2">
          <span className="text-xs">风格</span>
          <Segmented
            block
            disabled={disabled}
            value={value.preset}
            options={[
              { label: "克制清晰", value: "clear" },
              { label: "星空科技", value: "cosmic" },
              { label: "自定义", value: "custom", disabled: true },
            ]}
            onChange={(preset) =>
              onChange(appearancePreset(preset as "clear" | "cosmic"))
            }
          />
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-xs">背景</span>
          <Segmented
            block
            disabled={disabled}
            value={value.background}
            options={[
              {
                value: "solid",
                icon: (
                  <Tooltip title="纯色">
                    <BorderOutlined aria-label="纯色" />
                  </Tooltip>
                ),
              },
              {
                value: "dots",
                icon: (
                  <Tooltip title="点阵">
                    <DotChartOutlined aria-label="点阵" />
                  </Tooltip>
                ),
              },
              {
                value: "grid",
                icon: (
                  <Tooltip title="网格">
                    <TableOutlined aria-label="网格" />
                  </Tooltip>
                ),
              },
              {
                value: "stars",
                icon: (
                  <Tooltip title="静态星点">
                    <StarOutlined aria-label="静态星点" />
                  </Tooltip>
                ),
              },
            ]}
            onChange={(background) =>
              patch({ background: background as AtlasAppearance["background"] })
            }
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">跟随主题背景</span>
            <Switch
              disabled={disabled}
              checked={value.backgroundColor === null}
              onChange={(follow) =>
                patch({
                  backgroundColor: follow ? null : opaqueAtlasColor(token.colorBgContainer),
                })
              }
            />
          </div>
          <ColorPicker
            disabled={disabled || value.backgroundColor === null}
            disabledAlpha
            showText
            value={opaqueAtlasColor(value.backgroundColor ?? token.colorBgContainer)}
            onChangeComplete={(color) =>
              patch({ backgroundColor: color.toHexString() })
            }
            getPopupContainer={(trigger) =>
              trigger.closest("section") ?? document.body
            }
          />
        </div>
        <Divider className="my-0! border-[var(--home-preview-divider-color)]!" />
        <div className="flex flex-col gap-2">
          <span className="text-xs">节点外观</span>
          <Segmented
            block
            disabled={disabled}
            value={value.nodeStyle}
            options={[
              { label: "实心", value: "solid" },
              { label: "描边", value: "outline" },
              { label: "半透明", value: "translucent" },
            ]}
            onChange={(nodeStyle) =>
              patch({ nodeStyle: nodeStyle as AtlasAppearance["nodeStyle"] })
            }
          />
        </div>
        <label className="flex flex-col gap-2 text-xs">
          发光范围
          <Select
            disabled={disabled}
            value={value.glowScope}
            options={[
              { label: "关闭", value: "off" },
              { label: "选中及关联节点", value: "selected" },
              { label: "全部节点", value: "all" },
            ]}
            onChange={(glowScope) => patch({ glowScope })}
            getPopupContainer={(trigger) =>
              trigger.closest("section") ?? document.body
            }
          />
        </label>
        <div className="flex flex-col gap-3">
          <span className="text-xs">发光颜色</span>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">跟随分类</span>
            <Switch
              disabled={disabled}
              checked={value.glowColor === null}
              onChange={(follow) =>
                patch({ glowColor: follow ? null : opaqueAtlasColor(token.colorPrimary) })
              }
            />
          </div>
          <ColorPicker
            disabled={disabled || value.glowColor === null}
            disabledAlpha
            showText
            value={opaqueAtlasColor(value.glowColor ?? token.colorPrimary)}
            onChangeComplete={(color) =>
              patch({ glowColor: color.toHexString() })
            }
            getPopupContainer={(trigger) =>
              trigger.closest("section") ?? document.body
            }
          />
        </div>
        <div>
          <div className="flex justify-between gap-3 text-xs">
            <span>发光强度</span>
            <span className="tabular-nums">{value.glowStrength}%</span>
          </div>
          <Slider
            aria-label="发光强度"
            disabled={disabled || value.glowScope === "off"}
            min={0}
            max={100}
            value={value.glowStrength}
            onChange={(glowStrength) => previewRange({ glowStrength })}
            onChangeComplete={() => {
              rangeEditing.current = false;
            }}
          />
        </div>
        <Divider className="my-0! border-[var(--home-preview-divider-color)]!" />
        <div className="flex flex-col gap-3">
          <strong className="text-sm">连线</strong>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">使用默认颜色</span>
            <Switch
              disabled={disabled}
              checked={value.edgeColor === null}
              onChange={(follow) =>
                patch({ edgeColor: follow ? null : opaqueAtlasColor(token.colorPrimary) })
              }
            />
          </div>
          <ColorPicker
            disabled={disabled || value.edgeColor === null}
            disabledAlpha
            showText
            value={opaqueAtlasColor(value.edgeColor ?? token.colorTextBase)}
            onChangeComplete={(color) =>
              patch({ edgeColor: color.toHexString() })
            }
            getPopupContainer={(trigger) =>
              trigger.closest("section") ?? document.body
            }
          />
        </div>
        <div>
          <div className="flex justify-between gap-3 text-xs">
            <span>连线粗细</span>
            <span className="tabular-nums">{value.edgeWidth} px</span>
          </div>
          <Slider
            aria-label="连线粗细"
            disabled={disabled}
            min={0.5}
            max={4}
            step={0.5}
            value={value.edgeWidth}
            onChange={(edgeWidth) => previewRange({ edgeWidth })}
            onChangeComplete={() => {
              rangeEditing.current = false;
            }}
          />
        </div>
        <div>
          <div className="flex justify-between gap-3 text-xs">
            <span>连线不透明度</span>
            <span className="tabular-nums">
              {Math.round(value.edgeOpacity * 100)}%
            </span>
          </div>
          <Slider
            aria-label="连线不透明度"
            disabled={disabled}
            min={10}
            max={100}
            value={Math.round(value.edgeOpacity * 100)}
            onChange={(opacity) => previewRange({ edgeOpacity: opacity / 100 })}
            onChangeComplete={() => {
              rangeEditing.current = false;
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">连线发光</span>
          <Switch
            disabled={disabled}
            checked={value.edgeGlow}
            onChange={(edgeGlow) => patch({ edgeGlow })}
          />
        </div>
        <Divider className="my-0! border-[var(--home-preview-divider-color)]!" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">缩小时隐藏次要标签</span>
          <Switch
            disabled={disabled}
            checked={value.labelMode === "adaptive"}
            onChange={(hide) => patch({ labelMode: hide ? "adaptive" : "all" })}
          />
        </div>
        <Button
          disabled={disabled}
          icon={<ReloadOutlined />}
          onClick={() => onChange(appearancePreset("clear"))}
        >
          恢复默认
        </Button>
      </OverlayScrollArea>
    </aside>
  );
}
