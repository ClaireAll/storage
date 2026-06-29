"use client";

import { uploadImageToOss } from "@/utils/oss";
import { reqDelete, reqPost, reqPut } from "@/utils/request";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
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

/** 娣诲姞琛ｆ湇寮圭獥鎺ユ敹鐨勫睘鎬с€?*/
type ClothesCreateModalProps = {
  /** 鏂板鍜岀紪杈戞帴鍙ｅ湴鍧€銆?*/
  apiPath: string;
  /** 姝ｅ湪缂栬緫鐨勮。鏈嶏紱涓虹┖鏃惰〃绀烘柊澧炪€?*/
  editingClothes?: ClothesItem | null;
  /** 鏄惁灞曠ず鍥句功鍒嗙被瀛楁銆?*/
  hasBookCategory?: boolean;
  /** 鏄惁灞曠ず棰滆壊瀛楁銆?*/
  hasColor?: boolean;
  /** 鏄惁灞曠ず璐拱鏃ユ湡瀛楁銆?*/
  hasDate?: boolean;
  /** 鏄惁灞曠ず瀛ｈ妭瀛楁銆?*/
  hasSeason?: boolean;
  /** 鏄惁灞曠ず鏁伴噺瀛楁銆?*/
  hasCount?: boolean;
  /** 鏂囩珷鎺ㄨ崘鍚嶇О锛岀敤浜庤〃鍗曟枃妗堛€?*/
  itemLabel?: string;
  /** 鍚嶅瓧杈撳叆妗嗙ず渚嬨€?*/
  namePlaceholder?: string;
  /** 寮圭獥鏄惁鎵撳紑銆?*/
  open: boolean;
  /** 褰撳墠涓婚〉涓婚鑹诧紝鐢ㄤ簬寮圭獥鍐呴€変腑鎬併€?*/
  themeColor: string;
  /** OSS 涓婁紶鐩綍銆?*/
  uploadDirectory: "clothes" | "pants" | "toiletries" | "books";
  categoryOptions?: { label: string; value: string }[];
  showCategorySelect?: boolean;
  selectedCategoryHref?: string;
  onCategoryHrefChange?: (categoryHref: string) => void;
  /** 鍏抽棴寮圭獥銆?*/
  onClose: () => void;
  /** 淇濆瓨鎴愬姛鍚庣殑鍥炶皟銆?*/
  onSaved?: () => void;
};

/** 娣诲姞琛ｆ湇琛ㄥ崟瀛楁銆?*/
type ClothesCreateFormValues = {
  /** 鍥句功鍒嗙被銆?*/
  category?: number;
  /** 鏁伴噺銆?*/
  count?: number | null;
  /** 璐拱鏃ユ湡銆?*/
  timeStamp?: Dayjs;
  /** 浠锋牸銆?*/
  price: number;
  /** 瀛ｈ妭銆?*/
  season?: string[];
};

const seasons = ["春", "夏", "秋", "冬"];
const bookCategoryOptions = [
  { label: "实体书", value: 1 },
  { label: "电子书", value: 2 },
];
const formControlWidthClassName = "w-[200px] max-w-full";
const fallbackColor = "#8b8b8b";

