"use client";

import { uploadImageToOss } from "@/utils/oss";
import { reqPost } from "@/utils/request";
import { UploadOutlined } from "@ant-design/icons";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Slider,
  Tooltip,
  Typography,
} from "antd";
import { useEffect, useRef, useState } from "react";

/** 添加衣服弹窗接收的属性。 */
type ClothesCreateModalProps = {
  /** 弹窗是否打开。 */
  open: boolean;
  /** 当前主页主题色，用于弹窗内选中态。 */
  themeColor: string;
  /** 关闭弹窗。 */
  onClose: () => void;
  /** 保存成功后的回调。 */
  onCreated?: () => void;
};

/** 添加衣服表单字段。 */
type ClothesCreateFormValues = {
  /** 衣服名字。 */
  name: string;
  /** 购买日期，格式为 yyyy-mm-dd。 */
  timeStamp: string;
  /** 价格。 */
  price: number;
  /** 季节。 */
  season: string;
};

const seasons = ["春", "夏", "秋", "冬"];
const cropSize = 800;
const formControlWidthClassName = "w-[200px] max-w-full";
const fallbackColor = "#8b8b8b";
const hexColorPattern = /^#[0-9a-fA-F]{6}$/;
const cropPreviewSize = 260;

/** 获取当前本地日期字符串，格式为 yyyy-mm-dd。 */
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

/** 将 RGB 数值转换为十六进制颜色字符串。 */
function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** 判断用户填写的颜色是否为完整的十六进制颜色。 */
function isHexColor(color: string) {
  return hexColorPattern.test(color);
}

/** 限制图片拖拽偏移范围，避免裁剪区域露出空白。 */
function clampCropOffset(value: number, limit: number) {
  return Math.max(-limit, Math.min(limit, value));
}

/** 计算当前图片相对方块尺寸与缩放下，某个方向可以移动的最大比例。 */
function getCropOffsetLimit(sizeRatio: number, scale: number) {
  return Math.max(0, (sizeRatio * scale - 1) / 2);
}

/** 从图片对象地址中提取平均颜色。 */
function extractAverageColor(imageUrl: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const size = 80;

      if (!context) {
        reject(new Error("无法读取图片颜色"));
        return;
      }

      canvas.width = size;
      canvas.height = size;
      context.drawImage(image, 0, 0, size, size);

      const { data } = context.getImageData(0, 0, size, size);
      let red = 0;
      let green = 0;
      let blue = 0;
      let count = 0;

      for (let index = 0; index < data.length; index += 4) {
        const alpha = data[index + 3];

        if (alpha < 128) {
          continue;
        }

        red += data[index];
        green += data[index + 1];
        blue += data[index + 2];
        count += 1;
      }

      if (!count) {
        reject(new Error("未识别到可用颜色"));
        return;
      }

      resolve(
        rgbToHex(
          Math.round(red / count),
          Math.round(green / count),
          Math.round(blue / count),
        ),
      );
    };
    image.onerror = () => reject(new Error("图片读取失败"));
    image.src = imageUrl;
  });
}

