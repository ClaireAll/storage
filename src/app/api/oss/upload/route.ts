import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";

type OssUploadDirectory =
  | "avatars"
  | "clothes"
  | "pants"
  | "toiletries"
  | "books"
  | "hobby"
  | "cosmetic"
  | "skincare";

type OssUploadKind = "image" | "file";

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

function encodeObjectKey(objectKey: string) {
  return objectKey.split("/").map(encodeURIComponent).join("/");
}

function sanitizeOssFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .slice(0, 120);
}

function splitSafeFileName(fileName: string, fallbackBaseName: string) {
  const safeFileName = sanitizeOssFileName(fileName);
  const dotIndex = safeFileName.lastIndexOf(".");
  const rawBaseName =
    dotIndex > 0 ? safeFileName.slice(0, dotIndex) : safeFileName;
  const rawExtension = dotIndex > 0 ? safeFileName.slice(dotIndex + 1) : "";
  const baseName = rawBaseName.trim() || fallbackBaseName;
  const extension = (rawExtension.trim() || "png").toLowerCase();

  return { baseName, extension };
}

function getObjectKeyFromPublicUrl(fileUrl: string, publicBaseUrl: string) {
  try {
    const target = new URL(fileUrl);
    const base = new URL(publicBaseUrl);

    if (target.origin !== base.origin) {
      return "";
    }

    const basePath = decodeURIComponent(base.pathname)
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");
    let key = decodeURIComponent(target.pathname).replace(/^\/+/, "");

    if (basePath && key.startsWith(`${basePath}/`)) {
      key = key.slice(basePath.length + 1);
    }

    return key;
  } catch {
    return "";
  }
}

function signOssRequest(stringToSign: string, accessKeySecret: string) {
  return createHmac("sha1", accessKeySecret)
    .update(stringToSign)
    .digest("base64");
}

async function objectExists(
  objectKey: string,
  ossConfig: ReturnType<typeof getOssConfig>,
) {
  const date = new Date().toUTCString();
  const resource = `/${ossConfig.bucket}/${objectKey}`;
  const signature = signOssRequest(
    `HEAD\n\n\n${date}\n${resource}`,
    ossConfig.accessKeySecret,
  );
  const response = await fetch(
    `${ossConfig.host}/${encodeObjectKey(objectKey)}`,
    {
      headers: {
        Authorization: `OSS ${ossConfig.accessKeyId}:${signature}`,
        Date: date,
      },
      method: "HEAD",
    },
  );

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    throw new Error("检查 OSS 文件是否存在失败");
  }

  return true;
}

async function createUniqueObjectKey({
  directory,
  fileName,
  kind,
  ossConfig,
  userId,
}: {
  directory: OssUploadDirectory;
  fileName: string;
  kind: OssUploadKind;
  ossConfig: ReturnType<typeof getOssConfig>;
  userId: string;
}) {
  const { baseName, extension } = splitSafeFileName(
    fileName,
    kind === "image" ? "image" : "file",
  );

  for (let index = 1; index <= 999; index += 1) {
    const suffix = index === 1 ? "" : `_${index}`;
    const candidateKey = `${directory}/${userId}/${baseName}${suffix}.${extension}`;

    if (!(await objectExists(candidateKey, ossConfig))) {
      return candidateKey;
    }
  }

  throw new Error("同名 OSS 文件过多，请更换名称后重试");
}

function isAllowedDirectory(directory: string): directory is OssUploadDirectory {
  return (
    directory === "avatars" ||
    directory === "clothes" ||
    directory === "pants" ||
    directory === "toiletries" ||
    directory === "books" ||
    directory === "hobby" ||
    directory === "cosmetic" ||
    directory === "skincare"
  );
}

function isAllowedKind(kind: string): kind is OssUploadKind {
  return kind === "image" || kind === "file";
}

function isOwnAllowedObjectKey(
  key: string,
  userId: string,
  allowedDirectory: OssUploadDirectory,
) {
  return key.startsWith(`${allowedDirectory}/${userId}/`);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const directory = String(formData.get("directory") ?? "avatars");
    const fileName = String(formData.get("fileName") ?? "");
    const kind = String(formData.get("kind") ?? "image");
    const replaceFileUrl = String(formData.get("replaceFileUrl") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "缺少文件" }, { status: 400 });
    }

    if (!fileName) {
      return NextResponse.json({ message: "缺少文件名" }, { status: 400 });
    }

    if (!isAllowedDirectory(directory)) {
      return NextResponse.json({ message: "上传目录无效" }, { status: 400 });
    }

    if (!isAllowedKind(kind)) {
      return NextResponse.json({ message: "上传类型无效" }, { status: 400 });
    }

    if (kind === "file" && directory !== "books") {
      return NextResponse.json(
        { message: "文件只能上传到图书目录" },
        { status: 400 },
      );
    }

    if (kind === "image" && !file.type.startsWith("image/")) {
      return NextResponse.json({ message: "请选择图片文件" }, { status: 400 });
    }

    const maxFileSize = kind === "image" ? 5 * 1024 * 1024 : 50 * 1024 * 1024;

    if (file.size <= 0 || file.size > maxFileSize) {
      return NextResponse.json({ message: "文件大小无效" }, { status: 400 });
    }

    const ossConfig = getOssConfig();
    const replaceObjectKey = replaceFileUrl
      ? getObjectKeyFromPublicUrl(replaceFileUrl, ossConfig.publicBaseUrl)
      : "";
    const objectKey =
      replaceObjectKey &&
      isOwnAllowedObjectKey(replaceObjectKey, session.user.id, directory)
        ? replaceObjectKey
        : await createUniqueObjectKey({
            directory,
            fileName,
            kind,
            ossConfig,
            userId: session.user.id,
          });
    const date = new Date().toUTCString();
    const contentType =
      file.type ||
      (kind === "image" ? "image/jpeg" : "application/octet-stream");
    const resource = `/${ossConfig.bucket}/${objectKey}`;
    const signature = signOssRequest(
      `PUT\n\n${contentType}\n${date}\nx-oss-object-acl:public-read\n${resource}`,
      ossConfig.accessKeySecret,
    );
    const uploadResponse = await fetch(
      `${ossConfig.host}/${encodeObjectKey(objectKey)}`,
      {
        body: await file.arrayBuffer(),
        headers: {
          Authorization: `OSS ${ossConfig.accessKeyId}:${signature}`,
          "Content-Type": contentType,
          Date: date,
          "x-oss-object-acl": "public-read",
        },
        method: "PUT",
      },
    );

    if (!uploadResponse.ok) {
      return NextResponse.json(
        { message: "文件上传 OSS 失败" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      key: objectKey,
      url: `${ossConfig.publicBaseUrl}/${encodeObjectKey(objectKey)}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "文件上传 OSS 失败",
      },
      { status: 500 },
    );
  }
}
