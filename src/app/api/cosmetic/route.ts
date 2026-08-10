import { cosmeticCategoryOptions } from "@/app/(pages)/home/constant";
import { createImageItemRouteHandlers } from "../_utils/image-item-route";

const supportedCategories = cosmeticCategoryOptions.map(({ value }) => value);

export const { DELETE, POST, PUT } = createImageItemRouteHandlers({
  category: "cosmetic",
  countMode: "optional",
  directory: "cosmetic",
  generatedIdField: "c_id",
  idFields: ["c_id"],
  messages: {
    category: "请选择化妆品分类",
    count: "请输入有效数量",
    date: "请选择日期",
    id: "缺少化妆品标识",
    image: "请上传化妆品图片",
    name: "请输入化妆品名称",
    notFound: "化妆品不存在",
    price: "请输入有效价格",
  },
  supportedCategories,
});
