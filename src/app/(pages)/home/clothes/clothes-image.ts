const cropSize = 800;
const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

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

/** 将 RGB 数值转换为十六进制颜色字符串。 */
function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** 判断用户填写的颜色是否为完整的十六进制颜色。 */
export function isHexColor(color: string) {
  return hexColorPattern.test(color);
}

/** 从图片对象地址中提取平均颜色。 */
export function extractAverageColor(imageUrl: string) {
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
