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

type OssConfig = ReturnType<typeof getOssConfig>;

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

function getExtensionFromObjectKey(objectKey: string) {
  const fileName = objectKey.split("/").pop() ?? "";
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "";

  return extension || "png";
}

async function objectExists(objectKey: string, ossConfig: OssConfig) {
  const date = new Date().toUTCString();
  const resource = `/${ossConfig.bucket}/${objectKey}`;
  const signature = signOssRequest(
    `HEAD\n\n\n${date}\n${resource}`,
    ossConfig.accessKeySecret,
  );
  const response = await fetch(`${ossConfig.host}/${encodeURI(objectKey)}`, {
    headers: {
      Authorization: `OSS ${ossConfig.accessKeyId}:${signature}`,
      Date: date,
    },
    method: "HEAD",
  });

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
  extension,
  fileName,
  ossConfig,
  userId,
}: {
  directory: DeleteOwnOssObjectDirectory;
  extension: string;
  fileName: string;
  ossConfig: OssConfig;
  userId: string;
}) {
  const { baseName } = splitSafeFileName(fileName, "image");

  for (let index = 1; index <= 999; index += 1) {
    const suffix = index === 1 ? "" : `_${index}`;
    const candidateKey = `${directory}/${userId}/${baseName}${suffix}.${extension}`;

    if (!(await objectExists(candidateKey, ossConfig))) {
      return candidateKey;
    }
  }

  throw new Error("同名 OSS 文件过多，请更换名称后重试");
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

export async function renameOwnOssObject({
  allowedDirectories,
  fileUrl,
  nextBaseName,
  userId,
}: {
  allowedDirectories: DeleteOwnOssObjectDirectory[];
  fileUrl: string | null | undefined;
  nextBaseName: string;
  userId: string;
}) {
  if (!fileUrl) {
    return "";
  }

  const ossConfig = getOssConfig();
  const currentKey = getObjectKeyFromPublicUrl(fileUrl, ossConfig.publicBaseUrl);

  if (
    !currentKey ||
    !isOwnAllowedObjectKey(currentKey, userId, allowedDirectories)
  ) {
    return fileUrl;
  }

  const directory = allowedDirectories.find((allowedDirectory) =>
    currentKey.startsWith(`${allowedDirectory}/${userId}/`),
  );

  if (!directory) {
    return fileUrl;
  }

  const extension = getExtensionFromObjectKey(currentKey);
  const targetKey = await createUniqueObjectKey({
    directory,
    extension,
    fileName: `${nextBaseName}.${extension}`,
    ossConfig,
    userId,
  });

  if (targetKey === currentKey) {
    return fileUrl;
  }

  const date = new Date().toUTCString();
  const copySource = `/${ossConfig.bucket}/${encodeURI(currentKey)}`;
  const resource = `/${ossConfig.bucket}/${targetKey}`;
  const signature = signOssRequest(
    `PUT\n\n\n${date}\nx-oss-copy-source:${copySource}\n${resource}`,
    ossConfig.accessKeySecret,
  );
  const response = await fetch(`${ossConfig.host}/${encodeURI(targetKey)}`, {
    headers: {
      Authorization: `OSS ${ossConfig.accessKeyId}:${signature}`,
      Date: date,
      "x-oss-copy-source": copySource,
    },
    method: "PUT",
  });

  if (!response.ok) {
    throw new Error("重命名 OSS 文件失败");
  }

  await deleteOwnOssObject(fileUrl, userId, allowedDirectories);

  return `${ossConfig.publicBaseUrl}/${encodeURI(targetKey)}`;
}
