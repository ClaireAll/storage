"use client";

import { uploadFileToOss, uploadImageToOss } from "@/utils/oss";
import { reqDelete, reqPost, reqPut } from "@/utils/request";
import {
  DeleteOutlined,
  PlusOutlined,
  StarOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { FormInstance } from "antd";
import {
  App,
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Slider,
  Tooltip,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useRef, useState } from "react";
import { bookCategoryOptions, type ItemCategoryOption } from "../constant";
import type { ClothesItem } from "./clothes-type";
import {
  createCroppedImageFile,
  extractAverageColor,
  formatClothesSeasons,
  isHexColor,
  parseClothesSeasons,
  useDraggableModal,
  useImageCrop,
} from "./clothes-utils";

/** 添加衣服弹窗接收的属性。 */
type ClothesCreateModalProps = {
  /** 新增和编辑接口地址。 */
  apiPath: string;
  /** 正在编辑的衣服；为空时表示新增。 */
  editingClothes?: ClothesItem | null;
  /** 是否展示图书分类字段。 */
  hasBookCategory?: boolean;
  /** 是否展示图书文件上传字段。 */
  hasBookFile?: boolean;
  /** 是否展示颜色字段。 */
  hasColor?: boolean;
  /** 是否展示购买日期字段。 */
  hasDate?: boolean;
  /** 是否展示图片上传区域。 */
  hasImage?: boolean;
  /** 是否允许同一条记录管理多张图片。 */
  hasMultipleImages?: boolean;
  /** 是否展示价格字段。 */
  hasPrice?: boolean;
  /** 是否展示季节字段。 */
  hasSeason?: boolean;
  /** 是否展示数量字段。 */
  hasCount?: boolean;
  /** 是否展示链接字段。 */
  hasUrl?: boolean;
  /** 文章推荐名称，用于表单文案。 */
  itemLabel?: string;
  /** 名称输入框示例。 */
  namePlaceholder?: string;
  /** 弹窗是否打开。 */
  open: boolean;
  /** 当前主页主题色，用于弹窗内选中态。 */
  themeColor: string;
  /** OSS 上传目录。 */
  uploadDirectory:
    | "clothes"
    | "pants"
    | "toiletries"
    | "books"
    | "hobby"
    | "cosmetic"
    | "skincare"
    | "blog";
  categoryOptions?: { label: string; value: string }[];
  itemCategoryOptions?: ItemCategoryOption[];
  showCategorySelect?: boolean;
  selectedCategoryHref?: string;
  onCategoryHrefChange?: (categoryHref: string) => void;
  /** 关闭弹窗。 */
  onClose: () => void;
  /** 保存成功后的回调。 */
  onSaved?: () => void;
};

/** 添加衣服表单字段。 */
type ClothesCreateFormValues = {
  /** 图书分类。 */
  category?: number;
  /** 数量。 */
  count?: number | null;
  /** 购买日期。 */
  timeStamp?: Dayjs;
  /** 价格。 */
  price?: number;
  /** 季节。 */
  season?: string[];
  /** 外部链接。 */
  url?: string;
};

type UploadableDirectory = Exclude<
  ClothesCreateModalProps["uploadDirectory"],
  "blog"
>;

type ImageDraft = {
  file?: File;
  id: string;
  sourceFileName: string;
  url: string;
};

const seasons = ["春", "夏", "秋", "冬"];
const formControlWidthClassName = "w-[200px] max-w-full";
const fallbackColor = "#8b8b8b";

function getFileNameFromUrl(fileUrl: string) {
  try {
    const pathname = new URL(fileUrl).pathname;

    return decodeURIComponent(pathname.split("/").pop() ?? "");
  } catch {
    return fileUrl.split("/").pop() ?? "";
  }
}

function createNamedImageFileName(itemName: string, sourceFileName: string) {
  const extension = sourceFileName.includes(".")
    ? sourceFileName.split(".").pop()
    : "png";

  return `${itemName.trim() || "image"}.${extension || "png"}`;
}

function getItemImageUrls(item?: ClothesItem | null) {
  if (item?.pic_urls?.length) {
    return item.pic_urls;
  }

  return item?.pic_url ? [item.pic_url] : [];
}

function getClipboardImageFiles(clipboardData: DataTransfer) {
  const itemFiles = Array.from(clipboardData.items ?? [])
    .filter((item) => item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));

  if (itemFiles.length) {
    return itemFiles;
  }

  return Array.from(clipboardData.files ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );
}

