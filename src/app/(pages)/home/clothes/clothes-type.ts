/** 衣服物品在衣服页陈列和筛选中使用的数据结构。 */
export type ClothesItem = {
  /** 前端通用业务主键。 */
  c_id: string | number;
  /** 物品名称。 */
  name: string;
  /** 购买日期，格式为 yyyy-mm-dd。 */
  timeStamp: string;
  /** 价格。 */
  price: number;
  /** 主色，格式为 #rrggbb。 */
  color?: string;
  /** 物品图片地址。 */
  pic_url: string;
  /** 所属季节。 */
  season?: string;
  /** 物品数量。 */
  count?: number;
};
