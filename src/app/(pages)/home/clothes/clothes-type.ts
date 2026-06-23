/** 衣服物品在衣服页陈列和筛选中使用的数据结构。 */
export type ClothesItem = {
  /** 衣服业务主键。 */
  c_id: string | number;
  /** 衣服名称。 */
  name: string;
  /** 购买日期，格式为 yyyy-mm-dd。 */
  timeStamp: string;
  /** 价格。 */
  price: number;
  /** 主色，格式为 #rrggbb。 */
  color: string;
  /** 衣服图片地址。 */
  pic_url: string;
  /** 所属季节。 */
  season: string;
};
