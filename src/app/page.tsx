import { redirect } from "next/navigation";

/** 根路径入口，统一跳转到首页地址。 */
export default function RootPage() {
  redirect("/home");
}
