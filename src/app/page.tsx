import HomePage from "./home-page";
import { readThemeConfig } from "./theme/env";
import { auth } from "../../auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <HomePage initialTheme={readThemeConfig()} />;
}
