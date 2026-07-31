import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const shouldExecute = process.argv.includes("--execute");

function loadLocalEnv() {
  try {
    const envText = readFileSync(".env.local", "utf8");

    for (const line of envText.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);

      if (!match || process.env[match[1]]) {
        continue;
      }

      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // The script can also run with environment variables supplied directly.
  }
}

loadLocalEnv();

const imageTargets = [
  {
    directory: "avatars",
    idColumn: "id",
    nameColumn: "name",
    select: "id,name,avatar",
    table: "users",
    urlColumn: "avatar",
  },
  {
    directory: "clothes",
    idColumn: "c_id",
    nameColumn: "name",
    select: "id,c_id,name,pic_url",
    table: "clothes",
    urlColumn: "pic_url",
  },
  {
    directory: "pants",
    idColumn: "p_id",
    nameColumn: "name",
    select: "id,p_id,name,pic_url",
    table: "pants",
    urlColumn: "pic_url",
  },
  {
    directory: "toiletries",
    idColumn: "t_id",
    nameColumn: "name",
    select: "id,t_id,name,pic_url",
    table: "toiletries",
    urlColumn: "pic_url",
  },
  {
    directory: "books",
    idColumn: "b_id",
    nameColumn: "name",
    select: "id,b_id,name,pic_url",
    table: "books",
    urlColumn: "pic_url",
  },
  {
    directory: "hobby",
    idColumn: "h_id",
    nameColumn: "name",
    select: "id,h_id,name,pic_url",
    table: "hobby",
    urlColumn: "pic_url",
  },
  {
    directory: "cosmetic",
    idColumn: "c_id",
    nameColumn: "name",
    select: "id,c_id,name,pic_url",
    table: "cosmetic",
    urlColumn: "pic_url",
  },
  {
    directory: "skincare",
    idColumn: "s_id",
    nameColumn: "name",
    select: "id,s_id,name,pic_url",
    table: "skincare",
    urlColumn: "pic_url",
  },
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`缺少环境变量 ${name}`);
  }

  return value;
}

function getOssConfig() {
  const accessKeyId = requiredEnv("ALIYUN_OSS_ACCESS_KEY_ID");
  const accessKeySecret = requiredEnv("ALIYUN_OSS_ACCESS_KEY_SECRET");
  const bucket = requiredEnv("ALIYUN_OSS_BUCKET");
  const region = requiredEnv("ALIYUN_OSS_REGION");
  const endpoint = process.env.ALIYUN_OSS_ENDPOINT?.trim();
  const publicBaseUrl = requiredEnv("ALIYUN_OSS_PUBLIC_BASE_URL").replace(
    /\/$/,
    "",
  );

  return {
    accessKeyId,
    accessKeySecret,
    bucket,
    host: endpoint || `https://${bucket}.${region}.aliyuncs.com`,
    publicBaseUrl,
  };
}

