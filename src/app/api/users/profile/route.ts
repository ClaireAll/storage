import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "../../../../../auth";
import { createClient } from "@/utils/supabase/server";

/** 更新个人资料接口接收的请求体结构。 */
type ProfilePayload = {
  /** 用户头像地址，可为空。 */
  avatar?: string | null;
  /** 用户名称，必填。 */
  name?: string;
  /** 修改密码时输入的旧密码。 */
  oldPassword?: string;
  /** 新密码，可选；填写时最少 4 位。 */
  password?: string;
};

/** 删除 OSS 头像对象需要的本地配置。 */
type OssDeleteConfig = {
  /** 阿里云 AccessKeyId，用于生成删除签名。 */
  accessKeyId: string;
  /** 阿里云 AccessKeySecret，用于生成删除签名。 */
  accessKeySecret: string;
  /** OSS bucket 名称。 */
  bucket: string;
  /** OSS 访问端点。 */
  host: string;
  /** 数据库中头像公开访问地址的基础前缀。 */
  publicBaseUrl: string;
};

/** 读取 OSS 删除对象所需配置；缺少配置时返回 null，避免影响资料保存。 */
function getOssDeleteConfig(): OssDeleteConfig | null {
  const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID?.trim() ?? "";
  const accessKeySecret =
    process.env.ALIYUN_OSS_ACCESS_KEY_SECRET?.trim() ?? "";
  const bucket = process.env.ALIYUN_OSS_BUCKET?.trim() ?? "";
  const region = process.env.ALIYUN_OSS_REGION?.trim() ?? "";
  const endpoint = process.env.ALIYUN_OSS_ENDPOINT?.trim();
  const publicBaseUrl = process.env.ALIYUN_OSS_PUBLIC_BASE_URL?.trim() ?? "";

  if (!accessKeyId || !accessKeySecret || !bucket || !region || !publicBaseUrl) {
    return null;
  }

  return {
    accessKeyId,
    accessKeySecret,
    bucket,
    host: (endpoint || `https://${bucket}.${region}.aliyuncs.com`).replace(
      /\/$/,
      "",
    ),
    publicBaseUrl: publicBaseUrl.replace(/\/$/, ""),
  };
}

/** 从头像公开地址中解析当前用户的 OSS object key，参数 avatarUrl 为数据库中保存的头像地址。 */
function parseOwnAvatarObjectKey(
  avatarUrl: string,
  userId: string,
  publicBaseUrl: string,
) {
  const normalizedUrl = avatarUrl.split("?")[0];
  const publicUrlPrefix = `${publicBaseUrl}/`;

  if (!normalizedUrl.startsWith(publicUrlPrefix)) {
    return null;
  }

  const objectKey = normalizedUrl.slice(publicUrlPrefix.length);
  const userAvatarPrefix = `avatars/${userId}/`;

  return objectKey.startsWith(userAvatarPrefix) ? objectKey : null;
}

/** 对 OSS REST 请求签名，参数包含 HTTP 方法、bucket、objectKey、日期和密钥。 */
function signOssRequest(
  method: string,
  bucket: string,
  objectKey: string,
  date: string,
  accessKeySecret: string,
) {
  const stringToSign = `${method}\n\n\n${date}\n/${bucket}/${objectKey}`;

  return createHmac("sha1", accessKeySecret)
    .update(stringToSign)
    .digest("base64");
}

/** 将 objectKey 按路径片段编码为可用于 OSS 请求的 URL 路径。 */
function encodeObjectKeyPath(objectKey: string) {
  return objectKey.split("/").map(encodeURIComponent).join("/");
}

/** 判断数据库中的密码是否为 bcrypt 摘要，参数 password 为 users 表中的密码字段。 */
function isBcryptHash(password: string) {
  return /^\$2[aby]\$/.test(password);
}

/** 校验旧密码是否匹配，参数 oldPassword 为用户输入值，storedPassword 为数据库密码字段。 */
async function verifyOldPassword(oldPassword: string, storedPassword: string) {
  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(oldPassword, storedPassword);
  }

  return oldPassword === storedPassword;
}

/** 删除当前用户旧头像对象，删除失败只记录日志，不阻塞资料保存。 */
async function deleteOldAvatarObject(avatarUrl: string, userId: string) {
  const ossConfig = getOssDeleteConfig();

  if (!ossConfig) {
    console.warn("OSS 删除配置不完整，已跳过旧头像删除");
    return;
  }

  const objectKey = parseOwnAvatarObjectKey(
    avatarUrl,
    userId,
    ossConfig.publicBaseUrl,
  );

  if (!objectKey) {
    return;
  }

  const date = new Date().toUTCString();
  const signature = signOssRequest(
    "DELETE",
    ossConfig.bucket,
    objectKey,
    date,
    ossConfig.accessKeySecret,
  );
  const response = await fetch(
    `${ossConfig.host}/${encodeObjectKeyPath(objectKey)}`,
    {
      headers: {
        Authorization: `OSS ${ossConfig.accessKeyId}:${signature}`,
        Date: date,
      },
      method: "DELETE",
    },
  );

  if (!response.ok && response.status !== 404) {
    console.warn(`删除旧头像失败：${response.status} ${await response.text()}`);
  }
}

/** 处理当前登录用户的个人资料更新请求。 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const payload = (await request.json()) as ProfilePayload;
  const name = payload.name?.trim() ?? "";
  const avatar = payload.avatar?.trim() || null;
  const oldPassword = payload.oldPassword ?? "";
  const password = payload.password ?? "";

  if (!name) {
    return NextResponse.json({ message: "请输入显示名称" }, { status: 400 });
  }

  if (password && password.length < 4) {
    return NextResponse.json({ message: "密码最少 4 位" }, { status: 400 });
  }

  if (password && !oldPassword) {
    return NextResponse.json(
      { message: "修改密码时请输入旧密码" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const nextValues: Record<string, string | null> = {
    avatar,
    name,
  };

  const { data: currentProfile, error: currentProfileError } = await supabase
    .from("users")
    .select("avatar,password")
    .eq("id", session.user.id)
    .maybeSingle<{ avatar: string | null; password: string }>();

  if (currentProfileError) {
    return NextResponse.json(
      { message: currentProfileError.message },
      { status: 500 },
    );
  }

  if (!currentProfile) {
    return NextResponse.json({ message: "用户不存在" }, { status: 404 });
  }

  if (password) {
    const isOldPasswordValid = await verifyOldPassword(
      oldPassword,
      currentProfile.password,
    );

    if (!isOldPasswordValid) {
      return NextResponse.json({ message: "旧密码不正确" }, { status: 400 });
    }

    nextValues.password = await bcrypt.hash(password, 10);
  }

  const { data, error } = await supabase
    .from("users")
    .update(nextValues)
    .eq("id", session.user.id)
    .select("name,phone,avatar")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (currentProfile?.avatar && currentProfile.avatar !== avatar) {
    await deleteOldAvatarObject(currentProfile.avatar, session.user.id);
  }

  return NextResponse.json(data);
}
