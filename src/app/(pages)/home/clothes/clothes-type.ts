/** 衣服文章推荐在衣服页陈列和筛选中使用的数据结构。 */
export type ClothesItem = {
  /** 前端通用业务主键。 */
  c_id: string | number;
  /** 文章推荐名称。 */
  name: string;
  /** 购买日期，格式为 yyyy-mm-dd。 */
  timeStamp?: string;
  /** 价格。 */
  price?: number;
  /** 主色，格式为 #rrggbb。 */
  color?: string;
  /** 文章推荐图片地址。 */
  pic_url?: string;
  /** 所属季节。 */
  season?: string;
  /** 文章推荐数量。 */
  count?: number;
  /** 自定义分类值。 */
  category?: number;
  /** 图书下载文件地址。 */
  download_url?: string;
  /** 外部链接地址。 */
  url?: string;
};
