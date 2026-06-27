"use client";

import { uploadImageToOss } from "@/utils/oss";
import { reqDelete, reqPost, reqPut } from "@/utils/request";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Slider,
  Tooltip,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useRef, useState } from "react";
import {
  createCroppedImageFile,
  extractAverageColor,
  formatClothesSeasons,
  isHexColor,
  parseClothesSeasons,
  useDraggableModal,
  useImageCrop,
} from "./clothes-utils";
import type { ClothesItem } from "./clothes-type";

/** 添加衣服弹窗接收的属性。 */
type ClothesCreateModalProps = {
  /** 新增和编辑接口地址。 */
  apiPath: string;
  /** 正在编辑的衣服；为空时表示新增。 */
  editingClothes?: ClothesItem | null;
  /** 是否展示颜色字段。 */
  hasColor?: boolean;
  /** 是否展示季节字段。 */
  hasSeason?: boolean;
  /** 是否展示数量字段。 */
  hasCount?: boolean;
  /** 物品名称，用于表单文案。 */
  itemLabel?: string;
  /** 名字输入框示例。 */
  namePlaceholder?: string;
  /** 弹窗是否打开。 */
  open: boolean;
  /** 当前主页主题色，用于弹窗内选中态。 */
  themeColor: string;
  /** OSS 上传目录。 */
  uploadDirectory: "clothes" | "pants" | "toiletries";
  /** 关闭弹窗。 */
  onClose: () => void;
  /** 保存成功后的回调。 */
  onSaved?: () => void;
};

/** 添加衣服表单字段。 */
type ClothesCreateFormValues = {
  /** 数量。 */
  count?: number | null;
  /** 购买日期。 */
  timeStamp: Dayjs;
  /** 价格。 */
  price: number;
  /** 季节。 */
  season?: string[];
};

const seasons = ["春", "夏", "秋", "冬"];
const formControlWidthClassName = "w-[200px] max-w-full";
const fallbackColor = "#8b8b8b";