/** 将图片按当前裁剪参数生成正方形图片文件。 */
function createCroppedImageFile(
  imageUrl: string,
  sourceFileName: string,
  cropScale: number,
  cropOffsetX: number,
  cropOffsetY: number,
) {
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

/** 添加衣服弹窗。 */
export function ClothesCreateModal({
  onClose,
  onCreated,
  open,
  themeColor,
}: ClothesCreateModalProps) {
  const [form] = Form.useForm<ClothesCreateFormValues>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const sourceObjectUrlRef = useRef<string | null>(null);
  const [color, setColor] = useState("");
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const [cropScale, setCropScale] = useState(1);
  const [cropImageAspectRatio, setCropImageAspectRatio] = useState(1);
  const [cropSourceUrl, setCropSourceUrl] = useState("");
  const [imageError, setImageError] = useState("");
  const [isCropping, setIsCropping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [sourceFileName, setSourceFileName] = useState("");
  const cropFrameRef = useRef<HTMLDivElement>(null);
  const cropDragStartRef = useRef<{
    originX: number;
    originY: number;
    pointerX: number;
    pointerY: number;
  } | null>(null);
  const dragStartRef = useRef<{
    originX: number;
    originY: number;
    pointerX: number;
    pointerY: number;
  } | null>(null);

  /** 释放本地图片预览地址。 */
  function revokePreviewObjectUrl() {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }

  /** 释放裁剪源图本地地址。 */
  function revokeSourceObjectUrl() {
    if (sourceObjectUrlRef.current) {
      URL.revokeObjectURL(sourceObjectUrlRef.current);
      sourceObjectUrlRef.current = null;
    }
  }

  /** 重置弹窗中的临时表单状态。 */
  function resetDraft() {
    revokePreviewObjectUrl();
    revokeSourceObjectUrl();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setColor("");
    setCropOffsetX(0);
    setCropOffsetY(0);
    setCropImageAspectRatio(1);
    setCropScale(1);
    setCropSourceUrl("");
    setImageError("");
    setIsCropping(false);
    setSourceFileName("");
    form.setFieldsValue({
      name: "",
      price: 0,
      season: seasons[0],
      timeStamp: getTodayDateString(),
    });
  }

  /** 关闭前先清掉本次上传草稿，避免下次打开时闪过旧图片。 */
  function closeModal() {
    resetDraft();
    onClose();
  }

  /** 按下弹窗标题栏时记录拖拽起点。 */
  function startDragModal(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      originX: modalPosition.x,
      originY: modalPosition.y,
      pointerX: event.clientX,
      pointerY: event.clientY,
    };
  }

  /** 拖拽标题栏时移动弹窗。 */
  function dragModal(event: React.PointerEvent<HTMLDivElement>) {
    const dragStart = dragStartRef.current;

    if (!dragStart) {
      return;
    }

    setModalPosition({
      x: dragStart.originX + event.clientX - dragStart.pointerX,
      y: dragStart.originY + event.clientY - dragStart.pointerY,
    });
  }

  /** 松开标题栏时结束拖拽。 */
  function stopDragModal(event: React.PointerEvent<HTMLDivElement>) {
    dragStartRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
    const cropOffsetXLimit = getCropOffsetLimit(
      renderedWidthRatio,
      cropScale,
    );
    const cropOffsetYLimit = getCropOffsetLimit(
      renderedHeightRatio,
      cropScale,
    );
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
    const cropOffsetXLimit = getCropOffsetLimit(
      renderedWidthRatio,
      nextScale,
    );
    const cropOffsetYLimit = getCropOffsetLimit(
      renderedHeightRatio,
      nextScale,
    );

    setCropScale(nextScale);
    setCropOffsetX((currentOffsetX) =>
      clampCropOffset(currentOffsetX, cropOffsetXLimit),
    );
    setCropOffsetY((currentOffsetY) =>
      clampCropOffset(currentOffsetY, cropOffsetYLimit),
    );
  }

  useEffect(
    () => () => {
      revokePreviewObjectUrl();
      revokeSourceObjectUrl();
    },
    [],
  );

  /** 选择衣服图片后创建预览，并尝试提取主色。 */
  async function handleImageChange(fileList: FileList | null) {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setImageError("请选择图片文件");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError("图片大小不能超过 5MB");
      return;
    }

    revokePreviewObjectUrl();
    revokeSourceObjectUrl();
    setColor("");
    setCropOffsetX(0);
    setCropOffsetY(0);
    setCropImageAspectRatio(1);
    setCropScale(1);
    setIsCropping(true);
    setImageError("");
    setSourceFileName(file.name);

    const objectUrl = URL.createObjectURL(file);

    sourceObjectUrlRef.current = objectUrl;
    setCropSourceUrl(objectUrl);

    try {
      const extractedColor = await extractAverageColor(objectUrl);

      if (sourceObjectUrlRef.current === objectUrl) {
        setColor(extractedColor);
      }
    } catch {
      if (sourceObjectUrlRef.current === objectUrl) {
        setImageError("图片颜色提取失败，可手动选择颜色");
      }
    }
  }

  /** 提交新增衣服表单。 */
  async function submitClothes(values: ClothesCreateFormValues) {
    if (!cropSourceUrl || !sourceObjectUrlRef.current) {
      setImageError("请上传衣服图片");
      return;
    }

    setIsSaving(true);
    setImageError("");

    try {
      const croppedFile = await createCroppedImageFile(
        cropSourceUrl,
        sourceFileName || "clothes.jpg",
        cropScale,
        cropOffsetX,
        cropOffsetY,
      );
      const croppedObjectUrl = URL.createObjectURL(croppedFile);
      let clothesColor = color;

      revokePreviewObjectUrl();
      previewObjectUrlRef.current = croppedObjectUrl;

      if (!isHexColor(clothesColor)) {
        clothesColor = await extractAverageColor(croppedObjectUrl);
        setColor(clothesColor);
      }

      if (!isHexColor(clothesColor)) {
        setImageError("请选择衣服颜色");
        return;
      }

      const picUrl = await uploadImageToOss(croppedFile, {
        directory: "clothes",
      });

      await reqPost("/api/clothes", {
        data: {
          color: clothesColor,
          name: values.name.trim(),
          pic_url: picUrl,
          price: Number(values.price.toFixed(2)),
          season: values.season,
          timeStamp: values.timeStamp,
        },
      });

      onCreated?.();
      closeModal();
    } catch (error) {
      setImageError(
        error instanceof Error ? error.message : "保存衣服信息失败",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      afterOpenChange={(nextOpen) => {
        if (nextOpen) {
          setModalPosition({ x: 0, y: 0 });
          resetDraft();
        }
      }}
      centered
      className="clothes-create-modal"
      destroyOnHidden
      footer={null}
      mask={{ closable: false }}
      modalRender={(modal) => (
        <div
          style={
            {
              "--clothes-create-theme-color": themeColor,
              transform: `translate(${modalPosition.x}px, ${modalPosition.y}px)`,
            } as React.CSSProperties
          }
        >
          {modal}
        </div>
      )}
      onCancel={closeModal}
      open={open}
      title={
        <div
          className="cursor-move select-none"
          onPointerCancel={stopDragModal}
          onPointerDown={startDragModal}
          onPointerMove={dragModal}
          onPointerUp={stopDragModal}
        >
          添加衣服
        </div>
      }
      width={608}
    >
      <div className="grid grid-cols-[260px_276px] gap-x-6 gap-y-2 pt-4 max-sm:grid-cols-1">
        <div className="space-y-3">
          <div className="w-full">
            <button
              className="clothes-create-upload flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-dashed text-sm"
              onClick={(event) => {
                if (isCropping) {
                  event.preventDefault();
                  return;
                }

                fileInputRef.current?.click();
              }}
              type="button"
            >
              {cropSourceUrl && isCropping ? (
                <div
                  className="relative size-full cursor-grab overflow-hidden touch-none active:cursor-grabbing"
                  onPointerCancel={stopDragCrop}
                  onPointerDown={startDragCrop}
                  onPointerMove={dragCrop}
                  onPointerUp={stopDragCrop}
                  ref={cropFrameRef}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="衣服裁剪预览"
                    className="pointer-events-none absolute left-1/2 top-1/2 max-h-none max-w-none select-none"
                    onLoad={(event) => {
                      const image = event.currentTarget;

                      if (image.naturalWidth && image.naturalHeight) {
                        setCropImageAspectRatio(
                          image.naturalWidth / image.naturalHeight,
                        );
                      }
                    }}
                    src={cropSourceUrl}
                    style={{
                      height:
                        cropImageAspectRatio >= 1
                          ? "100%"
                          : `${100 / cropImageAspectRatio}%`,
                      transform: `translate(-50%, -50%) translate(${cropOffsetX * cropPreviewSize}px, ${cropOffsetY * cropPreviewSize}px) scale(${cropScale})`,
                      width:
                        cropImageAspectRatio >= 1
                          ? `${cropImageAspectRatio * 100}%`
                          : "100%",
                    }}
                  />
                  <span className="pointer-events-none absolute inset-0 border-2 border-white/80 shadow-[inset_0_0_0_9999px_rgb(0_0_0/12%)]" />
                </div>
              ) : (
                <span className="flex flex-col items-center gap-2">
                  <UploadOutlined className="text-2xl" />
                  上传衣服图片
                </span>
              )}
            </button>
          </div>
          <input
            accept="image/*"
            className="hidden"
            onChange={(event) => handleImageChange(event.target.files)}
            ref={fileInputRef}
            type="file"
          />
          {imageError && (
            <Typography.Text type="danger">{imageError}</Typography.Text>
          )}
        </div>

        <div className="flex flex-col">
          <Form
            autoComplete="off"
            colon={false}
            form={form}
            id="clothes-create-form"
            labelAlign="left"
            labelCol={{ flex: "76px" }}
            layout="horizontal"
            onFinish={submitClothes}
            requiredMark={false}
            wrapperCol={{ flex: "200px" }}
          >
            <Form.Item
              label="名字"
              name="name"
              rules={[{ message: "请输入衣服名字", required: true }]}
            >
              <Input
                autoComplete="new-password"
                className={formControlWidthClassName}
                name="clothes-create-item-title"
                placeholder="例如：白色短袖"
              />
            </Form.Item>

            <Form.Item
              label="日期"
              name="timeStamp"
              rules={[{ message: "请选择购买日期", required: true }]}
            >
              <Input className={formControlWidthClassName} type="date" />
            </Form.Item>

            <Form.Item
              label="价格"
              name="price"
              rules={[{ message: "请输入价格", required: true }]}
            >
              <InputNumber
                className={formControlWidthClassName}
                min={0}
                precision={2}
                prefix="¥"
              />
            </Form.Item>

            <Form.Item label="颜色">
              <div className="flex items-center gap-3">
                <input
                  aria-label="选择衣服颜色"
                  className="clothes-create-color-picker size-8 shrink-0 cursor-pointer rounded border p-0"
                  onChange={(event) => setColor(event.target.value)}
                  type="color"
                  value={color || fallbackColor}
                />
                <Input
                  autoComplete="new-password"
                  className={formControlWidthClassName}
                  name="clothes-create-color-text"
                  onChange={(event) => setColor(event.target.value)}
                  placeholder="#rrggbb"
                  value={color}
                />
              </div>
            </Form.Item>

            <Form.Item
              label="季节"
              name="season"
              rules={[{ message: "请选择季节", required: true }]}
            >
              <Segmented
                block
                className={formControlWidthClassName}
                options={seasons}
              />
            </Form.Item>
          </Form>
        </div>
        <div className="col-span-full grid grid-cols-[260px_276px] items-center gap-x-6 gap-y-2 max-sm:grid-cols-1">
          <div className="h-8">
            {cropSourceUrl && isCropping ? (
              <div className="clothes-create-crop-toolbar grid max-w-full grid-cols-[44px_minmax(0,1fr)_32px] items-center gap-2 rounded-md">
                <Typography.Text type="secondary">缩放</Typography.Text>
                <Slider
                  max={2.5}
                  min={1}
                  onChange={changeCropScale}
                  step={0.01}
                  value={cropScale}
                />
                <Tooltip title="重新选择">
                  <Button
                    aria-label="重新选择"
                    icon={<UploadOutlined />}
                    onClick={() => fileInputRef.current?.click()}
                    size="small"
                  />
                </Tooltip>
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-3">
            <Button onClick={closeModal}>取消</Button>
            <Button
              form="clothes-create-form"
              htmlType="submit"
              loading={isSaving}
              type="primary"
            >
              保存
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
