import { createHmac, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";

/** OSS PostObject 签名接口返回给前端的字段结构。 */
type OssPolicyResponse = {
  /** 前端提交表单上传的 OSS 地址。 */
  host: string;
  /** 文件在 OSS 中保存的对象 Key。 */
  key: string;
  /** 上传成功后可写入数据库的公开访问地址。 */
  url: string;
  /** 前端直传 OSS 时需要携带的表单字段。 */
  fields: Record<string, string>;
};

/** 读取并校验 OSS 上传所需的环境变量。 */
function getOssConfig() {
  const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID?.trim() ?? "";
  const accessKeySecret =
    process.env.ALIYUN_OSS_ACCESS_KEY_SECRET?.trim() ?? "";
  const bucket = process.env.ALIYUN_OSS_BUCKET?.trim() ?? "";
  const region = process.env.ALIYUN_OSS_REGION?.trim() ?? "";
  const endpoint = process.env.ALIYUN_OSS_ENDPOINT?.trim();
  const publicBaseUrl = process.env.ALIYUN_OSS_PUBLIC_BASE_URL?.trim() ?? "";

  if (!accessKeyId || !accessKeySecret || !bucket || !region || !publicBaseUrl) {
    throw new Error("请先配置阿里云 OSS 环境变量");
  }

  return {
    accessKeyId,
    accessKeySecret,
    bucket,
    host: endpoint || `https://${bucket}.${region}.aliyuncs.com`,
    publicBaseUrl: publicBaseUrl.replace(/\/$/, ""),
  };
}

/** OSS 允许前端上传的业务目录。 */
type OssUploadDirectory = "avatars" | "clothes" | "pants" | "toiletries" | "books" | "hobby";
type OssUploadKind = "image" | "file";

/** 根据当前用户、业务目录和文件名生成图片在 OSS 中的对象 Key。 */
function createImageObjectKey(
  userId: string,
  fileName: string,
  directory: OssUploadDirectory,
) {
  const extension = fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase()
    : "png";

  return `${directory}/${userId}/${Date.now()}-${randomUUID()}.${extension || "png"}`;
}

function sanitizeOssFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .slice(0, 120);
}

function createFileObjectKey(
  userId: string,
  fileName: string,
  directory: OssUploadDirectory,
) {
  const safeFileName = sanitizeOssFileName(fileName) || "未命名文件";

  return `${directory}/${userId}/${safeFileName}`;
}

/** 生成 OSS PostObject 策略字符串，参数 objectKey 为本次允许上传的对象 Key。 */
function createPolicy(objectKey: string, kind: OssUploadKind) {
  const expiration = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const contentTypePrefix = kind === "image" ? "image/" : "";
  const maxFileSize = kind === "image" ? 5 * 1024 * 1024 : 50 * 1024 * 1024;

  return Buffer.from(
    JSON.stringify({
      conditions: [
        ["eq", "$key", objectKey],
        ["starts-with", "$Content-Type", contentTypePrefix],
        ["eq", "$x-oss-object-acl", "public-read"],
        ["content-length-range", 1, maxFileSize],
      ],
      expiration,
    }),
  ).toString("base64");
}

/** 使用 AccessKeySecret 对 policy 进行 HMAC-SHA1 签名。 */
function signPolicy(policy: string, accessKeySecret: string) {
  return createHmac("sha1", accessKeySecret).update(policy).digest("base64");
}

/** 为当前登录用户生成一次图片直传 OSS 的 PostObject 签名。 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const { directory = "avatars", fileName, kind = "image" } = (await request.json()) as {
    directory?: OssUploadDirectory;
    fileName?: string;
    kind?: OssUploadKind;
  };

  if (!fileName) {
    return NextResponse.json({ message: "缺少文件名" }, { status: 400 });
  }

  if (
    directory !== "avatars" &&
    directory !== "clothes" &&
    directory !== "pants" &&
    directory !== "toiletries" &&
    directory !== "books" &&
    directory !== "hobby"
  ) {
    return NextResponse.json({ message: "上传目录无效" }, { status: 400 });
  }

  if (kind !== "image" && kind !== "file") {
    return NextResponse.json({ message: "上传类型无效" }, { status: 400 });
  }

  if (kind === "file" && directory !== "books") {
    return NextResponse.json({ message: "文件只能上传到图书目录" }, { status: 400 });
  }

  try {
    const ossConfig = getOssConfig();
    const key =
      kind === "file"
        ? createFileObjectKey(session.user.id, fileName, directory)
        : createImageObjectKey(session.user.id, fileName, directory);
    const policy = createPolicy(key, kind);
    const signature = signPolicy(policy, ossConfig.accessKeySecret);
    const result: OssPolicyResponse = {
      fields: {
        "Content-Type": kind === "image" ? "image/" : "application/octet-stream",
        OSSAccessKeyId: ossConfig.accessKeyId,
        Signature: signature,
        key,
        policy,
        success_action_status: "204",
        "x-oss-object-acl": "public-read",
      },
      host: ossConfig.host,
      key,
      url: `${ossConfig.publicBaseUrl}/${encodeURI(key)}`,
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "生成 OSS 签名失败",
      },
      { status: 500 },
    );
  }
}