/** 添加衣服弹窗。 */
export function ClothesCreateModal({
  apiPath,
  editingClothes,
  hasColor = true,
  hasCount = false,
  hasSeason = true,
  itemLabel = "衣服",
  namePlaceholder,
  onClose,
  onSaved,
  open,
  themeColor,
  uploadDirectory,
}: ClothesCreateModalProps) {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<ClothesCreateFormValues>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const sourceObjectUrlRef = useRef<string | null>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState("");
  const [cropSourceUrl, setCropSourceUrl] = useState("");
  const [imageError, setImageError] = useState("");
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadPasteReady, setIsUploadPasteReady] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const [sourceFileName, setSourceFileName] = useState("");
  const {
    changeCropScale,
    cropFrameRef,
    cropOffsetX,
    cropOffsetY,
    cropScale,
    dragCrop,
    getCropImageStyle,
    resetCrop,
    setCropImageAspectRatio,
    startDragCrop,
    stopDragCrop,
  } = useImageCrop();
  const {
    drag: dragModal,
    position: modalPosition,
    resetPosition: resetModalPosition,
    startDrag: startDragModal,
    stopDrag: stopDragModal,
  } = useDraggableModal();
  const isEditing = Boolean(editingClothes);
  const resolvedNamePlaceholder =
    namePlaceholder ??
    (itemLabel === "裤子"
      ? "黑色长裤"
      : itemLabel === "洗漱用品"
        ? "牙膏"
        : "白色短袖");

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
  function resetDraft(nextEditingClothes: ClothesItem | null = null) {
    revokePreviewObjectUrl();
    revokeSourceObjectUrl();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setColor(nextEditingClothes?.color ?? "");
    resetCrop();
    setCropSourceUrl("");
    setImageError("");
    setIsCropping(false);
    setIsUploadPasteReady(false);
    setNameDraft(nextEditingClothes?.name ?? "");
    setNameError("");
    setSourceFileName("");
    form.setFieldsValue({
      count: hasCount ? (nextEditingClothes?.count ?? 1) : undefined,
      price: nextEditingClothes?.price ?? 0,
      season: nextEditingClothes?.season
        ? parseClothesSeasons(nextEditingClothes.season)
        : [seasons[0]],
      timeStamp: nextEditingClothes?.timeStamp
        ? dayjs(nextEditingClothes.timeStamp)
        : dayjs(),
    });
  }

  /** 关闭前先清掉本次上传草稿，避免下次打开时闪过旧图片。 */
  function closeModal() {
    resetDraft();
    onClose();
  }

  useEffect(
    () => () => {
      revokePreviewObjectUrl();
      revokeSourceObjectUrl();
    },
    [],
  );

  /** 选择衣服图片后创建预览，并尝试提取主色，参数 files 为用户选择、拖拽或粘贴的文件列表。 */
  async function handleImageChange(files: ArrayLike<File> | null) {
    setIsDragOverUpload(false);
    setIsUploadPasteReady(false);

    const file = files?.[0];

    if (!file) {
      return;
    }

    fileInputRef.current?.blur();
    uploadAreaRef.current?.blur();

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
    resetCrop();
    setIsCropping(true);
    setImageError("");
    setSourceFileName(file.name);

    const objectUrl = URL.createObjectURL(file);

    sourceObjectUrlRef.current = objectUrl;
    setCropSourceUrl(objectUrl);

    if (!hasColor) {
      return;
    }

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

  /** 文件拖入上传区时保持浏览器不打开图片，并显示上传区高亮。 */
  function dragOverUpload(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOverUpload(true);
  }

  /** 文件离开上传区时取消上传区高亮。 */
  function dragLeaveUpload(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOverUpload(false);
  }

  /** 在上传区释放文件时读取拖拽图片并进入裁剪流程。 */
  function dropUpload(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    handleImageChange(event.dataTransfer.files);
  }

  /** 在上传区粘贴图片时读取剪贴板图片并进入裁剪流程。 */
  function pasteUpload(event: React.ClipboardEvent<HTMLElement>) {
    const imageFiles = Array.from(event.clipboardData.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (!imageFiles.length) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    handleImageChange(imageFiles);
  }

  /** 单击上传区时只聚焦并标记为可粘贴，不立即打开文件选择器。 */
  function focusUploadForPaste(event: React.MouseEvent<HTMLDivElement>) {
    if (isCropping) {
      event.preventDefault();
      return;
    }

    setIsUploadPasteReady(true);
  }

  /** 双击上传区时打开本地文件选择器。 */
  function openUploadFilePicker(event: React.MouseEvent<HTMLDivElement>) {
    if (isCropping) {
      event.preventDefault();
      return;
    }

    fileInputRef.current?.click();
  }

  function keyDownUpload(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();

    if (!isCropping) {
      fileInputRef.current?.click();
    }
  }

  /** 默认价格为 0 时聚焦全选，方便直接覆盖输入。 */
  function focusPriceInput(event: React.FocusEvent<HTMLInputElement>) {
    if (form.getFieldValue("price") !== 0) {
      return;
    }

    const priceInput = event.currentTarget;

    window.requestAnimationFrame(() => {
      priceInput.select();
    });
  }

  /** 提交衣服表单，新增时创建记录，编辑时更新当前记录。 */
  async function submitClothes(values: ClothesCreateFormValues) {
    const currentCropSourceUrl = cropSourceUrl;
    const currentEditingClothes = editingClothes ?? null;
    const clothesName = nameDraft.trim();
    const itemCount = Number(values.count ?? 0);
    const shouldUploadNewImage =
      Boolean(currentCropSourceUrl) && Boolean(sourceObjectUrlRef.current);

    if (!clothesName) {
      setNameError(`请输入${itemLabel}名字`);
      return;
    }

    if (hasCount && (!Number.isFinite(itemCount) || itemCount < 1)) {
      setImageError("请输入有效数量");
      return;
    }

    if (!shouldUploadNewImage && !currentEditingClothes?.pic_url) {
      setImageError(`请上传${itemLabel}图片`);
      return;
    }

    setIsSaving(true);
    setImageError("");
    setNameError("");

    try {
      let clothesColor = color;
      let picUrl = currentEditingClothes?.pic_url ?? "";
      let croppedFile: File | null = null;

      if (shouldUploadNewImage && currentCropSourceUrl) {
        croppedFile = await createCroppedImageFile({
          cropOffsetX,
          cropOffsetY,
          cropScale,
          imageUrl: currentCropSourceUrl,
          sourceFileName: sourceFileName || `${uploadDirectory}.jpg`,
        });
        const croppedObjectUrl = URL.createObjectURL(croppedFile);

        revokePreviewObjectUrl();
        previewObjectUrlRef.current = croppedObjectUrl;

        if (hasColor && !isHexColor(clothesColor)) {
          clothesColor = await extractAverageColor(croppedObjectUrl);
          setColor(clothesColor);
        }
      }

      if (hasColor && !isHexColor(clothesColor)) {
        setImageError(`请选择${itemLabel}颜色`);
        return;
      }

      closeModal();

      if (croppedFile) {
        picUrl = await uploadImageToOss(croppedFile, {
          directory: uploadDirectory,
        });
      }

      const clothesPayload: {
        color?: string;
        count?: number;
        name: string;
        pic_url: string;
        price: number;
        season?: string;
        timeStamp: string;
      } = {
        name: clothesName,
        pic_url: picUrl,
        price: Number(values.price.toFixed(2)),
        timeStamp: values.timeStamp.format("YYYY-MM-DD"),
      };

      if (hasColor) {
        clothesPayload.color = clothesColor;
      }

      if (hasSeason) {
        clothesPayload.season = formatClothesSeasons(values.season ?? []);
      }

      if (hasCount) {
        clothesPayload.count = Math.floor(itemCount);
      }

      if (currentEditingClothes) {
        await reqPut(apiPath, {
          data: {
            ...clothesPayload,
            c_id: currentEditingClothes.c_id,
          },
        });
      } else {
        await reqPost(apiPath, {
          data: clothesPayload,
        });
      }

      onSaved?.();
      message.success("保存成功");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : `保存${itemLabel}信息失败`;

      setImageError(errorMessage);
      message.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDeleteClothes() {
    const currentEditingClothes = editingClothes ?? null;

    if (!currentEditingClothes) {
      return;
    }

    modal.confirm({
      cancelText: "取消",
      content: `删除后会同时删除${itemLabel}图片，且无法恢复。`,
      okButtonProps: { danger: true },
      okText: "删除",
      onOk: async () => {
        setIsDeleting(true);

        try {
          await reqDelete(apiPath, {
            data: {
              c_id: currentEditingClothes.c_id,
            },
          });
          closeModal();
          onSaved?.();
          message.success("删除成功");
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : `删除${itemLabel}失败`;

          message.error(errorMessage);
          throw error;
        } finally {
          setIsDeleting(false);
        }
      },
      title: `删除${itemLabel}`,
    });
  }

  return (
    <Modal
      afterOpenChange={(nextOpen) => {
        if (nextOpen) {
          resetModalPosition();
          resetDraft(editingClothes ?? null);
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
              marginLeft: modalPosition.x,
              marginTop: modalPosition.y,
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
          {isEditing ? `编辑${itemLabel}` : `添加${itemLabel}`}
        </div>
      }
      width={608}
    >
      <div className="grid grid-cols-[260px_276px] gap-x-6 gap-y-2 pt-4 max-sm:grid-cols-1">
        <div className="space-y-3">
          <div className="w-full">
            <div
              aria-label={`${itemLabel}图片上传区域`}
              className={`clothes-create-upload flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-dashed text-sm transition-colors ${
                isDragOverUpload ? "is-drag-over" : ""
              } ${
                isUploadPasteReady ? "is-paste-ready" : ""
              }`}
              onBlur={() => setIsUploadPasteReady(false)}
              onClick={focusUploadForPaste}
              onDoubleClick={openUploadFilePicker}
              onDragLeave={dragLeaveUpload}
              onDragOver={dragOverUpload}
              onDrop={dropUpload}
              onKeyDown={keyDownUpload}
              onPaste={pasteUpload}
              role="button"
              ref={uploadAreaRef}
              tabIndex={0}
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
                    alt={`${itemLabel}裁剪预览`}
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
                    style={getCropImageStyle()}
                  />
                  <span className="pointer-events-none absolute inset-0 border-2 border-white/80 shadow-[inset_0_0_0_9999px_rgb(0_0_0/12%)]" />
                </div>
              ) : editingClothes?.pic_url ? (
                <span className="relative size-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={editingClothes.name}
                    className="size-full object-cover"
                    src={editingClothes.pic_url}
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1.5 text-xs text-white">
                    双击 / 拖拽 / 粘贴更换
                  </span>
                </span>
              ) : (
                <span className="flex flex-col items-center gap-2">
                  <UploadOutlined className="text-2xl" />
                  双击 / 拖拽 / 粘贴上传
                </span>
              )}
            </div>
          </div>
          <input
            accept="image/*"
            className="hidden"
            onChange={(event) => handleImageChange(event.target.files)}
            ref={fileInputRef}
            type="file"
          />
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
              help={nameError || undefined}
              validateStatus={nameError ? "error" : undefined}
            >
              <Input
                autoComplete="off"
                className={formControlWidthClassName}
                name="clothes-create-item-title"
                onChange={(event) => {
                  setNameDraft(event.target.value);

                  if (nameError) {
                    setNameError("");
                  }
                }}
                placeholder={`例如：${resolvedNamePlaceholder}`}
                value={nameDraft}
              />
            </Form.Item>

            <Form.Item
              label="日期"
              name="timeStamp"
              rules={[{ message: "请选择购买日期", required: true }]}
            >
              <DatePicker
                className={formControlWidthClassName}
                format="YYYY-MM-DD"
                placeholder="请选择购买日期"
              />
            </Form.Item>

            <Form.Item
              label="价格"
              name="price"
              rules={[{ message: "请输入价格", required: true }]}
            >
              <InputNumber
                className={formControlWidthClassName}
                min={0}
                onFocus={focusPriceInput}
                precision={2}
                prefix="¥"
              />
            </Form.Item>

            {hasCount ? (
              <Form.Item
                label="数量"
                name="count"
                rules={[{ message: "请输入数量", required: true }]}
              >
                <InputNumber
                  className={formControlWidthClassName}
                  min={1}
                  precision={0}
                />
              </Form.Item>
            ) : null}

            {hasColor ? (
              <Form.Item label="颜色">
                <div className="flex items-center gap-3">
                  <input
                    aria-label={`选择${itemLabel}颜色`}
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
            ) : null}

            {hasSeason ? (
              <Form.Item
                label="季节"
                name="season"
                rules={[
                  {
                    message: "请选择季节",
                    required: true,
                    type: "array",
                  },
                ]}
              >
                <Checkbox.Group
                  className="clothes-create-season-checkboxes"
                  options={seasons}
                />
              </Form.Item>
            ) : null}
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
            ) : imageError ? (
              <Typography.Text type="danger">{imageError}</Typography.Text>
            ) : null}
          </div>
          <div className="flex justify-between gap-3">
            {isEditing ? (
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={isDeleting}
                onClick={confirmDeleteClothes}
              >
                删除
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
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
      </div>
    </Modal>
  );
}
