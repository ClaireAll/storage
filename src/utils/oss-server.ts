import { createHmac, randomUUID } from "crypto";

type ServerOssUploadDirectory =
  | "avatars"
  | "clothes"
  | "pants"
  | "toiletries"
  | "books"
  | "hobby"
  | "cosmetic"
  | "skincare"
  | "ai-outfits";

type UploadPublicBufferOptions = {
  body: ArrayBuffer | Buffer;
  contentType: string;
  directory: ServerOssUploadDirectory;
  fileName: string;
  userId: string;
};

type DeleteOwnOssObjectDirectory = ServerOssUploadDirectory;

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

function createImageObjectKey(
  userId: string,
  fileName: string,
  directory: ServerOssUploadDirectory,
) {
  const extension = fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase()
    : "png";

  return `${directory}/${userId}/${Date.now()}-${randomUUID()}.${extension || "png"}`;
}

function createPolicy(objectKey: string, maxFileSize: number) {
  const expiration = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  return Buffer.from(
    JSON.stringify({
      conditions: [
        ["eq", "$key", objectKey],
        ["starts-with", "$Content-Type", "image/"],
        ["eq", "$x-oss-object-acl", "public-read"],
        ["content-length-range", 1, maxFileSize],
      ],
      expiration,
    }),
  ).toString("base64");
}

function signPolicy(policy: string, accessKeySecret: string) {
  return createHmac("sha1", accessKeySecret).update(policy).digest("base64");
}

function signOssRequest(stringToSign: string, accessKeySecret: string) {
  return createHmac("sha1", accessKeySecret)
    .update(stringToSign)
    .digest("base64");
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

function isOwnAllowedObjectKey(
  key: string,
  userId: string,
  allowedDirectories: DeleteOwnOssObjectDirectory[],
) {
  return allowedDirectories.some((directory) =>
    key.startsWith(`${directory}/${userId}/`),
  );
}

export async function uploadPublicBufferToOss({
  body,
  contentType,
  directory,
  fileName,
  userId,
}: UploadPublicBufferOptions) {
  if (!contentType.startsWith("image/")) {
    throw new Error("只支持上传图片结果");
  }

  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const maxFileSize = 10 * 1024 * 1024;

  if (buffer.byteLength > maxFileSize) {
    throw new Error("生成图片大小不能超过 10MB");
  }

  const ossConfig = getOssConfig();
  const key = createImageObjectKey(userId, fileName, directory);
  const policy = createPolicy(key, maxFileSize);
  const signature = signPolicy(policy, ossConfig.accessKeySecret);
  const formData = new FormData();

  formData.append("Content-Type", contentType);
  formData.append("OSSAccessKeyId", ossConfig.accessKeyId);
  formData.append("Signature", signature);
  formData.append("key", key);
  formData.append("policy", policy);
  formData.append("success_action_status", "204");
  formData.append("x-oss-object-acl", "public-read");
  formData.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: contentType }),
    fileName,
  );

  const response = await fetch(ossConfig.host, {
    body: formData,
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("生成图片转存 OSS 失败");
  }

  return `${ossConfig.publicBaseUrl}/${encodeURI(key)}`;
}

export async function deleteOwnOssObject(
  fileUrl: string | null | undefined,
  userId: string,
  allowedDirectories: DeleteOwnOssObjectDirectory[],
) {
  if (!fileUrl) {
    return;
  }

  const ossConfig = getOssConfig();
  const key = getObjectKeyFromPublicUrl(fileUrl, ossConfig.publicBaseUrl);

  if (!key || !isOwnAllowedObjectKey(key, userId, allowedDirectories)) {
    return;
  }

  const date = new Date().toUTCString();
  const resource = `/${ossConfig.bucket}/${key}`;
  const signature = signOssRequest(
    `DELETE\n\n\n${date}\n${resource}`,
    ossConfig.accessKeySecret,
  );
  const response = await fetch(`${ossConfig.host}/${encodeURI(key)}`, {
    headers: {
      Authorization: `OSS ${ossConfig.accessKeyId}:${signature}`,
      Date: date,
    },
    method: "DELETE",
  });

  if (!response.ok && response.status !== 404) {
    throw new Error("删除 OSS 文件失败");
  }
}
