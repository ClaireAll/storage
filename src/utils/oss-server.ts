import { createHmac } from "crypto";

type DeleteOwnOssObjectDirectory =
  | "avatars"
  | "clothes"
  | "pants"
  | "toiletries"
  | "books"
  | "hobby"
  | "cosmetic"
  | "skincare";

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
