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

/** 图片上传到 OSS 时可指定的业务目录。 */
type OssUploadDirectory = "avatars" | "clothes";

/** 将图片直传到阿里云 OSS，参数 file 为用户选择的本地图片文件。 */
export async function uploadImageToOss(
  file: File,
  opts: { directory?: OssUploadDirectory } = {},
) {
  validateImageFile(file);

  const policy = await reqPost<OssPolicyResponse>("/api/oss/policy", {
    data: {
      directory: opts.directory ?? "avatars",
      fileName: file.name,
    },
  });
  const formData = new FormData();

  Object.entries(policy.fields).forEach(([key, value]) => {
    formData.append(key, key === "Content-Type" ? file.type : value);
  });

  formData.append("file", file);

  const response = await fetch(policy.host, {
    body: formData,
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("图片上传 OSS 失败");
  }

  return policy.url;
}