function getSupabaseClient() {
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

function getObjectKeyFromPublicUrl(fileUrl, publicBaseUrl) {
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

function sanitizeOssFileName(fileName) {
  return fileName
    .trim()
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .slice(0, 120);
}

function splitSafeFileName(fileName, fallbackBaseName) {
  const safeFileName = sanitizeOssFileName(fileName);
  const dotIndex = safeFileName.lastIndexOf(".");
  const rawBaseName =
    dotIndex > 0 ? safeFileName.slice(0, dotIndex) : safeFileName;
  const rawExtension = dotIndex > 0 ? safeFileName.slice(dotIndex + 1) : "";

  return {
    baseName: rawBaseName.trim() || fallbackBaseName,
    extension: (rawExtension.trim() || "png").toLowerCase(),
  };
}

function createTargetFileName(recordName, sourceKey, target) {
  const sourceFileName = decodeURIComponent(sourceKey.split("/").pop() ?? "");
  const sourceExtension = sourceFileName.includes(".")
    ? sourceFileName.split(".").pop()
    : "png";
  const requestedName = recordName;
  const extension =
    target.directory === "avatars" ? "png" : sourceExtension || "png";

  return `${requestedName || "image"}.${extension}`;
}

function createCandidateFileName(baseName, extension, index) {
  return index === 1
    ? `${baseName}.${extension}`
    : `${baseName}_${index}.${extension}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isAlreadyNamedObjectKey(sourceKey, requestedFileName) {
  const sourceFileName = decodeURIComponent(sourceKey.split("/").pop() ?? "");
  const { baseName, extension } = splitSafeFileName(requestedFileName, "image");
  const namedPattern = new RegExp(
    `^${escapeRegExp(baseName)}(?:_\\d+)?\\.${escapeRegExp(extension)}$`,
  );

  return namedPattern.test(sourceFileName);
}

function signOssRequest(method, key, ossConfig, headers = {}) {
  const date = headers.Date ?? new Date().toUTCString();
  const ossHeaders = Object.entries(headers)
    .filter(([name]) => name.toLowerCase().startsWith("x-oss-"))
    .map(([name, value]) => `${name.toLowerCase()}:${value}`)
    .sort()
    .join("\n");
  const resource = `/${ossConfig.bucket}/${key}`;
  const stringToSign = [
    method,
    "",
    "",
    date,
    ossHeaders ? `${ossHeaders}\n${resource}` : resource,
  ].join("\n");
  const signature = createHmac("sha1", ossConfig.accessKeySecret)
    .update(stringToSign)
    .digest("base64");

  return {
    Authorization: `OSS ${ossConfig.accessKeyId}:${signature}`,
    Date: date,
  };
}

async function objectExists(objectKey, ossConfig) {
  const headers = signOssRequest("HEAD", objectKey, ossConfig);
  const response = await fetch(`${ossConfig.host}/${encodeURI(objectKey)}`, {
    headers,
    method: "HEAD",
  });

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    throw new Error(`检查 OSS 文件失败: ${objectKey}`);
  }

  return true;
}

async function createUniqueObjectKey(directory, userId, fileName, ossConfig) {
  const { baseName, extension } = splitSafeFileName(fileName, "image");

  for (let index = 1; index <= 999; index += 1) {
    const candidateFileName = createCandidateFileName(
      baseName,
      extension,
      index,
    );
    const candidateKey = `${directory}/${userId}/${candidateFileName}`;

    if (!(await objectExists(candidateKey, ossConfig))) {
      return candidateKey;
    }
  }

  throw new Error(`同名 OSS 文件过多: ${directory}/${userId}/${baseName}`);
}

async function copyOssObject(sourceKey, targetKey, ossConfig) {
  const copySource = `/${ossConfig.bucket}/${encodeURIComponent(sourceKey)}`;
  const headers = {
    Date: new Date().toUTCString(),
    "x-oss-copy-source": copySource,
    "x-oss-object-acl": "public-read",
  };
  const signedHeaders = signOssRequest("PUT", targetKey, ossConfig, headers);
  const response = await fetch(`${ossConfig.host}/${encodeURI(targetKey)}`, {
    headers: {
      ...headers,
      ...signedHeaders,
    },
    method: "PUT",
  });

  if (!response.ok) {
    throw new Error(`复制 OSS 文件失败: ${sourceKey} -> ${targetKey}`);
  }
}

async function deleteOssObject(objectKey, ossConfig) {
  const headers = signOssRequest("DELETE", objectKey, ossConfig);
  const response = await fetch(`${ossConfig.host}/${encodeURI(objectKey)}`, {
    headers,
    method: "DELETE",
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`删除 OSS 文件失败: ${objectKey}`);
  }
}

function isOwnedImageKey(key, userId, target) {
  return key.startsWith(`${target.directory}/${userId}/`);
}

async function updateRecordUrl(supabase, target, record, nextUrl) {
  let query = supabase
    .from(target.table)
    .update({ [target.urlColumn]: nextUrl })
    .eq(target.idColumn, record[target.idColumn]);

  if (target.idColumn !== "id") {
    query = query.eq("id", record.id);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`更新 ${target.table} 失败: ${error.message}`);
  }
}

async function processTarget(supabase, ossConfig, target) {
  const { data, error } = await supabase
    .from(target.table)
    .select(target.select)
    .not(target.urlColumn, "is", null);

  if (error) {
    throw new Error(`读取 ${target.table} 失败: ${error.message}`);
  }

  for (const record of data ?? []) {
    const fileUrl = record[target.urlColumn];
    const userId = record.id;
    const sourceKey = getObjectKeyFromPublicUrl(fileUrl, ossConfig.publicBaseUrl);

    if (!sourceKey || !isOwnedImageKey(sourceKey, userId, target)) {
      continue;
    }

    const requestedFileName = createTargetFileName(
      record.name,
      sourceKey,
      target,
    );
    if (isAlreadyNamedObjectKey(sourceKey, requestedFileName)) {
      continue;
    }

    const targetKey = await createUniqueObjectKey(
      target.directory,
      userId,
      requestedFileName,
      ossConfig,
    );

    if (sourceKey === targetKey) {
      continue;
    }

    const nextUrl = `${ossConfig.publicBaseUrl}/${encodeURI(targetKey)}`;
    console.log(
      `${shouldExecute ? "EXECUTE" : "DRY-RUN"} ${target.table}: ${sourceKey} -> ${targetKey}`,
    );

    if (!shouldExecute) {
      continue;
    }

    await copyOssObject(sourceKey, targetKey, ossConfig);
    await updateRecordUrl(supabase, target, record, nextUrl);
    await deleteOssObject(sourceKey, ossConfig);
  }
}

async function main() {
  const ossConfig = getOssConfig();
  const supabase = getSupabaseClient();

  if (!shouldExecute) {
    console.log("DRY-RUN only. Add --execute to copy OSS objects and update DB.");
  }

  for (const target of imageTargets) {
    await processTarget(supabase, ossConfig, target);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