/** 添加衣服弹窗。 */
export function ItemEditDialog({
  apiPath,
  categoryOptions,
  editingClothes,
  hasBookCategory = false,
  hasBookFile = false,
  hasColor = true,
  hasCount = false,
  hasDate = true,
  hasImage = true,
  hasMultipleImages = false,
  hasPrice = true,
  hasSeason = true,
  hasUrl = false,
  itemCategoryOptions,
  itemLabel = "衣服",
  namePlaceholder,
  onCategoryHrefChange,
  onClose,
  onSaved,
  open,
  selectedCategoryHref,
  showCategorySelect = false,
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
  const [isCropImageReady, setIsCropImageReady] = useState(false);
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadPasteReady, setIsUploadPasteReady] = useState(false);
  const [imageDrafts, setImageDrafts] = useState<ImageDraft[]>([]);
  const [selectedImageDraftId, setSelectedImageDraftId] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const [sourceFileName, setSourceFileName] = useState("");
  const bookFileInputRef = useRef<HTMLInputElement>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [bookFileName, setBookFileName] = useState("");
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
  const shouldChooseCategory = Boolean(
    showCategorySelect && categoryOptions?.length,
  );
  const hasSelectedCategory =
    !shouldChooseCategory || Boolean(selectedCategoryHref);
  const resolvedNamePlaceholder =
    namePlaceholder ??
    (itemLabel === "裤子"
      ? "黑色长裤"
      : itemLabel === "日用品"
        ? "牙膏"
        : "白色短袖");
  const modalWidth = hasImage ? (hasMultipleImages ? 960 : 608) : 360;
  const selectedImageDraft = imageDrafts.find(
    (draft) => draft.id === selectedImageDraftId,
  );

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

  function revokeImageDraftObjectUrls() {
    imageDrafts.forEach((draft) => {
      if (draft.file) {
        URL.revokeObjectURL(draft.url);
      }
    });
  }

  /** 重置弹窗中的临时表单状态。 */
  function resetDraft(nextEditingClothes: ClothesItem | null = null) {
    revokePreviewObjectUrl();
    revokeSourceObjectUrl();
    revokeImageDraftObjectUrls();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setColor(nextEditingClothes?.color ?? "");
    resetCrop();
    setCropSourceUrl("");
    setImageError("");
    setIsCropImageReady(false);
    const nextImageDrafts = getItemImageUrls(nextEditingClothes).map(
      (url, index) => ({
        id: `saved-${index}-${url}`,
        sourceFileName: getFileNameFromUrl(url) || `${uploadDirectory}.jpg`,
        url,
      }),
    );

    setImageDrafts(nextImageDrafts);
    setSelectedImageDraftId(nextImageDrafts[0]?.id ?? "");
    setCropSourceUrl(hasMultipleImages ? (nextImageDrafts[0]?.url ?? "") : "");
    setIsCropping(hasMultipleImages && Boolean(nextImageDrafts[0]));
    setIsUploadPasteReady(false);
    setNameDraft(nextEditingClothes?.name ?? "");
    setNameError("");
    setSourceFileName("");
    setBookFile(null);
    setBookFileName(
      hasBookFile && nextEditingClothes?.download_url
        ? getFileNameFromUrl(nextEditingClothes.download_url)
        : "",
    );
    if (bookFileInputRef.current) {
      bookFileInputRef.current.value = "";
    }
    const resolvedItemCategoryOptions = itemCategoryOptions ?? [];

    form.setFieldsValue({
      category:
        hasBookCategory || resolvedItemCategoryOptions.length
        ? (nextEditingClothes?.category ??
          (hasBookCategory
            ? bookCategoryOptions[0].value
            : resolvedItemCategoryOptions[0]?.value))
        : undefined,
      count: hasCount ? (nextEditingClothes?.count ?? 1) : undefined,
      price: hasPrice ? (nextEditingClothes?.price ?? 0) : undefined,
      season: nextEditingClothes?.season
        ? parseClothesSeasons(nextEditingClothes.season)
        : [seasons[0]],
      timeStamp: hasDate
        ? nextEditingClothes?.timeStamp
          ? dayjs(nextEditingClothes.timeStamp)
          : dayjs()
        : undefined,
      url: hasUrl ? (nextEditingClothes?.url ?? "") : undefined,
    });
  }

  /** 关闭前先清理本次上传草稿，避免下次打开时闪过旧图片。 */
  function closeModal() {
    resetDraft();
    onClose();
  }

  useEffect(
    () => () => {
      revokePreviewObjectUrl();
      revokeSourceObjectUrl();
      revokeImageDraftObjectUrls();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!open || !hasMultipleImages) {
      return;
    }

    function pasteDocumentImage(event: ClipboardEvent) {
      if (!event.clipboardData) {
        return;
      }

      const imageFiles = getClipboardImageFiles(event.clipboardData);

      if (!imageFiles.length) {
        return;
      }

      event.preventDefault();
      handleImageChange(imageFiles);
    }

    document.addEventListener("paste", pasteDocumentImage, true);

    return () => {
      document.removeEventListener("paste", pasteDocumentImage, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMultipleImages, open]);

  /** 选择衣服图片后创建预览，并尝试提取主色，参数 files 为用户选择、拖拽或粘贴的文件列表。 */
  async function handleImageChange(files: ArrayLike<File> | null) {
    setIsDragOverUpload(false);
    setIsUploadPasteReady(false);

    const imageFiles = Array.from(files ?? []).filter((item) =>
      item.type.startsWith("image/"),
    );
    const file = imageFiles[0];

    if (!file || !imageFiles.length) {
      setImageError("请选择图片文件");
      return;
    }

    fileInputRef.current?.blur();
    uploadAreaRef.current?.blur();

    if (imageFiles.some((imageFile) => imageFile.size > 5 * 1024 * 1024)) {
      setImageError("图片大小不能超过 5MB");
      return;
    }

    if (hasMultipleImages) {
      const nextDrafts = imageFiles.map((imageFile) => {
        const objectUrl = URL.createObjectURL(imageFile);

        return {
          file: imageFile,
          id: `${imageFile.name}-${imageFile.lastModified}-${objectUrl}`,
          sourceFileName: imageFile.name,
          url: objectUrl,
        };
      });

      setImageDrafts((currentDrafts) => [...currentDrafts, ...nextDrafts]);
      const firstDraft = nextDrafts[0];

      resetCrop();
      setCropSourceUrl(firstDraft?.url ?? "");
      setIsCropping(Boolean(firstDraft));
      setSelectedImageDraftId(firstDraft?.id ?? "");
      setImageError("");
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
    const imageFiles = getClipboardImageFiles(event.clipboardData);

    if (!imageFiles.length) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    handleImageChange(imageFiles);
  }

  /** 判断当前设备是否更适合点按上传，触屏端无法稳定使用双击选择文件。 */
  function shouldOpenPickerOnUploadClick() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches
    );
  }

  /** 单击上传区时，触屏端打开文件选择器，桌面端只聚焦并标记为可粘贴。 */
  function focusUploadForPaste(event: React.MouseEvent<HTMLDivElement>) {
    if (isCropping) {
      event.preventDefault();
      return;
    }

    if (shouldOpenPickerOnUploadClick()) {
      fileInputRef.current?.click();
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

  function startMultiImageCrop(draft?: ImageDraft) {
    resetCrop();
    setCropSourceUrl(draft?.url ?? "");
    setIsCropImageReady(false);
    setIsCropping(Boolean(draft));
  }

  function prepareNewImageDraft() {
    setSelectedImageDraftId("");
    startMultiImageCrop();
    setImageError("");
    setIsUploadPasteReady(true);

    window.requestAnimationFrame(() => {
      uploadAreaRef.current?.focus();
    });
  }

  function selectImageDraft(draftId: string) {
    const draft = imageDrafts.find((item) => item.id === draftId);

    setSelectedImageDraftId(draftId);
    startMultiImageCrop(draft);
  }

  function setImageDraftAsCover(draftId: string) {
    const nextSelectedDraft = imageDrafts.find((item) => item.id === draftId);

    setImageDrafts((currentDrafts) => {
      const draft = currentDrafts.find((item) => item.id === draftId);

      if (!draft) {
        return currentDrafts;
      }

      return [draft, ...currentDrafts.filter((item) => item.id !== draftId)];
    });
    setSelectedImageDraftId(draftId);
    startMultiImageCrop(nextSelectedDraft);
  }

  function removeImageDraft(draftId: string) {
    setImageDrafts((currentDrafts) => {
      const nextDrafts = currentDrafts.filter((draft) => draft.id !== draftId);
      const removedDraft = currentDrafts.find((draft) => draft.id === draftId);

      if (removedDraft?.file) {
        URL.revokeObjectURL(removedDraft.url);
      }

      if (selectedImageDraftId === draftId) {
        setSelectedImageDraftId(nextDrafts[0]?.id ?? "");
        startMultiImageCrop(nextDrafts[0]);
      }

      return nextDrafts;
    });
  }

  function chooseBookFile(files: ArrayLike<File> | null) {
    const file = files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setImageError("文件大小不能超过 50MB");
      return;
    }

    setBookFile(file);
    setBookFileName(file.name);
    setImageError("");
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
    const shouldRequireImage =
      hasImage && !hasBookCategory && !hasMultipleImages;

    if (!hasSelectedCategory) {
      setNameError("请先选择分类");
      return;
    }

    if (!clothesName) {
      setNameError(`请输入${itemLabel}名称`);
      return;
    }

    if (hasCount && (!Number.isFinite(itemCount) || itemCount < 1)) {
      setImageError("请输入有效数量");
      return;
    }

    if (hasDate && !values.timeStamp) {
      setImageError("请选择购买日期");
      return;
    }

    if (
      shouldRequireImage &&
      !shouldUploadNewImage &&
      !currentEditingClothes?.pic_url
    ) {
      setImageError(`请上传${itemLabel}图片`);
      return;
    }

    setIsSaving(true);
    setImageError("");
    setNameError("");

    try {
      let clothesColor = color;
      let picUrl = hasImage ? (currentEditingClothes?.pic_url ?? "") : "";
      let picUrls = hasMultipleImages
        ? imageDrafts.filter((draft) => !draft.file).map((draft) => draft.url)
        : [];
      let downloadUrl = currentEditingClothes?.download_url ?? "";
      let croppedFile: File | null = null;

      if (hasImage && shouldUploadNewImage && currentCropSourceUrl) {
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

      if (!hasMultipleImages) {
        closeModal();
      }

      if (croppedFile) {
        picUrl = await uploadImageToOss(croppedFile, {
          directory: uploadDirectory as UploadableDirectory,
          fileName: createNamedImageFileName(clothesName, croppedFile.name),
        });
      }

      if (hasMultipleImages) {
        const nextPicUrls: string[] = [];

        for (const draft of imageDrafts) {
          const shouldCropSelectedDraft =
            draft.id === selectedImageDraft?.id &&
            cropSourceUrl === draft.url &&
            isCropping;

          if (!draft.file && !shouldCropSelectedDraft) {
            nextPicUrls.push(draft.url);
            continue;
          }

          const uploadFile = shouldCropSelectedDraft
            ? await createCroppedImageFile({
                cropOffsetX,
                cropOffsetY,
                cropScale,
                imageUrl: draft.url,
                sourceFileName: draft.sourceFileName,
              })
            : draft.file;

          if (!uploadFile) {
            continue;
          }

          nextPicUrls.push(
            await uploadImageToOss(uploadFile, {
              directory: uploadDirectory as UploadableDirectory,
              fileName: createNamedImageFileName(
                clothesName,
                uploadFile.name || draft.sourceFileName,
              ),
              replaceFileUrl:
                shouldCropSelectedDraft && !draft.file ? draft.url : undefined,
            }),
          );
        }

        picUrls = nextPicUrls;
        closeModal();
      }

      if (hasBookFile && bookFile) {
        downloadUrl = await uploadFileToOss(bookFile, {
          directory: "books",
        });
      }

      const clothesPayload: {
        category?: number;
        color?: string;
        count?: number;
        download_url?: string;
        name: string;
        pic_url?: string;
        pic_urls?: string[];
        price?: number;
        season?: string;
        timeStamp?: string;
        url?: string;
      } = {
        name: clothesName,
      };

      if (hasMultipleImages) {
        clothesPayload.pic_urls = picUrls;
      } else if (hasImage) {
        clothesPayload.pic_url = picUrl;
      }

      if (hasPrice) {
        clothesPayload.price = Number((values.price ?? 0).toFixed(2));
      }

      if (hasDate && values.timeStamp) {
        clothesPayload.timeStamp = values.timeStamp.format("YYYY-MM-DD");
      }

      if (hasColor) {
        clothesPayload.color = clothesColor;
      }

      if (hasBookCategory) {
        clothesPayload.category =
          values.category ?? bookCategoryOptions[0].value;
      }

      if (hasBookFile) {
        clothesPayload.download_url = downloadUrl;
      }

      if (itemCategoryOptions?.length) {
        clothesPayload.category =
          values.category ?? itemCategoryOptions[0].value;
      }

      if (hasSeason) {
        clothesPayload.season = formatClothesSeasons(values.season ?? []);
      }

      if (hasCount) {
        clothesPayload.count = Math.floor(itemCount);
      }

      if (hasUrl) {
        clothesPayload.url = values.url?.trim() ?? "";
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
          {isEditing
            ? `编辑${itemLabel}`
            : `添加${hasSelectedCategory ? itemLabel : ""}`}
        </div>
      }
      width={modalWidth}
    >
      <div
        className={
          hasImage
            ? hasMultipleImages
              ? "grid grid-cols-[minmax(0,1.1fr)_1px_minmax(300px,0.9fr)] gap-x-8 gap-y-4 pt-4 max-sm:grid-cols-1"
              : "grid grid-cols-[260px_276px] gap-x-6 gap-y-2 pt-4 max-sm:grid-cols-1"
            : "grid grid-cols-[276px] gap-y-2 pt-4"
        }
      >
        {hasImage ? (
          <ImageUploader
            cropFrameRef={cropFrameRef}
            cropSourceUrl={cropSourceUrl}
            dragCrop={dragCrop}
            dragLeaveUpload={dragLeaveUpload}
            dragOverUpload={dragOverUpload}
            dropUpload={dropUpload}
            editingClothes={editingClothes}
            fileInputRef={fileInputRef}
            focusUploadForPaste={focusUploadForPaste}
            getCropImageStyle={getCropImageStyle}
            handleImageChange={handleImageChange}
            hasMultipleImages={hasMultipleImages}
            imageDrafts={imageDrafts}
            isCropImageReady={isCropImageReady}
            isCropping={isCropping}
            isDragOverUpload={isDragOverUpload}
            isUploadPasteReady={isUploadPasteReady}
            itemLabel={itemLabel}
            keyDownUpload={keyDownUpload}
            openUploadFilePicker={openUploadFilePicker}
            pasteUpload={pasteUpload}
            prepareNewImageDraft={prepareNewImageDraft}
            removeImageDraft={removeImageDraft}
            selectedImageDraft={selectedImageDraft}
            selectImageDraft={selectImageDraft}
            setCropImageAspectRatio={setCropImageAspectRatio}
            setIsCropImageReady={setIsCropImageReady}
            setImageDraftAsCover={setImageDraftAsCover}
            setIsUploadPasteReady={setIsUploadPasteReady}
            startDragCrop={startDragCrop}
            stopDragCrop={stopDragCrop}
            uploadAreaRef={uploadAreaRef}
          />
        ) : null}

        {hasMultipleImages ? <span className="clothes-create-divider" /> : null}

        <ItemEditForm
          categoryOptions={categoryOptions}
          color={color}
          form={form}
          focusPriceInput={focusPriceInput}
          bookFileInputRef={bookFileInputRef}
          bookFileName={bookFileName}
          chooseBookFile={chooseBookFile}
          hasBookCategory={hasBookCategory}
          hasBookFile={hasBookFile}
          hasColor={hasColor}
          hasCount={hasCount}
          hasDate={hasDate}
          hasPrice={hasPrice}
          hasSeason={hasSeason}
          hasSelectedCategory={hasSelectedCategory}
          hasUrl={hasUrl}
          isEditing={isEditing}
          itemLabel={itemLabel}
          itemCategoryOptions={itemCategoryOptions}
          nameDraft={nameDraft}
          nameError={nameError}
          onCategoryHrefChange={onCategoryHrefChange}
          onFinish={submitClothes}
          resolvedNamePlaceholder={resolvedNamePlaceholder}
          selectedCategoryHref={selectedCategoryHref}
          setColor={setColor}
          setNameDraft={setNameDraft}
          setNameError={setNameError}
          showCategorySelect={showCategorySelect}
        />
        <div
          className={
            hasImage
              ? hasMultipleImages
                ? "col-span-full grid grid-cols-[minmax(0,1.1fr)_1px_minmax(300px,0.9fr)] items-center gap-x-8 gap-y-2 max-sm:grid-cols-1"
                : "col-span-full grid grid-cols-[260px_276px] items-center gap-x-6 gap-y-2 max-sm:grid-cols-1"
              : "col-span-full grid gap-y-2"
          }
        >
          {hasImage && !hasMultipleImages ? (
            <ImageToolbar
              changeCropScale={changeCropScale}
              cropScale={cropScale}
              cropSourceUrl={cropSourceUrl}
              fileInputRef={fileInputRef}
              imageError={imageError}
              isCropping={isCropping}
            />
          ) : hasMultipleImages ? (
            imageError ? (
              <Typography.Text className="text-xs" type="danger">
                {imageError}
              </Typography.Text>
            ) : hasMultipleImages && selectedImageDraft && cropSourceUrl && isCropping ? (
              <ImageToolbar
                changeCropScale={changeCropScale}
                cropScale={cropScale}
                cropSourceUrl={cropSourceUrl}
                fileInputRef={fileInputRef}
                imageError={imageError}
                isCropping={isCropping}
              />
            ) : (
              <Typography.Text className="text-xs" type="secondary">
                共 {imageDrafts.length} 张图片
              </Typography.Text>
            )
          ) : null}
          {!hasImage && imageError ? (
            <Typography.Text className="text-xs" type="danger">
              {imageError}
            </Typography.Text>
          ) : null}
          <div
            className={
              isEditing ? "flex justify-between gap-3" : "flex justify-end gap-3"
            }
          >
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

type ItemEditFormProps = {
  bookFileInputRef: React.RefObject<HTMLInputElement | null>;
  bookFileName: string;
  categoryOptions?: { label: string; value: string }[];
  chooseBookFile: (files: ArrayLike<File> | null) => void;
  color: string;
  form: FormInstance<ClothesCreateFormValues>;
  focusPriceInput: (event: React.FocusEvent<HTMLInputElement>) => void;
  hasBookCategory: boolean;
  hasBookFile: boolean;
  hasColor: boolean;
  hasCount: boolean;
  hasDate: boolean;
  hasPrice: boolean;
  hasSeason: boolean;
  hasSelectedCategory: boolean;
  hasUrl: boolean;
  isEditing: boolean;
  itemCategoryOptions?: { label: string; value: number }[];
  itemLabel: string;
  nameDraft: string;
  nameError: string;
  onCategoryHrefChange?: (categoryHref: string) => void;
  onFinish: (values: ClothesCreateFormValues) => void;
  resolvedNamePlaceholder: string;
  selectedCategoryHref?: string;
  setColor: (color: string) => void;
  setNameDraft: (name: string) => void;
  setNameError: (error: string) => void;
  showCategorySelect: boolean;
};

export function ItemEditForm({
  bookFileInputRef,
  bookFileName,
  categoryOptions,
  chooseBookFile,
  color,
  form,
  focusPriceInput,
  hasBookCategory,
  hasBookFile,
  hasColor,
  hasCount,
  hasDate,
  hasPrice,
  hasSeason,
  hasSelectedCategory,
  hasUrl,
  isEditing,
  itemCategoryOptions,
  itemLabel,
  nameDraft,
  nameError,
  onCategoryHrefChange,
  onFinish,
  resolvedNamePlaceholder,
  selectedCategoryHref,
  setColor,
  setNameDraft,
  setNameError,
  showCategorySelect,
}: ItemEditFormProps) {
  const itemFormCategoryOptions = itemCategoryOptions ?? bookCategoryOptions;

  return (
    <div className="flex flex-col">
      <Form
        autoComplete="off"
        colon={false}
        form={form}
        id="clothes-create-form"
        labelAlign="left"
        labelCol={{ flex: "76px" }}
        layout="horizontal"
        onFinish={onFinish}
        requiredMark={false}
        wrapperCol={{ flex: "200px" }}
      >
        {showCategorySelect && categoryOptions?.length ? (
          <Form.Item
            label="分类"
            help={!hasSelectedCategory && nameError ? nameError : undefined}
            validateStatus={
              !hasSelectedCategory && nameError ? "error" : undefined
            }
          >
            <Select
              className={formControlWidthClassName}
              disabled={isEditing}
              onChange={(value) => {
                setNameError("");
                onCategoryHrefChange?.(value);
              }}
              options={categoryOptions}
              placeholder="先选择分类"
              value={selectedCategoryHref}
            />
          </Form.Item>
        ) : null}

        <Form.Item
          label="名称"
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

        {hasDate ? (
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
        ) : null}

        {hasPrice ? (
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
        ) : null}

        {hasUrl ? (
          <Form.Item
            label="链接"
            name="url"
            rules={[
              { message: "请输入链接", required: true },
              { type: "url", message: "请输入有效链接" },
            ]}
          >
            <Input
              autoComplete="off"
              className={formControlWidthClassName}
              placeholder="https://example.com"
            />
          </Form.Item>
        ) : null}

        {hasSelectedCategory ? (
          <>
            {hasBookCategory || itemCategoryOptions?.length ? (
              <Form.Item
                label="分类"
                name="category"
                rules={[{ message: "请选择分类", required: true }]}
              >
                <Select<number>
                  className={formControlWidthClassName}
                  options={itemFormCategoryOptions}
                  placeholder="请选择分类"
                />
              </Form.Item>
            ) : null}

            {hasBookFile ? (
              <Form.Item label="文件">
                <div className="flex max-w-full items-center gap-2">
                  <Button
                    icon={<UploadOutlined />}
                    onClick={() => bookFileInputRef.current?.click()}
                  >
                    选择文件
                  </Button>
                  <Typography.Text
                    className="min-w-0 flex-1"
                    ellipsis={{ tooltip: bookFileName || "未选择文件" }}
                    type={bookFileName ? undefined : "secondary"}
                  >
                    {bookFileName || "未选择文件"}
                  </Typography.Text>
                  <input
                    className="hidden!"
                    onChange={(event) => chooseBookFile(event.target.files)}
                    ref={bookFileInputRef}
                    type="file"
                  />
                </div>
              </Form.Item>
            ) : null}

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
          </>
        ) : null}
      </Form>
    </div>
  );
}

export const ClothesCreateModal = ItemEditDialog;

type ImageUploaderProps = {
  cropFrameRef: React.RefObject<HTMLDivElement | null>;
  cropSourceUrl: string;
  dragCrop: (event: React.PointerEvent<HTMLDivElement>) => void;
  dragLeaveUpload: (event: React.DragEvent<HTMLDivElement>) => void;
  dragOverUpload: (event: React.DragEvent<HTMLDivElement>) => void;
  dropUpload: (event: React.DragEvent<HTMLDivElement>) => void;
  editingClothes?: ClothesItem | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  focusUploadForPaste: (event: React.MouseEvent<HTMLDivElement>) => void;
  getCropImageStyle: () => React.CSSProperties;
  handleImageChange: (files: ArrayLike<File> | null) => void;
  hasMultipleImages: boolean;
  imageDrafts: ImageDraft[];
  isCropImageReady: boolean;
  isCropping: boolean;
  isDragOverUpload: boolean;
  isUploadPasteReady: boolean;
  itemLabel: string;
  keyDownUpload: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  openUploadFilePicker: (event: React.MouseEvent<HTMLDivElement>) => void;
  pasteUpload: (event: React.ClipboardEvent<HTMLElement>) => void;
  prepareNewImageDraft: () => void;
  removeImageDraft: (draftId: string) => void;
  selectedImageDraft?: ImageDraft;
  selectImageDraft: (draftId: string) => void;
  setCropImageAspectRatio: (aspectRatio: number) => void;
  setIsCropImageReady: (isReady: boolean) => void;
  setImageDraftAsCover: (draftId: string) => void;
  setIsUploadPasteReady: (isReady: boolean) => void;
  startDragCrop: (event: React.PointerEvent<HTMLDivElement>) => void;
  stopDragCrop: (event: React.PointerEvent<HTMLDivElement>) => void;
  uploadAreaRef: React.RefObject<HTMLDivElement | null>;
};

export function ImageUploader({
  cropFrameRef,
  cropSourceUrl,
  dragCrop,
  dragLeaveUpload,
  dragOverUpload,
  dropUpload,
  editingClothes,
  fileInputRef,
  focusUploadForPaste,
  getCropImageStyle,
  handleImageChange,
  hasMultipleImages,
  imageDrafts,
  isCropImageReady,
  isCropping,
  isDragOverUpload,
  isUploadPasteReady,
  itemLabel,
  keyDownUpload,
  openUploadFilePicker,
  pasteUpload,
  prepareNewImageDraft,
  removeImageDraft,
  selectedImageDraft,
  selectImageDraft,
  setCropImageAspectRatio,
  setIsCropImageReady,
  setImageDraftAsCover,
  setIsUploadPasteReady,
  startDragCrop,
  stopDragCrop,
  uploadAreaRef,
}: ImageUploaderProps) {
  const selectedImageDraftIndex = selectedImageDraft
    ? imageDrafts.findIndex((draft) => draft.id === selectedImageDraft.id)
    : -1;
  const isSelectedImageCover = selectedImageDraftIndex === 0;

  if (hasMultipleImages) {
    return (
      <div
        className="clothes-multi-image-uploader space-y-3"
        onClick={() => uploadAreaRef.current?.focus()}
        onDragLeave={dragLeaveUpload}
        onDragOver={dragOverUpload}
        onDrop={dropUpload}
        onKeyDown={keyDownUpload}
        onPaste={pasteUpload}
        ref={uploadAreaRef}
        role="button"
        tabIndex={0}
      >
        <div
          className={`clothes-multi-image-preview relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border ${
            !selectedImageDraft ? "is-empty border-dashed" : ""
          } ${isDragOverUpload ? "is-drag-over" : ""} ${
            isUploadPasteReady ? "is-paste-ready" : ""
          }`}
          onClick={focusUploadForPaste}
          onDoubleClick={openUploadFilePicker}
          onPaste={pasteUpload}
        >
          {selectedImageDraft && cropSourceUrl && isCropping ? (
            <>
              <div
                className="clothes-multi-image-crop relative size-full cursor-grab touch-none overflow-hidden active:cursor-grabbing"
                onPointerCancel={stopDragCrop}
                onPointerDown={startDragCrop}
                onPointerMove={dragCrop}
                onPointerUp={stopDragCrop}
                ref={cropFrameRef}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`${itemLabel}调整预览`}
                  className={
                    isCropImageReady
                      ? "pointer-events-none absolute left-1/2 top-1/2 max-h-none max-w-none select-none"
                      : "pointer-events-none size-full object-cover select-none"
                  }
                  key={cropSourceUrl}
                  onLoad={(event) => {
                    const image = event.currentTarget;

                    if (image.naturalWidth && image.naturalHeight) {
                      setCropImageAspectRatio(
                        image.naturalWidth / image.naturalHeight,
                      );
                      setIsCropImageReady(true);
                    }
                  }}
                  src={cropSourceUrl}
                  style={isCropImageReady ? getCropImageStyle() : undefined}
                />
                <span className="pointer-events-none absolute inset-0 border-2 border-white/80 shadow-[inset_0_0_0_9999px_rgb(0_0_0/12%)]" />
              </div>
              <span className="clothes-multi-image-cover-badge">封面</span>
              <div className="clothes-multi-image-preview-toolbar">
                {!isSelectedImageCover ? (
                  <Button
                    icon={<StarOutlined />}
                    onClick={() => setImageDraftAsCover(selectedImageDraft.id)}
                    size="small"
                    type="text"
                  >
                    设为封面
                  </Button>
                ) : null}
                <Button
                  icon={<DeleteOutlined />}
                  onClick={() => removeImageDraft(selectedImageDraft.id)}
                  size="small"
                  type="text"
                >
                  删除
                </Button>
              </div>
            </>
          ) : selectedImageDraft ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${itemLabel}封面预览`}
                className="size-full object-cover"
                src={selectedImageDraft.url}
              />
              <span className="clothes-multi-image-cover-badge">封面</span>
              <div className="clothes-multi-image-preview-toolbar">
                {!isSelectedImageCover ? (
                  <Button
                    icon={<StarOutlined />}
                    onClick={() => setImageDraftAsCover(selectedImageDraft.id)}
                    size="small"
                    type="text"
                  >
                    设为封面
                  </Button>
                ) : null}
                <Button
                  icon={<DeleteOutlined />}
                  onClick={() => removeImageDraft(selectedImageDraft.id)}
                  size="small"
                  type="text"
                >
                  删除
                </Button>
              </div>
            </>
          ) : (
            <button
              className="clothes-multi-image-empty"
              type="button"
            >
              <PlusOutlined className="text-2xl" />
              双击 / 拖拽 / 粘贴上传
            </button>
          )}
        </div>
        <div className="clothes-multi-image-strip">
          {imageDrafts.map((draft, index) => (
            <button
              className={`clothes-multi-image-thumb ${
                draft.id === selectedImageDraft?.id ? "is-active" : ""
              }`}
              key={draft.id}
              onClick={() => selectImageDraft(draft.id)}
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={`${itemLabel}图片 ${index + 1}`} src={draft.url} />
              {index === 0 ? (
                <span className="clothes-multi-image-thumb-cover">封面</span>
              ) : null}
              <span
                className="clothes-multi-image-thumb-delete"
                onClick={(event) => {
                  event.stopPropagation();
                  removeImageDraft(draft.id);
                }}
              >
                <DeleteOutlined />
              </span>
            </button>
          ))}
          <button
            className="clothes-multi-image-add"
            onClick={prepareNewImageDraft}
            type="button"
          >
            <PlusOutlined />
          </button>
        </div>
        <input
          accept="image/*"
          className="hidden"
          multiple
          onChange={(event) => handleImageChange(event.target.files)}
          ref={fileInputRef}
          type="file"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="w-full">
        <div
          aria-label={`${itemLabel}图片上传区域`}
          className={`clothes-create-upload flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-dashed text-sm transition-colors ${
            isDragOverUpload ? "is-drag-over" : ""
          } ${isUploadPasteReady ? "is-paste-ready" : ""}`}
          onBlur={() => setIsUploadPasteReady(false)}
          onClick={focusUploadForPaste}
          onDoubleClick={openUploadFilePicker}
          onDragLeave={dragLeaveUpload}
          onDragOver={dragOverUpload}
          onDrop={dropUpload}
          onKeyDown={keyDownUpload}
          onPaste={pasteUpload}
          ref={uploadAreaRef}
          role="button"
          tabIndex={0}
        >
          {cropSourceUrl && isCropping ? (
            <div
              className="relative size-full cursor-grab touch-none overflow-hidden active:cursor-grabbing"
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
  );
}

type ImageToolbarProps = {
  changeCropScale: (value: number) => void;
  cropScale: number;
  cropSourceUrl: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imageError: string;
  isCropping: boolean;
};

export function ImageToolbar({
  changeCropScale,
  cropScale,
  cropSourceUrl,
  fileInputRef,
  imageError,
  isCropping,
}: ImageToolbarProps) {
  return (
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
  );
}
