import HomePage from "./home-page";
import { readThemeConfig } from "./theme/env";

export const dynamic = "force-dynamic";

export default function Home() {
  return <HomePage initialTheme={readThemeConfig()} />;
}
