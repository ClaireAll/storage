import type { ClothesItem } from "@/app/(pages)/home/clothes/clothes-type";
import type { ThemeConfig, ThemeDatabaseRow } from "@/app/(pages)/theme/types";
import type {
  HobbyShareListItem,
  HobbyShareResolutionStatus,
  HobbyShareSlide,
} from "@/app/api/share/hobby/share-types";
import { getThemeRowFromConfig } from "@/app/(pages)/theme/constants";
import type { createClient } from "@/utils/supabase/server";

export type DatabaseClient = Awaited<ReturnType<typeof createClient>>;

export type HomeProfileRow = {
  avatar?: string | null;
  name?: string | null;
  phone?: string | null;
};

export type UserAuthProfileRow = {
  avatar: string | null;
  password: string;
};

export type UserProfileWriteValues = Record<string, string | null>;

export type ItemCategory =
  | "clothes"
  | "pants"
  | "toiletries"
  | "books"
  | "hobby"
  | "cosmetic"
  | "skincare"
  | "blog";

export type ItemWriteValues = {
  b_id?: string | number;
  c_id?: string | number;
  h_id?: string | number;
  s_id?: string | number;
  category?: number;
  color?: string;
  count?: number;
  download_url?: string;
  name: string;
  pic_url?: string;
  pic_urls?: string[];
  price?: number;
  season?: string;
  timeStamp?: string;
  url?: string;
};

type ItemCategoryConfig = {
  idColumn: "c_id" | "p_id" | "t_id" | "b_id" | "h_id" | "s_id";
  selectFields: string;
  table: ItemCategory;
  hasTimeStamp?: boolean;
};

type RawItemRow = Omit<ClothesItem, "c_id"> &
  Partial<Record<ItemCategoryConfig["idColumn"], ClothesItem["c_id"]>>;

type HobbyShareListRow = {
  created_at: string;
  expires_at: string | null;
  password_hash: string | null;
  token: string;
};

const itemCategoryConfigs: Record<ItemCategory, ItemCategoryConfig> = {
  clothes: {
    idColumn: "c_id",
    selectFields: "c_id,name,timeStamp,price,color,pic_url,season",
    table: "clothes",
  },
  pants: {
    idColumn: "p_id",
    selectFields: "p_id,name,timeStamp,price,color,pic_url,season",
    table: "pants",
  },
  toiletries: {
    idColumn: "t_id",
    selectFields: "t_id,name,timeStamp,price,pic_url,count",
    table: "toiletries",
  },
  books: {
    hasTimeStamp: false,
    idColumn: "b_id",
    selectFields: "b_id,name,price,pic_url,category,download_url",
    table: "books",
  },
  hobby: {
    idColumn: "h_id",
    selectFields: "h_id,name,timeStamp,price,pic_urls,category",
    table: "hobby",
  },
  cosmetic: {
    idColumn: "c_id",
    selectFields: "c_id,name,timeStamp,price,pic_url,count,category",
    table: "cosmetic",
  },
  skincare: {
    idColumn: "s_id",
    selectFields: "s_id,name,timeStamp,price,pic_url,count,category",
    table: "skincare",
  },
  blog: {
    hasTimeStamp: false,
    idColumn: "b_id",
    selectFields: "b_id,name,category,url",
    table: "blog",
  },
};

const themeSelectFields =
  "id,theme,texture,ani_theme,hidden_category_keys,light_theme_color,light_theme_bg,light_theme_text,dark_theme_color,dark_theme_bg,dark_theme_text";

export async function listItems(
  supabase: DatabaseClient,
  category: ItemCategory,
  userId: string,
) {
  const config = itemCategoryConfigs[category];
  let query = supabase
    .from(config.table)
    .select(config.selectFields)
    .eq("id", userId);

  if (config.hasTimeStamp !== false) {
    query = query.order("timeStamp", { ascending: false });
  }

  const { data, error } = await query
    .order(config.idColumn, { ascending: false })
    .returns<RawItemRow[]>();

  return {
    data: data?.map((item) => mapItemRow(config, item)) ?? [],
    error,
  };
}

export async function createItem(
  supabase: DatabaseClient,
  category: ItemCategory,
  userId: string,
  values: ItemWriteValues,
) {
  const config = itemCategoryConfigs[category];
  const { data, error } = await supabase
    .from(config.table)
    .insert({
      ...values,
      id: userId,
    })
    .select(config.selectFields)
    .single<RawItemRow>();

  return {
    data: data ? mapItemRow(config, data) : null,
    error,
  };
}

export async function updateItem(
  supabase: DatabaseClient,
  category: ItemCategory,
  userId: string,
  itemId: string,
  values: ItemWriteValues,
) {
  const config = itemCategoryConfigs[category];
  const { data, error } = await supabase
    .from(config.table)
    .update(values)
    .eq("id", userId)
    .eq(config.idColumn, itemId)
    .select(config.selectFields)
    .single<RawItemRow>();

  return {
    data: data ? mapItemRow(config, data) : null,
    error,
  };
}

