import { useRef, useState, type PointerEvent } from "react";
import { pinyin } from "pinyin-pro";

const cropSize = 800;
const cropPreviewSize = 260;
const hexColorPattern = /^#[0-9a-fA-F]{6}$/;
const clothesSeasonSeparatorPattern = /\s+/;

/** 名称搜索匹配结果。 */
export type ClothesNameSearchMatch = {
  /** 是否命中名称。 */
  matched: boolean;
  /** 名称中被命中的字符下标。 */
  highlightIndexes: Set<number>;
};

/** 图片裁剪参数。 */
export type ImageCropOptions = {
  /** 裁剪图片地址。 */
  imageUrl: string;
  /** 源文件名。 */
  sourceFileName: string;
  /** 图片缩放比例。 */
  cropScale: number;
  /** 横向偏移比例。 */
  cropOffsetX: number;
  /** 纵向偏移比例。 */
  cropOffsetY: number;
};

/** 拖拽位置。 */
type DragPosition = {
  /** 横向偏移像素。 */
  x: number;
  /** 纵向偏移像素。 */
  y: number;
};

/** 拖拽起点记录。 */
type DragStart = {
  /** 起始横向偏移像素。 */
  originX: number;
  /** 起始纵向偏移像素。 */
  originY: number;
  /** 起始指针横坐标。 */
  pointerX: number;
  /** 起始指针纵坐标。 */
  pointerY: number;
};

/** 裁剪拖拽起点记录。 */
type CropDragStart = {
  /** 起始横向偏移比例。 */
  originX: number;
  /** 起始纵向偏移比例。 */
  originY: number;
  /** 起始指针横坐标。 */
  pointerX: number;
  /** 起始指针纵坐标。 */
  pointerY: number;
};

/** 将 RGB 数值转换为十六进制颜色字符串。 */
function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** 限制图片拖拽偏移范围，避免裁剪区域露出空白。 */
function clampCropOffset(value: number, limit: number) {
  return Math.max(-limit, Math.min(limit, value));
}

/** 计算某个方向在当前缩放下可以移动的最大比例。 */
function getCropOffsetLimit(sizeRatio: number, scale: number) {
  return Math.max(0, (sizeRatio * scale - 1) / 2);
}

/** 判断用户填写的颜色是否为完整的十六进制颜色。 */
export function isHexColor(color: string) {
  return hexColorPattern.test(color);
}

/** 将衣服季节字符串拆成数组，兼容旧的单季节数据。 */
export function parseClothesSeasons(season: string) {
  return season
    .trim()
    .split(clothesSeasonSeparatorPattern)
    .filter(Boolean);
}

/** 将衣服季节数组格式化为数据库存储字符串。 */
export function formatClothesSeasons(seasons: string[]) {
  return Array.from(new Set(seasons.map((season) => season.trim()).filter(Boolean)))
    .join(" ");
}

/** 规范化搜索关键字，忽略空格和大小写。 */
function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

/** 将字符串按字符拆分，避免中文字符索引错位。 */
function splitSearchChars(value: string) {
  return Array.from(value);
}

/** 标记普通字符串命中的字符范围。 */
function markDirectMatchIndexes(source: string, keyword: string) {
  const highlightIndexes = new Set<number>();
  const sourceChars = splitSearchChars(source);
  const keywordChars = splitSearchChars(keyword);

  if (!keywordChars.length) {
    return highlightIndexes;
  }

  const sourceText = sourceChars.join("").toLowerCase();
  const keywordText = keywordChars.join("").toLowerCase();
  const matchIndex = sourceText.indexOf(keywordText);

  if (matchIndex === -1) {
    return highlightIndexes;
  }

  for (let index = matchIndex; index < matchIndex + keywordChars.length; index += 1) {
    highlightIndexes.add(index);
  }

  return highlightIndexes;
}

/** 在拼音字符串中查找命中范围，并映射回原名称字符。 */
function markPinyinMatchIndexes(
  pinyinText: string,
  pinyinCharIndexes: number[],
  keyword: string,
) {
  const highlightIndexes = new Set<number>();
  const matchIndex = pinyinText.indexOf(keyword);

  if (matchIndex === -1) {
    return highlightIndexes;
  }

  for (let index = matchIndex; index < matchIndex + keyword.length; index += 1) {
    const sourceIndex = pinyinCharIndexes[index];

    if (sourceIndex !== undefined) {
      highlightIndexes.add(sourceIndex);
    }
  }

  return highlightIndexes;
}

