import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import LoginPageClient from "@/features/login/page-client";

/** 渲染登录页；如果用户已登录，则直接跳转到首页。 */
export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return <LoginPageClient />;
}
