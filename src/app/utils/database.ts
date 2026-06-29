import type { ClothesItem } from "@/app/(pages)/home/clothes/clothes-type";
import type { ThemeConfig, ThemeDatabaseRow } from "@/app/(pages)/theme/types";
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

export type ItemCategory = "clothes" | "pants" | "toiletries" | "books";

export type ItemWriteValues = {
  category?: number;
  color?: string;
  count?: number;
  name: string;
  pic_url: string;
  price: number;
  season?: string;
  timeStamp?: string;
};

type ItemCategoryConfig = {
  idColumn: "c_id" | "p_id" | "t_id" | "b_id";
  selectFields: string;
  table: ItemCategory;
  hasTimeStamp?: boolean;
};

type RawItemRow = Omit<ClothesItem, "c_id"> &
  Partial<Record<ItemCategoryConfig["idColumn"], ClothesItem["c_id"]>>;

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
    selectFields: "b_id,name,price,pic_url,category",
    table: "books",
  },
};

const themeSelectFields =
  "id,theme,texture,ani_theme,light_theme_color,light_theme_bg,light_theme_text,dark_theme_color,dark_theme_bg,dark_theme_text";

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
    .select("pic_url")
    .eq("id", userId)
    .eq(config.idColumn, itemId)
    .maybeSingle<{ pic_url: string }>();
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

function mapItemRow(config: ItemCategoryConfig, item: RawItemRow): ClothesItem {
  const itemId = item[config.idColumn];

  return {
    ...item,
    c_id: itemId ?? "",
  };
}