/** 判断衣服名称是否命中搜索关键字，支持中文、全拼和首字母。 */
export function matchClothesNameSearch(
  name: string,
  keyword: string,
): ClothesNameSearchMatch {
  const normalizedKeyword = normalizeSearchText(keyword);
  const directHighlightIndexes = markDirectMatchIndexes(name, keyword.trim());

  if (!normalizedKeyword) {
    return {
      highlightIndexes: new Set(),
      matched: true,
    };
  }

  if (directHighlightIndexes.size) {
    return {
      highlightIndexes: directHighlightIndexes,
      matched: true,
    };
  }

  const nameChars = splitSearchChars(name);
  const pinyinTokens = pinyin(name, {
    toneType: "none",
    type: "array",
  }) as string[];
  const fullPinyinChars: string[] = [];
  const fullPinyinCharIndexes: number[] = [];
  const initialChars: string[] = [];
  const initialCharIndexes: number[] = [];

  pinyinTokens.forEach((token, tokenIndex) => {
    const normalizedToken = normalizeSearchText(token);

    if (!normalizedToken) {
      return;
    }

    initialChars.push(normalizedToken[0]);
    initialCharIndexes.push(tokenIndex);

    splitSearchChars(normalizedToken).forEach((char) => {
      fullPinyinChars.push(char);
      fullPinyinCharIndexes.push(tokenIndex);
    });
  });

  const fullPinyinMatchIndexes = markPinyinMatchIndexes(
    fullPinyinChars.join(""),
    fullPinyinCharIndexes,
    normalizedKeyword,
  );

  if (fullPinyinMatchIndexes.size) {
    return {
      highlightIndexes: fullPinyinMatchIndexes,
      matched: true,
    };
  }

  const initialMatchIndexes = markPinyinMatchIndexes(
    initialChars.join(""),
    initialCharIndexes,
    normalizedKeyword,
  );

  return {
    highlightIndexes: initialMatchIndexes,
    matched: initialMatchIndexes.size > 0 || nameChars.join("").toLowerCase().includes(normalizedKeyword),
  };
}

/** 从图片对象地址中提取平均颜色。 */
export function extractAverageColor(imageUrl: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) {
        reject(new Error("无法读取图片颜色"));
        return;
      }

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);

      const centerX = Math.floor(image.naturalWidth / 2);
      const centerY = Math.floor(image.naturalHeight / 2);
      const { data } = context.getImageData(centerX, centerY, 1, 1);
      const alpha = data[3];

      if (alpha < 128) {
        reject(new Error("未识别到可用颜色"));
        return;
      }

      resolve(rgbToHex(data[0], data[1], data[2]));
    };
    image.onerror = () => reject(new Error("图片读取失败"));
    image.src = imageUrl;
  });
}

/** 将图片按当前裁剪参数生成正方形图片文件。 */
export function createCroppedImageFile({
  cropOffsetX,
  cropOffsetY,
  cropScale,
  imageUrl,
  sourceFileName,
}: ImageCropOptions) {
  return new Promise<File>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("无法裁剪图片"));
        return;
      }

      canvas.width = cropSize;
      canvas.height = cropSize;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, cropSize, cropSize);

      const baseScale = Math.max(
        cropSize / image.naturalWidth,
        cropSize / image.naturalHeight,
      );
      const drawWidth = image.naturalWidth * baseScale * cropScale;
      const drawHeight = image.naturalHeight * baseScale * cropScale;
      const drawX = (cropSize - drawWidth) / 2 + cropOffsetX * cropSize;
      const drawY = (cropSize - drawHeight) / 2 + cropOffsetY * cropSize;

      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("图片裁剪失败"));
            return;
          }

          const fileName = sourceFileName.replace(/\.[^.]+$/, "");

          resolve(
            new File([blob], `${fileName || "clothes"}-crop.jpg`, {
              type: "image/jpeg",
            }),
          );
        },
        "image/jpeg",
        0.92,
      );
    };
    image.onerror = () => reject(new Error("图片读取失败"));
    image.src = imageUrl;
  });
}

/** 管理可拖拽弹窗的位置和标题栏事件。 */
export function useDraggableModal() {
  const [position, setPosition] = useState<DragPosition>({ x: 0, y: 0 });
  const dragStartRef = useRef<DragStart | null>(null);

  /** 重置弹窗位置。 */
  function resetPosition() {
    setPosition({ x: 0, y: 0 });
  }

  /** 按下弹窗标题栏时记录拖拽起点。 */
  function startDrag(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      originX: position.x,
      originY: position.y,
      pointerX: event.clientX,
      pointerY: event.clientY,
    };
  }

  /** 拖拽标题栏时移动弹窗。 */
  function drag(event: PointerEvent<HTMLDivElement>) {
    const dragStart = dragStartRef.current;

    if (!dragStart) {
      return;
    }

    setPosition({
      x: dragStart.originX + event.clientX - dragStart.pointerX,
      y: dragStart.originY + event.clientY - dragStart.pointerY,
    });
  }

  /** 松开标题栏时结束拖拽。 */
  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    dragStartRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return {
    drag,
    position,
    resetPosition,
    startDrag,
    stopDrag,
  };
}