/** 娣诲姞琛ｆ湇寮圭獥銆?*/
export function ItemEditDialog({
  apiPath,
  categoryOptions,
  editingClothes,
  hasBookCategory = false,
  hasColor = true,
  hasCount = false,
  hasDate = true,
  hasSeason = true,
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

  /** 閲婃斁鏈湴鍥剧墖棰勮鍦板潃銆?*/
  function revokePreviewObjectUrl() {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }

  /** 閲婃斁瑁佸壀婧愬浘鏈湴鍦板潃銆?*/
  function revokeSourceObjectUrl() {
    if (sourceObjectUrlRef.current) {
      URL.revokeObjectURL(sourceObjectUrlRef.current);
      sourceObjectUrlRef.current = null;
    }
  }

  /** 閲嶇疆寮圭獥涓殑涓存椂琛ㄥ崟鐘舵€併€?*/
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
      category: hasBookCategory
        ? (nextEditingClothes?.category ?? bookCategoryOptions[0].value)
        : undefined,
      count: hasCount ? (nextEditingClothes?.count ?? 1) : undefined,
      price: nextEditingClothes?.price ?? 0,
      season: nextEditingClothes?.season
        ? parseClothesSeasons(nextEditingClothes.season)
        : [seasons[0]],
      timeStamp: hasDate
        ? nextEditingClothes?.timeStamp
          ? dayjs(nextEditingClothes.timeStamp)
          : dayjs()
        : undefined,
    });
  }

  /** 鍏抽棴鍓嶅厛娓呮帀鏈涓婁紶鑽夌锛岄伩鍏嶄笅娆℃墦寮€鏃堕棯杩囨棫鍥剧墖銆?*/
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

  /** 閫夋嫨琛ｆ湇鍥剧墖鍚庡垱寤洪瑙堬紝骞跺皾璇曟彁鍙栦富鑹诧紝鍙傛暟 files 涓虹敤鎴烽€夋嫨銆佹嫋鎷芥垨绮樿创鐨勬枃浠跺垪琛ㄣ€?*/
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

  /** 鏂囦欢鎷栧叆涓婁紶鍖烘椂淇濇寔娴忚鍣ㄤ笉鎵撳紑鍥剧墖锛屽苟鏄剧ず涓婁紶鍖洪珮浜€?*/
  function dragOverUpload(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOverUpload(true);
  }

  /** 鏂囦欢绂诲紑涓婁紶鍖烘椂鍙栨秷涓婁紶鍖洪珮浜€?*/
  function dragLeaveUpload(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOverUpload(false);
  }

  /** 鍦ㄤ笂浼犲尯閲婃斁鏂囦欢鏃惰鍙栨嫋鎷藉浘鐗囧苟杩涘叆瑁佸壀娴佺▼銆?*/
  function dropUpload(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    handleImageChange(event.dataTransfer.files);
  }

  /** 鍦ㄤ笂浼犲尯绮樿创鍥剧墖鏃惰鍙栧壀璐存澘鍥剧墖骞惰繘鍏ヨ鍓祦绋嬨€?*/
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

  /** 鍗曞嚮涓婁紶鍖烘椂鍙仛鐒﹀苟鏍囪涓哄彲绮樿创锛屼笉绔嬪嵆鎵撳紑鏂囦欢閫夋嫨鍣ㄣ€?*/
  function focusUploadForPaste(event: React.MouseEvent<HTMLDivElement>) {
    if (isCropping) {
      event.preventDefault();
      return;
    }

    setIsUploadPasteReady(true);
  }

  /** 鍙屽嚮涓婁紶鍖烘椂鎵撳紑鏈湴鏂囦欢閫夋嫨鍣ㄣ€?*/
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

  /** 榛樿浠锋牸涓?0 鏃惰仛鐒﹀叏閫夛紝鏂逛究鐩存帴瑕嗙洊杈撳叆銆?*/
  function focusPriceInput(event: React.FocusEvent<HTMLInputElement>) {
    if (form.getFieldValue("price") !== 0) {
      return;
    }

    const priceInput = event.currentTarget;

    window.requestAnimationFrame(() => {
      priceInput.select();
    });
  }

  /** 鎻愪氦琛ｆ湇琛ㄥ崟锛屾柊澧炴椂鍒涘缓璁板綍锛岀紪杈戞椂鏇存柊褰撳墠璁板綍銆?*/
  async function submitClothes(values: ClothesCreateFormValues) {
    const currentCropSourceUrl = cropSourceUrl;
    const currentEditingClothes = editingClothes ?? null;
    const clothesName = nameDraft.trim();
    const itemCount = Number(values.count ?? 0);
    const shouldUploadNewImage =
      Boolean(currentCropSourceUrl) && Boolean(sourceObjectUrlRef.current);

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
        category?: number;
        color?: string;
        count?: number;
        name: string;
        pic_url: string;
        price: number;
        season?: string;
        timeStamp?: string;
      } = {
        name: clothesName,
        pic_url: picUrl,
        price: Number(values.price.toFixed(2)),
      };

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
        error instanceof Error
          ? error.message
          : `保存${itemLabel}信息失败`;

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
      width={608}
    >
      <div className="grid grid-cols-[260px_276px] gap-x-6 gap-y-2 pt-4 max-sm:grid-cols-1">
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
          isCropping={isCropping}
          isDragOverUpload={isDragOverUpload}
          isUploadPasteReady={isUploadPasteReady}
          itemLabel={itemLabel}
          keyDownUpload={keyDownUpload}
          openUploadFilePicker={openUploadFilePicker}
          pasteUpload={pasteUpload}
          setCropImageAspectRatio={setCropImageAspectRatio}
          setIsUploadPasteReady={setIsUploadPasteReady}
          startDragCrop={startDragCrop}
          stopDragCrop={stopDragCrop}
          uploadAreaRef={uploadAreaRef}
        />

        <ItemEditForm
          categoryOptions={categoryOptions}
          color={color}
          form={form}
          focusPriceInput={focusPriceInput}
          hasBookCategory={hasBookCategory}
          hasColor={hasColor}
          hasCount={hasCount}
          hasDate={hasDate}
          hasSeason={hasSeason}
          hasSelectedCategory={hasSelectedCategory}
          isEditing={isEditing}
          itemLabel={itemLabel}
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
        <div className="col-span-full grid grid-cols-[260px_276px] items-center gap-x-6 gap-y-2 max-sm:grid-cols-1">
          <ImageToolbar
            changeCropScale={changeCropScale}
            cropScale={cropScale}
            cropSourceUrl={cropSourceUrl}
            fileInputRef={fileInputRef}
            imageError={imageError}
            isCropping={isCropping}
          />
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

