import { useRef, useState } from "react";

const cropPreviewSize = 260;

/** 限制图片拖拽偏移范围，避免裁剪区域露出空白。 */
function clampCropOffset(value: number, limit: number) {
  return Math.max(-limit, Math.min(limit, value));
}

/** 计算当前图片相对方块尺寸与缩放下，某个方向可以移动的最大比例。 */
function getCropOffsetLimit(sizeRatio: number, scale: number) {
  return Math.max(0, (sizeRatio * scale - 1) / 2);
}

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
  function startDragCrop(event: React.PointerEvent<HTMLDivElement>) {
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
  function dragCrop(event: React.PointerEvent<HTMLDivElement>) {
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
  function stopDragCrop(event: React.PointerEvent<HTMLDivElement>) {
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
