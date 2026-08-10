import { createImageItemRouteHandlers } from "../_utils/image-item-route";

export const { DELETE, POST, PUT } = createImageItemRouteHandlers({
  category: "clothes",
  directory: "clothes",
  idFields: ["c_id"],
  messages: {
    color: "请选择衣服颜色",
    date: "请选择购买日期",
    id: "缺少衣服标识",
    image: "请上传衣服图片",
    name: "请输入衣服名称",
    notFound: "衣服不存在",
    price: "请输入有效价格",
    season: "请选择季节",
  },
  requireColor: true,
  requireSeason: true,
});
