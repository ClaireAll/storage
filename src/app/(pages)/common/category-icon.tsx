import { cn } from "@/lib/utils";
import type { ElementType } from "react";

/** 分类图标组件接收的属性。 */
type CategoryIconProps = {
  /** Ant Design 图标组件，用于 iconfont 没有覆盖的分类。 */
  Icon?: ElementType;
  /** iconfont 图标类名，例如 icon-clothes。 */
  name?: string;
  /** 是否使用 24x24 外层点击/排版容器，关闭后图标本身为 16x16。 */
  hasPadding?: boolean;
  /** 外层容器补充类名。 */
  className?: string;
};

/** 分类入口图标，默认外层 24x24，内部图标 16x16 并居中。 */
export function CategoryIcon({
  Icon,
  className,
  hasPadding = true,
  name,
}: CategoryIconProps) {
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
        <Icon className="inline-flex size-4 items-center justify-center text-base leading-none" />
      ) : (
        <i
          className={cn(
            "iconfont inline-flex size-4 items-center justify-center text-base leading-none",
            name,
          )}
        />
      )}
    </span>
  );
}
