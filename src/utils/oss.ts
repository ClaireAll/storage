import { reqPost } from "./request";

/** OSS PostObject 签名接口返回的数据结构。 */
type OssPolicyResponse = {
  /** 前端提交表单上传的 OSS 地址。 */
  host: string;
  /** 上传成功后可写入数据库的公开访问地址。 */
  url: string;
  /** 前端直传 OSS 时需要携带的表单字段。 */
  fields: Record<string, string>;
};

/** 校验待上传文件是否为图片，参数 file 为用户选择的本地文件。 */
function validateImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择图片文件");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("图片大小不能超过 5MB");
  }
}

function validateUploadFile(file: File) {
  if (file.size > 50 * 1024 * 1024) {
    throw new Error("文件大小不能超过 50MB");
  }
}

/** 图片上传到 OSS 时可指定的业务目录。 */
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
const uploadTimeoutMs = 30_000;

function hasNonAsciiText(value: string) {
  return /[^\x00-\x7F]/.test(value);
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), uploadTimeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function uploadToOss(
  file: File,
  opts: {
    directory?: OssUploadDirectory;
    fileName?: string;
    kind?: OssUploadKind;
    replaceFileUrl?: string;
  } = {},
) {
  const directory = opts.directory ?? "avatars";
  const fileName = opts.fileName ?? file.name;
  const kind = opts.kind ?? "image";
  const replaceFileUrl = opts.replaceFileUrl ?? "";

  async function uploadWithServerFallback() {
    const fallbackFormData = new FormData();

    fallbackFormData.append("directory", directory);
    fallbackFormData.append("file", file);
    fallbackFormData.append("fileName", fileName);
    fallbackFormData.append("kind", kind);
    fallbackFormData.append("replaceFileUrl", replaceFileUrl);

    const fallbackResponse = await fetchWithTimeout("/api/oss/upload", {
      body: fallbackFormData,
      method: "POST",
    });

    if (!fallbackResponse.ok) {
      throw new Error("文件上传 OSS 失败");
    }

    const fallbackResult = (await fallbackResponse.json()) as { url: string };

    return fallbackResult.url;
  }

  if (replaceFileUrl || hasNonAsciiText(fileName)) {
    return uploadWithServerFallback();
  }

  const policy = await reqPost<OssPolicyResponse>("/api/oss/policy", {
    data: {
      directory,
      fileName,
      kind,
    },
  });
  const formData = new FormData();

  Object.entries(policy.fields).forEach(([key, value]) => {
    formData.append(key, key === "Content-Type" ? file.type : value);
  });

  formData.append("file", file);

  const response = await fetchWithTimeout(policy.host, {
    body: formData,
    method: "POST",
  }).catch(() => null);

  if (!response?.ok) {
    return uploadWithServerFallback();
  }

  return policy.url;
}

/** 将图片直传到阿里云 OSS，参数 file 为用户选择的本地图片文件。 */
export async function uploadImageToOss(
  file: File,
  opts: {
    directory?: OssUploadDirectory;
    fileName?: string;
    replaceFileUrl?: string;
  } = {},
) {
  validateImageFile(file);

  return uploadToOss(file, { ...opts, kind: "image" });
}

export async function uploadFileToOss(
  file: File,
  opts: { directory?: OssUploadDirectory; fileName?: string } = {},
) {
  validateUploadFile(file);

  return uploadToOss(file, { ...opts, kind: "file" });
}
