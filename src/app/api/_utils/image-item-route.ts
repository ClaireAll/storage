import type { ItemCategory, ItemWriteValues } from "@/app/utils/database";
import {
  createItem,
  deleteItem,
  getItemPicture,
  updateItem,
} from "@/app/utils/database";
import {
  deleteOwnOssObject,
  type DeleteOwnOssObjectDirectory,
} from "@/utils/oss-server";
import { createClient } from "@/utils/supabase/server";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

type IdField = "b_id" | "c_id" | "h_id" | "p_id" | "s_id" | "t_id";
type CountMode = "optional" | "required";

type ImageItemPayload = {
  category?: number;
  color?: string;
  count?: number;
  name?: string;
  pic_url?: string;
  price?: number;
  season?: string;
  timeStamp?: string;
} & Partial<Record<IdField, string | number>>;

type ParsedImageItemValues = {
  category: number | null;
  color: string;
  count: number | null;
  name: string;
  picUrl: string;
  price: number | null;
  season: string;
  timeStamp: string;
};

type ImageItemRouteMessages = {
  category?: string;
  color?: string;
  count?: string;
  date: string;
  deleteImage?: string;
  id: string;
  image: string;
  name: string;
  notFound: string;
  price: string;
  season?: string;
};

type ImageItemRouteConfig = {
  category: ItemCategory;
  countMode?: CountMode;
  directory: DeleteOwnOssObjectDirectory;
  generatedIdField?: "c_id" | "s_id";
  idFields: IdField[];
  messages: ImageItemRouteMessages;
  requireColor?: boolean;
  requireSeason?: boolean;
  supportedCategories?: number[];
};

const seasons = ["春", "夏", "秋", "冬"];
const seasonSeparatorPattern = /\s+/;

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function isValidSeasonValue(value: string) {
  const values = value.trim().split(seasonSeparatorPattern).filter(Boolean);

  return values.length > 0 && values.every((season) => seasons.includes(season));
}

function getItemId(payload: ImageItemPayload, idFields: IdField[]) {
  for (const field of idFields) {
    const value = payload[field];

    if (typeof value === "number" || typeof value === "string") {
      const id = String(value).trim();

      if (id) {
        return id;
      }
    }
  }

  return "";
}

function parseNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Number(value.toFixed(2))
    : null;
}

function parseCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.floor(value)
    : null;
}

function parseCategory(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function parseImageItemValues(
  payload: ImageItemPayload,
): ParsedImageItemValues {
  return {
    category: parseCategory(payload.category),
    color: payload.color?.trim() ?? "",
    count: parseCount(payload.count),
    name: payload.name?.trim() ?? "",
    picUrl: payload.pic_url?.trim() ?? "",
    price: parseNumber(payload.price),
    season: payload.season?.trim() ?? "",
    timeStamp: payload.timeStamp?.trim() ?? "",
  };
}

function validateImageItemValues(
  config: ImageItemRouteConfig,
  values: ParsedImageItemValues,
) {
  if (!values.name) {
    return config.messages.name;
  }

  if (!values.timeStamp || !isDateString(values.timeStamp)) {
    return config.messages.date;
  }

  if (
    config.supportedCategories?.length &&
    (values.category === null ||
      !config.supportedCategories.includes(values.category))
  ) {
    return config.messages.category ?? "请选择分类";
  }

  if (values.price === null || values.price < 0) {
    return config.messages.price;
  }

  if (
    (config.countMode === "required" &&
      (values.count === null || values.count < 1)) ||
    (config.countMode === "optional" &&
      values.count !== null &&
      values.count < 1)
  ) {
    return config.messages.count ?? "请输入有效数量";
  }

  if (config.requireColor && (!values.color || !isHexColor(values.color))) {
    return config.messages.color ?? "请选择颜色";
  }

  if (!values.picUrl) {
    return config.messages.image;
  }

  if (
    config.requireSeason &&
    (!values.season || !isValidSeasonValue(values.season))
  ) {
    return config.messages.season ?? "请选择季节";
  }

  return "";
}

function toWriteValues(
  config: ImageItemRouteConfig,
  values: ParsedImageItemValues,
) {
  const writeValues: ItemWriteValues = {
    name: values.name,
    pic_url: values.picUrl,
    price: values.price ?? 0,
    timeStamp: values.timeStamp,
  };

  if (config.supportedCategories?.length) {
    writeValues.category = values.category ?? config.supportedCategories[0];
  }

  if (config.countMode) {
    writeValues.count = values.count ?? 1;
  }

  if (config.requireColor) {
    writeValues.color = values.color;
  }

  if (config.requireSeason) {
    writeValues.season = values.season;
  }

  return writeValues;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export function createImageItemRouteHandlers(config: ImageItemRouteConfig) {
  async function POST(request: Request) {
    const session = await auth();

    if (!session?.user?.id) {
      return jsonError("请先登录", 401);
    }

    const values = parseImageItemValues(
      (await request.json()) as ImageItemPayload,
    );
    const validationMessage = validateImageItemValues(config, values);

    if (validationMessage) {
      return jsonError(validationMessage, 400);
    }

    const supabase = await createClient();
    const baseValues = toWriteValues(config, values);
    const createValues = config.generatedIdField
      ? ({
          ...baseValues,
          [config.generatedIdField]: randomUUID(),
        } as ItemWriteValues)
      : baseValues;
    const { data, error } = await createItem(
      supabase,
      config.category,
      session.user.id,
      createValues,
    );

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json(data);
  }

  async function PUT(request: Request) {
    const session = await auth();

    if (!session?.user?.id) {
      return jsonError("请先登录", 401);
    }

    const payload = (await request.json()) as ImageItemPayload;
    const itemId = getItemId(payload, config.idFields);
    const values = parseImageItemValues(payload);
    const validationMessage = validateImageItemValues(config, values);

    if (!itemId) {
      return jsonError(config.messages.id, 400);
    }

    if (validationMessage) {
      return jsonError(validationMessage, 400);
    }

    const supabase = await createClient();
    const { data, error } = await updateItem(
      supabase,
      config.category,
      session.user.id,
      itemId,
      toWriteValues(config, values),
    );

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json(data);
  }

  async function DELETE(request: Request) {
    const session = await auth();

    if (!session?.user?.id) {
      return jsonError("请先登录", 401);
    }

    const payload = (await request.json()) as ImageItemPayload;
    const itemId = getItemId(payload, config.idFields);

    if (!itemId) {
      return jsonError(config.messages.id, 400);
    }

    const supabase = await createClient();
    const { data: currentItem, error: currentItemError } =
      await getItemPicture(supabase, config.category, session.user.id, itemId);

    if (currentItemError) {
      return jsonError(currentItemError.message, 500);
    }

    if (!currentItem) {
      return jsonError(config.messages.notFound, 404);
    }

    try {
      await deleteOwnOssObject(currentItem.pic_url, session.user.id, [
        config.directory,
      ]);
    } catch (error) {
      return jsonError(
        error instanceof Error
          ? error.message
          : (config.messages.deleteImage ?? "删除图片失败"),
        500,
      );
    }

    const { error } = await deleteItem(
      supabase,
      config.category,
      session.user.id,
      itemId,
    );

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ ok: true });
  }

  return { DELETE, POST, PUT };
}
