import { createImageItemRouteHandlers } from "../_utils/image-item-route";

export const { DELETE, POST, PUT } = createImageItemRouteHandlers({
  category: "toiletries",
  countMode: "required",
  directory: "toiletries",
  idFields: ["t_id", "c_id"],
  messages: {
    count: "请输入有效数量",
    date: "请选择购买日期",
    id: "缺少日用品标识",
    image: "请上传日用品图片",
    name: "请输入日用品名称",
    notFound: "日用品不存在",
    price: "请输入有效价格",
  },
});
