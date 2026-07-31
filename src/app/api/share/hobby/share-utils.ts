import type { ClothesItem } from "@/app/(pages)/home/clothes/clothes-type";
import type { ThemeConfig } from "@/app/(pages)/theme/types";
import type {
  HobbyShareExpiry,
  HobbyShareResolution,
  HobbyShareResolutionStatus,
  HobbyShareSlide,
} from "./share-types";

const durationByExpiry = {
  day: 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
} as const;

/** 按爱好和图片原始顺序展开分享快照。 */
export function flattenHobbyShareSlides(items: ClothesItem[]) {
  return items.flatMap<HobbyShareSlide>((item) =>
    (item.pic_urls ?? [])
      .filter((imageUrl) => typeof imageUrl === "string" && imageUrl.trim())
      .map((imageUrl) => ({
        hobbyId: String(item.c_id),
        imageUrl: imageUrl.trim(),
        name: item.name,
      })),
  );
}

/** 根据有效期计算数据库保存的 ISO 失效时间。 */
export function getHobbyShareExpiresAt(
  expiry: HobbyShareExpiry,
  now = new Date(),
) {
  if (expiry === "forever") {
    return null;
  }

  return new Date(now.getTime() + durationByExpiry[expiry]).toISOString();
}

/** 判断请求值是否为可用的分享有效期。 */
export function isHobbyShareExpiry(value: unknown): value is HobbyShareExpiry {
  return (
    value === "day" ||
    value === "week" ||
    value === "month" ||
    value === "forever"
  );
}

/** 完整主题快照校验器，用于隔离分享数据与主题模块。 */
type ThemeConfigValidator = (value: unknown) => value is ThemeConfig;

const hobbyShareResolutionStatuses: HobbyShareResolutionStatus[] = [
  "ready",
  "password_required",
  "invalid_password",
  "expired",
  "not_found",
  "error",
];

/** 创建不携带未校验快照数据的读取失败状态。 */
function createHobbyShareErrorResolution(): HobbyShareResolution {
  return {
    expiresAt: null,
    slides: [],
    status: "error",
    theme: null,
  };
}

/** 判断未知值是否为可读取字段的普通对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

/** 判断公开快照中的单张图片是否满足运行时契约。 */
function isHobbyShareSlide(value: unknown): value is HobbyShareSlide {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.hobbyId === "string" &&
    typeof value.name === "string" &&
    typeof value.imageUrl === "string" &&
    Boolean(value.imageUrl.trim())
  );
}

/** 校验并规范化公开解析结果，畸形 ready 快照统一降级为读取失败。 */
export function normalizeHobbyShareResolution(
  value: unknown,
  isValidTheme: ThemeConfigValidator,
): HobbyShareResolution {
  if (
    !isRecord(value) ||
    typeof value.status !== "string" ||
    !hobbyShareResolutionStatuses.includes(
      value.status as HobbyShareResolutionStatus,
    )
  ) {
    return createHobbyShareErrorResolution();
  }

  const status = value.status as HobbyShareResolutionStatus;
  const expiresAt =
    value.expiresAt === null || typeof value.expiresAt === "string"
      ? value.expiresAt
      : null;

  if (status !== "ready") {
    return {
      expiresAt,
      slides: [],
      status,
      theme: null,
    };
  }

  if (
    !isValidTheme(value.theme) ||
    !Array.isArray(value.slides) ||
    value.slides.length === 0 ||
    !value.slides.every(isHobbyShareSlide)
  ) {
    return createHobbyShareErrorResolution();
  }

  return {
    expiresAt,
    slides: value.slides.map((slide) => ({
      ...slide,
      imageUrl: slide.imageUrl.trim(),
    })),
    status,
    theme: value.theme,
  };
}
