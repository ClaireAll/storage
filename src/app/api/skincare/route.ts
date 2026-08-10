import { skincareCategoryOptions } from "@/app/(pages)/home/constant";
import { createImageItemRouteHandlers } from "../_utils/image-item-route";

const supportedCategories = skincareCategoryOptions.map(({ value }) => value);

export const { DELETE, POST, PUT } = createImageItemRouteHandlers({
  category: "skincare",
  countMode: "optional",
  directory: "skincare",
  generatedIdField: "s_id",
  idFields: ["s_id", "c_id"],
  messages: {
    category: "请选择护肤品分类",
    count: "请输入有效数量",
    date: "请选择日期",
    id: "缺少护肤品标识",
    image: "请上传护肤品图片",
    name: "请输入护肤品名称",
    notFound: "护肤品不存在",
    price: "请输入有效价格",
  },
  supportedCategories,
});
