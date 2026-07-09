type GenerateWanxiangOutfitImageOptions = {
  imageUrls?: string[];
  prompt: string;
};

type WanxiangGenerateResult = {
  imageUrls: string[];
  model: string;
  temporaryImageUrls: string[];
};

const defaultDashscopeBaseUrl = "https://dashscope.aliyuncs.com/api/v1";
const defaultWanxiangModel = "wan2.7-image-pro";
const maxReferenceImages = 6;
const defaultOutfitPrompt =
  "请基于参考图生成一张自然真实的全身穿搭效果图，尽量保留服装颜色、材质、廓形和款式特征，背景简洁，真实摄影风格。";

function getWanxiangConfig() {
  const apiKey = process.env.DASHSCOPE_API_KEY?.trim() ?? "";
  const baseUrl =
    process.env.DASHSCOPE_BASE_URL?.trim() || defaultDashscopeBaseUrl;
  const model = process.env.WAN_IMAGE_MODEL?.trim() || defaultWanxiangModel;

  if (!apiKey) {
    throw new Error("缺少 DASHSCOPE_API_KEY");
  }

  return {
    apiKey,
    endpoint: `${baseUrl.replace(/\/$/, "")}/services/aigc/multimodal-generation/generation`,
    model,
  };
}

function normalizeImageUrls(imageUrls: string[] | undefined) {
  return (imageUrls ?? [])
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, maxReferenceImages);
}

function createWanxiangPrompt(prompt: string, imageCount: number) {
  const userPrompt = prompt.trim() || defaultOutfitPrompt;

  if (!imageCount) {
    return userPrompt;
  }

  return `${userPrompt}\n\n参考图共 ${imageCount} 张，请把它们作为服装、人物或风格参考，不要生成商品展示图。`;
}

function collectImageUrls(value: unknown, output: Set<string>) {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectImageUrls(item, output));
    return;
  }

  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    if (
      (key === "image" || key === "url") &&
      typeof item === "string" &&
      /^https?:\/\//i.test(item)
    ) {
      output.add(item);
      return;
    }

    collectImageUrls(item, output);
  });
}

export function extractWanxiangImageUrls(result: unknown) {
  const urls = new Set<string>();

  collectImageUrls(result, urls);

  return [...urls];
}

export async function generateWanxiangOutfitImage({
  imageUrls,
  prompt,
}: GenerateWanxiangOutfitImageOptions): Promise<WanxiangGenerateResult> {
  const config = getWanxiangConfig();
  const references = normalizeImageUrls(imageUrls);
  const content = [
    ...references.map((image) => ({ image })),
    { text: createWanxiangPrompt(prompt, references.length) },
  ];
  const response = await fetch(config.endpoint, {
    body: JSON.stringify({
      input: {
        messages: [
          {
            content,
            role: "user",
          },
        ],
      },
      model: config.model,
      parameters: {
        n: 1,
        size: "2K",
        watermark: false,
      },
    }),
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const result = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      result.error?.message ?? result.message ?? "万相图片生成失败",
    );
  }

  const temporaryImageUrls = extractWanxiangImageUrls(result);

  if (!temporaryImageUrls.length) {
    throw new Error("万相没有返回图片结果");
  }

  return {
    imageUrls: temporaryImageUrls,
    model: config.model,
    temporaryImageUrls,
  };
}