/** 管理图片裁剪缩放、比例和拖拽偏移。 */
export function useImageCrop() {
  const cropFrameRef = useRef<HTMLDivElement>(null);
  const cropDragStartRef = useRef<CropDragStart | null>(null);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const [cropScale, setCropScale] = useState(1);
  const [cropImageAspectRatio, setCropImageAspectRatio] = useState(1);

  /** 重置裁剪参数。 */
  function resetCrop() {
    setCropOffsetX(0);
    setCropOffsetY(0);
    setCropImageAspectRatio(1);
    setCropScale(1);
  }

  /** 按下裁剪图片时记录拖拽起点。 */
  function startDragCrop(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    cropDragStartRef.current = {
      originX: cropOffsetX,
      originY: cropOffsetY,
      pointerX: event.clientX,
      pointerY: event.clientY,
    };
  }

  /** 拖拽裁剪图片时更新图片偏移。 */
  function dragCrop(event: PointerEvent<HTMLDivElement>) {
    const dragStart = cropDragStartRef.current;
    const cropFrame = cropFrameRef.current;

    if (!dragStart || !cropFrame) {
      return;
    }

    if (event.buttons !== 1) {
      stopDragCrop(event);
      return;
    }

    const frameRect = cropFrame.getBoundingClientRect();

    if (!frameRect.width || !frameRect.height) {
      return;
    }

    const renderedWidthRatio =
      cropImageAspectRatio >= 1 ? cropImageAspectRatio : 1;
    const renderedHeightRatio =
      cropImageAspectRatio >= 1 ? 1 : 1 / cropImageAspectRatio;
    const cropOffsetXLimit = getCropOffsetLimit(renderedWidthRatio, cropScale);
    const cropOffsetYLimit = getCropOffsetLimit(renderedHeightRatio, cropScale);
    const nextCropOffsetX = clampCropOffset(
      dragStart.originX +
        (event.clientX - dragStart.pointerX) / frameRect.width,
      cropOffsetXLimit,
    );
    const nextCropOffsetY = clampCropOffset(
      dragStart.originY +
        (event.clientY - dragStart.pointerY) / frameRect.height,
      cropOffsetYLimit,
    );

    setCropOffsetX((currentOffsetX) =>
      Math.abs(currentOffsetX - nextCropOffsetX) < 0.001
        ? currentOffsetX
        : nextCropOffsetX,
    );
    setCropOffsetY((currentOffsetY) =>
      Math.abs(currentOffsetY - nextCropOffsetY) < 0.001
        ? currentOffsetY
        : nextCropOffsetY,
    );
  }

  /** 松开裁剪图片时结束拖拽。 */
  function stopDragCrop(event: PointerEvent<HTMLDivElement>) {
    cropDragStartRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  /** 调整缩放时同步收敛拖拽偏移，避免缩小时露出空白。 */
  function changeCropScale(nextScale: number) {
    const renderedWidthRatio =
      cropImageAspectRatio >= 1 ? cropImageAspectRatio : 1;
    const renderedHeightRatio =
      cropImageAspectRatio >= 1 ? 1 : 1 / cropImageAspectRatio;
    const cropOffsetXLimit = getCropOffsetLimit(renderedWidthRatio, nextScale);
    const cropOffsetYLimit = getCropOffsetLimit(renderedHeightRatio, nextScale);

    setCropScale(nextScale);
    setCropOffsetX((currentOffsetX) =>
      clampCropOffset(currentOffsetX, cropOffsetXLimit),
    );
    setCropOffsetY((currentOffsetY) =>
      clampCropOffset(currentOffsetY, cropOffsetYLimit),
    );
  }

  /** 根据当前比例和偏移生成预览图片样式。 */
  function getCropImageStyle() {
    return {
      height:
        cropImageAspectRatio >= 1
          ? "100%"
          : `${100 / cropImageAspectRatio}%`,
      transform: `translate(-50%, -50%) translate(${cropOffsetX * cropPreviewSize}px, ${cropOffsetY * cropPreviewSize}px) scale(${cropScale})`,
      width:
        cropImageAspectRatio >= 1
          ? `${cropImageAspectRatio * 100}%`
          : "100%",
    };
  }

  return {
    changeCropScale,
    cropFrameRef,
    cropImageAspectRatio,
    cropOffsetX,
    cropOffsetY,
    cropScale,
    dragCrop,
    getCropImageStyle,
    resetCrop,
    setCropImageAspectRatio,
    startDragCrop,
    stopDragCrop,
  };
}
