import type { ThemeConfig } from "@/app/(pages)/theme/types";

/** 爱好分享链接支持的有效期选项。 */
export type HobbyShareExpiry = "day" | "week" | "month" | "forever";

/** 公开爱好分享页展示的单张图片快照。 */
export type HobbyShareSlide = {
  hobbyId: string;
  imageUrl: string;
  name: string;
};

/** 爱好分享创建成功后返回的数据。 */
export type HobbyShareCreateResult = {
  expiresAt: string | null;
  token: string;
};

/** 当前账号已经创建的爱好分享链接摘要。 */
export type HobbyShareListItem = {
  createdAt: string;
  expiresAt: string | null;
  hasPassword: boolean;
  token: string;
};

/** 解析公开爱好分享记录时可能返回的状态。 */
export type HobbyShareResolutionStatus =
  | "ready"
  | "password_required"
  | "invalid_password"
  | "expired"
  | "not_found"
  | "error";

/** 数据库解析公开爱好分享记录后的标准结果。 */
export type HobbyShareResolution = {
  expiresAt: string | null;
  slides: HobbyShareSlide[];
  status: HobbyShareResolutionStatus;
  theme: ThemeConfig | null;
};
