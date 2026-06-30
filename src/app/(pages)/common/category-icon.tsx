import { cn } from "@/lib/utils";
import type { ElementType } from "react";

/** iconfont 渲染方式。 */
type IconfontMode = "font" | "symbol";

/** 分类图标组件接收的属性。 */
type CategoryIconProps = {
  /** Ant Design 图标组件，用于 iconfont 没有覆盖的分类。 */
  Icon?: ElementType;
  /** iconfont 图标名，例如 icon-clothes。symbol 模式下会自动转成 #icon-clothes。 */
  name?: string;
  /** iconfont 渲染方式：font 为普通字体图标，symbol 支持彩色图标。 */
  mode?: IconfontMode;
  /** 是否使用 24x24 外层点击/排版容器，关闭后图标本身为 16x16。 */
  hasPadding?: boolean;
  /** 外层容器补充类名。 */
  className?: string;
  /** 内部图标补充类名。 */
  iconClassName?: string;
};

/** 将 iconfont 名称转成 symbol href。 */
function getSymbolHref(name?: string) {
  if (!name) return undefined;

  const iconName = name.trim().replace(/^#/, "").split(/\s+/)[0];

  return iconName ? `#${iconName}` : undefined;
}

/** 分类入口图标，默认外层 24x24，内部图标 16x16 并居中。 */
export function CategoryIcon({
  Icon,
  className,
  iconClassName,
  hasPadding = true,
  mode = "font",
  name,
}: CategoryIconProps) {
  const symbolHref = getSymbolHref(name);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        hasPadding ? "size-6" : "size-4",
        className,
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            "inline-flex size-4 items-center justify-center text-base leading-none",
            iconClassName,
          )}
        />
      ) : mode === "symbol" ? (
        <svg
          className={cn(
            "inline-block size-4 shrink-0 overflow-hidden align-[-0.15em]",
            iconClassName,
          )}
          focusable="false"
        >
          {symbolHref ? <use href={symbolHref} xlinkHref={symbolHref} /> : null}
        </svg>
      ) : (
        <i
          className={cn(
            "iconfont inline-flex size-4 items-center justify-center text-base leading-none",
            name,
            iconClassName,
          )}
        />
      )}
    </span>
  );
}
