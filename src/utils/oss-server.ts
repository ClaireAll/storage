import { createHmac } from "crypto";

type OssDeleteConfig = {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  host: string;
  publicBaseUrl: string;
};

type OssDirectory = "avatars" | "clothes" | "pants" | "toiletries" | "books";

function getOssDeleteConfig(): OssDeleteConfig {
  const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID?.trim() ?? "";
  const accessKeySecret =
    process.env.ALIYUN_OSS_ACCESS_KEY_SECRET?.trim() ?? "";
  const bucket = process.env.ALIYUN_OSS_BUCKET?.trim() ?? "";
  const region = process.env.ALIYUN_OSS_REGION?.trim() ?? "";
  const endpoint = process.env.ALIYUN_OSS_ENDPOINT?.trim();
  const publicBaseUrl = process.env.ALIYUN_OSS_PUBLIC_BASE_URL?.trim() ?? "";

  if (!accessKeyId || !accessKeySecret || !bucket || !region || !publicBaseUrl) {
    throw new Error("请先配置阿里云 OSS 删除所需环境变量");
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

function parseOwnObjectKey(
  objectUrl: string,
  userId: string,
  publicBaseUrl: string,
  directories: OssDirectory[],
) {
  const normalizedUrl = objectUrl.split("?")[0];
  const publicUrlPrefix = `${publicBaseUrl}/`;

  if (!normalizedUrl.startsWith(publicUrlPrefix)) {
    return null;
  }

  const objectKey = normalizedUrl.slice(publicUrlPrefix.length);

  return directories.some((directory) =>
    objectKey.startsWith(`${directory}/${userId}/`),
  )
    ? objectKey
    : null;
}

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

function encodeObjectKeyPath(objectKey: string) {
  return objectKey.split("/").map(encodeURIComponent).join("/");
}

export async function deleteOwnOssObject(
  objectUrl: string,
  userId: string,
  directories: OssDirectory[],
) {
  const ossConfig = getOssDeleteConfig();
  const objectKey = parseOwnObjectKey(
    objectUrl,
    userId,
    ossConfig.publicBaseUrl,
    directories,
  );

  if (!objectKey) {
    throw new Error("图片地址不属于当前用户，已取消删除");
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
    throw new Error(`删除图片失败：${response.status} ${await response.text()}`);
  }
}