type ItemEditFormProps = {
  categoryOptions?: { label: string; value: string }[];
  color: string;
  form: FormInstance<ClothesCreateFormValues>;
  focusPriceInput: (event: React.FocusEvent<HTMLInputElement>) => void;
  hasBookCategory: boolean;
  hasColor: boolean;
  hasCount: boolean;
  hasDate: boolean;
  hasSeason: boolean;
  hasSelectedCategory: boolean;
  isEditing: boolean;
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
  categoryOptions,
  color,
  form,
  focusPriceInput,
  hasBookCategory,
  hasColor,
  hasCount,
  hasDate,
  hasSeason,
  hasSelectedCategory,
  isEditing,
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

        {hasSelectedCategory ? (
          <>
            {hasBookCategory ? (
              <Form.Item
                label="分类"
                name="category"
                rules={[{ message: "请选择分类", required: true }]}
              >
                <Select<number>
                  className={formControlWidthClassName}
                  options={bookCategoryOptions}
                  placeholder="请选择分类"
                />
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
  isCropping: boolean;
  isDragOverUpload: boolean;
  isUploadPasteReady: boolean;
  itemLabel: string;
  keyDownUpload: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  openUploadFilePicker: (event: React.MouseEvent<HTMLDivElement>) => void;
  pasteUpload: (event: React.ClipboardEvent<HTMLElement>) => void;
  setCropImageAspectRatio: (aspectRatio: number) => void;
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
  isCropping,
  isDragOverUpload,
  isUploadPasteReady,
  itemLabel,
  keyDownUpload,
  openUploadFilePicker,
  pasteUpload,
  setCropImageAspectRatio,
  setIsUploadPasteReady,
  startDragCrop,
  stopDragCrop,
  uploadAreaRef,
}: ImageUploaderProps) {
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
