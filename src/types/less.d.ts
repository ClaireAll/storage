declare module "*.less";

declare module "*.module.less" {
  const classes: Record<string, string>;
  export default classes;
}