export async function getItemPicture(
  supabase: DatabaseClient,
  category: ItemCategory,
  userId: string,
  itemId: string,
) {
  const config = itemCategoryConfigs[category];

  return supabase
    .from(config.table)
    .select(category === "hobby" ? "name,pic_urls" : "name,pic_url")
    .eq("id", userId)
    .eq(config.idColumn, itemId)
    .maybeSingle<{
      name?: string | null;
      pic_url?: string | null;
      pic_urls?: string[] | null;
    }>();
}

export async function getItemAssets(
  supabase: DatabaseClient,
  category: ItemCategory,
  userId: string,
  itemId: string,
) {
  const config = itemCategoryConfigs[category];

  return supabase
    .from(config.table)
    .select("pic_url,download_url")
    .eq("id", userId)
    .eq(config.idColumn, itemId)
    .maybeSingle<{ download_url?: string | null; pic_url?: string | null }>();
}

export async function deleteItem(
  supabase: DatabaseClient,
  category: ItemCategory,
  userId: string,
  itemId: string,
) {
  const config = itemCategoryConfigs[category];

  return supabase
    .from(config.table)
    .delete()
    .eq("id", userId)
    .eq(config.idColumn, itemId);
}

export function getHomeProfile(
  supabase: DatabaseClient,
  userId: string,
) {
  return supabase
    .from("users")
    .select("name,phone,avatar")
    .eq("id", userId)
    .maybeSingle<HomeProfileRow>();
}

export function listUsers(supabase: DatabaseClient) {
  return supabase.from("users").select("*");
}

export function getUserByPhone(supabase: DatabaseClient, phone: string) {
  return supabase.from("users").select("id").eq("phone", phone).maybeSingle();
}

export function createUser(
  supabase: DatabaseClient,
  values: {
    name: string;
    password: string;
    phone: string;
  },
) {
  return supabase
    .from("users")
    .insert(values)
    .select("id,name,phone")
    .single();
}

export function getUserAuthProfile(
  supabase: DatabaseClient,
  userId: string,
) {
  return supabase
    .from("users")
    .select("avatar,password")
    .eq("id", userId)
    .maybeSingle<UserAuthProfileRow>();
}

export function updateUserProfile(
  supabase: DatabaseClient,
  userId: string,
  values: UserProfileWriteValues,
) {
  return supabase
    .from("users")
    .update(values)
    .eq("id", userId)
    .select("name,phone,avatar")
    .single<HomeProfileRow>();
}

export function getThemeRow(supabase: DatabaseClient, userId: string) {
  return supabase
    .from("theme")
    .select(themeSelectFields)
    .eq("id", userId)
    .maybeSingle<ThemeDatabaseRow>();
}

export function upsertTheme(
  supabase: DatabaseClient,
  userId: string,
  config: ThemeConfig,
) {
  return supabase.from("theme").upsert(getThemeRowFromConfig(userId, config), {
    onConflict: "id",
  });
}

/** 创建爱好分享快照，并返回随机令牌与失效时间。 */
export async function createHobbyShare(
  supabase: DatabaseClient,
  values: {
    expiresAt: string | null;
    ownerId: string;
    password: string;
    slides: HobbyShareSlide[];
    theme: ThemeConfig;
  },
) {
  const { data, error } = await supabase
    .rpc("create_hobby_share", {
      p_expires_at: values.expiresAt,
      p_owner_id: values.ownerId,
      p_password: values.password || null,
      p_slides: values.slides,
      p_theme: values.theme,
    })
    .single<{ expires_at: string | null; token: string }>();

  return {
    data: data
      ? { expiresAt: data.expires_at, token: data.token }
      : null,
    error,
  };
}

/** 列出当前账号创建过的爱好分享链接摘要，不返回密码摘要和快照内容。 */
export async function listHobbyShares(
  supabase: DatabaseClient,
  ownerId: string,
) {
  const { data, error } = await supabase
    .from("hobby_shares")
    .select("token,expires_at,created_at,password_hash")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .returns<HobbyShareListRow[]>();

  return {
    data:
      data?.map<HobbyShareListItem>((item) => ({
        createdAt: item.created_at,
        expiresAt: item.expires_at,
        hasPassword: Boolean(item.password_hash),
        token: item.token,
      })) ?? [],
    error,
  };
}

/** 删除当前账号拥有的爱好分享链接。 */
export function deleteHobbyShare(
  supabase: DatabaseClient,
  ownerId: string,
  token: string,
) {
  return supabase
    .from("hobby_shares")
    .delete()
    .eq("owner_id", ownerId)
    .eq("token", token);
}

/** 解析公开爱好分享令牌，并隐藏数据库中的密码摘要。 */
export async function resolveHobbyShare(
  supabase: DatabaseClient,
  token: string,
  password?: string,
) {
  const { data, error } = await supabase
    .rpc("resolve_hobby_share", {
      p_password: password || null,
      p_token: token,
    })
    .single<{
      expires_at: string | null;
      slides: HobbyShareSlide[] | null;
      status: HobbyShareResolutionStatus;
      theme: ThemeConfig | null;
    }>();

  return {
    data: data
      ? {
          expiresAt: data.expires_at,
          slides: data.slides ?? [],
          status: data.status,
          theme: data.theme,
        }
      : null,
    error,
  };
}

function mapItemRow(config: ItemCategoryConfig, item: RawItemRow): ClothesItem {
  const itemId = item[config.idColumn];

  return {
    ...item,
    c_id: itemId ?? "",
  };
}
