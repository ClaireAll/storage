import { createImageItemRouteHandlers } from "../_utils/image-item-route";

export const { DELETE, POST, PUT } = createImageItemRouteHandlers({
  category: "pants",
  directory: "pants",
  idFields: ["c_id"],
  messages: {
    color: "请选择裤子颜色",
    date: "请选择购买日期",
    id: "缺少裤子标识",
    image: "请上传裤子图片",
    name: "请输入裤子名称",
    notFound: "裤子不存在",
    price: "请输入有效价格",
    season: "请选择季节",
  },
  requireColor: true,
  requireSeason: true,
});
